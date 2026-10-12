from collections import defaultdict
from decimal import Decimal

from django.db import models

from api.models.data.base import DataRoot


class Customer(DataRoot):
    name = models.CharField(max_length=255, unique=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def get_financial_summary(self):
        """Invoice totals and AR subledger (single-currency amounts)."""
        from api.services.accounting.contact_ledger import (
            financial_summary_from_invoices_and_subledger,
        )

        invoice_total = Decimal("0")
        paid_on_invoices = Decimal("0")

        for sale in self.sales.all():
            invoice_total += Decimal(sale.total_amount or 0)
            paid_on_invoices += Decimal(sale.received_amount or 0)

        for ret in self.sale_returns.filter(is_deleted=False):
            invoice_total -= Decimal(ret.total_amount or 0)
            paid_on_invoices -= Decimal(ret.refunded_amount or 0)

        if invoice_total < 0:
            invoice_total = Decimal("0")
        if paid_on_invoices < 0:
            paid_on_invoices = Decimal("0")

        return financial_summary_from_invoices_and_subledger(
            kind="customer",
            contact_id=self.pk,
            invoice_totals_by_currency={"AFN": invoice_total},
            paid_on_invoices_by_currency={"AFN": paid_on_invoices},
        )
