from django.db import models
from decimal import Decimal
from django.utils import timezone
from .base import DataRoot
from api.models.data.product import Product


class Purchase(DataRoot):
    supplier = models.ForeignKey(
        "Supplier", on_delete=models.CASCADE, related_name="purchases"
    )
    is_paid = models.BooleanField(default=False)
    currency = models.CharField(max_length=5, choices=[("AFN", "AFN"), ("USD", "USD")])
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    purchase_date = models.DateField(default=timezone.now)
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    equivalent_amount = models.DecimalField(
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
        help_text="Cash/bank account for amounts paid at purchase time (GL cash leg).",
    )

    def __str__(self):
        return f"Purchase #{self.pk} - {self.total_amount} {self.currency}"

    def calculate_equivalent_amount(self):
        """Calculate the equivalent amount by dividing total_amount by exchange_rate if currency is AFN."""
        if self.currency == "AFN" and self.exchange_rate > 0:
            self.equivalent_amount = self.total_amount / self.exchange_rate
        else:
            self.equivalent_amount = Decimal("0.00")

    def save(self, *args, **kwargs):
        # Call the calculate_equivalent_amount method before saving the purchase
        self.calculate_equivalent_amount()

        # Set is_paid to True if received_amount equals total_amount
        if self.received_amount == self.total_amount:
            self.is_paid = True
        else:
            self.is_paid = False  # Ensure it's False if not fully paid

        super().save(*args, **kwargs)


class PurchaseItem(DataRoot):
    purchase = models.ForeignKey(
        Purchase, on_delete=models.CASCADE, related_name="purchase_items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="purchases"
    )
    thickness = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
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
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    # Runtime choice on dual-measurement lines: which qty × buy_price
    pricing_base = models.CharField(
        max_length=20,
        choices=[
            ("weight", "Weight"),
            ("meter", "Meter"),
            ("khada", "Khada"),
            ("grain", "Grain"),
        ],
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"PurchaseItem #{self.pk} for Purchase #{self.purchase.id}"
