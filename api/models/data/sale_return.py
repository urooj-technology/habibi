from decimal import Decimal

from django.db import models
from django.utils import timezone

from api.models.data.base import DataRoot
from api.models.data.customer import Customer
from api.models.data.inventory import Inventory
from api.models.data.sale import Sale, SaleItems


class SaleReturn(DataRoot):
    """Customer credit note / sales return linked to an original sale invoice."""

    sale = models.ForeignKey(
        Sale,
        on_delete=models.PROTECT,
        related_name="sale_returns",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        related_name="sale_returns",
        null=True,
        blank=True,
    )
    currency = models.CharField(max_length=5, choices=[("AFN", "AFN"), ("USD", "USD")])
    return_date = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    refunded_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Cash/bank refund given to the customer. Remainder credits AR.",
    )
    equivalent_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    refund_account = models.ForeignKey(
        "api.AccountingAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sale_return_refunds",
        help_text="Cash/bank account for refunds paid at return time.",
    )
    note = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"SaleReturn #{self.pk} — Sale #{self.sale_id}"

    def calculate_equivalent_amount(self):
        if self.currency == "AFN" and self.exchange_rate > 0:
            self.equivalent_amount = (
                self.total_amount or Decimal("0.00")
            ) / self.exchange_rate
        else:
            self.equivalent_amount = Decimal("0.00")

    def save(self, *args, **kwargs):
        if self.sale_id and not self.customer_id:
            self.customer_id = self.sale.customer_id
        if self.sale_id and not self.currency:
            self.currency = self.sale.currency
        self.calculate_equivalent_amount()
        super().save(*args, **kwargs)


class SaleReturnItem(DataRoot):
    sale_return = models.ForeignKey(
        SaleReturn, on_delete=models.CASCADE, related_name="items"
    )
    sale_item = models.ForeignKey(
        SaleItems,
        on_delete=models.PROTECT,
        related_name="return_items",
        null=True,
        blank=True,
    )
    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, related_name="sale_return_items"
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
        return f"SaleReturnItem for Return #{self.sale_return_id}"
