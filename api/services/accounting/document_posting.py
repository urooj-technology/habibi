"""GL posting for payroll and opening-balance documents."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from api.choices import DocumentStatus
from api.models.accounting.journal import JournalEntry
from api.services.accounting.chart import account_by_code
from api.services.accounting.period_lock import assert_period_open
from api.services.accounting.posting import (
    _add_line,
    _assert_balanced,
    _delete_source,
)


_DATE_FIELDS = (
    "run_date",
    "entry_date",
    "payment_date",
)


def document_date(doc):
    for field in _DATE_FIELDS:
        value = getattr(doc, field, None)
        if value:
            return value.date() if hasattr(value, "date") and callable(value.date) else value
    raise ValueError("Document has no date for period lock check.")


def check_period_for_document(doc) -> None:
    assert_period_open(document_date(doc))


def delete_document_journal(source_type: str, source_id: int) -> None:
    _delete_source(source_type, source_id)


@transaction.atomic
def sync_payroll_run(payroll_run) -> None:
    from api.models.payroll import PayrollRunLine

    _delete_source(JournalEntry.SourceType.PAYROLL_RUN, payroll_run.pk)
    if getattr(payroll_run, "is_deleted", False):
        return
    if payroll_run.status != DocumentStatus.POSTED:
        return

    currency = (getattr(payroll_run, "currency", None) or "AFN").upper()
    if currency == "USD":
        wage_exp = account_by_code("6101")
        cash_acc = account_by_code("1001")
    else:
        wage_exp = account_by_code("6100")
        cash_acc = account_by_code("1000")

    entry = JournalEntry.objects.create(
        reference=payroll_run.reference or f"PAYROLL-{payroll_run.pk}",
        memo=payroll_run.memo or f"Payroll run #{payroll_run.pk}",
        entry_date=payroll_run.run_date,
        source_type=JournalEntry.SourceType.PAYROLL_RUN,
        source_id=payroll_run.pk,
    )

    net_total = Decimal("0")
    for line in PayrollRunLine.objects.filter(payroll_run=payroll_run).select_related(
        "employee"
    ):
        net = line.net_amount or Decimal("0")
        if net <= 0:
            continue
        net_total += net
        _add_line(
            entry,
            wage_exp,
            net,
            Decimal("0"),
            line_memo=f"Payroll — {line.employee.name if line.employee else line.employee_id}",
        )

    if net_total <= 0:
        entry.delete()
        return

    _add_line(entry, cash_acc, Decimal("0"), net_total, line_memo="Payroll paid")
    _assert_balanced(entry)


@transaction.atomic
def sync_opening_balance(entry) -> None:
    from api.services.accounting.chart import opening_balance_equity_account

    _delete_source(JournalEntry.SourceType.OPENING_BALANCE, entry.pk)
    if getattr(entry, "is_deleted", False):
        return
    if entry.status != DocumentStatus.POSTED:
        return

    debit = entry.debit_amount or Decimal("0")
    credit = entry.credit_amount or Decimal("0")
    if debit <= 0 and credit <= 0:
        return
    if debit > 0 and credit > 0:
        raise ValueError("Opening balance must be either a debit or a credit, not both.")

    target = entry.account
    equity = opening_balance_equity_account(currency=getattr(target, "currency", "AFN"))
    if equity.pk == target.pk:
        raise ValueError(
            "Choose a different account — opening balance equity is the automatic offset."
        )

    je = JournalEntry.objects.create(
        reference=f"OB-{entry.pk}",
        memo=entry.memo or f"Opening balance #{entry.pk}",
        entry_date=entry.entry_date,
        source_type=JournalEntry.SourceType.OPENING_BALANCE,
        source_id=entry.pk,
    )
    # Primary line on the selected account
    _add_line(je, target, debit, credit, line_memo=entry.memo or "Opening balance")
    # Balancing opposite on Opening Balance Equity (same currency)
    _add_line(
        je,
        equity,
        credit,
        debit,
        line_memo="Opening balance equity offset",
    )
    _assert_balanced(je)
