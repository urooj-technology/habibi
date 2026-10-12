from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalEntry, JournalLine
from api.services.accounting.chart import account_by_code, resolve_cash_bank_account
from api.services.accounting.money import to_home_afn, to_usd


# Inventory asset (and matching COGS) always posts to the USD chart accounts.
INVENTORY_USD = "1201"
COGS_USD = "5001"


def _post_usd_inventory_movement(
    entry: JournalEntry,
    *,
    debit_account: AccountingAccount,
    credit_account: AccountingAccount,
    cost_amount: Decimal,
    cost_currency: str,
    doc_currency: str,
    exchange_rate,
    debit_memo: str,
    credit_memo: str,
) -> None:
    """
    Post a balanced inventory/COGS pair onto USD accounts.

    - Document USD: USD in debit_home/credit_home; AFN equivalent in *_foreign.
    - Document AFN: AFN in debit_home/credit_home (keeps the journal balanced with
      AR/AP AFN legs); USD inventory amount in *_foreign with foreign_currency=USD
      so the USD inventory account balance reads correctly.
    """
    cost_ccy = (cost_currency or "AFN").upper()
    doc_ccy = (doc_currency or "AFN").upper()
    amt = Decimal(cost_amount or 0).quantize(Decimal("0.01"))
    if amt <= 0:
        return

    usd_amt = to_usd(amt, cost_ccy, exchange_rate)
    if usd_amt <= 0:
        return

    if doc_ccy == "USD":
        # Cost may be AFN buy_price — already converted to usd_amt.
        afn_equiv = to_home_afn(usd_amt, "USD", exchange_rate)
        _add_line(
            entry,
            debit_account,
            usd_amt,
            Decimal("0"),
            line_memo=debit_memo,
            debit_foreign=afn_equiv if afn_equiv > 0 else None,
            foreign_currency="AFN" if afn_equiv > 0 else "",
            exchange_rate=exchange_rate if afn_equiv > 0 else None,
        )
        _add_line(
            entry,
            credit_account,
            Decimal("0"),
            usd_amt,
            line_memo=credit_memo,
            credit_foreign=afn_equiv if afn_equiv > 0 else None,
            foreign_currency="AFN" if afn_equiv > 0 else "",
            exchange_rate=exchange_rate if afn_equiv > 0 else None,
        )
        return

    # AFN document: keep AFN in home columns for entry balance.
    if cost_ccy == "AFN":
        afn_home = amt
    else:
        afn_home = to_home_afn(amt, "USD", exchange_rate)
    if afn_home <= 0:
        return
    _add_line(
        entry,
        debit_account,
        afn_home,
        Decimal("0"),
        line_memo=debit_memo,
        debit_foreign=usd_amt,
        foreign_currency="USD",
        exchange_rate=exchange_rate,
    )
    _add_line(
        entry,
        credit_account,
        Decimal("0"),
        afn_home,
        line_memo=credit_memo,
        credit_foreign=usd_amt,
        foreign_currency="USD",
        exchange_rate=exchange_rate,
    )

def _delete_source(source_type: str, source_id: int) -> None:
    JournalEntry.objects.filter(source_type=source_type, source_id=source_id).delete()


def _add_line(
    entry: JournalEntry,
    account: AccountingAccount,
    debit_home: Decimal,
    credit_home: Decimal,
    *,
    line_memo: str = "",
    customer=None,
    supplier=None,
    debit_foreign=None,
    credit_foreign=None,
    foreign_currency: str = "",
    exchange_rate=None,
) -> None:
    # Backward compatibility: keep foreign_amount populated as a signed net if provided
    foreign_amount = None
    if debit_foreign is not None or credit_foreign is not None:
        df = Decimal(str(debit_foreign or 0))
        cf = Decimal(str(credit_foreign or 0))
        foreign_amount = (df - cf).quantize(Decimal("0.0001"))
    JournalLine.objects.create(
        entry=entry,
        account=account,
        debit_home=debit_home,
        credit_home=credit_home,
        line_memo=line_memo,
        customer=customer,
        supplier=supplier,
        debit_foreign=debit_foreign,
        credit_foreign=credit_foreign,
        foreign_amount=foreign_amount,
        foreign_currency=foreign_currency or "",
        exchange_rate=exchange_rate,
    )


def _assert_balanced(entry: JournalEntry) -> None:
    lines = entry.lines.all()
    td = sum((l.debit_home for l in lines), Decimal("0"))
    tc = sum((l.credit_home for l in lines), Decimal("0"))
    if td != tc:
        raise ValueError(f"Unbalanced journal {entry.pk}: debit {td} credit {tc}")


def _sale_item_cost(item) -> tuple[Decimal, str]:
    """
    Estimate sale item's cost in its buy_currency as: buy_price × cost qty.

    buy_price is the inventory unit cost from purchases (e.g. 10 per kg).
    Quantity MUST use the same unit as that buy_price (inventory.buy_pricing_base),
    NOT the sale line's pricing_base (e.g. selling by khada while cost is per kg).

    Example: buy 1000kg @ 10/kg; sell 100kg / 10 khada by khada → cost = 10 × 100kg = 1000
    (not 10 × 10 khada = 100).
    """
    buy_price = item.buy_price or Decimal("0.00")
    if buy_price <= 0:
        return (Decimal("0.00"), (getattr(item, "buy_currency", "") or "AFN").upper())

    inventory = getattr(item, "inventory", None)
    product = getattr(inventory, "product", None)
    if not product:
        return (Decimal("0.00"), (getattr(item, "buy_currency", "") or "AFN").upper())

    def _d(v) -> Decimal:
        try:
            return Decimal(str(v or "0")).quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    amount_by_unit = {
        "weight": "weight_amount",
        "meter": "meter_amount",
        "khada": "khada_amount",
        "grain": "grain_amount",
    }

    units = []
    if getattr(product, "is_weight", False):
        units.append("weight")
    if getattr(product, "is_meter", False):
        units.append("meter")
    if getattr(product, "is_khada", False):
        units.append("khada")
    if getattr(product, "is_grain", False):
        units.append("grain")

    # Cost unit = purchase unit stored on inventory (not sale pricing_base).
    cost_base = (getattr(inventory, "buy_pricing_base", None) or "").strip()
    if cost_base not in amount_by_unit or (units and cost_base not in units):
        if len(units) == 1:
            cost_base = units[0]
        elif "weight" in units:
            cost_base = "weight"
        elif units:
            cost_base = units[0]
        else:
            cost_base = "weight"

    qty = _d(getattr(item, amount_by_unit[cost_base], None))

    if qty <= 0:
        # Last resort: try other measured qtys on the line so we don't under-cost.
        for unit in units:
            alt = _d(getattr(item, amount_by_unit[unit], None))
            if alt > 0:
                qty = alt
                break
        if qty <= 0:
            qty = Decimal("1.00")

    cur = (getattr(item, "buy_currency", "") or "AFN").upper()
    return ((buy_price * qty).quantize(Decimal("0.01")), cur)


@transaction.atomic
def sync_sale(sale) -> None:
    _delete_source(JournalEntry.SourceType.SALE, sale.pk)
    if getattr(sale, "is_deleted", False):
        return
    total = sale.total_amount or Decimal("0")
    if total <= 0:
        return

    cur = (sale.currency or "AFN").upper()
    recv = sale.received_amount or Decimal("0")

    # Same posting policy as purchases (see sync_purchase).
    if cur == "USD":
        rev_amt = Decimal(total).quantize(Decimal("0.01"))
        recv_amt = Decimal(recv).quantize(Decimal("0.01"))
        if recv_amt > rev_amt:
            recv_amt = rev_amt
        rev_equiv_afn = to_home_afn(rev_amt, "USD", sale.exchange_rate)
        recv_equiv_afn = to_home_afn(recv_amt, "USD", sale.exchange_rate)
        if rev_equiv_afn <= 0:
            return
    else:
        rev_amt = Decimal(total).quantize(Decimal("0.01"))
        recv_amt = Decimal(recv).quantize(Decimal("0.01"))
        if recv_amt > rev_amt:
            recv_amt = rev_amt
        rev_equiv_afn = None
        recv_equiv_afn = None

    sales_acc = account_by_code("4001" if cur == "USD" else "4000")
    ar_acc = account_by_code("1101" if cur == "USD" else "1100")
    # Inventory/COGS currency is driven by the items' buy_currency, not the sale currency.
    entry_date = (sale.sale_date or timezone.now()).date()
    entry = JournalEntry.objects.create(
        reference=f"SALE-{sale.pk}",
        memo=f"Sale invoice #{sale.pk}",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.SALE,
        source_id=sale.pk,
    )

    cash_acc = resolve_cash_bank_account(getattr(sale, "payment_account_id", None), currency=cur)
    ar_amount = rev_amt - recv_amt
    if recv_amt > 0 and cash_acc:
        _add_line(
            entry,
            cash_acc,
            recv_amt,
            Decimal("0"),
            line_memo="Cash/bank at invoice",
            debit_foreign=recv_equiv_afn,
            foreign_currency="AFN" if cur == "USD" else "",
            exchange_rate=sale.exchange_rate if cur == "USD" else None,
        )
    elif recv_amt > 0 and not cash_acc:
        ar_amount = rev_amt

    if ar_amount > 0:
        _add_line(
            entry,
            ar_acc,
            ar_amount,
            Decimal("0"),
            line_memo="Accounts receivable",
            customer=sale.customer,
            debit_foreign=(
                (rev_equiv_afn or Decimal("0")) - (recv_equiv_afn or Decimal("0"))
                if cur == "USD"
                else None
            ),
            foreign_currency="AFN" if cur == "USD" else "",
            exchange_rate=sale.exchange_rate if cur == "USD" else None,
        )
    _add_line(
        entry,
        sales_acc,
        Decimal("0"),
        rev_amt,
        line_memo="Revenue",
        credit_foreign=rev_equiv_afn,
        foreign_currency="AFN" if cur == "USD" else "",
        exchange_rate=sale.exchange_rate if cur == "USD" else None,
    )

    # Perpetual inventory: always reduce USD inventory (1201) / COGS (5001).
    # AFN buy costs are converted with the sale exchange rate (AFN per 1 USD).
    # Customer AR / cash / revenue stay in the sale document currency above.
    inv_acc = account_by_code(INVENTORY_USD)
    cogs_acc = account_by_code(COGS_USD)
    totals: dict[str, Decimal] = {}
    for it in sale.sale_items.all():
        amt, c = _sale_item_cost(it)
        totals[c] = (totals.get(c) or Decimal("0.00")) + amt

    for c, amt in totals.items():
        _post_usd_inventory_movement(
            entry,
            debit_account=cogs_acc,
            credit_account=inv_acc,
            cost_amount=amt,
            cost_currency=c,
            doc_currency=cur,
            exchange_rate=sale.exchange_rate,
            debit_memo=f"COGS / inventory out ({c}→USD)",
            credit_memo=f"Inventory out ({c}→USD)",
        )
    _assert_balanced(entry)


@transaction.atomic
def sync_sale_return(sale_return) -> None:
    """
    Reverse of sync_sale for a credit note:
    - Dr Sales revenue for return total
    - Cr Cash/Bank for refunded_amount (if any)
    - Cr AR (customer) for the remainder
    - Dr Inventory / Cr COGS to restore stock cost
    """
    _delete_source(JournalEntry.SourceType.SALE_RETURN, sale_return.pk)
    if getattr(sale_return, "is_deleted", False):
        return
    total = sale_return.total_amount or Decimal("0")
    if total <= 0:
        return

    cur = (sale_return.currency or "AFN").upper()
    refund = sale_return.refunded_amount or Decimal("0")

    if cur == "USD":
        rev_amt = Decimal(total).quantize(Decimal("0.01"))
        refund_amt = Decimal(refund).quantize(Decimal("0.01"))
        if refund_amt > rev_amt:
            refund_amt = rev_amt
        rev_equiv_afn = to_home_afn(rev_amt, "USD", sale_return.exchange_rate)
        refund_equiv_afn = to_home_afn(refund_amt, "USD", sale_return.exchange_rate)
        if rev_equiv_afn <= 0:
            return
    else:
        rev_amt = Decimal(total).quantize(Decimal("0.01"))
        refund_amt = Decimal(refund).quantize(Decimal("0.01"))
        if refund_amt > rev_amt:
            refund_amt = rev_amt
        rev_equiv_afn = None
        refund_equiv_afn = None

    sales_acc = account_by_code("4001" if cur == "USD" else "4000")
    ar_acc = account_by_code("1101" if cur == "USD" else "1100")
    entry_date = (sale_return.return_date or timezone.now()).date()
    entry = JournalEntry.objects.create(
        reference=f"SALE-RET-{sale_return.pk}",
        memo=f"Sales return #{sale_return.pk} (Sale #{sale_return.sale_id})",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.SALE_RETURN,
        source_id=sale_return.pk,
    )

    # Reverse revenue
    _add_line(
        entry,
        sales_acc,
        rev_amt,
        Decimal("0"),
        line_memo="Sales returns / credit note",
        debit_foreign=rev_equiv_afn,
        foreign_currency="AFN" if cur == "USD" else "",
        exchange_rate=sale_return.exchange_rate if cur == "USD" else None,
    )

    cash_acc = resolve_cash_bank_account(
        getattr(sale_return, "refund_account_id", None), currency=cur
    )
    ar_credit = rev_amt - refund_amt
    if refund_amt > 0 and cash_acc:
        _add_line(
            entry,
            cash_acc,
            Decimal("0"),
            refund_amt,
            line_memo="Cash/bank refund",
            credit_foreign=refund_equiv_afn,
            foreign_currency="AFN" if cur == "USD" else "",
            exchange_rate=sale_return.exchange_rate if cur == "USD" else None,
        )
    elif refund_amt > 0 and not cash_acc:
        ar_credit = rev_amt

    if ar_credit > 0:
        _add_line(
            entry,
            ar_acc,
            Decimal("0"),
            ar_credit,
            line_memo="Credit to customer AR",
            customer=sale_return.customer,
            credit_foreign=(
                (rev_equiv_afn or Decimal("0")) - (refund_equiv_afn or Decimal("0"))
                if cur == "USD"
                else None
            ),
            foreign_currency="AFN" if cur == "USD" else "",
            exchange_rate=sale_return.exchange_rate if cur == "USD" else None,
        )

    # Restore USD inventory / reverse USD COGS (always 1201 / 5001).
    inv_acc = account_by_code(INVENTORY_USD)
    cogs_acc = account_by_code(COGS_USD)
    totals: dict[str, Decimal] = {}
    for it in sale_return.items.all():
        amt, c = _sale_item_cost(it)
        totals[c] = (totals.get(c) or Decimal("0.00")) + amt

    for c, amt in totals.items():
        _post_usd_inventory_movement(
            entry,
            debit_account=inv_acc,
            credit_account=cogs_acc,
            cost_amount=amt,
            cost_currency=c,
            doc_currency=cur,
            exchange_rate=sale_return.exchange_rate,
            debit_memo=f"Inventory restored ({c}→USD)",
            credit_memo=f"COGS reverse ({c}→USD)",
        )
    _assert_balanced(entry)


@transaction.atomic
def sync_purchase(purchase) -> None:
    _delete_source(JournalEntry.SourceType.PURCHASE, purchase.pk)
    if getattr(purchase, "is_deleted", False):
        return
    total = purchase.total_amount or Decimal("0")
    if total <= 0:
        return

    cur = (purchase.currency or "AFN").upper()
    recv = purchase.received_amount or Decimal("0")

    # Posting policy:
    # - Supplier AP / cash: always in the purchase document currency (2000/2001, cash).
    # - Inventory asset: ALWAYS USD account 1201.
    #   USD purchase → debit 1201 with USD in home.
    #   AFN purchase → convert via exchange_rate (AFN per USD), store AFN in home
    #   (balances AP) and USD in foreign for the inventory account balance.
    if cur == "USD":
        doc_amt = Decimal(total).quantize(Decimal("0.01"))
        recv_amt = Decimal(recv).quantize(Decimal("0.01"))
        if recv_amt > doc_amt:
            recv_amt = doc_amt
        inv_equiv_afn = to_home_afn(doc_amt, "USD", purchase.exchange_rate)
        recv_equiv_afn = to_home_afn(recv_amt, "USD", purchase.exchange_rate)
        if inv_equiv_afn <= 0:
            return
        inv_home = doc_amt
        inv_foreign = inv_equiv_afn
        inv_foreign_ccy = "AFN"
    else:
        doc_amt = Decimal(total).quantize(Decimal("0.01"))  # AFN
        recv_amt = Decimal(recv).quantize(Decimal("0.01"))
        if recv_amt > doc_amt:
            recv_amt = doc_amt
        inv_usd = to_usd(doc_amt, "AFN", purchase.exchange_rate)
        if inv_usd <= 0:
            # AFN purchases need a valid exchange rate to post USD inventory.
            return
        inv_home = doc_amt
        inv_foreign = inv_usd
        inv_foreign_ccy = "USD"
        inv_equiv_afn = None
        recv_equiv_afn = None

    inv_acc = account_by_code(INVENTORY_USD)
    ap_acc = account_by_code("2001" if cur == "USD" else "2000")
    entry_date = purchase.purchase_date or timezone.now().date()
    entry = JournalEntry.objects.create(
        reference=f"PUR-{purchase.pk}",
        memo=f"Purchase #{purchase.pk}",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.PURCHASE,
        source_id=purchase.pk,
    )

    cash_acc = resolve_cash_bank_account(
        getattr(purchase, "payment_account_id", None), currency=cur
    )
    ap_amount = doc_amt - recv_amt
    if recv_amt > 0 and cash_acc:
        _add_line(
            entry,
            cash_acc,
            Decimal("0"),
            recv_amt,
            line_memo="Cash/bank at bill",
            credit_foreign=recv_equiv_afn,
            foreign_currency="AFN" if cur == "USD" else "",
            exchange_rate=purchase.exchange_rate if cur == "USD" else None,
        )
    elif recv_amt > 0 and not cash_acc:
        ap_amount = doc_amt

    _add_line(
        entry,
        inv_acc,
        inv_home,
        Decimal("0"),
        line_memo="Inventory / purchases (USD asset)",
        debit_foreign=inv_foreign,
        foreign_currency=inv_foreign_ccy,
        exchange_rate=purchase.exchange_rate,
    )
    if ap_amount > 0:
        _add_line(
            entry,
            ap_acc,
            Decimal("0"),
            ap_amount,
            line_memo="Accounts payable",
            supplier=purchase.supplier,
            credit_foreign=(
                (inv_equiv_afn or Decimal("0")) - (recv_equiv_afn or Decimal("0"))
                if cur == "USD"
                else None
            ),
            foreign_currency="AFN" if cur == "USD" else "",
            exchange_rate=purchase.exchange_rate if cur == "USD" else None,
        )
    _assert_balanced(entry)


@transaction.atomic
def create_manual_journal(
    *,
    entry_date,
    reference: str,
    memo: str,
    lines_data: list[dict],
    user,
) -> JournalEntry:
    """
    lines_data: list of dicts with keys:
    account_id, debit_home, credit_home, line_memo (opt),
    customer_id (opt), supplier_id (opt)
    """
    from api.models.data.customer import Customer
    from api.models.data.supplier import Supplier

    entry = JournalEntry.objects.create(
        reference=reference or "",
        memo=memo or "",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.MANUAL,
        source_id=None,
        created_by=user if user and user.is_authenticated else None,
    )
    total_debit = Decimal("0")
    total_credit = Decimal("0")
    for row in lines_data:
        acc = AccountingAccount.objects.get(pk=row["account_id"], is_active=True)
        dr = Decimal(str(row.get("debit_home") or "0")).quantize(Decimal("0.01"))
        cr = Decimal(str(row.get("credit_home") or "0")).quantize(Decimal("0.01"))
        if dr > 0 and cr > 0:
            raise ValueError("Each line must be either debit or credit in home currency.")
        total_debit += dr
        total_credit += cr
        cust = None
        sup = None
        if row.get("customer_id"):
            cust = Customer.objects.filter(pk=row["customer_id"]).first()
        if row.get("supplier_id"):
            sup = Supplier.objects.filter(pk=row["supplier_id"]).first()
        _add_line(
            entry,
            acc,
            dr,
            cr,
            line_memo=row.get("line_memo") or "",
            customer=cust,
            supplier=sup,
        )
    if total_debit != total_credit:
        entry.delete()
        raise ValueError("Manual journal must balance in home currency (AFN).")
    _assert_balanced(entry)
    return entry


@transaction.atomic
def update_manual_journal(
    *,
    entry: JournalEntry,
    entry_date,
    reference: str,
    memo: str,
    lines_data: list[dict],
    user,
) -> JournalEntry:
    """
    Update an existing MANUAL journal entry by replacing its lines.
    System-generated journals are not allowed to be modified through this function.
    """
    from api.models.data.customer import Customer
    from api.models.data.supplier import Supplier

    if entry.source_type != JournalEntry.SourceType.MANUAL:
        raise ValueError("Only MANUAL journal entries can be updated.")

    # Update header fields
    entry.entry_date = entry_date
    entry.reference = reference or ""
    entry.memo = memo or ""
    entry.save(update_fields=["entry_date", "reference", "memo"])

    # Replace lines wholesale (simpler + mirrors Django admin inline behavior).
    JournalLine.objects.filter(entry=entry).delete()

    total_debit = Decimal("0")
    total_credit = Decimal("0")
    for row in lines_data:
        acc = AccountingAccount.objects.get(pk=row["account_id"], is_active=True)
        dr = Decimal(str(row.get("debit_home") or "0")).quantize(Decimal("0.01"))
        cr = Decimal(str(row.get("credit_home") or "0")).quantize(Decimal("0.01"))
        if dr > 0 and cr > 0:
            raise ValueError("Each line must be either debit or credit in home currency.")
        total_debit += dr
        total_credit += cr
        cust = None
        sup = None
        if row.get("customer_id"):
            cust = Customer.objects.filter(pk=row["customer_id"]).first()
        if row.get("supplier_id"):
            sup = Supplier.objects.filter(pk=row["supplier_id"]).first()
        _add_line(
            entry,
            acc,
            dr,
            cr,
            line_memo=row.get("line_memo") or "",
            customer=cust,
            supplier=sup,
        )

    if total_debit != total_credit:
        entry.delete()
        raise ValueError("Manual journal must balance in home currency (AFN).")

    _assert_balanced(entry)
    return entry
