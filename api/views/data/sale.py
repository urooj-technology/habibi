from decimal import Decimal

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from account.permissions import ModuleCRUDPermission
from api.filters.sale_filters import SaleFilter
from api.models.data.inventory import Inventory
from api.models.data.sale import Sale, SaleItems
from api.serializers.data.sale import SaleSerializer
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination
from api.views.data.sale_return import SaleReturnableItemsMixin


class SaleViewSet(SaleReturnableItemsMixin, DataRootViewSet):
    queryset = Sale.objects.all().order_by("-id")
    serializer_class = SaleSerializer
    permission_classes = [ModuleCRUDPermission("sales")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = SaleFilter
    search_fields = [
        "customer__name",
        "customer__contact",
        "sale_items__inventory__product__name",
        "sale_items__note",
    ]
    pagination_class = CustomPagination

    def filter_queryset(self, queryset):
        search = (self.request.query_params.get("search") or "").strip()
        pk_lookup = None
        if search:
            stripped = search.lstrip("#").strip()
            if stripped.isdigit():
                try:
                    pk_lookup = int(stripped)
                except (ValueError, OverflowError):
                    pk_lookup = None
        filtered = super().filter_queryset(queryset)
        if pk_lookup is not None:
            by_id = queryset.filter(pk=pk_lookup)
            return (filtered | by_id).distinct()
        return filtered

    def _d(self, value):
        return Decimal(str(value)) if value is not None else Decimal("0")

    def _normalize_optional_customer(self, data):
        """Allow blank / empty customer for walk-in POS sales."""
        try:
            mutable = data.copy()
        except Exception:
            mutable = dict(data)
        customer = mutable.get("customer")
        if customer in ("", None, "null", "undefined"):
            mutable["customer"] = None
        return mutable

    def _validate_walk_in_settlement(self, *, customer, total, received):
        """
        Walk-in (no customer): unpaid balance is not allowed — pay in full
        or attach a customer for credit.
        """
        if customer not in (None, "", 0, "0"):
            return None
        total_d = self._d(total)
        received_d = self._d(received)
        if total_d > 0 and received_d < total_d:
            return {
                "error": (
                    "Walk-in sales must be paid in full, or select a customer "
                    "to record on account."
                )
            }
        return None

    def _line_qty(self, item_data):
        return self._d(item_data.get("quantity", item_data.get("grain_amount", 0)))

    def _check_stock(self, inventory, quantity):
        available = self._d(inventory.quantity)
        if available < quantity:
            return {
                "error": (
                    f"Insufficient stock for {inventory.product.name}. "
                    f"Available: {available}, required: {quantity}"
                )
            }
        return None

    def _adjust_stock(self, inventory, quantity, operation="subtract"):
        qty = self._d(quantity)
        current = self._d(inventory.quantity)
        inventory.quantity = current - qty if operation == "subtract" else current + qty
        inventory.save()
        if operation == "subtract":
            from api.services.notifications import notify_low_stock_if_needed

            notify_low_stock_if_needed(inventory)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        sale_data = self._normalize_optional_customer(request.data)
        sale_items_data = sale_data.pop("items", [])

        walk_err = self._validate_walk_in_settlement(
            customer=sale_data.get("customer"),
            total=sale_data.get("total_amount"),
            received=sale_data.get("received_amount"),
        )
        if walk_err:
            return Response(walk_err, status=status.HTTP_400_BAD_REQUEST)

        sale_serializer = self.get_serializer(data=sale_data)
        sale_serializer.is_valid(raise_exception=True)
        sale = sale_serializer.save()

        for item_data in sale_items_data:
            inventory = Inventory.objects.filter(id=item_data.get("inventory")).first()
            if not inventory:
                return Response(
                    {"error": f"Inventory with ID {item_data.get('inventory')} not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            quantity = self._line_qty(item_data)
            sale_price = self._d(item_data.get("sale_price", 0))

            stock_error = self._check_stock(inventory, quantity)
            if stock_error:
                return Response(stock_error, status=status.HTTP_400_BAD_REQUEST)

            SaleItems.objects.create(
                sale=sale,
                inventory=inventory,
                quantity=quantity,
                sale_price=sale_price,
                buy_price=inventory.buy_price or Decimal("0"),
            )
            self._adjust_stock(inventory, quantity, "subtract")

        return Response(
            {"detail": "Sale created successfully."},
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        from api.models.data.sale_return import SaleReturnItem
        from api.views.data.sale_return import returned_qty_for_sale_item

        sale = self.get_object()
        sale_data = self._normalize_optional_customer(request.data)
        sale_items_data = sale_data.pop("items", None)

        walk_err = self._validate_walk_in_settlement(
            customer=sale_data.get("customer", sale.customer_id),
            total=sale_data.get("total_amount", sale.total_amount),
            received=sale_data.get("received_amount", sale.received_amount),
        )
        if walk_err:
            return Response(walk_err, status=status.HTTP_400_BAD_REQUEST)

        sale_serializer = self.get_serializer(sale, data=sale_data, partial=True)
        sale_serializer.is_valid(raise_exception=True)
        sale = sale_serializer.save()

        if sale_items_data is None:
            return Response({"detail": "Sale updated successfully."}, status=status.HTTP_200_OK)

        if not isinstance(sale_items_data, list):
            return Response(
                {"error": "items must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_items = {item.id: item for item in sale.sale_items.all()}
        kept_ids: set[int] = set()

        def _has_returns(sale_item_id: int) -> bool:
            return SaleReturnItem.objects.filter(
                sale_item_id=sale_item_id,
                sale_return__is_deleted=False,
            ).exists()

        for item_data in sale_items_data:
            inventory = Inventory.objects.filter(id=item_data.get("inventory")).first()
            if not inventory:
                return Response(
                    {"error": f"Inventory with ID {item_data.get('inventory')} not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            quantity = self._line_qty(item_data)
            sale_price = self._d(item_data.get("sale_price", 0))

            raw_id = item_data.get("id") or item_data.get("sale_item_id")
            try:
                item_id = int(raw_id) if raw_id not in (None, "") else None
            except (TypeError, ValueError):
                item_id = None

            old_item = existing_items.get(item_id) if item_id else None

            if old_item is not None:
                if _has_returns(old_item.id):
                    if old_item.inventory_id != inventory.id:
                        return Response(
                            {
                                "error": (
                                    f"Cannot change product on sale item #{old_item.id} "
                                    "because it has sales returns."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    returned = returned_qty_for_sale_item(old_item.id)
                    if quantity < returned:
                        return Response(
                            {
                                "error": (
                                    f"Cannot reduce sale item #{old_item.id} below "
                                    f"returned quantity ({returned})."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                old_inv = Inventory.objects.filter(id=old_item.inventory_id).first()
                if old_inv:
                    self._adjust_stock(old_inv, old_item.quantity, "add")
                    if old_inv.id == inventory.id:
                        inventory.refresh_from_db()

                stock_error = self._check_stock(inventory, quantity)
                if stock_error:
                    return Response(stock_error, status=status.HTTP_400_BAD_REQUEST)

                old_item.inventory = inventory
                old_item.quantity = quantity
                old_item.sale_price = sale_price
                old_item.buy_price = inventory.buy_price or Decimal("0")
                old_item.save()
                self._adjust_stock(inventory, quantity, "subtract")
                kept_ids.add(old_item.id)
                continue

            stock_error = self._check_stock(inventory, quantity)
            if stock_error:
                return Response(stock_error, status=status.HTTP_400_BAD_REQUEST)

            SaleItems.objects.create(
                sale=sale,
                inventory=inventory,
                quantity=quantity,
                sale_price=sale_price,
                buy_price=inventory.buy_price or Decimal("0"),
            )
            self._adjust_stock(inventory, quantity, "subtract")

        for item_id, old_item in existing_items.items():
            if item_id in kept_ids:
                continue
            if _has_returns(item_id):
                return Response(
                    {
                        "error": (
                            f"Cannot remove sale item #{item_id} because it has "
                            "sales returns linked to it."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            inv = Inventory.objects.filter(id=old_item.inventory_id).first()
            if inv:
                self._adjust_stock(inv, old_item.quantity, "add")
            old_item.delete()

        return Response(
            {"detail": "Sale updated successfully."},
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        from api.models.data.sale_return import SaleReturn

        sale = self.get_object()
        if SaleReturn.objects.filter(sale_id=sale.id, is_deleted=False).exists():
            return Response(
                {
                    "error": (
                        "Cannot delete this sale because it has sales returns. "
                        "Delete the returns first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in sale.sale_items.all():
            inv = Inventory.objects.filter(id=item.inventory_id).first()
            if inv:
                self._adjust_stock(inv, item.quantity, "add")

        sale.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
