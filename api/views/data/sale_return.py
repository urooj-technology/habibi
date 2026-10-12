from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework.response import Response

from api.models.accounting.account import AccountingAccount
from api.models.data.inventory import Inventory
from api.models.data.sale import Sale, SaleItems
from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.serializers.data.sale_return import SaleReturnSerializer
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination


def _d(value) -> Decimal:
    return Decimal(str(value)) if value is not None else Decimal("0")


def returned_qty_for_sale_item(sale_item_id: int, *, exclude_return_id: int | None = None) -> dict:
    """Sum of quantities already returned for a sale line (excluding one return doc)."""
    qs = SaleReturnItem.objects.filter(
        sale_item_id=sale_item_id,
        sale_return__is_deleted=False,
    )
    if exclude_return_id:
        qs = qs.exclude(sale_return_id=exclude_return_id)
    agg = qs.aggregate(
        weight=Sum("weight_amount"),
        meter=Sum("meter_amount"),
        khada=Sum("khada_amount"),
        grain=Sum("grain_amount"),
    )
    return {
        "weight": _d(agg["weight"]),
        "meter": _d(agg["meter"]),
        "khada": _d(agg["khada"]),
        "grain": _d(agg["grain"]),
    }


def remaining_for_sale_item(sale_item: SaleItems, *, exclude_return_id: int | None = None) -> dict:
    returned = returned_qty_for_sale_item(sale_item.id, exclude_return_id=exclude_return_id)
    return {
        "weight": max(_d(sale_item.weight_amount) - returned["weight"], Decimal("0")),
        "meter": max(_d(sale_item.meter_amount) - returned["meter"], Decimal("0")),
        "khada": max(_d(sale_item.khada_amount) - returned["khada"], Decimal("0")),
        "grain": max(_d(sale_item.grain_amount) - returned["grain"], Decimal("0")),
    }


class SaleReturnViewSet(DataRootViewSet):
    queryset = SaleReturn.objects.all().order_by("-id")
    serializer_class = SaleReturnSerializer
    permission_classes = [ModuleCRUDPermission("sale_returns")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["customer", "currency", "sale"]
    search_fields = [
        "customer__name",
        "customer__contact",
        "currency",
        "note",
        "items__inventory__product__name",
    ]
    pagination_class = CustomPagination

    def _normalize_quantities_for_product(
        self,
        *,
        product,
        weight_amount: Decimal,
        meter_amount: Decimal,
        khada_amount: Decimal,
        grain_amount: Decimal,
    ):
        flags = [
            getattr(product, "is_weight", False),
            getattr(product, "is_meter", False),
            getattr(product, "is_khada", False),
            getattr(product, "is_grain", False),
        ]
        active_count = sum(1 for f in flags if f)
        if active_count >= 2:
            return (
                weight_amount if getattr(product, "is_weight", False) else Decimal("0"),
                meter_amount if getattr(product, "is_meter", False) else Decimal("0"),
                khada_amount if getattr(product, "is_khada", False) else Decimal("0"),
                grain_amount if getattr(product, "is_grain", False) else Decimal("0"),
            )
        if getattr(product, "is_weight", False):
            return (weight_amount, Decimal("0"), Decimal("0"), Decimal("0"))
        if getattr(product, "is_meter", False):
            return (Decimal("0"), meter_amount, Decimal("0"), Decimal("0"))
        if getattr(product, "is_khada", False):
            return (Decimal("0"), Decimal("0"), khada_amount, Decimal("0"))
        if getattr(product, "is_grain", False):
            return (Decimal("0"), Decimal("0"), Decimal("0"), grain_amount)
        return (weight_amount, Decimal("0"), Decimal("0"), Decimal("0"))

    def _update_inventory(self, inventory, weight, meter, khada, grain, operation="add"):
        if operation == "subtract":
            inventory.weight_amount = _d(inventory.weight_amount) - weight
            inventory.meter_amount = _d(inventory.meter_amount) - meter
            inventory.khada_amount = _d(inventory.khada_amount) - khada
            inventory.grain_amount = _d(inventory.grain_amount) - grain
        else:
            inventory.weight_amount = _d(inventory.weight_amount) + weight
            inventory.meter_amount = _d(inventory.meter_amount) + meter
            inventory.khada_amount = _d(inventory.khada_amount) + khada
            inventory.grain_amount = _d(inventory.grain_amount) + grain
        inventory.save()
        if operation == "subtract":
            from api.services.notifications import notify_low_stock_if_needed

            notify_low_stock_if_needed(inventory)

    def _validate_settlement(self, *, total, refunded, refund_account_id, currency):
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
            if (acc.currency or "").upper() != (currency or "").upper():
                return {"error": "Refund account currency must match the return currency."}
        return None

    def _validate_and_build_lines(self, *, sale, items_data, exclude_return_id=None):
        """Validate return lines against original sale remaining quantities."""
        if not items_data:
            return None, {"error": "Add at least one return line."}

        built = []
        for item_data in items_data:
            sale_item_id = item_data.get("sale_item") or item_data.get("sale_item_id")
            if not sale_item_id:
                return None, {"error": "Each return line must reference a sale_item."}

            sale_item = SaleItems.objects.filter(
                pk=sale_item_id, sale_id=sale.id, is_deleted=False
            ).select_related("inventory", "inventory__product").first()
            if not sale_item:
                return None, {
                    "error": f"Sale item {sale_item_id} does not belong to sale #{sale.id}."
                }

            inventory = sale_item.inventory
            product = inventory.product if inventory else None
            weight = _d(item_data.get("weight_amount", 0))
            meter = _d(item_data.get("meter_amount", 0))
            khada = _d(item_data.get("khada_amount", 0))
            grain = _d(item_data.get("grain_amount", 0))
            weight, meter, khada, grain = self._normalize_quantities_for_product(
                product=product,
                weight_amount=weight,
                meter_amount=meter,
                khada_amount=khada,
                grain_amount=grain,
            )
            if weight <= 0 and meter <= 0 and khada <= 0 and grain <= 0:
                return None, {"error": f"Return quantity required for sale item #{sale_item_id}."}

            remaining = remaining_for_sale_item(
                sale_item, exclude_return_id=exclude_return_id
            )
            if (
                weight > remaining["weight"]
                or meter > remaining["meter"]
                or khada > remaining["khada"]
                or grain > remaining["grain"]
            ):
                return None, {
                    "error": (
                        f"Return qty exceeds remaining for {product.name if product else 'item'} "
                        f"(sale item #{sale_item_id}). "
                        f"Remaining W/M/K/G: {remaining['weight']}/{remaining['meter']}/"
                        f"{remaining['khada']}/{remaining['grain']}."
                    )
                }

            sale_price = _d(item_data.get("sale_price", sale_item.sale_price))
            pricing_base = item_data.get("pricing_base") or sale_item.pricing_base
            built.append(
                {
                    "sale_item": sale_item,
                    "inventory": inventory,
                    "weight_amount": weight,
                    "meter_amount": meter,
                    "khada_amount": khada,
                    "grain_amount": grain,
                    "sale_price": sale_price,
                    "buy_price": sale_item.buy_price,
                    "buy_currency": sale_item.buy_currency or "AFN",
                    "pricing_base": pricing_base,
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
        data["currency"] = sale.currency
        if not data.get("exchange_rate"):
            data["exchange_rate"] = sale.exchange_rate

        total = _d(data.get("total_amount", 0))
        refunded = _d(data.get("refunded_amount", 0))
        settle_err = self._validate_settlement(
            total=total,
            refunded=refunded,
            refund_account_id=data.get("refund_account"),
            currency=sale.currency,
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
        doc = serializer.save(
            customer_id=sale.customer_id,
            currency=sale.currency,
            exchange_rate=_d(data.get("exchange_rate", sale.exchange_rate)),
        )

        for line in lines:
            SaleReturnItem.objects.create(
                sale_return=doc,
                sale_item=line["sale_item"],
                inventory=line["inventory"],
                weight_amount=line["weight_amount"],
                meter_amount=line["meter_amount"],
                khada_amount=line["khada_amount"],
                grain_amount=line["grain_amount"],
                sale_price=line["sale_price"],
                buy_price=line["buy_price"],
                buy_currency=line["buy_currency"],
                pricing_base=line["pricing_base"],
                note=line["note"],
            )
            self._update_inventory(
                line["inventory"],
                line["weight_amount"],
                line["meter_amount"],
                line["khada_amount"],
                line["grain_amount"],
                "add",
            )

        # Re-sync GL after items exist
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
        data["currency"] = sale.currency
        data["sale"] = sale.id

        total = _d(data.get("total_amount", doc.total_amount))
        refunded = _d(data.get("refunded_amount", doc.refunded_amount))
        refund_account = data.get("refund_account", doc.refund_account_id)
        settle_err = self._validate_settlement(
            total=total,
            refunded=refunded,
            refund_account_id=refund_account,
            currency=sale.currency,
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

            # Roll back inventory from previous return lines
            for old in doc.items.select_related("inventory"):
                if old.inventory:
                    self._update_inventory(
                        old.inventory,
                        _d(old.weight_amount),
                        _d(old.meter_amount),
                        _d(old.khada_amount),
                        _d(old.grain_amount),
                        "subtract",
                    )
            doc.items.all().delete()

            for line in lines:
                SaleReturnItem.objects.create(
                    sale_return=doc,
                    sale_item=line["sale_item"],
                    inventory=line["inventory"],
                    weight_amount=line["weight_amount"],
                    meter_amount=line["meter_amount"],
                    khada_amount=line["khada_amount"],
                    grain_amount=line["grain_amount"],
                    sale_price=line["sale_price"],
                    buy_price=line["buy_price"],
                    buy_currency=line["buy_currency"],
                    pricing_base=line["pricing_base"],
                    note=line["note"],
                )
                self._update_inventory(
                    line["inventory"],
                    line["weight_amount"],
                    line["meter_amount"],
                    line["khada_amount"],
                    line["grain_amount"],
                    "add",
                )

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
                self._update_inventory(
                    item.inventory,
                    _d(item.weight_amount),
                    _d(item.meter_amount),
                    _d(item.khada_amount),
                    _d(item.grain_amount),
                    "subtract",
                )
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaleReturnableItemsMixin:
    """Mixin to attach returnable-items action onto SaleViewSet."""

    @action(detail=True, methods=["get"], url_path="returnable-items")
    def returnable_items(self, request, pk=None):
        sale = self.get_object()
        rows = []
        for item in sale.sale_items.filter(is_deleted=False).select_related(
            "inventory", "inventory__product"
        ):
            remaining = remaining_for_sale_item(item)
            if (
                remaining["weight"] <= 0
                and remaining["meter"] <= 0
                and remaining["khada"] <= 0
                and remaining["grain"] <= 0
            ):
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
                        "is_weight": product.is_weight,
                        "is_meter": product.is_meter,
                        "is_khada": product.is_khada,
                        "is_grain": product.is_grain,
                    }
                    if product
                    else None,
                    "thickness": inv.thickness if inv else None,
                    "sale_price": str(item.sale_price or 0),
                    "buy_price": str(item.buy_price or 0),
                    "buy_currency": item.buy_currency,
                    "pricing_base": item.pricing_base,
                    "sold": {
                        "weight": str(_d(item.weight_amount)),
                        "meter": str(_d(item.meter_amount)),
                        "khada": str(_d(item.khada_amount)),
                        "grain": str(_d(item.grain_amount)),
                    },
                    "remaining": {k: str(v) for k, v in remaining.items()},
                    "note": item.note,
                }
            )
        return Response(
            {
                "sale_id": sale.id,
                "customer_id": sale.customer_id,
                "customer_name": sale.customer.name if sale.customer else None,
                "currency": sale.currency,
                "exchange_rate": str(sale.exchange_rate or 0),
                "sale_total": str(sale.total_amount or 0),
                "items": rows,
            }
        )
