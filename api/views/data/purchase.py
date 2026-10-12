# api/views/data/purchase.py
from collections import defaultdict

from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from rest_framework import status
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal, InvalidOperation

from api.serializers.data.purchase import PurchaseSerializer
from api.models.data.purchase import Purchase, PurchaseItem
from api.models.data.inventory import Inventory
from api.models.data.product import Product
from api.views.data.pagination import CustomPagination
from api.views.data.base import DataRootViewSet


def normalize_purchase_thickness(value):
    """Canonical string for product + thickness so stock rows match across lines."""
    if value is None:
        return ""
    s = str(value).strip()
    if s == "":
        return ""
    try:
        d = Decimal(s).quantize(Decimal("0.01"))
        return format(d, "f")
    except (InvalidOperation, ValueError):
        return s


def thickness_key_to_model_value(thickness_key):
    """PurchaseItem uses Decimal; empty thickness is stored as NULL."""
    if thickness_key == "":
        return None
    return Decimal(thickness_key)


class PurchaseViewSet(DataRootViewSet):
    queryset = Purchase.objects.all().order_by("-id")
    serializer_class = PurchaseSerializer
    permission_classes = [ModuleCRUDPermission("purchases")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["supplier", "currency", "purchase_date"]
    search_fields = ["supplier__name", "currency"]
    pagination_class = CustomPagination

    def calculate_average_buy_price(self, product, inventory, new_item):
        """
        Weighted average unit cost using the line's runtime pricing_base qty
        (falls back to product flags when unset).
        Returns (new_average_price, total_amount_in_pricing_unit, pricing_base).
        """
        amount_by_unit = {
            "weight": "weight_amount",
            "meter": "meter_amount",
            "khada": "khada_amount",
            "grain": "grain_amount",
        }
        units = []
        if product.is_weight:
            units.append("weight")
        if product.is_meter:
            units.append("meter")
        if product.is_khada:
            units.append("khada")
        if product.is_grain:
            units.append("grain")

        # Prefer existing inventory cost unit so dual-unit stock stays consistent.
        existing_base = (
            (getattr(inventory, "buy_pricing_base", None) or "").strip()
            if inventory
            else ""
        )
        pricing_base = new_item.get("pricing_base") or existing_base or None
        if pricing_base not in amount_by_unit or (units and pricing_base not in units):
            if existing_base in amount_by_unit and (
                not units or existing_base in units
            ):
                pricing_base = existing_base
            elif len(units) == 1:
                pricing_base = units[0]
            elif "weight" in units:
                pricing_base = "weight"
            elif units:
                pricing_base = units[0]
            else:
                pricing_base = "weight"

        measurement_field = amount_by_unit[pricing_base]

        existing_amount = (
            Decimal(str(inventory.__dict__.get(measurement_field) or "0"))
            if inventory
            else Decimal("0")
        )
        existing_price = (
            (inventory.buy_price * existing_amount)
            if inventory and inventory.buy_price
            else Decimal("0")
        )

        new_amount = Decimal(str(new_item.get(measurement_field) or "0"))
        new_price = Decimal(str(new_item.get("buy_price") or "0")) * new_amount

        total_amount = existing_amount + new_amount
        total_price = existing_price + new_price

        if total_amount > 0:
            average_price = total_price / total_amount
        else:
            average_price = Decimal(str(new_item.get("buy_price") or "0"))

        return (average_price, total_amount, pricing_base)

    def _apply_inventory_line_change(
        self,
        product,
        product_id,
        thickness_key,
        weight_amount,
        meter_amount,
        khada_amount,
        grain_amount,
        buy_price,
        old_item,
        pricing_base=None,
    ):
        """Update inventory for one purchase line vs optional previous line (purchase edit)."""
        inventory = Inventory.objects.filter(
            product_id=product_id, thickness=thickness_key, currency=(self.request.data.get("currency") or "AFN")
        ).first()

        net_weight = weight_amount - (
            old_item.weight_amount if old_item else Decimal("0")
        )
        net_meter = meter_amount - (
            old_item.meter_amount if old_item else Decimal("0")
        )
        net_khada = khada_amount - (
            old_item.khada_amount if old_item else Decimal("0")
        )
        net_grain = grain_amount - (
            old_item.grain_amount if old_item else Decimal("0")
        )

        average_price, total_amount, cost_base = self.calculate_average_buy_price(
            product,
            inventory,
            {
                "weight_amount": net_weight,
                "meter_amount": net_meter,
                "khada_amount": net_khada,
                "grain_amount": net_grain,
                "buy_price": buy_price,
                "pricing_base": pricing_base
                or (getattr(old_item, "pricing_base", None) if old_item else None),
            },
        )

        if inventory:
            inventory.weight_amount = (
                inventory.weight_amount or Decimal("0")
            ) + net_weight
            inventory.meter_amount = (
                inventory.meter_amount or Decimal("0")
            ) + net_meter
            inventory.khada_amount = (
                inventory.khada_amount or Decimal("0")
            ) + net_khada
            inventory.grain_amount = (
                inventory.grain_amount or Decimal("0")
            ) + net_grain
            inventory.buy_price = average_price
            inventory.buy_pricing_base = cost_base or inventory.buy_pricing_base or ""
        else:
            inventory = Inventory(
                product_id=product_id,
                currency=(self.request.data.get("currency") or "AFN"),
                thickness=thickness_key,
                weight_amount=weight_amount,
                meter_amount=meter_amount,
                khada_amount=khada_amount,
                grain_amount=grain_amount,
                buy_price=average_price,
                buy_pricing_base=cost_base or "",
            )
        inventory.save()
        from api.services.notifications import notify_low_stock_if_needed

        notify_low_stock_if_needed(inventory)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            purchase_data = request.data
            purchase_items_data = purchase_data.get("items", [])
            received_amount = self.safe_decimal(purchase_data.get("received_amount", 0))
            exchange_rate = self.safe_decimal(purchase_data.get("exchange_rate", 1))
            currency = purchase_data.get("currency")
            if (currency or "").upper() == "USD" and exchange_rate <= 0:
                return Response(
                    {"detail": "Exchange rate is required for USD purchases."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            purchase_serializer = self.get_serializer(data=purchase_data)
            purchase_serializer.is_valid(raise_exception=True)
            purchase = purchase_serializer.save()

            for item_data in purchase_items_data:
                product_id = item_data.get("product")
                product = Product.objects.get(id=product_id)
                weight_amount = self.safe_decimal(item_data.get("weight_amount", 0))
                meter_amount = self.safe_decimal(item_data.get("meter_amount", 0))
                khada_amount = self.safe_decimal(item_data.get("khada_amount", 0))
                grain_amount = self.safe_decimal(item_data.get("grain_amount", 0))
                buy_price = self.safe_decimal(item_data.get("buy_price", 0))
                pricing_base = item_data.get("pricing_base") or None
                thickness_key = normalize_purchase_thickness(
                    item_data.get("thickness")
                )

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product_id=product_id,
                    thickness=thickness_key_to_model_value(thickness_key),
                    weight_amount=weight_amount,
                    meter_amount=meter_amount,
                    khada_amount=khada_amount,
                    grain_amount=grain_amount,
                    buy_price=buy_price,
                    pricing_base=pricing_base,
                )

                self._apply_inventory_line_change(
                    product,
                    product_id,
                    thickness_key,
                    weight_amount,
                    meter_amount,
                    khada_amount,
                    grain_amount,
                    buy_price,
                    None,
                    pricing_base,
                )

            return Response(
                {"detail": "✅ Purchase created successfully with items!"},
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
            purchase_data = request.data
            purchase_items_data = purchase_data.get("items", [])
            received_amount = self.safe_decimal(purchase_data.get("received_amount", 0))
            exchange_rate = self.safe_decimal(purchase_data.get("exchange_rate", 1))
            currency = purchase_data.get("currency")
            if (currency or "").upper() == "USD" and exchange_rate <= 0:
                return Response(
                    {"detail": "Exchange rate is required for USD purchases."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            purchase_serializer = self.get_serializer(
                purchase, data=purchase_data, partial=True
            )
            purchase_serializer.is_valid(raise_exception=True)
            purchase = purchase_serializer.save()

            old_item_queues = defaultdict(list)
            for item in purchase.purchase_items.all():
                tkey = normalize_purchase_thickness(item.thickness)
                old_item_queues[(item.product_id, tkey)].append(item)
            purchase.purchase_items.all().delete()

            for item_data in purchase_items_data:
                product_id = item_data.get("product")
                product = Product.objects.get(id=product_id)
                weight_amount = self.safe_decimal(item_data.get("weight_amount", 0))
                meter_amount = self.safe_decimal(item_data.get("meter_amount", 0))
                khada_amount = self.safe_decimal(item_data.get("khada_amount", 0))
                grain_amount = self.safe_decimal(item_data.get("grain_amount", 0))
                buy_price = self.safe_decimal(item_data.get("buy_price", 0))
                pricing_base = item_data.get("pricing_base") or None
                # Inventory.buy_price is stored in home AFN (unit cost).
                if currency == "USD":
                    buy_price = buy_price * (exchange_rate or Decimal("0"))
                thickness_key = normalize_purchase_thickness(
                    item_data.get("thickness")
                )

                qkey = (product_id, thickness_key)
                old_item = None
                if old_item_queues[qkey]:
                    old_item = old_item_queues[qkey].pop(0)

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product_id=product_id,
                    thickness=thickness_key_to_model_value(thickness_key),
                    weight_amount=weight_amount,
                    meter_amount=meter_amount,
                    khada_amount=khada_amount,
                    grain_amount=grain_amount,
                    buy_price=buy_price,
                    pricing_base=pricing_base,
                )

                self._apply_inventory_line_change(
                    product,
                    product_id,
                    thickness_key,
                    weight_amount,
                    meter_amount,
                    khada_amount,
                    grain_amount,
                    buy_price,
                    old_item,
                    pricing_base,
                )

            for qkey, leftover_list in list(old_item_queues.items()):
                for leftover in leftover_list:
                    product_id, thickness_key = qkey
                    product = Product.objects.get(id=product_id)
                    self._apply_inventory_line_change(
                        product,
                        product_id,
                        thickness_key,
                        Decimal("0"),
                        Decimal("0"),
                        Decimal("0"),
                        Decimal("0"),
                        leftover.buy_price or Decimal("0"),
                        leftover,
                    )

            return Response(
                {"detail": "✅ Purchase updated successfully with updated inventory!"},
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

    def safe_decimal(self, value):
        """Safely convert a value to Decimal, returning 0 on failure."""
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return Decimal("0")
