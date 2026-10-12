from decimal import Decimal


def to_home_afn(amount, currency: str = None, exchange_rate=None) -> Decimal:
    """Amounts are Afghani — pass through."""
    if amount is None:
        amount = Decimal("0")
    return Decimal(amount).quantize(Decimal("0.01"))


def payment_amount_home(amount, currency: str = None, exchange_rate=None) -> Decimal:
    return to_home_afn(amount)
