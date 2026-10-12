from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from api.models.accounting.account import AccountingAccount


class JournalEntry(models.Model):
    """Header for a balanced set of lines; debits and credits are in home currency (AFN)."""

    class SourceType(models.TextChoices):
        MANUAL = "MANUAL", _("Manual entry")
        SALE = "SALE", _("Sale invoice")
        SALE_RETURN = "SALE_RETURN", _("Sale return / credit note")
        PURCHASE = "PURCHASE", _("Purchase bill")
        SALE_PAYMENT = "SALE_PAYMENT", _("Customer receipt / advance")
        PURCHASE_PAYMENT = "PURCHASE_PAYMENT", _("Supplier payment")
        SALARY_PAYMENT = "SALARY_PAYMENT", _("Salary payment")
        PAYROLL_RUN = "PAYROLL_RUN", _("Payroll run")
        OPENING_BALANCE = "OPENING_BALANCE", _("Opening balance")
        CURRENCY_CONVERSION = "CURRENCY_CONVERSION", _("Currency conversion")

    reference = models.CharField(max_length=64, blank=True, default="")
    memo = models.TextField(blank=True, default="")
    entry_date = models.DateField(db_index=True)
    source_type = models.CharField(
        max_length=32,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
        db_index=True,
    )
    source_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries_created",
    )

    class Meta:
        ordering = ("-entry_date", "-id")
        indexes = [
            models.Index(fields=["source_type", "source_id"]),
        ]

    def __str__(self):
        return f"JE #{self.pk} {self.entry_date} {self.source_type}"


class JournalLine(models.Model):
    entry = models.ForeignKey(
        JournalEntry, on_delete=models.CASCADE, related_name="lines"
    )
    account = models.ForeignKey(
        AccountingAccount, on_delete=models.PROTECT, related_name="journal_lines"
    )
    line_memo = models.CharField(max_length=255, blank=True, default="")
    debit_home = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0"))
    credit_home = models.DecimalField(
        max_digits=18, decimal_places=2, default=Decimal("0")
    )
    debit_foreign = models.DecimalField(
        max_digits=18, decimal_places=4, null=True, blank=True
    )
    credit_foreign = models.DecimalField(
        max_digits=18, decimal_places=4, null=True, blank=True
    )
    foreign_amount = models.DecimalField(
        max_digits=18, decimal_places=4, null=True, blank=True
    )
    foreign_currency = models.CharField(max_length=5, blank=True, default="")
    exchange_rate = models.DecimalField(
        max_digits=14, decimal_places=6, null=True, blank=True
    )
    customer = models.ForeignKey(
        "api.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_lines",
    )
    supplier = models.ForeignKey(
        "api.Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_lines",
    )

    class Meta:
        ordering = ("id",)

    def clean(self):
        super().clean()
        if self.debit_home > 0 and self.credit_home > 0:
            raise ValidationError(_("A line cannot have both debit and credit in home currency."))
        if self.debit_home < 0 or self.credit_home < 0:
            raise ValidationError(_("Amounts cannot be negative."))

    def __str__(self):
        return f"Line {self.pk} {self.account.code}"
