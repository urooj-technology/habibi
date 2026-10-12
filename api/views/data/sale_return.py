from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from account.permissions import ModuleCRUDPermission
from api.models.accounting.account import AccountingAccount
from api.models.data.sale import Sale, SaleItems
from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.serializers.data.sale_return import SaleReturnSerializer
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination


def _d(value) -> Decimal:
    return Decimal(str(value)) if value is not None else Decimal("0")


def returned_qty_for_sale_item(
    sale_item_id: int, *, exclude_return_id: int | None = None
) -> Decimal:
    qs = SaleReturnItem.objects.filter(
        sale_item_id=sale_item_id,
        sale_return__is_deleted=False,
    )
    if exclude_return_id:
        qs = qs.exclude(sale_return_id=exclude_return_id)
    agg = qs.aggregate(total=Sum("quantity"))
    return _d(agg["total"])


def remaining_for_sale_item(
    sale_item: SaleItems, *, exclude_return_id: int | None = None
) -> Decimal:
    returned = returned_qty_for_sale_item(
        sale_item.id, exclude_return_id=exclude_return_id
    )
    return max(_d(sale_item.quantity) - returned, Decimal("0"))


class SaleReturnViewSet(DataRootViewSet):
    queryset = SaleReturn.objects.all().order_by("-id")
    serializer_class = SaleReturnSerializer
    permission_classes = [ModuleCRUDPermission("sale_returns")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["customer", "sale"]
    search_fields = [
        "customer__name",
        "customer__contact",
        "note",
        "items__inventory__product__name",
    ]
    pagination_class = CustomPagination

    def _adjust_stock(self, inventory, quantity, operation="add"):
        qty = _d(quantity)
        current = _d(inventory.quantity)
        inventory.quantity = current + qty if operation == "add" else current - qty
        inventory.save()
        if operation == "subtract":
            from api.services.notifications import notify_low_stock_if_needed

            notify_low_stock_if_needed(inventory)

    def _validate_settlement(self, *, total, refunded, refund_account_id):
        total = _d(total)
        refunded = _d(refunded)
        if refunded < 0:
            return {"error": "Refunded amount cannot be negative."}
        if refunded > total:
            return {"error": "Refunded amount cannot exceed return total."}
        if refunded > 0:
            if not refund_account_id:
                return {"error": "Select a cash/bank account for the refund."}
            acc = AccountingAccount.objects.filter(
                pk=refund_account_id, is_active=True
            ).first()
            if not acc:
                return {"error": "Refund account not found."}
            if acc.role not in (
                AccountingAccount.Role.CASH,
                AccountingAccount.Role.BANK,
            ):
                return {"error": "Refund account must be a cash or bank account."}
        return None

    def _validate_and_build_lines(self, *, sale, items_data, exclude_return_id=None):
        if not items_data:
            return None, {"error": "Add at least one return line."}

        built = []
        for item_data in items_data:
            sale_item_id = item_data.get("sale_item") or item_data.get("sale_item_id")
            if not sale_item_id:
                return None, {"error": "Each return line must reference a sale_item."}

            sale_item = (
                SaleItems.objects.filter(
                    pk=sale_item_id, sale_id=sale.id, is_deleted=False
                )
                .select_related("inventory", "inventory__product")
                .first()
            )
            if not sale_item:
                return None, {
                    "error": f"Sale item {sale_item_id} does not belong to sale #{sale.id}."
                }

            inventory = sale_item.inventory
            product = inventory.product if inventory else None
            quantity = _d(
                item_data.get("quantity", item_data.get("grain_amount", 0))
            )
            if quantity <= 0:
                return None, {
                    "error": f"Return quantity required for sale item #{sale_item_id}."
                }

            remaining = remaining_for_sale_item(
                sale_item, exclude_return_id=exclude_return_id
            )
            if quantity > remaining:
                return None, {
                    "error": (
                        f"Return qty exceeds remaining for "
                        f"{product.name if product else 'item'} "
                        f"(sale item #{sale_item_id}). Remaining: {remaining}."
                    )
                }

            sale_price = _d(item_data.get("sale_price", sale_item.sale_price))
            built.append(
                {
                    "sale_item": sale_item,
                    "inventory": inventory,
                    "quantity": quantity,
                    "sale_price": sale_price,
                    "buy_price": sale_item.buy_price,
                    "note": str(item_data.get("note") or ""),
                }
            )
        return built, None

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        items_data = data.pop("items", [])
        sale_id = data.get("sale")
        sale = Sale.objects.filter(pk=sale_id, is_deleted=False).first()
        if not sale:
            return Response(
                {"error": "Original sale invoice is required and must exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not sale.customer_id:
            return Response(
                {"error": "Cannot return a sale without a customer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data["customer"] = sale.customer_id

        total = _d(data.get("total_amount", 0))
        refunded = _d(data.get("refunded_amount", 0))
        settle_err = self._validate_settlement(
            total=total,
            refunded=refunded,
            refund_account_id=data.get("refund_account"),
        )
        if settle_err:
            return Response(settle_err, status=status.HTTP_400_BAD_REQUEST)
        if refunded <= 0:
            data["refund_account"] = None

        lines, err = self._validate_and_build_lines(sale=sale, items_data=items_data)
        if err:
            return Response(err, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(customer_id=sale.customer_id)

        for line in lines:
            SaleReturnItem.objects.create(
                sale_return=doc,
                sale_item=line["sale_item"],
                inventory=line["inventory"],
                quantity=line["quantity"],
                sale_price=line["sale_price"],
                buy_price=line["buy_price"],
                note=line["note"],
            )
            self._adjust_stock(line["inventory"], line["quantity"], "add")

        from api.services.accounting.posting import sync_sale_return

        sync_sale_return(doc)

        return Response(
            self.get_serializer(doc).data,
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        doc = self.get_object()
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        items_data = data.pop("items", None)
        sale = doc.sale
        if getattr(sale, "is_deleted", False):
            return Response(
                {"error": "Original sale was deleted; this return cannot be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data["customer"] = sale.customer_id
        data["sale"] = sale.id

        total = _d(data.get("total_amount", doc.total_amount))
        refunded = _d(data.get("refunded_amount", doc.refunded_amount))
        refund_account = data.get("refund_account", doc.refund_account_id)
        settle_err = self._validate_settlement(
            total=total,
            refunded=refunded,
            refund_account_id=refund_account,
        )
        if settle_err:
            return Response(settle_err, status=status.HTTP_400_BAD_REQUEST)
        if refunded <= 0:
            data["refund_account"] = None

        if items_data is not None:
            lines, err = self._validate_and_build_lines(
                sale=sale, items_data=items_data, exclude_return_id=doc.id
            )
            if err:
                return Response(err, status=status.HTTP_400_BAD_REQUEST)

            for old in doc.items.select_related("inventory"):
                if old.inventory:
                    self._adjust_stock(old.inventory, old.quantity, "subtract")
            doc.items.all().delete()

            for line in lines:
                SaleReturnItem.objects.create(
                    sale_return=doc,
                    sale_item=line["sale_item"],
                    inventory=line["inventory"],
                    quantity=line["quantity"],
                    sale_price=line["sale_price"],
                    buy_price=line["buy_price"],
                    note=line["note"],
                )
                self._adjust_stock(line["inventory"], line["quantity"], "add")

        serializer = self.get_serializer(doc, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save()

        from api.services.accounting.posting import sync_sale_return

        sync_sale_return(doc)

        return Response(self.get_serializer(doc).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        doc = self.get_object()
        for item in doc.items.select_related("inventory"):
            if item.inventory:
                self._adjust_stock(item.inventory, item.quantity, "subtract")
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaleReturnableItemsMixin:
    @action(detail=True, methods=["get"], url_path="returnable-items")
    def returnable_items(self, request, pk=None):
        sale = self.get_object()
        rows = []
        for item in sale.sale_items.filter(is_deleted=False).select_related(
            "inventory", "inventory__product"
        ):
            remaining = remaining_for_sale_item(item)
            if remaining <= 0:
                continue
            inv = item.inventory
            product = inv.product if inv else None
            rows.append(
                {
                    "sale_item_id": item.id,
                    "inventory_id": inv.id if inv else None,
                    "product_name": product.name if product else None,
                    "product_details": {
                        "id": product.id,
                        "name": product.name,
                        "description": product.description,
                    }
                    if product
                    else None,
                    "sale_price": str(item.sale_price or 0),
                    "buy_price": str(item.buy_price or 0),
                    "sold_quantity": str(_d(item.quantity)),
                    "remaining_quantity": str(remaining),
                    "note": item.note,
                }
            )
        return Response(
            {
                "sale_id": sale.id,
                "customer_id": sale.customer_id,
                "customer_name": sale.customer.name if sale.customer else None,
                "sale_total": str(sale.total_amount or 0),
                "items": rows,
            }
        )
