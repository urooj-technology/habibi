from decimal import Decimal


def to_home_afn(amount, currency: str, exchange_rate) -> Decimal:
    """
    Convert a document amount into home ledger currency (AFN).

    - AFN amounts are stored as-is on the document.
    - USD amounts use ``exchange_rate`` as AFN per 1 USD (same convention as ``Sale`` profit logic).
    """
    if amount is None:
        amount = Decimal("0")
    cur = (currency or "AFN").upper()
    rate = exchange_rate if exchange_rate is not None else Decimal("0")
    rate = Decimal(rate)
    amt = Decimal(amount)
    if cur == "AFN":
        return amt.quantize(Decimal("0.01"))
    if cur == "USD":
        if rate > 0:
            return (amt * rate).quantize(Decimal("0.01"))
    return Decimal("0.00")


def to_usd(amount, currency: str, exchange_rate) -> Decimal:
    """
    Convert an amount into USD for inventory asset posting.

    Inventory GL is always USD. ``exchange_rate`` is AFN per 1 USD.
    - USD amounts pass through.
    - AFN amounts use amount / exchange_rate.
    """
    if amount is None:
        amount = Decimal("0")
    cur = (currency or "AFN").upper()
    rate = Decimal(exchange_rate if exchange_rate is not None else 0)
    amt = Decimal(amount)
    if cur == "USD":
        return amt.quantize(Decimal("0.01"))
    if cur == "AFN" and rate > 0:
        return (amt / rate).quantize(Decimal("0.01"))
    return Decimal("0.00")


def payment_amount_home(amount, currency: str, exchange_rate) -> Decimal:
    """Sale/Purchase payment row: AFN is home; USD uses AFN-per-USD rate when present."""
    return to_home_afn(amount, currency, exchange_rate)
