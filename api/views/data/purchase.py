from collections import defaultdict
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from account.permissions import ModuleCRUDPermission
from api.models.accounting.account import AccountingAccount
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
        except (InvalidOperation, ValueError, TypeError):
            return Decimal("0")

    def _bad_request(self, payload):
        """Return 400 and ensure the surrounding atomic block rolls back."""
        transaction.set_rollback(True)
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

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

    def _validate_payment_account(self, *, received, payment_account_id):
        received_d = self.safe_decimal(received)
        if received_d <= 0:
            return None
        if not payment_account_id:
            return {"detail": "Select a cash/bank account for the payment."}
        acc = AccountingAccount.objects.filter(
            pk=payment_account_id, is_active=True
        ).first()
        if not acc:
            return {"detail": "Payment account not found."}
        if acc.role not in (
            AccountingAccount.Role.CASH,
            AccountingAccount.Role.BANK,
        ):
            return {"detail": "Payment account must be a cash or bank account."}
        return None

    def _line_sell_price(self, item_data):
        """Optional sell price on a purchase line; None when not provided."""
        raw = item_data.get("sell_price")
        if raw is None or str(raw).strip() == "":
            return None
        value = self.safe_decimal(raw)
        if value < 0:
            raise ValueError("Sell price cannot be negative.")
        return value

    def _apply_sell_price(self, product_id, sell_price):
        if sell_price is None:
            return
        Inventory.objects.filter(product_id=product_id, is_deleted=False).update(
            sell_price=sell_price
        )

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

    def _locked_inventory(self, product_id):
        return (
            Inventory.objects.select_for_update()
            .filter(product_id=product_id, is_deleted=False)
            .first()
        )

    def _apply_inventory_change(self, product_id, quantity, buy_price, old_item=None):
        """
        Apply purchase line qty/price to inventory.
        Returns an error dict on failure, else None.
        """
        inventory = self._locked_inventory(product_id)
        old_qty = self.safe_decimal(old_item.quantity) if old_item else Decimal("0")
        old_price = (
            self.safe_decimal(old_item.buy_price) if old_item else Decimal("0")
        )
        quantity = self.safe_decimal(quantity)
        buy_price = self.safe_decimal(buy_price)
        net_qty = quantity - old_qty

        # Buy-price-only edit: revalue average cost without changing qty.
        if old_item is not None and net_qty == 0 and buy_price != old_price:
            if inventory:
                existing_qty = self.safe_decimal(inventory.quantity)
                if existing_qty > 0:
                    existing_value = (
                        self.safe_decimal(inventory.buy_price) * existing_qty
                    )
                    adjusted = existing_value - (old_price * old_qty) + (
                        buy_price * old_qty
                    )
                    inventory.buy_price = adjusted / existing_qty
                    inventory.save()
            return None

        if inventory:
            new_qty = self.safe_decimal(inventory.quantity) + net_qty
            if new_qty < 0:
                product_name = getattr(
                    getattr(inventory, "product", None), "name", product_id
                )
                return {
                    "detail": (
                        f"Cannot reduce stock for {product_name} below zero "
                        f"(on hand: {inventory.quantity}, change: {net_qty}). "
                        "Units may already have been sold."
                    )
                }
            average_price = self.calculate_average_buy_price(
                inventory, net_qty, buy_price
            )
            inventory.quantity = new_qty
            inventory.buy_price = average_price
        else:
            if net_qty < 0:
                return {
                    "detail": (
                        f"Cannot reduce stock for product {product_id}: "
                        "no inventory record exists."
                    )
                }
            if quantity <= 0:
                return None
            average_price = buy_price
            inventory = Inventory(
                product_id=product_id,
                quantity=quantity,
                buy_price=average_price,
            )

        inventory.save()

        from api.services.notifications import notify_low_stock_if_needed

        notify_low_stock_if_needed(inventory)
        return None

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            purchase_data = self._normalize_optional_supplier(request.data)
            purchase_items_data = purchase_data.pop("items", [])

            walk_err = self._validate_walk_in_settlement(
                supplier=purchase_data.get("supplier"),
                total=purchase_data.get("total_amount"),
                received=purchase_data.get("received_amount"),
            )
            if walk_err:
                return self._bad_request(walk_err)

            pay_err = self._validate_payment_account(
                received=purchase_data.get("received_amount"),
                payment_account_id=purchase_data.get("payment_account"),
            )
            if pay_err:
                return self._bad_request(pay_err)

            if self.safe_decimal(purchase_data.get("received_amount")) <= 0:
                purchase_data["payment_account"] = None

            purchase_serializer = self.get_serializer(data=purchase_data)
            purchase_serializer.is_valid(raise_exception=True)
            purchase = purchase_serializer.save()

            for item_data in purchase_items_data:
                product_id = item_data.get("product")
                Product.objects.get(id=product_id)
                quantity = self._line_qty(item_data)
                buy_price = self.safe_decimal(item_data.get("buy_price", 0))
                sell_price = self._line_sell_price(item_data)

                if quantity <= 0:
                    return self._bad_request(
                        {
                            "detail": (
                                "Each purchase line must have quantity "
                                "greater than zero."
                            )
                        }
                    )

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product_id=product_id,
                    quantity=quantity,
                    buy_price=buy_price,
                    sell_price=sell_price,
                )
                inv_err = self._apply_inventory_change(
                    product_id, quantity, buy_price
                )
                if inv_err:
                    return self._bad_request(inv_err)
                self._apply_sell_price(product_id, sell_price)

            return Response(
                {"detail": "Purchase created successfully."},
                status=status.HTTP_201_CREATED,
            )
        except InvalidOperation:
            return self._bad_request(
                {"detail": "Invalid number format in the request data."}
            )
        except ValueError as e:
            return self._bad_request({"detail": str(e)})
        except Exception as e:
            transaction.set_rollback(True)
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        try:
            purchase = self.get_object()
            purchase_data = self._normalize_optional_supplier(request.data)
            # None = leave lines unchanged; missing key must NOT wipe items.
            purchase_items_data = purchase_data.pop("items", None)

            walk_err = self._validate_walk_in_settlement(
                supplier=purchase_data.get("supplier", purchase.supplier_id),
                total=purchase_data.get("total_amount", purchase.total_amount),
                received=purchase_data.get(
                    "received_amount", purchase.received_amount
                ),
            )
            if walk_err:
                return self._bad_request(walk_err)

            received_for_pay = purchase_data.get(
                "received_amount", purchase.received_amount
            )
            payment_account_id = purchase_data.get(
                "payment_account", purchase.payment_account_id
            )
            pay_err = self._validate_payment_account(
                received=received_for_pay,
                payment_account_id=payment_account_id,
            )
            if pay_err:
                return self._bad_request(pay_err)

            if self.safe_decimal(received_for_pay) <= 0:
                purchase_data["payment_account"] = None

            purchase_serializer = self.get_serializer(
                purchase, data=purchase_data, partial=True
            )
            purchase_serializer.is_valid(raise_exception=True)
            purchase = purchase_serializer.save()

            if purchase_items_data is None:
                return Response(
                    {"detail": "Purchase updated successfully."},
                    status=status.HTTP_200_OK,
                )

            if not isinstance(purchase_items_data, list):
                return self._bad_request({"detail": "items must be a list."})

            old_item_queues = defaultdict(list)
            for item in purchase.purchase_items.all():
                old_item_queues[item.product_id].append(item)
            purchase.purchase_items.all().delete()

            for item_data in purchase_items_data:
                product_id = item_data.get("product")
                Product.objects.get(id=product_id)
                quantity = self._line_qty(item_data)
                buy_price = self.safe_decimal(item_data.get("buy_price", 0))
                sell_price = self._line_sell_price(item_data)

                if quantity <= 0:
                    return self._bad_request(
                        {
                            "detail": (
                                "Each purchase line must have quantity "
                                "greater than zero."
                            )
                        }
                    )

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
                    sell_price=sell_price,
                )
                inv_err = self._apply_inventory_change(
                    product_id, quantity, buy_price, old_item
                )
                if inv_err:
                    return self._bad_request(inv_err)
                self._apply_sell_price(product_id, sell_price)

            for product_id, leftovers in list(old_item_queues.items()):
                for leftover in leftovers:
                    inv_err = self._apply_inventory_change(
                        product_id,
                        Decimal("0"),
                        leftover.buy_price or Decimal("0"),
                        leftover,
                    )
                    if inv_err:
                        return self._bad_request(inv_err)

            return Response(
                {"detail": "Purchase updated successfully."},
                status=status.HTTP_200_OK,
            )
        except InvalidOperation:
            return self._bad_request(
                {"detail": "Invalid number format in the request data."}
            )
        except ValueError as e:
            return self._bad_request({"detail": str(e)})
        except Exception as e:
            transaction.set_rollback(True)
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        try:
            purchase = self.get_object()
            for item in purchase.purchase_items.all():
                inv_err = self._apply_inventory_change(
                    item.product_id,
                    Decimal("0"),
                    item.buy_price or Decimal("0"),
                    item,
                )
                if inv_err:
                    return self._bad_request(inv_err)

            purchase.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            return self._bad_request({"detail": str(e)})

