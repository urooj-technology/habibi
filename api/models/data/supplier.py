from django.db import models
from decimal import Decimal
from collections import defaultdict
from .base import DataRoot


class Supplier(DataRoot):
    name = models.CharField(max_length=255, unique=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def get_financial_summary(self):
        """
        Summary per currency from purchase invoices and AP subledger balance.

        Total comes from purchase bills. Paid and remaining are derived from the
        same accounts-payable lines as the supplier ledger, so extra payments
        recorded in the journal (not only received_amount on the purchase) are
        included.
        """
        from api.services.accounting.contact_ledger import (
            financial_summary_from_invoices_and_subledger,
        )

        invoice_totals: dict[str, Decimal] = defaultdict(Decimal)
        paid_on_invoices: dict[str, Decimal] = defaultdict(Decimal)

        for purchase in self.purchases.all().only(
            "total_amount", "received_amount", "currency"
        ):
            if not purchase.currency:
                continue
            invoice_totals[purchase.currency] += Decimal(purchase.total_amount or 0)
            paid_on_invoices[purchase.currency] += Decimal(purchase.received_amount or 0)

        return financial_summary_from_invoices_and_subledger(
            kind="supplier",
            contact_id=self.pk,
            invoice_totals_by_currency=dict(invoice_totals),
            paid_on_invoices_by_currency=dict(paid_on_invoices),
        )
