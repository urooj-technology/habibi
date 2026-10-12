from django.db import models
from decimal import Decimal
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
    )
    document_kind = models.CharField(
        max_length=16,
        choices=SaleDocumentKind.choices,
        default=SaleDocumentKind.INVOICE,
        db_index=True,
    )
    is_paid = models.BooleanField(default=False)
    currency = models.CharField(max_length=5, choices=[("AFN", "AFN"), ("USD", "USD")])
    sale_date = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    received_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    equivalent_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    freight_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="کرایه for display on bill only; not included in total_amount or reports",
    )
    payment_account = models.ForeignKey(
        "api.AccountingAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_cash_bank",
        help_text="Cash/bank account for amounts received at sale time (GL cash leg).",
    )

    def __str__(self):
        return f"Sale #{self.pk} - {self.currency}"

    def calculate_equivalent_amount(self):
        """Calculate the equivalent amount by dividing total_amount by exchange_rate if currency is AFN."""
        if self.currency == "AFN" and self.exchange_rate > 0:
            self.equivalent_amount = (
                self.total_amount or Decimal("0.00")
            ) / self.exchange_rate
        else:
            self.equivalent_amount = Decimal("0.00")

    def save(self, *args, **kwargs):
        self.calculate_equivalent_amount()

        if self.received_amount == self.total_amount:
            self.is_paid = True
        else:
            self.is_paid = False

        super().save(*args, **kwargs)


class SaleItems(DataRoot):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="sale_items")
    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, related_name="sale_items"
    )
    note = models.CharField(max_length=255, null=True, blank=True)
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
    sale_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    buy_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    buy_currency = models.CharField(
        max_length=5, choices=[("AFN", "AFN"), ("USD", "USD")], default="AFN"
    )
    # Runtime choice on dual-measurement lines: which qty × sale_price
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
        return f"SaleItem for {self.sale}"
