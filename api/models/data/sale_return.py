from decimal import Decimal

from django.db import models
from django.utils import timezone

from api.models.data.base import DataRoot
from api.models.data.customer import Customer
from api.models.data.inventory import Inventory
from api.models.data.sale import Sale, SaleItems


class SaleReturn(DataRoot):
    """Customer credit note / sales return linked to an original sale."""

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
    return_date = models.DateTimeField(default=timezone.now)
    total_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    refunded_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Cash refund given to the customer. Remainder credits AR.",
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

    def save(self, *args, **kwargs):
        if self.sale_id and not self.customer_id:
            self.customer_id = self.sale.customer_id
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
        return f"SaleReturnItem for Return #{self.sale_return_id}"
