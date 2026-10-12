"""Shared choice enums for ERP documents."""

from django.db import models


class CurrencyCode(models.TextChoices):
    AFN = "AFN", "AFN"
    USD = "USD", "USD"


class DocumentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class SaleDocumentKind(models.TextChoices):
    INVOICE = "INVOICE", "Sales invoice"
    CASH_RECEIPT = "CASH_RECEIPT", "Sales receipt (cash sale)"


class AccountCategory(models.TextChoices):
    """Chart-of-accounts grouping aligned with the ERP proposal."""

    CURRENT_ASSET = "CURRENT_ASSET", "Current assets"
    FIXED_ASSET = "FIXED_ASSET", "Fixed assets"
    OTHER_ASSET = "OTHER_ASSET", "Other assets"
    CURRENT_LIABILITY = "CURRENT_LIABILITY", "Current liabilities"
    LONG_TERM_LIABILITY = "LONG_TERM_LIABILITY", "Long-term liabilities"
    CAPITAL = "CAPITAL", "Capital"
    DRAWINGS = "DRAWINGS", "Drawings"
    RETAINED_EARNINGS = "RETAINED_EARNINGS", "Retained earnings"
    CURRENT_YEAR_EARNINGS = "CURRENT_YEAR_EARNINGS", "Current year earnings"
    SALES_INCOME = "SALES_INCOME", "Sales income"
    SERVICE_INCOME = "SERVICE_INCOME", "Service income"
    OTHER_INCOME = "OTHER_INCOME", "Other income"
    OPERATING_EXPENSE = "OPERATING_EXPENSE", "Operating expenses"
    COGS = "COGS", "Cost of goods sold"
