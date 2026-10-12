from decimal import Decimal
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework import status
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from api.filters.sale_filters import SaleFilter
from api.serializers.data.sale import SaleSerializer
from api.models.data.sale import Sale, SaleItems
from api.models.data.inventory import Inventory
from api.views.data.sale_return import SaleReturnableItemsMixin
from api.views.data.pagination import CustomPagination
from api.views.data.base import DataRootViewSet


class SaleViewSet(SaleReturnableItemsMixin, DataRootViewSet):
    queryset = Sale.objects.all().order_by("-id")
    serializer_class = SaleSerializer
    permission_classes = [ModuleCRUDPermission("sales")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_class = SaleFilter
    search_fields = [
        "customer__name",
        "customer__contact",
        "currency",
        "sale_items__inventory__product__name",
        "sale_items__note",
    ]
    pagination_class = CustomPagination

    def filter_queryset(self, queryset):
        """Apply filters + search; pure numeric / #123 search also matches sale primary key."""
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

    def _convert_to_decimal(self, value):
        """Helper method to safely convert values to Decimal, handling None"""
        return Decimal(str(value)) if value is not None else Decimal(0)

    def _normalize_quantities_for_product(
        self,
        *,
        product,
        weight_amount: Decimal,
        meter_amount: Decimal,
        khada_amount: Decimal,
        grain_amount: Decimal,
    ):
        """
        Keep only amounts for the product's active measurement type(s).

        Dual-measurement products (e.g. khada + weight with a conversion rate)
        keep both amounts so stock can be tracked in both units.
        """
        flags = [
            getattr(product, "is_weight", False),
            getattr(product, "is_meter", False),
            getattr(product, "is_khada", False),
            getattr(product, "is_grain", False),
        ]
        active_count = sum(1 for f in flags if f)

        # Dual (or more) — keep each enabled field, zero the rest
        if active_count >= 2:
            return (
                weight_amount if getattr(product, "is_weight", False) else Decimal("0"),
                meter_amount if getattr(product, "is_meter", False) else Decimal("0"),
                khada_amount if getattr(product, "is_khada", False) else Decimal("0"),
                grain_amount if getattr(product, "is_grain", False) else Decimal("0"),
            )

        # Single measurement — keep only that field
        if getattr(product, "is_weight", False):
            return (weight_amount, Decimal("0"), Decimal("0"), Decimal("0"))
        if getattr(product, "is_meter", False):
            return (Decimal("0"), meter_amount, Decimal("0"), Decimal("0"))
        if getattr(product, "is_khada", False):
            return (Decimal("0"), Decimal("0"), khada_amount, Decimal("0"))
        if getattr(product, "is_grain", False):
            return (Decimal("0"), Decimal("0"), Decimal("0"), grain_amount)
        return (weight_amount, Decimal("0"), Decimal("0"), Decimal("0"))

    def _check_inventory_stock(
        self, inventory, weight_amount, meter_amount, khada_amount, grain_amount, note
    ):
        """Helper method to check inventory stock with None handling"""
        inventory_weight = self._convert_to_decimal(inventory.weight_amount)
        inventory_meter = self._convert_to_decimal(inventory.meter_amount)
        inventory_khada = self._convert_to_decimal(inventory.khada_amount)
        inventory_grain = self._convert_to_decimal(inventory.grain_amount)

        if (
            inventory_weight < weight_amount
            or inventory_meter < meter_amount
            or inventory_khada < khada_amount
            or inventory_grain < grain_amount
        ):
            return {
                "error": (
                    f"Insufficient stock for product {inventory.product.name}. "
                    f"Available - weight: {inventory_weight}, "
                    f"meter: {inventory_meter}, "
                    f"khada: {inventory_khada}, "
                    f"dana: {inventory_grain}; "
                    f"Required - weight: {weight_amount}, "
                    f"meter: {meter_amount}, "
                    f"khada: {khada_amount}, "
                    f"dana: {grain_amount}"
                )
            }
        return None

    def _update_inventory(
        self,
        inventory,
        weight_amount,
        meter_amount,
        khada_amount,
        grain_amount,
        note,
        operation="subtract",
    ):
        """Helper method to update inventory with None handling"""
        if operation == "subtract":
            inventory.weight_amount = (
                self._convert_to_decimal(inventory.weight_amount) - weight_amount
            )
            inventory.meter_amount = (
                self._convert_to_decimal(inventory.meter_amount) - meter_amount
            )
            inventory.khada_amount = (
                self._convert_to_decimal(inventory.khada_amount) - khada_amount
            )
            inventory.grain_amount = (
                self._convert_to_decimal(inventory.grain_amount) - grain_amount
            )
        else:  # add
            inventory.weight_amount = (
                self._convert_to_decimal(inventory.weight_amount) + weight_amount
            )
            inventory.meter_amount = (
                self._convert_to_decimal(inventory.meter_amount) + meter_amount
            )
            inventory.khada_amount = (
                self._convert_to_decimal(inventory.khada_amount) + khada_amount
            )
            inventory.grain_amount = (
                self._convert_to_decimal(inventory.grain_amount) + grain_amount
            )
        inventory.save()
        if operation == "subtract":
            from api.services.notifications import notify_low_stock_if_needed

            notify_low_stock_if_needed(inventory)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        sale_data = request.data.copy()
        sale_items_data = sale_data.pop("items", [])
        received_amount = self._convert_to_decimal(sale_data.get("received_amount", 0))

        # Grab the currency code (e.g., "USD" or "AFN")
        currency_code = sale_data.get("currency")
        exchange_rate = self._convert_to_decimal(sale_data.get("exchange_rate", 1))

        # Create the Sale record
        sale_serializer = self.get_serializer(data=sale_data)
        sale_serializer.is_valid(raise_exception=True)
        sale = sale_serializer.save(exchange_rate=exchange_rate)

        # Create SaleItems and decrement Inventory
        for item_data in sale_items_data:
            inventory = Inventory.objects.filter(id=item_data["inventory"]).first()
            if not inventory:
                return Response(
                    {"error": f"Inventory with ID {item_data['inventory']} not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            weight_amount = self._convert_to_decimal(item_data.get("weight_amount", 0))
            meter_amount = self._convert_to_decimal(item_data.get("meter_amount", 0))
            khada_amount = self._convert_to_decimal(item_data.get("khada_amount", 0))
            grain_amount = self._convert_to_decimal(item_data.get("grain_amount", 0))
            (
                weight_amount,
                meter_amount,
                khada_amount,
                grain_amount,
            ) = self._normalize_quantities_for_product(
                product=inventory.product,
                weight_amount=weight_amount,
                meter_amount=meter_amount,
                khada_amount=khada_amount,
                grain_amount=grain_amount,
            )
            sale_price = self._convert_to_decimal(item_data["sale_price"])
            note = str(item_data.get("note", ""))  # Keep as string for CharField
            buy_price = inventory.buy_price  # Get buy_price from inventory
            buy_currency = getattr(inventory, "currency", "AFN") or "AFN"
            pricing_base = item_data.get("pricing_base") or None

            # Check stock
            stock_error = self._check_inventory_stock(
                inventory, weight_amount, meter_amount, khada_amount, grain_amount, note
            )
            if stock_error:
                return Response(stock_error, status=status.HTTP_400_BAD_REQUEST)

            # Create item with buy_price from inventory
            SaleItems.objects.create(
                sale=sale,
                inventory=inventory,
                weight_amount=weight_amount,
                meter_amount=meter_amount,
                khada_amount=khada_amount,
                grain_amount=grain_amount,
                sale_price=sale_price,
                buy_price=buy_price,  # Include buy_price from inventory
                buy_currency=buy_currency,
                note=note,
                pricing_base=pricing_base,
            )

            # Update stock
            self._update_inventory(
                inventory,
                weight_amount,
                meter_amount,
                khada_amount,
                grain_amount,
                note,
                "subtract",
            )

        return Response(
            {"detail": "✅ Sale created successfully with items!"},
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update sale header + lines in place.

        Sale lines referenced by SaleReturnItem (PROTECT) must not be deleted
        and recreated — match by id, update quantities, and only soft-delete
        lines that have no returns.
        """
        from api.models.data.sale_return import SaleReturnItem
        from api.views.data.sale_return import returned_qty_for_sale_item

        sale = self.get_object()
        sale_data = request.data.copy()
        sale_items_data = sale_data.pop("items", None)
        exchange_rate = self._convert_to_decimal(
            sale_data.get("exchange_rate", sale.exchange_rate)
        )

        sale_serializer = self.get_serializer(sale, data=sale_data, partial=True)
        sale_serializer.is_valid(raise_exception=True)
        sale = sale_serializer.save(exchange_rate=exchange_rate)

        # Header-only PATCH (no items key) — leave lines alone.
        if sale_items_data is None:
            return Response(
                {"detail": "✅ Sale updated successfully!"},
                status=status.HTTP_200_OK,
            )

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

            weight_amount = self._convert_to_decimal(item_data.get("weight_amount", 0))
            meter_amount = self._convert_to_decimal(item_data.get("meter_amount", 0))
            khada_amount = self._convert_to_decimal(item_data.get("khada_amount", 0))
            grain_amount = self._convert_to_decimal(item_data.get("grain_amount", 0))
            (
                weight_amount,
                meter_amount,
                khada_amount,
                grain_amount,
            ) = self._normalize_quantities_for_product(
                product=inventory.product,
                weight_amount=weight_amount,
                meter_amount=meter_amount,
                khada_amount=khada_amount,
                grain_amount=grain_amount,
            )
            sale_price = self._convert_to_decimal(item_data["sale_price"])
            note = str(item_data.get("note", ""))
            buy_price = inventory.buy_price
            buy_currency = getattr(inventory, "currency", "AFN") or "AFN"
            pricing_base = item_data.get("pricing_base") or None

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
                    shortages = []
                    checks = (
                        ("weight", weight_amount, returned["weight"]),
                        ("meter", meter_amount, returned["meter"]),
                        ("khada", khada_amount, returned["khada"]),
                        ("grain", grain_amount, returned["grain"]),
                    )
                    for label, new_qty, ret_qty in checks:
                        if new_qty < ret_qty:
                            shortages.append(
                                f"{label}: sold {new_qty} < already returned {ret_qty}"
                            )
                    if shortages:
                        return Response(
                            {
                                "error": (
                                    f"Cannot reduce sale item #{old_item.id} below "
                                    f"returned quantities ({'; '.join(shortages)})."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # Restore previous stock, then apply new quantities.
                old_inv = Inventory.objects.filter(id=old_item.inventory_id).first()
                if old_inv:
                    self._update_inventory(
                        old_inv,
                        old_item.weight_amount,
                        old_item.meter_amount,
                        old_item.khada_amount,
                        old_item.grain_amount,
                        old_item.note,
                        "add",
                    )
                    if old_inv.id == inventory.id:
                        inventory.refresh_from_db()

                stock_error = self._check_inventory_stock(
                    inventory,
                    weight_amount,
                    meter_amount,
                    khada_amount,
                    grain_amount,
                    note,
                )
                if stock_error:
                    return Response(stock_error, status=status.HTTP_400_BAD_REQUEST)

                old_item.inventory = inventory
                old_item.weight_amount = weight_amount
                old_item.meter_amount = meter_amount
                old_item.khada_amount = khada_amount
                old_item.grain_amount = grain_amount
                old_item.sale_price = sale_price
                old_item.buy_price = buy_price
                old_item.buy_currency = buy_currency
                old_item.note = note
                old_item.pricing_base = pricing_base
                old_item.save()

                self._update_inventory(
                    inventory,
                    weight_amount,
                    meter_amount,
                    khada_amount,
                    grain_amount,
                    note,
                    "subtract",
                )
                kept_ids.add(old_item.id)
                continue

            # New line
            stock_error = self._check_inventory_stock(
                inventory,
                weight_amount,
                meter_amount,
                khada_amount,
                grain_amount,
                note,
            )
            if stock_error:
                return Response(stock_error, status=status.HTTP_400_BAD_REQUEST)

            SaleItems.objects.create(
                sale=sale,
                inventory=inventory,
                weight_amount=weight_amount,
                meter_amount=meter_amount,
                khada_amount=khada_amount,
                grain_amount=grain_amount,
                sale_price=sale_price,
                buy_price=buy_price,
                buy_currency=buy_currency,
                note=note,
                pricing_base=pricing_base,
            )
            self._update_inventory(
                inventory,
                weight_amount,
                meter_amount,
                khada_amount,
                grain_amount,
                note,
                "subtract",
            )

        # Soft-delete lines removed from the payload (only if not returned).
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
                self._update_inventory(
                    inv,
                    old_item.weight_amount,
                    old_item.meter_amount,
                    old_item.khada_amount,
                    old_item.grain_amount,
                    old_item.note,
                    "add",
                )
            old_item.delete()  # soft-delete (model.delete), not queryset hard delete

        return Response(
            {"detail": "✅ Sale updated successfully with updated inventory!"},
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
                        "Delete or void the returns first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Return stock before deletion
        for item in sale.sale_items.all():
            inv = Inventory.objects.filter(id=item.inventory_id).first()
            if inv:
                self._update_inventory(
                    inv,
                    item.weight_amount,
                    item.meter_amount,
                    item.khada_amount,
                    item.grain_amount,
                    item.note,
                    "add",
                )

        sale.delete()
        return Response(
            {"detail": "✅ Sale deleted successfully!"},
            status=status.HTTP_204_NO_CONTENT,
        )
