"""Payroll processing documents."""

from decimal import Decimal

from django.db import models
from django.utils import timezone

from api.choices import DocumentStatus
from api.models.data.base import DataRoot
from api.models.data.employee import Employee


class PayrollRun(DataRoot):
    run_date = models.DateField(default=timezone.now)
    period_start = models.DateField()
    period_end = models.DateField()
    total_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.DRAFT,
        db_index=True,
    )
    reference = models.CharField(max_length=64, blank=True, default="")
    memo = models.TextField(blank=True, default="")

    class Meta:
        ordering = ("-run_date", "-id")


class PayrollRunLine(DataRoot):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="lines")
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_lines")
    gross_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    deductions = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    net_amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal("0.00"))
    note = models.CharField(max_length=255, blank=True, default="")

    def save(self, *args, **kwargs):
        self.net_amount = (self.gross_amount - self.deductions).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)
