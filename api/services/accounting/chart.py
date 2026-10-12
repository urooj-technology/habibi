from api.models.accounting.account import AccountingAccount

# Default chart — created by ensure_default_chart() from api.signals.chart (post_migrate),
# not from migrations. Avoid calling ensure_default_chart() in AppConfig.ready() (DB access warning).
# Codes aligned with the accounting proposal (subset; extend via API/admin).
DEFAULT_ACCOUNTS = [
    # AFN core accounts
    ("1000", "Cash on Hand (AFN)", "AFN", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.CASH),
    ("1010", "Bank — Main (AFN)", "AFN", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.BANK),
    ("1100", "Accounts Receivable (AFN)", "AFN", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.AR),
    ("1150", "Supplier Prepayments (AFN)", "AFN", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.NONE),
    ("1200", "Inventory (AFN)", "AFN", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.INVENTORY),
    ("2000", "Accounts Payable (AFN)", "AFN", AccountingAccount.AccountType.LIABILITY, AccountingAccount.Role.AP),
    (
        "2050",
        "Customer Advances (AFN)",
        "AFN",
        AccountingAccount.AccountType.LIABILITY,
        AccountingAccount.Role.CUSTOMER_ADVANCE,
    ),
    ("2100", "Owner Capital — Ahmad (AFN)", "AFN", AccountingAccount.AccountType.EQUITY, AccountingAccount.Role.NONE),
    ("2200", "Owner Capital — Mehmood (AFN)", "AFN", AccountingAccount.AccountType.EQUITY, AccountingAccount.Role.NONE),
    (
        "2300",
        "Opening Balance Equity (AFN)",
        "AFN",
        AccountingAccount.AccountType.EQUITY,
        AccountingAccount.Role.OPENING_BALANCE_EQUITY,
    ),
    ("4000", "Sales Revenue (AFN)", "AFN", AccountingAccount.AccountType.INCOME, AccountingAccount.Role.SALES),
    ("5000", "Cost of Goods Sold (AFN)", "AFN", AccountingAccount.AccountType.EXPENSE, AccountingAccount.Role.COGS),
    (
        "6000",
        "Operating Expenses — General & Administrative (AFN)",
        "AFN",
        AccountingAccount.AccountType.EXPENSE,
        AccountingAccount.Role.OPERATING_EXPENSE,
    ),
    (
        "6100",
        "Salaries & Wages (AFN)",
        "AFN",
        AccountingAccount.AccountType.EXPENSE,
        AccountingAccount.Role.OPERATING_EXPENSE,
    ),
    (
        "2150",
        "Wages Payable (AFN)",
        "AFN",
        AccountingAccount.AccountType.LIABILITY,
        AccountingAccount.Role.NONE,
    ),
    # USD parallel core accounts (post USD documents here)
    ("1001", "Cash on Hand (USD)", "USD", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.CASH),
    ("1011", "Bank — Main (USD)", "USD", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.BANK),
    ("1101", "Accounts Receivable (USD)", "USD", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.AR),
    ("1201", "Inventory (USD)", "USD", AccountingAccount.AccountType.ASSET, AccountingAccount.Role.INVENTORY),
    ("2001", "Accounts Payable (USD)", "USD", AccountingAccount.AccountType.LIABILITY, AccountingAccount.Role.AP),
    (
        "2301",
        "Opening Balance Equity (USD)",
        "USD",
        AccountingAccount.AccountType.EQUITY,
        AccountingAccount.Role.OPENING_BALANCE_EQUITY,
    ),
    ("4001", "Sales Revenue (USD)", "USD", AccountingAccount.AccountType.INCOME, AccountingAccount.Role.SALES),
    ("5001", "Cost of Goods Sold (USD)", "USD", AccountingAccount.AccountType.EXPENSE, AccountingAccount.Role.COGS),
    (
        "6101",
        "Salaries & Wages (USD)",
        "USD",
        AccountingAccount.AccountType.EXPENSE,
        AccountingAccount.Role.OPERATING_EXPENSE,
    ),
    (
        "2151",
        "Wages Payable (USD)",
        "USD",
        AccountingAccount.AccountType.LIABILITY,
        AccountingAccount.Role.NONE,
    ),
]


def ensure_default_chart() -> None:
    for code, name, currency, account_type, role in DEFAULT_ACCOUNTS:
        AccountingAccount.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "currency": currency,
                "account_type": account_type,
                "role": role,
                "is_active": True,
            },
        )


def account_by_code(code: str) -> AccountingAccount:
    ensure_default_chart()
    return AccountingAccount.objects.get(code=code, is_active=True)


def opening_balance_equity_account(*, currency: str = "AFN") -> AccountingAccount:
    """Equity offset used to keep opening-balance journals balanced."""
    ensure_default_chart()
    ccy = (currency or "AFN").upper()
    acc = (
        AccountingAccount.objects.filter(
            role=AccountingAccount.Role.OPENING_BALANCE_EQUITY,
            currency=ccy,
            is_active=True,
        )
        .order_by("code")
        .first()
    )
    if acc:
        return acc
    return account_by_code("2301" if ccy == "USD" else "2300")


def resolve_cash_bank_account(account_id, *, currency: str = "AFN") -> AccountingAccount | None:
    """Explicit payment account, else default cash for the document currency."""
    ensure_default_chart()
    if account_id:
        acc = AccountingAccount.objects.filter(pk=account_id, is_active=True).first()
        if acc:
            return acc
    code = "1001" if (currency or "AFN").upper() == "USD" else "1000"
    return AccountingAccount.objects.filter(code=code, is_active=True).first()
