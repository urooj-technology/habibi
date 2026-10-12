from django.db import models
from decimal import Decimal
from collections import defaultdict
from api.models.data.base import DataRoot


class Customer(DataRoot):
    name = models.CharField(max_length=255, unique=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    def get_financial_summary(self):
        """
        Summary per currency from sale invoices (net of returns) and AR subledger.

        Total comes from sales minus sale returns. Paid and remaining match the
        customer ledger (includes journal receipts, not only received_amount).
        """
        from api.services.accounting.contact_ledger import (
            financial_summary_from_invoices_and_subledger,
        )

        invoice_totals: dict[str, Decimal] = defaultdict(Decimal)
        paid_on_invoices: dict[str, Decimal] = defaultdict(Decimal)

        for sale in self.sales.all():
            if not sale.currency:
                continue
            invoice_totals[sale.currency] += Decimal(sale.total_amount or 0)
            paid_on_invoices[sale.currency] += Decimal(sale.received_amount or 0)

        for ret in self.sale_returns.filter(is_deleted=False):
            if not ret.currency:
                continue
            invoice_totals[ret.currency] -= Decimal(ret.total_amount or 0)
            # Cash refunds reduce paid-on-invoice cash, same currency
            paid_on_invoices[ret.currency] -= Decimal(ret.refunded_amount or 0)

        for ccy in list(invoice_totals.keys()):
            if invoice_totals[ccy] < 0:
                invoice_totals[ccy] = Decimal("0")
            if paid_on_invoices.get(ccy, Decimal("0")) < 0:
                paid_on_invoices[ccy] = Decimal("0")

        return financial_summary_from_invoices_and_subledger(
            kind="customer",
            contact_id=self.pk,
            invoice_totals_by_currency=dict(invoice_totals),
            paid_on_invoices_by_currency=dict(paid_on_invoices),
        )
