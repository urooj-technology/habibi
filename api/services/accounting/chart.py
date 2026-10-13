from api.models.accounting.account import AccountingAccount

# Single-currency chart (Afghani). Created by ensure_default_chart() post_migrate.
DEFAULT_ACCOUNTS = [
    ("1000", "Cash on Hand", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.CASH),
    ("1010", "Bank — Main", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.BANK),
    ("1100", "Accounts Receivable", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.AR),
    ("1150", "Supplier Prepayments", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.NONE),
    ("1200", "Inventory", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.INVENTORY),
    ("2000", "Accounts Payable", AccountingAccount.AccountType.LIABILITY, AccountingAccount.Role.AP),
    (
        "2050",
        "Customer Advances",
        AccountingAccount.AccountType.LIABILITY,
        AccountingAccount.Role.CUSTOMER_ADVANCE,
    ),
    ("2100", "Owner Capital — Ahmad", AccountingAccount.AccountType.EQUITY, AccountingAccount.Role.NONE),
    ("2200", "Owner Capital — Mehmood", AccountingAccount.AccountType.EQUITY, AccountingAccount.Role.NONE),
    (
        "2300",
        "Opening Balance Equity",
        AccountingAccount.AccountType.EQUITY,
        AccountingAccount.Role.OPENING_BALANCE_EQUITY,
    ),
    ("4000", "Sales Revenue", AccountingAccount.AccountType.INCOME, AccountingAccount.Role.SALES),
    ("5000", "Cost of Goods Sold", AccountingAccount.AccountType.EXPENSE, AccountingAccount.Role.COGS),
    (
        "6000",
        "Operating Expenses — General & Administrative",
        AccountingAccount.AccountType.EXPENSE,
        AccountingAccount.Role.OPERATING_EXPENSE,
    ),
    (
        "6100",
        "Salaries & Wages",
        AccountingAccount.AccountType.EXPENSE,
        AccountingAccount.Role.OPERATING_EXPENSE,
    ),
    (
        "2150",
        "Wages Payable",
        AccountingAccount.AccountType.LIABILITY,
        AccountingAccount.Role.NONE,
    ),
]


def ensure_default_chart() -> None:
    for code, name, account_type, role in DEFAULT_ACCOUNTS:
        AccountingAccount.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "currency": "AFN",
                "account_type": account_type,
                "role": role,
                "is_active": True,
            },
        )


def account_by_code(code: str) -> AccountingAccount:
    ensure_default_chart()
    return AccountingAccount.objects.get(code=code, is_active=True)


def opening_balance_equity_account(*, currency: str = None) -> AccountingAccount:
    ensure_default_chart()
    acc = (
        AccountingAccount.objects.filter(
            role=AccountingAccount.Role.OPENING_BALANCE_EQUITY,
            is_active=True,
        )
        .order_by("code")
        .first()
    )
    if acc:
        return acc
    return account_by_code("2300")


def resolve_cash_bank_account(account_id, *, currency: str = None) -> AccountingAccount | None:
    """
    Resolve a cash/bank GL account for operational receipts/payments.
    Only accepts active CASH/BANK roles — no silent fallback to code 1000
    when an invalid account id is supplied.
    """
    ensure_default_chart()
    if account_id:
        acc = AccountingAccount.objects.filter(pk=account_id, is_active=True).first()
        if acc and acc.role in (
            AccountingAccount.Role.CASH,
            AccountingAccount.Role.BANK,
        ):
            return acc
        return None
    return None
