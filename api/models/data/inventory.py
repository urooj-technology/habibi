from decimal import Decimal

from .base import DataRoot, models
from api.models.data.product import Product


class Inventory(DataRoot):
    """Stock row: one per product — quantity, average cost and selling price."""

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="inventory"
    )
    quantity = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    buy_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    sell_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Default selling price; set from the latest purchase, editable at sale time.",
    )
    min_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Low-stock alert threshold (0 = alert when empty).",
    )

    class Meta:
        verbose_name_plural = "inventory"

    def __str__(self):
        return f"Stock #{self.id} — {self.product.name}"
