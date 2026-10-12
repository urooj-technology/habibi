from collections import defaultdict
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from account.permissions import ModuleCRUDPermission
from api.models.data.inventory import Inventory
from api.models.data.product import Product
from api.models.data.purchase import Purchase, PurchaseItem
from api.serializers.data.purchase import PurchaseSerializer
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination


class PurchaseViewSet(DataRootViewSet):
    queryset = Purchase.objects.all().order_by("-id")
    serializer_class = PurchaseSerializer
    permission_classes = [ModuleCRUDPermission("purchases")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["supplier", "purchase_date"]
    search_fields = ["supplier__name"]
    pagination_class = CustomPagination

    def safe_decimal(self, value):
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return Decimal("0")

    def _normalize_optional_supplier(self, data):
        """Allow blank / empty supplier for walk-in cash purchases."""
        try:
            mutable = data.copy()
        except Exception:
            mutable = dict(data)
        supplier = mutable.get("supplier")
        if supplier in ("", None, "null", "undefined"):
            mutable["supplier"] = None
        return mutable

    def _validate_walk_in_settlement(self, *, supplier, total, received):
        """
        No supplier: unpaid balance is not allowed — pay in full
        or attach a supplier for credit (AP).
        """
        if supplier not in (None, "", 0, "0"):
            return None
        total_d = self.safe_decimal(total)
        received_d = self.safe_decimal(received)
        if total_d > 0 and received_d < total_d:
            return {
                "detail": (
                    "Purchases without a supplier must be paid in full, "
                    "or select a supplier to record on account."
                )
            }
        return None

    def _line_qty(self, item_data):
        return self.safe_decimal(
            item_data.get("quantity", item_data.get("grain_amount", 0))
        )

    def calculate_average_buy_price(self, inventory, net_qty, buy_price):
        existing_qty = (
            Decimal(str(inventory.quantity or 0)) if inventory else Decimal("0")
        )
        existing_value = (
            (inventory.buy_price * existing_qty)
            if inventory and inventory.buy_price
            else Decimal("0")
        )
        new_value = buy_price * net_qty
        total_qty = existing_qty + net_qty
        total_value = existing_value + new_value
        if total_qty > 0:
            return total_value / total_qty
        return buy_price

    def _apply_inventory_change(self, product_id, quantity, buy_price, old_item=None):
        inventory = Inventory.objects.filter(product_id=product_id).first()
        old_qty = self.safe_decimal(old_item.quantity) if old_item else Decimal("0")
        net_qty = quantity - old_qty

        average_price = self.calculate_average_buy_price(inventory, net_qty, buy_price)

        if inventory:
            inventory.quantity = self.safe_decimal(inventory.quantity) + net_qty
            inventory.buy_price = average_price
        else:
            inventory = Inventory(
                product_id=product_id,
                quantity=quantity,
                buy_price=average_price,
            )
        inventory.save()

        from api.services.notifications import notify_low_stock_if_needed

        notify_low_stock_if_needed(inventory)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            purchase_data = self._normalize_optional_supplier(request.data)
            purchase_items_data = purchase_data.get("items", [])

            walk_err = self._validate_walk_in_settlement(
                supplier=purchase_data.get("supplier"),
                total=purchase_data.get("total_amount"),
                received=purchase_data.get("received_amount"),
            )
            if walk_err:
                return Response(walk_err, status=status.HTTP_400_BAD_REQUEST)

            purchase_serializer = self.get_serializer(data=purchase_data)
            purchase_serializer.is_valid(raise_exception=True)
            purchase = purchase_serializer.save()

            for item_data in purchase_items_data:
                product_id = item_data.get("product")
                Product.objects.get(id=product_id)
                quantity = self._line_qty(item_data)
                buy_price = self.safe_decimal(item_data.get("buy_price", 0))

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product_id=product_id,
                    quantity=quantity,
                    buy_price=buy_price,
                )
                self._apply_inventory_change(product_id, quantity, buy_price)

            return Response(
                {"detail": "Purchase created successfully."},
                status=status.HTTP_201_CREATED,
            )
        except InvalidOperation:
            return Response(
                {"detail": "Invalid number format in the request data."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        try:
            purchase = self.get_object()
            purchase_data = self._normalize_optional_supplier(request.data)
            purchase_items_data = purchase_data.get("items", [])

            walk_err = self._validate_walk_in_settlement(
                supplier=purchase_data.get("supplier", purchase.supplier_id),
                total=purchase_data.get("total_amount", purchase.total_amount),
                received=purchase_data.get(
                    "received_amount", purchase.received_amount
                ),
            )
            if walk_err:
                return Response(walk_err, status=status.HTTP_400_BAD_REQUEST)

            purchase_serializer = self.get_serializer(
                purchase, data=purchase_data, partial=True
            )
            purchase_serializer.is_valid(raise_exception=True)
            purchase = purchase_serializer.save()

            old_item_queues = defaultdict(list)
            for item in purchase.purchase_items.all():
                old_item_queues[item.product_id].append(item)
            purchase.purchase_items.all().delete()

            for item_data in purchase_items_data:
                product_id = item_data.get("product")
                Product.objects.get(id=product_id)
                quantity = self._line_qty(item_data)
                buy_price = self.safe_decimal(item_data.get("buy_price", 0))

                old_item = (
                    old_item_queues[product_id].pop(0)
                    if old_item_queues[product_id]
                    else None
                )

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product_id=product_id,
                    quantity=quantity,
                    buy_price=buy_price,
                )
                self._apply_inventory_change(product_id, quantity, buy_price, old_item)

            for product_id, leftovers in list(old_item_queues.items()):
                for leftover in leftovers:
                    self._apply_inventory_change(
                        product_id,
                        Decimal("0"),
                        leftover.buy_price or Decimal("0"),
                        leftover,
                    )

            return Response(
                {"detail": "Purchase updated successfully."},
                status=status.HTTP_200_OK,
            )
        except InvalidOperation:
            return Response(
                {"detail": "Invalid number format in the request data."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
