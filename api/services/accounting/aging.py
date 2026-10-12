"""Customer and vendor aging from open AR/AP subledger balances."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalLine
from api.models.data.customer import Customer
from api.models.data.supplier import Supplier


def _role_account(*, role: str, currency: str) -> AccountingAccount | None:
    return AccountingAccount.objects.filter(
        role=role,
        currency=currency,
        is_active=True,
    ).first()


def _contact_balance(*, account: AccountingAccount, contact_field: str, contact_id: int, as_of: date) -> Decimal:
    qs = JournalLine.objects.filter(
        account=account,
        entry__entry_date__lte=as_of,
        **{contact_field: contact_id},
    )
    if account.currency == AccountingAccount.Currency.USD:
        deb = qs.filter(foreign_currency="USD").aggregate(v=Sum("debit_foreign"))["v"] or Decimal("0")
        cred = qs.filter(foreign_currency="USD").aggregate(v=Sum("credit_foreign"))["v"] or Decimal("0")
        if deb == 0 and cred == 0:
            deb = qs.aggregate(v=Sum("debit_home"))["v"] or Decimal("0")
            cred = qs.aggregate(v=Sum("credit_home"))["v"] or Decimal("0")
    else:
        deb = qs.aggregate(v=Sum("debit_home"))["v"] or Decimal("0")
        cred = qs.aggregate(v=Sum("credit_home"))["v"] or Decimal("0")
    return (Decimal(deb) - Decimal(cred)).quantize(Decimal("0.01"))


def build_vendor_aging(*, currency: str, as_of: date | None = None) -> dict:
    as_of = as_of or timezone.now().date()
    account = _role_account(role=AccountingAccount.Role.AP, currency=currency)
    rows = []
    total = Decimal("0")
    if not account:
        return {"as_of": as_of.isoformat(), "currency": currency, "rows": rows, "total": "0.00"}

    for supplier in Supplier.objects.filter(is_deleted=False).order_by("name"):
        balance = _contact_balance(
            account=account,
            contact_field="supplier_id",
            contact_id=supplier.id,
            as_of=as_of,
        )
        payable = (-balance).quantize(Decimal("0.01"))
        if payable <= 0:
            continue
        rows.append({"supplier_id": supplier.id, "name": supplier.name, "balance": str(payable)})
        total += payable
    return {"as_of": as_of.isoformat(), "currency": currency, "rows": rows, "total": str(total.quantize(Decimal("0.01")))}


def build_customer_receivables(*, currency: str, as_of: date | None = None) -> dict:
    """Customers who owe the business (open AR subledger balances)."""
    as_of = as_of or timezone.now().date()
    account = _role_account(role=AccountingAccount.Role.AR, currency=currency)
    rows = []
    total = Decimal("0")
    if not account:
        return {"as_of": as_of.isoformat(), "currency": currency, "rows": rows, "total": "0.00"}

    for customer in Customer.objects.filter(is_deleted=False).order_by("name"):
        balance = _contact_balance(
            account=account,
            contact_field="customer_id",
            contact_id=customer.id,
            as_of=as_of,
        )
        receivable = balance.quantize(Decimal("0.01"))
        if receivable <= 0:
            continue
        rows.append({"customer_id": customer.id, "name": customer.name, "balance": str(receivable)})
        total += receivable
    return {"as_of": as_of.isoformat(), "currency": currency, "rows": rows, "total": str(total.quantize(Decimal("0.01")))}


def get_subledger_account(*, kind: str, currency: str) -> AccountingAccount | None:
    role = (
        AccountingAccount.Role.AR
        if kind == "customer"
        else AccountingAccount.Role.AP
    )
    return _role_account(role=role, currency=currency)
