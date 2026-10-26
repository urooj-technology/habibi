from decimal import Decimal

from django.db import models
from django.utils import timezone

from .base import DataRoot
from api.models.data.inventory import Inventory
from api.models.data.customer import Customer
from api.choices import SaleDocumentKind


class Sale(DataRoot):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        related_name="sales",
        null=True,
        blank=True,
        help_text="Optional — leave empty for walk-in / POS cash sales.",
    )
    document_kind = models.CharField(
        max_length=16,
        choices=SaleDocumentKind.choices,
        default=SaleDocumentKind.INVOICE,
        db_index=True,
    )
    is_paid = models.BooleanField(default=False)
    sale_date = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Invoice discount in money; total_amount is net after this.",
    )
    discount_percent = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Invoice discount percent (stored for re-edit; amount is authoritative).",
    )
    received_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    payment_account = models.ForeignKey(
        "api.AccountingAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_cash_bank",
        help_text="Cash/bank account for amounts received at sale time.",
    )
    notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"Sale #{self.pk}"

    def save(self, *args, **kwargs):
        total = self.total_amount
        received = self.received_amount
        if total is None or received is None:
            self.is_paid = False
        else:
            self.is_paid = Decimal(str(received)) >= Decimal(str(total))
        super().save(*args, **kwargs)


class SaleItems(DataRoot):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="sale_items")
    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, related_name="sale_items"
    )
    quantity = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    sale_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    buy_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )

    def __str__(self):
        return f"SaleItem for Sale #{self.sale_id}"

    @property
    def line_total(self):
        return (self.quantity or Decimal("0")) * (self.sale_price or Decimal("0"))
