"""Financial statement builders (single company, account-currency aware)."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Q, Sum

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalLine


def _signed_balance(debit: Decimal, credit: Decimal) -> Decimal:
    return (debit - credit).quantize(Decimal("0.01"))


def _line_totals(qs, currency: str) -> tuple[Decimal, Decimal]:
    if currency == AccountingAccount.Currency.AFN:
        deb = qs.aggregate(v=Sum("debit_home"))["v"] or Decimal("0")
        cred = qs.aggregate(v=Sum("credit_home"))["v"] or Decimal("0")
        return Decimal(deb), Decimal(cred)

    deb = qs.filter(foreign_currency="USD").aggregate(v=Sum("debit_foreign"))["v"] or Decimal("0")
    cred = qs.filter(foreign_currency="USD").aggregate(v=Sum("credit_foreign"))["v"] or Decimal("0")
    if deb == 0 and cred == 0:
        deb = qs.aggregate(v=Sum("debit_home"))["v"] or Decimal("0")
        cred = qs.aggregate(v=Sum("credit_home"))["v"] or Decimal("0")
    return Decimal(deb), Decimal(cred)


def account_period_net(account_id: int, date_from: str, date_to: str, currency: str) -> Decimal:
    qs = JournalLine.objects.filter(
        account_id=account_id,
        entry__entry_date__gte=date_from,
        entry__entry_date__lte=date_to,
    )
    deb, cred = _line_totals(qs, currency)
    return _signed_balance(deb, cred)


def account_balance_as_of(account_id: int, as_of: str, currency: str) -> Decimal:
    qs = JournalLine.objects.filter(account_id=account_id, entry__entry_date__lte=as_of)
    deb, cred = _line_totals(qs, currency)
    return _signed_balance(deb, cred)


def build_general_ledger(account_id: int, date_from: str, date_to: str) -> dict:
    account = AccountingAccount.objects.get(pk=account_id)
    currency = account.currency
    opening = account_balance_as_of(account_id, date_from, currency)
    running = opening
    lines = []
    qs = (
        JournalLine.objects.filter(
            account_id=account_id,
            entry__entry_date__gte=date_from,
            entry__entry_date__lte=date_to,
        )
        .select_related("entry")
        .order_by("entry__entry_date", "id")
    )
    for line in qs:
        if currency == AccountingAccount.Currency.USD and line.foreign_currency == "USD":
            deb = line.debit_foreign or Decimal("0")
            cred = line.credit_foreign or Decimal("0")
        else:
            deb = line.debit_home
            cred = line.credit_home
        running += deb - cred
        lines.append(
            {
                "date": line.entry.entry_date.isoformat(),
                "reference": line.entry.reference,
                "memo": line.line_memo or line.entry.memo,
                "debit": str(deb.quantize(Decimal("0.01"))),
                "credit": str(cred.quantize(Decimal("0.01"))),
                "balance": str(running.quantize(Decimal("0.01"))),
            }
        )
    return {
        "account_id": account.id,
        "account_code": account.code,
        "account_name": account.name,
        "currency": currency,
        "from": date_from,
        "to": date_to,
        "opening_balance": str(opening),
        "closing_balance": str(running.quantize(Decimal("0.01"))),
        "lines": lines,
    }


def build_profit_and_loss(date_from: str, date_to: str, currency: str) -> dict:
    income_rows = []
    expense_rows = []
    total_income = Decimal("0")
    total_expense = Decimal("0")

    for acc in AccountingAccount.objects.filter(
        is_active=True,
        account_type=AccountingAccount.AccountType.INCOME,
        currency=currency,
    ).order_by("code"):
        net = account_period_net(acc.id, date_from, date_to, currency)
        amount = -net
        if amount != 0:
            income_rows.append({"code": acc.code, "name": acc.name, "amount": str(amount)})
            total_income += amount

    for acc in AccountingAccount.objects.filter(
        is_active=True,
        account_type=AccountingAccount.AccountType.EXPENSE,
        currency=currency,
    ).order_by("code"):
        net = account_period_net(acc.id, date_from, date_to, currency)
        if net != 0:
            expense_rows.append({"code": acc.code, "name": acc.name, "amount": str(net)})
            total_expense += net

    net_profit = (total_income - total_expense).quantize(Decimal("0.01"))
    return {
        "from": date_from,
        "to": date_to,
        "currency": currency,
        "income": income_rows,
        "expenses": expense_rows,
        "total_income": str(total_income.quantize(Decimal("0.01"))),
        "total_expenses": str(total_expense.quantize(Decimal("0.01"))),
        "net_profit": str(net_profit),
    }


def _balance_sheet_amount(account_type: str, signed: Decimal) -> Decimal:
    """Convert debit−credit signed balance to natural statement amount."""
    if account_type == AccountingAccount.AccountType.ASSET:
        return signed
    if account_type in (
        AccountingAccount.AccountType.LIABILITY,
        AccountingAccount.AccountType.EQUITY,
    ):
        return -signed
    return Decimal("0")


def build_balance_sheet(as_of: str, currency: str) -> dict:
    """
    Statement of financial position as of a date (per account currency).
    Includes year-to-date net income under equity when P&L accounts are open.
    """
    assets: list[dict] = []
    liabilities: list[dict] = []
    equity: list[dict] = []
    total_assets = Decimal("0")
    total_liabilities = Decimal("0")
    total_equity = Decimal("0")

    for acc in AccountingAccount.objects.filter(
        is_active=True,
        currency=currency,
        account_type__in=(
            AccountingAccount.AccountType.ASSET,
            AccountingAccount.AccountType.LIABILITY,
            AccountingAccount.AccountType.EQUITY,
        ),
    ).order_by("code"):
        signed = account_balance_as_of(acc.id, as_of, currency)
        amount = _balance_sheet_amount(acc.account_type, signed).quantize(Decimal("0.01"))
        if amount == 0:
            continue
        row = {"code": acc.code, "name": acc.name, "balance": str(amount)}
        if acc.account_type == AccountingAccount.AccountType.ASSET:
            assets.append(row)
            total_assets += amount
        elif acc.account_type == AccountingAccount.AccountType.LIABILITY:
            liabilities.append(row)
            total_liabilities += amount
        else:
            equity.append(row)
            total_equity += amount

    year_start = f"{as_of[:4]}-01-01"
    pnl = build_profit_and_loss(year_start, as_of, currency)
    net_income = Decimal(pnl["net_profit"])
    if net_income != 0:
        equity.append(
            {
                "code": "",
                "name": "Current period net income",
                "balance": str(net_income.quantize(Decimal("0.01"))),
            }
        )
        total_equity += net_income

    total_assets = total_assets.quantize(Decimal("0.01"))
    total_liabilities = total_liabilities.quantize(Decimal("0.01"))
    total_equity = total_equity.quantize(Decimal("0.01"))
    le_total = (total_liabilities + total_equity).quantize(Decimal("0.01"))

    return {
        "as_of": as_of,
        "currency": currency,
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "total_assets": str(total_assets),
        "total_liabilities": str(total_liabilities),
        "total_equity": str(total_equity),
        "total_liabilities_and_equity": str(le_total),
        "is_balanced": total_assets == le_total,
    }
