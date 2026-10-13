"""Shared choice enums for ERP documents."""

from django.db import models


class DocumentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class SaleDocumentKind(models.TextChoices):
    INVOICE = "INVOICE", "Sales invoice"
    CASH_RECEIPT = "CASH_RECEIPT", "Sales receipt (cash sale)"
