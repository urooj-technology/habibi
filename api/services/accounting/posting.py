from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalEntry, JournalLine
from api.services.accounting.chart import account_by_code, resolve_cash_bank_account
from api.shop_config import (
    AP_ACCOUNT_CODE,
    AR_ACCOUNT_CODE,
    COGS_ACCOUNT_CODE,
    INVENTORY_ACCOUNT_CODE,
    SALES_ACCOUNT_CODE,
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
) -> None:
    JournalLine.objects.create(
        entry=entry,
        account=account,
        debit_home=debit_home,
        credit_home=credit_home,
        line_memo=line_memo,
        customer=customer,
        supplier=supplier,
    )


def _assert_balanced(entry: JournalEntry) -> None:
    lines = entry.lines.all()
    td = sum((l.debit_home for l in lines), Decimal("0"))
    tc = sum((l.credit_home for l in lines), Decimal("0"))
    if td != tc:
        raise ValueError(f"Unbalanced journal {entry.pk}: debit {td} credit {tc}")


def _sale_item_cost(item) -> Decimal:
    buy_price = item.buy_price or Decimal("0.00")
    qty = Decimal(str(getattr(item, "quantity", 0) or 0))
    if buy_price <= 0 or qty <= 0:
        return Decimal("0.00")
    return (buy_price * qty).quantize(Decimal("0.01"))


@transaction.atomic
def sync_sale(sale) -> None:
    _delete_source(JournalEntry.SourceType.SALE, sale.pk)
    if getattr(sale, "is_deleted", False):
        return
    total = sale.total_amount or Decimal("0")
    if total <= 0:
        return

    rev_amt = Decimal(total).quantize(Decimal("0.01"))
    recv_amt = Decimal(sale.received_amount or 0).quantize(Decimal("0.01"))
    if recv_amt > rev_amt:
        recv_amt = rev_amt

    sales_acc = account_by_code(SALES_ACCOUNT_CODE)
    ar_acc = account_by_code(AR_ACCOUNT_CODE)
    entry_date = (sale.sale_date or timezone.now()).date()
    entry = JournalEntry.objects.create(
        reference=f"SALE-{sale.pk}",
        memo=f"Sale invoice #{sale.pk}",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.SALE,
        source_id=sale.pk,
    )

    cash_acc = resolve_cash_bank_account(getattr(sale, "payment_account_id", None))
    ar_amount = rev_amt - recv_amt
    if recv_amt > 0 and cash_acc:
        _add_line(entry, cash_acc, recv_amt, Decimal("0"), line_memo="Cash/bank at invoice")
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
        )
    _add_line(entry, sales_acc, Decimal("0"), rev_amt, line_memo="Revenue")

    inv_acc = account_by_code(INVENTORY_ACCOUNT_CODE)
    cogs_acc = account_by_code(COGS_ACCOUNT_CODE)
    cogs_total = Decimal("0.00")
    for it in sale.sale_items.all():
        cogs_total += _sale_item_cost(it)

    if cogs_total > 0:
        _add_line(entry, cogs_acc, cogs_total, Decimal("0"), line_memo="COGS")
        _add_line(entry, inv_acc, Decimal("0"), cogs_total, line_memo="Inventory out")

    _assert_balanced(entry)


@transaction.atomic
def sync_sale_return(sale_return) -> None:
    _delete_source(JournalEntry.SourceType.SALE_RETURN, sale_return.pk)
    if getattr(sale_return, "is_deleted", False):
        return
    total = sale_return.total_amount or Decimal("0")
    if total <= 0:
        return

    rev_amt = Decimal(total).quantize(Decimal("0.01"))
    refund_amt = Decimal(sale_return.refunded_amount or 0).quantize(Decimal("0.01"))
    if refund_amt > rev_amt:
        refund_amt = rev_amt

    sales_acc = account_by_code(SALES_ACCOUNT_CODE)
    ar_acc = account_by_code(AR_ACCOUNT_CODE)
    entry_date = (sale_return.return_date or timezone.now()).date()
    entry = JournalEntry.objects.create(
        reference=f"SALE-RET-{sale_return.pk}",
        memo=f"Sales return #{sale_return.pk} (Sale #{sale_return.sale_id})",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.SALE_RETURN,
        source_id=sale_return.pk,
    )

    _add_line(entry, sales_acc, rev_amt, Decimal("0"), line_memo="Sales returns")

    cash_acc = resolve_cash_bank_account(getattr(sale_return, "refund_account_id", None))
    ar_credit = rev_amt - refund_amt
    if refund_amt > 0 and cash_acc:
        _add_line(entry, cash_acc, Decimal("0"), refund_amt, line_memo="Cash/bank refund")
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
        )

    inv_acc = account_by_code(INVENTORY_ACCOUNT_CODE)
    cogs_acc = account_by_code(COGS_ACCOUNT_CODE)
    restore_total = Decimal("0.00")
    for it in sale_return.items.all():
        restore_total += _sale_item_cost(it)

    if restore_total > 0:
        _add_line(entry, inv_acc, restore_total, Decimal("0"), line_memo="Inventory restored")
        _add_line(entry, cogs_acc, Decimal("0"), restore_total, line_memo="COGS reverse")

    _assert_balanced(entry)


@transaction.atomic
def sync_purchase(purchase) -> None:
    _delete_source(JournalEntry.SourceType.PURCHASE, purchase.pk)
    if getattr(purchase, "is_deleted", False):
        return
    total = purchase.total_amount or Decimal("0")
    if total <= 0:
        return

    doc_amt = Decimal(total).quantize(Decimal("0.01"))
    recv_amt = Decimal(purchase.received_amount or 0).quantize(Decimal("0.01"))
    if recv_amt > doc_amt:
        recv_amt = doc_amt

    inv_acc = account_by_code(INVENTORY_ACCOUNT_CODE)
    ap_acc = account_by_code(AP_ACCOUNT_CODE)
    entry_date = purchase.purchase_date or timezone.now().date()
    entry = JournalEntry.objects.create(
        reference=f"PUR-{purchase.pk}",
        memo=f"Purchase #{purchase.pk}",
        entry_date=entry_date,
        source_type=JournalEntry.SourceType.PURCHASE,
        source_id=purchase.pk,
    )

    cash_acc = resolve_cash_bank_account(getattr(purchase, "payment_account_id", None))
    ap_amount = doc_amt - recv_amt
    if recv_amt > 0 and cash_acc:
        _add_line(entry, cash_acc, Decimal("0"), recv_amt, line_memo="Cash/bank at bill")
    elif recv_amt > 0 and not cash_acc:
        ap_amount = doc_amt

    _add_line(entry, inv_acc, doc_amt, Decimal("0"), line_memo="Inventory / purchases")
    if ap_amount > 0:
        _add_line(
            entry,
            ap_acc,
            Decimal("0"),
            ap_amount,
            line_memo="Accounts payable",
            supplier=purchase.supplier,
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
            raise ValueError("Each line must be either debit or credit.")
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
        raise ValueError("Manual journal must balance.")
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
    from api.models.data.customer import Customer
    from api.models.data.supplier import Supplier

    if entry.source_type != JournalEntry.SourceType.MANUAL:
        raise ValueError("Only MANUAL journal entries can be updated.")

    entry.entry_date = entry_date
    entry.reference = reference or ""
    entry.memo = memo or ""
    entry.save(update_fields=["entry_date", "reference", "memo"])

    JournalLine.objects.filter(entry=entry).delete()

    total_debit = Decimal("0")
    total_credit = Decimal("0")
    for row in lines_data:
        acc = AccountingAccount.objects.get(pk=row["account_id"], is_active=True)
        dr = Decimal(str(row.get("debit_home") or "0")).quantize(Decimal("0.01"))
        cr = Decimal(str(row.get("credit_home") or "0")).quantize(Decimal("0.01"))
        if dr > 0 and cr > 0:
            raise ValueError("Each line must be either debit or credit.")
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
        raise ValueError("Manual journal must balance.")

    _assert_balanced(entry)
    return entry
