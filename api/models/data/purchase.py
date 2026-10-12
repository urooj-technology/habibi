from decimal import Decimal

from django.db import models
from django.utils import timezone

from .base import DataRoot
from api.models.data.product import Product


class Purchase(DataRoot):
    supplier = models.ForeignKey(
        "Supplier", on_delete=models.CASCADE, related_name="purchases"
    )
    is_paid = models.BooleanField(default=False)
    purchase_date = models.DateField(default=timezone.now)
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    received_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    payment_account = models.ForeignKey(
        "api.AccountingAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchases_cash_bank",
        help_text="Cash/bank account for amounts paid at purchase time.",
    )

    def __str__(self):
        return f"Purchase #{self.pk} — {self.total_amount}"

    def save(self, *args, **kwargs):
        self.is_paid = self.received_amount == self.total_amount
        super().save(*args, **kwargs)


class PurchaseItem(DataRoot):
    purchase = models.ForeignKey(
        Purchase, on_delete=models.CASCADE, related_name="purchase_items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="purchases"
    )
    quantity = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    buy_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )

    def __str__(self):
        return f"PurchaseItem #{self.pk} for Purchase #{self.purchase_id}"

    @property
    def line_total(self):
        return (self.quantity or Decimal("0")) * (self.buy_price or Decimal("0"))
