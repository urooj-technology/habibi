from decimal import Decimal

from django.db import models

from .base import DataRoot


class Supplier(DataRoot):
    name = models.CharField(max_length=255, unique=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def get_financial_summary(self):
        """Purchase totals and AP subledger (single-currency amounts)."""
        from api.services.accounting.contact_ledger import (
            financial_summary_from_invoices_and_subledger,
        )

        invoice_total = Decimal("0")
        paid_on_invoices = Decimal("0")

        for purchase in self.purchases.all().only("total_amount", "received_amount"):
            invoice_total += Decimal(purchase.total_amount or 0)
            paid_on_invoices += Decimal(purchase.received_amount or 0)

        return financial_summary_from_invoices_and_subledger(
            kind="supplier",
            contact_id=self.pk,
            invoice_totals_by_currency={"AFN": invoice_total},
            paid_on_invoices_by_currency={"AFN": paid_on_invoices},
        )
