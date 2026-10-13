from django.db import models
from django.utils.translation import gettext_lazy as _


class AccountingAccount(models.Model):
    """
    Chart of accounts. Each account has a posting currency (AFN or USD).
    Journal lines store amounts in debit_home/credit_home and optional foreign columns;
    see api.services.accounting.balances for how list balances are aggregated.
    """

    class Currency(models.TextChoices):
        AFN = "AFN", _("AFN")
        USD = "USD", _("USD")

    class AccountType(models.TextChoices):
        ASSET = "ASSET", _("Asset")
        LIABILITY = "LIABILITY", _("Liability")
        EQUITY = "EQUITY", _("Equity")
        INCOME = "INCOME", _("Income")
        EXPENSE = "EXPENSE", _("Expense")

    class Role(models.TextChoices):
        NONE = "", _("Unclassified")
        CASH = "CASH", _("Cash")
        BANK = "BANK", _("Bank")
        AR = "AR", _("Accounts receivable")
        AP = "AP", _("Accounts payable")
        INVENTORY = "INVENTORY", _("Inventory")
        SALES = "SALES", _("Sales revenue")
        COGS = "COGS", _("Cost of goods sold")
        CUSTOMER_ADVANCE = "CUSTOMER_ADVANCE", _("Customer advances")
        OPERATING_EXPENSE = "OPERATING_EXPENSE", _("Operating expense")
        OPENING_BALANCE_EQUITY = "OPENING_BALANCE_EQUITY", _("Opening balance equity")

    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.AFN, db_index=True
    )
    account_type = models.CharField(
        max_length=20, choices=AccountType.choices, db_index=True
    )
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        blank=True,
        default=Role.NONE,
        db_index=True,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("code",)

    def __str__(self):
        return f"{self.code} {self.name}"
