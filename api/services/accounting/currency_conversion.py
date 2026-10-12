"""
Currency conversion journals:

1. Contact mode — move customer AR or supplier AP between AFN and USD accounts
   (tagged to the contact).
2. Account mode — move any balance between two GL accounts of different currencies
   (e.g. Cash AFN ↔ Cash USD, Bank AFN ↔ Bank USD).

Journal home columns stay in AFN so the entry balances. USD account legs store
USD in *_foreign with foreign_currency=\"USD\".
"""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalEntry
from api.models.data.customer import Customer
from api.models.data.supplier import Supplier
from api.services.accounting.chart import account_by_code
from api.services.accounting.money import to_home_afn, to_usd
from api.services.accounting.posting import _add_line, _assert_balanced


AR_AFN = "1100"
AR_USD = "1101"
AP_AFN = "2000"
AP_USD = "2001"


def _d(v) -> Decimal:
    return Decimal(str(v or "0")).quantize(Decimal("0.01"))


def _amounts(from_ccy: str, amount: Decimal, rate: Decimal) -> tuple[Decimal, Decimal]:
    """Return (afn_home, usd_amt) for the conversion."""
    if from_ccy == "USD":
        usd_amt = amount
        afn_home = to_home_afn(usd_amt, "USD", rate)
    else:
        afn_home = amount
        usd_amt = to_usd(afn_home, "AFN", rate)
    if afn_home <= 0 or usd_amt <= 0:
        raise ValueError("Converted amounts must be greater than zero.")
    return afn_home, usd_amt


def _usd_line_kwargs(usd_amt: Decimal, rate: Decimal, side: str) -> dict:
    """side: 'debit' | 'credit' — USD amount on the foreign columns."""
    if side == "debit":
        return {
            "debit_foreign": usd_amt,
            "foreign_currency": "USD",
            "exchange_rate": rate,
        }
    return {
        "credit_foreign": usd_amt,
        "foreign_currency": "USD",
        "exchange_rate": rate,
    }


@transaction.atomic
def post_account_currency_conversion(
    *,
    from_account_id: int,
    to_account_id: int,
    amount: Decimal | str,
    exchange_rate: Decimal | str,
    entry_date=None,
    memo: str = "",
    created_by=None,
) -> JournalEntry:
    """
    Convert amount from one GL account to another (different currencies).

    Amount is in the from-account currency. Rate is AFN per 1 USD.
    Asset / debit-normal style: credit the from account, debit the to account.
    """
    amt = _d(amount)
    rate = Decimal(str(exchange_rate or "0"))
    if amt <= 0:
        raise ValueError("amount must be greater than zero.")
    if rate <= 0:
        raise ValueError("exchange_rate (AFN per 1 USD) is required.")
    if int(from_account_id) == int(to_account_id):
        raise ValueError("from_account and to_account must be different.")

    from_acc = AccountingAccount.objects.filter(pk=from_account_id, is_active=True).first()
    to_acc = AccountingAccount.objects.filter(pk=to_account_id, is_active=True).first()
    if not from_acc:
        raise ValueError(f"From account #{from_account_id} not found.")
    if not to_acc:
        raise ValueError(f"To account #{to_account_id} not found.")

    from_ccy = (from_acc.currency or "AFN").upper()
    to_ccy = (to_acc.currency or "AFN").upper()
    if from_ccy not in ("AFN", "USD") or to_ccy not in ("AFN", "USD"):
        raise ValueError("Only AFN and USD accounts are supported.")
    if from_ccy == to_ccy:
        raise ValueError(
            f"Accounts must have different currencies (both are {from_ccy})."
        )

    afn_home, usd_amt = _amounts(from_ccy, amt, rate)
    date = entry_date or timezone.now().date()
    direction = f"{from_ccy}→{to_ccy}"
    label = f"{from_acc.code} {from_acc.name} → {to_acc.code} {to_acc.name}"
    default_memo = f"Currency conversion {direction} — {label}"

    entry = JournalEntry.objects.create(
        reference=f"FX-ACC-{from_acc.code}-{to_acc.code}",
        memo=(memo or "").strip() or default_memo,
        entry_date=date,
        source_type=JournalEntry.SourceType.CURRENCY_CONVERSION,
        source_id=from_acc.id,
        created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
    )

    # Credit from-account (reduce), debit to-account (increase) — asset style.
    if from_ccy == "USD":
        _add_line(
            entry,
            from_acc,
            Decimal("0"),
            afn_home,
            line_memo=f"Convert out {usd_amt} USD",
            **_usd_line_kwargs(usd_amt, rate, "credit"),
        )
    else:
        _add_line(
            entry,
            from_acc,
            Decimal("0"),
            afn_home,
            line_memo=f"Convert out {afn_home} AFN",
        )

    if to_ccy == "USD":
        _add_line(
            entry,
            to_acc,
            afn_home,
            Decimal("0"),
            line_memo=f"Convert in {usd_amt} USD",
            **_usd_line_kwargs(usd_amt, rate, "debit"),
        )
    else:
        _add_line(
            entry,
            to_acc,
            afn_home,
            Decimal("0"),
            line_memo=f"Convert in {afn_home} AFN",
        )

    _assert_balanced(entry)
    return entry


@transaction.atomic
def post_contact_currency_conversion(
    *,
    kind: str,
    contact_id: int,
    from_currency: str,
    to_currency: str,
    amount: Decimal | str,
    exchange_rate: Decimal | str,
    entry_date=None,
    memo: str = "",
    created_by=None,
) -> JournalEntry:
    """
    kind: \"customer\" | \"supplier\"
    amount: in from_currency
    exchange_rate: AFN per 1 USD
    """
    kind = (kind or "").strip().lower()
    from_ccy = (from_currency or "").upper()
    to_ccy = (to_currency or "").upper()
    amt = _d(amount)
    rate = Decimal(str(exchange_rate or "0"))

    if kind not in ("customer", "supplier"):
        raise ValueError("kind must be customer or supplier.")
    if from_ccy not in ("AFN", "USD") or to_ccy not in ("AFN", "USD"):
        raise ValueError("Currencies must be AFN or USD.")
    if from_ccy == to_ccy:
        raise ValueError("from_currency and to_currency must differ.")
    if amt <= 0:
        raise ValueError("amount must be greater than zero.")
    if rate <= 0:
        raise ValueError("exchange_rate (AFN per 1 USD) is required.")

    if kind == "customer":
        contact = Customer.objects.filter(pk=contact_id, is_deleted=False).first()
        if not contact:
            raise ValueError(f"Customer #{contact_id} not found.")
        customer, supplier = contact, None
        afn_code, usd_code = AR_AFN, AR_USD
        label = f"Customer #{contact_id} {contact.name}"
    else:
        contact = Supplier.objects.filter(pk=contact_id, is_deleted=False).first()
        if not contact:
            raise ValueError(f"Supplier #{contact_id} not found.")
        customer, supplier = None, contact
        afn_code, usd_code = AP_AFN, AP_USD
        label = f"Supplier #{contact_id} {contact.name}"

    afn_acc = account_by_code(afn_code)
    usd_acc = account_by_code(usd_code)
    afn_home, usd_amt = _amounts(from_ccy, amt, rate)

    date = entry_date or timezone.now().date()
    direction = f"{from_ccy}→{to_ccy}"
    default_memo = f"Currency conversion {direction} — {label}"
    entry = JournalEntry.objects.create(
        reference=f"FX-{kind[:3].upper()}-{contact_id}-{from_ccy}{to_ccy}",
        memo=(memo or "").strip() or default_memo,
        entry_date=date,
        source_type=JournalEntry.SourceType.CURRENCY_CONVERSION,
        source_id=contact_id,
        created_by=created_by if getattr(created_by, "is_authenticated", False) else None,
    )

    if kind == "customer":
        if from_ccy == "USD" and to_ccy == "AFN":
            _add_line(
                entry,
                usd_acc,
                Decimal("0"),
                afn_home,
                line_memo=f"Close AR USD {usd_amt}",
                customer=customer,
                **_usd_line_kwargs(usd_amt, rate, "credit"),
            )
            _add_line(
                entry,
                afn_acc,
                afn_home,
                Decimal("0"),
                line_memo=f"Open AR AFN {afn_home}",
                customer=customer,
            )
        else:
            _add_line(
                entry,
                afn_acc,
                Decimal("0"),
                afn_home,
                line_memo=f"Close AR AFN {afn_home}",
                customer=customer,
            )
            _add_line(
                entry,
                usd_acc,
                afn_home,
                Decimal("0"),
                line_memo=f"Open AR USD {usd_amt}",
                customer=customer,
                **_usd_line_kwargs(usd_amt, rate, "debit"),
            )
    else:
        if from_ccy == "USD" and to_ccy == "AFN":
            _add_line(
                entry,
                usd_acc,
                afn_home,
                Decimal("0"),
                line_memo=f"Close AP USD {usd_amt}",
                supplier=supplier,
                **_usd_line_kwargs(usd_amt, rate, "debit"),
            )
            _add_line(
                entry,
                afn_acc,
                Decimal("0"),
                afn_home,
                line_memo=f"Open AP AFN {afn_home}",
                supplier=supplier,
            )
        else:
            _add_line(
                entry,
                afn_acc,
                afn_home,
                Decimal("0"),
                line_memo=f"Close AP AFN {afn_home}",
                supplier=supplier,
            )
            _add_line(
                entry,
                usd_acc,
                Decimal("0"),
                afn_home,
                line_memo=f"Open AP USD {usd_amt}",
                supplier=supplier,
                **_usd_line_kwargs(usd_amt, rate, "credit"),
            )

    _assert_balanced(entry)
    return entry
