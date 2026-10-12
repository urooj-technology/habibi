"""
Aggregate journal line amounts for chart-of-accounts display.

Posting stores amounts in two column pairs depending on document type:
- USD purchase / sale / salary: account currency in debit_home/credit_home, AFN in *_foreign
  (foreign_currency="AFN" on the line).
- Legacy USD sale lines may still have foreign_currency="USD" (USD in *_foreign).
- AFN documents: everything in debit_home/credit_home.

Use these helpers so list views show balances in the account's currency (USD or AFN),
matching journal lines in Django admin — not converted AFN totals on USD accounts.
"""

from decimal import Decimal

from django.db.models import Case, DecimalField, F, Q, Sum, Value, When
from django.db.models.functions import Coalesce

from api.models.accounting.account import AccountingAccount

_OUT = DecimalField(max_digits=18, decimal_places=4)
_ZERO = Value(Decimal("0"), output_field=_OUT)


def _line_debit_account_currency():
    return Case(
        When(currency=AccountingAccount.Currency.AFN, then=F("journal_lines__debit_home")),
        When(
            currency=AccountingAccount.Currency.USD,
            journal_lines__foreign_currency="USD",
            then=F("journal_lines__debit_foreign"),
        ),
        default=F("journal_lines__debit_home"),
        output_field=_OUT,
    )


def _line_credit_account_currency():
    return Case(
        When(currency=AccountingAccount.Currency.AFN, then=F("journal_lines__credit_home")),
        When(
            currency=AccountingAccount.Currency.USD,
            journal_lines__foreign_currency="USD",
            then=F("journal_lines__credit_foreign"),
        ),
        default=F("journal_lines__credit_home"),
        output_field=_OUT,
    )


def _line_debit_afn():
    """AFN book amount per line (for consolidation / home-currency reporting)."""
    return Case(
        When(currency=AccountingAccount.Currency.AFN, then=F("journal_lines__debit_home")),
        When(journal_lines__foreign_currency="AFN", then=F("journal_lines__debit_foreign")),
        When(journal_lines__foreign_currency="USD", then=F("journal_lines__debit_home")),
        default=F("journal_lines__debit_home"),
        output_field=_OUT,
    )


def _line_credit_afn():
    return Case(
        When(currency=AccountingAccount.Currency.AFN, then=F("journal_lines__credit_home")),
        When(journal_lines__foreign_currency="AFN", then=F("journal_lines__credit_foreign")),
        When(journal_lines__foreign_currency="USD", then=F("journal_lines__credit_home")),
        default=F("journal_lines__credit_home"),
        output_field=_OUT,
    )


def annotate_account_balance_totals(queryset):
    """Add _debit_ccy, _credit_ccy, _debit_afn, _credit_afn on AccountingAccount queryset."""
    debit_ccy = Coalesce(
        Sum(_line_debit_account_currency(), output_field=_OUT),
        _ZERO,
        output_field=_OUT,
    )
    credit_ccy = Coalesce(
        Sum(_line_credit_account_currency(), output_field=_OUT),
        _ZERO,
        output_field=_OUT,
    )
    debit_afn = Coalesce(
        Sum(_line_debit_afn(), output_field=_OUT),
        _ZERO,
        output_field=_OUT,
    )
    credit_afn = Coalesce(
        Sum(_line_credit_afn(), output_field=_OUT),
        _ZERO,
        output_field=_OUT,
    )
    return queryset.annotate(
        _debit_ccy=debit_ccy,
        _credit_ccy=credit_ccy,
        _debit_afn=debit_afn,
        _credit_afn=credit_afn,
        # Legacy names used by older code paths
        _debit_home=debit_afn,
        _credit_home=credit_afn,
    )


def signed_balance(debit: Decimal, credit: Decimal, account_type: str) -> Decimal:
    """Net amount in account-type normal balance (debit + for assets/expenses, credit + for liabilities/equity/income)."""
    if account_type in {
        AccountingAccount.AccountType.ASSET,
        AccountingAccount.AccountType.EXPENSE,
    }:
        return debit - credit
    return credit - debit


def aggregate_line_totals(line_queryset, *, account_currency: str):
    """
    Sum debit/credit on a JournalLine queryset in account currency and AFN book.
    """
    if account_currency == AccountingAccount.Currency.AFN:
        debit_ccy = Case(
            default=F("debit_home"),
            output_field=_OUT,
        )
        credit_ccy = Case(
            default=F("credit_home"),
            output_field=_OUT,
        )
    else:
        debit_ccy = Case(
            When(foreign_currency="USD", then=F("debit_foreign")),
            default=F("debit_home"),
            output_field=_OUT,
        )
        credit_ccy = Case(
            When(foreign_currency="USD", then=F("credit_foreign")),
            default=F("credit_home"),
            output_field=_OUT,
        )

    debit_afn = Case(
        When(foreign_currency="AFN", then=F("debit_foreign")),
        When(foreign_currency="USD", then=F("debit_home")),
        default=F("debit_home"),
        output_field=_OUT,
    )
    credit_afn = Case(
        When(foreign_currency="AFN", then=F("credit_foreign")),
        When(foreign_currency="USD", then=F("credit_home")),
        default=F("credit_home"),
        output_field=_OUT,
    )

    agg = line_queryset.aggregate(
        d_ccy=Coalesce(Sum(debit_ccy, output_field=_OUT), _ZERO, output_field=_OUT),
        c_ccy=Coalesce(Sum(credit_ccy, output_field=_OUT), _ZERO, output_field=_OUT),
        d_afn=Coalesce(Sum(debit_afn, output_field=_OUT), _ZERO, output_field=_OUT),
        c_afn=Coalesce(Sum(credit_afn, output_field=_OUT), _ZERO, output_field=_OUT),
    )
    return {
        "debit": agg["d_ccy"] or Decimal("0"),
        "credit": agg["c_ccy"] or Decimal("0"),
        "debit_afn": agg["d_afn"] or Decimal("0"),
        "credit_afn": agg["c_afn"] or Decimal("0"),
    }
