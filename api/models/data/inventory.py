# api/models/data/inventory.py
from .base import DataRoot, models
from api.models.data.product import Product
from decimal import Decimal


class Inventory(DataRoot):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="inventory"
    )
    currency = models.CharField(
        max_length=5, choices=[("AFN", "AFN"), ("USD", "USD")], default="AFN"
    )
    thickness = models.CharField(max_length=100, null=True, blank=True)
    weight_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    meter_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    khada_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    grain_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    buy_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    # Unit that buy_price is expressed in (from purchase pricing_base).
    # COGS must use this unit × buy_price — not the sale line's pricing_base.
    buy_pricing_base = models.CharField(
        max_length=20,
        choices=[
            ("weight", "Weight"),
            ("meter", "Meter"),
            ("khada", "Khada"),
            ("grain", "Grain"),
        ],
        blank=True,
        default="",
    )
    # Alert when stock qty is at or below these mins (0 = alert when empty).
    min_weight_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    min_meter_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    min_khada_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    min_grain_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )

    def __str__(self):
        return f"Stock id: {self.id} - product: {self.product.name} {self.product.id}"