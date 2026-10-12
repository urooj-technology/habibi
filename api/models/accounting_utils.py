"""Accountant utilities: opening balances, period locks, audit."""

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from api.choices import DocumentStatus
from api.models.data.base import DataRoot


class OpeningBalanceEntry(DataRoot):
    entry_date = models.DateField(default=timezone.now)
    account = models.ForeignKey("api.AccountingAccount", on_delete=models.PROTECT)
    debit_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    credit_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    memo = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
        db_index=True,
    )

    class Meta:
        ordering = ("-entry_date", "-id")


class AccountingPeriodLock(DataRoot):
    """Prevent posting into closed accounting periods."""

    period_start = models.DateField()
    period_end = models.DateField()
    is_locked = models.BooleanField(default=True)
    locked_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ("-period_end",)

    def __str__(self) -> str:
        return f"{self.period_start} → {self.period_end} ({'locked' if self.is_locked else 'open'})"


class AuditLog(models.Model):
    """Append-only activity log for key business actions."""

    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"
        POST = "POST", "Post"
        EXPORT = "EXPORT", "Export"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=16, choices=Action.choices, db_index=True)
    module = models.CharField(max_length=64, db_index=True)
    object_type = models.CharField(max_length=64, blank=True, default="")
    object_id = models.CharField(max_length=64, blank=True, default="")
    summary = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at", "-id")

    def __str__(self) -> str:
        return f"{self.action} {self.module} {self.object_type}#{self.object_id}"
