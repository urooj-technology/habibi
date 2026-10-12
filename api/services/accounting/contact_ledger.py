"""Customer / supplier accounting ledgers.

Balances are sourced from AR/AP journal lines only. API fields match persisted
customer, supplier, sale, purchase, and journal models.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Literal

from django.core.paginator import EmptyPage, Paginator
from django.db.models import Max, Q, Sum
from django.utils import timezone

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalEntry, JournalLine
from api.models.data.customer import Customer
from api.models.data.purchase import Purchase
from api.models.data.sale import Sale
from api.models.data.supplier import Supplier
from api.choices import DocumentStatus

ContactKind = Literal["customer", "supplier"]

ZERO = Decimal("0")
MONEY = Decimal("0.01")

SOURCE_TO_CUSTOMER_TYPE = {
    JournalEntry.SourceType.SALE: "SALE_INVOICE",
    JournalEntry.SourceType.SALE_RETURN: "CUSTOMER_RETURN",
    JournalEntry.SourceType.SALE_PAYMENT: "PAYMENT_RECEIVED",
    JournalEntry.SourceType.CURRENCY_CONVERSION: "CURRENCY_CONVERSION",
    JournalEntry.SourceType.MANUAL: "ADJUSTMENT",
}

SOURCE_TO_SUPPLIER_TYPE = {
    JournalEntry.SourceType.PURCHASE: "PURCHASE_INVOICE",
    JournalEntry.SourceType.PURCHASE_PAYMENT: "PAYMENT_MADE",
    JournalEntry.SourceType.CURRENCY_CONVERSION: "CURRENCY_CONVERSION",
    JournalEntry.SourceType.MANUAL: "ADJUSTMENT",
}

CUSTOMER_TXN_FILTER = [
    "SALE_INVOICE",
    "PAYMENT_RECEIVED",
    "CUSTOMER_RETURN",
    "CURRENCY_CONVERSION",
    "ADJUSTMENT",
]

SUPPLIER_TXN_FILTER = [
    "PURCHASE_INVOICE",
    "PAYMENT_MADE",
    "PURCHASE_RETURN",
    "CURRENCY_CONVERSION",
    "ADJUSTMENT",
]


def _line_debit_credit_account_currency(line: JournalLine) -> tuple[Decimal, Decimal, str]:
    """Debit, credit, and currency for one journal line (account posting currency)."""
    ccy = line.account.currency
    if ccy == AccountingAccount.Currency.USD:
        if (line.foreign_currency or "").upper() == "USD":
            deb = line.debit_foreign or Decimal("0")
            cred = line.credit_foreign or Decimal("0")
        else:
            deb = line.debit_home or Decimal("0")
            cred = line.credit_home or Decimal("0")
    else:
        deb = line.debit_home or Decimal("0")
        cred = line.credit_home or Decimal("0")
    return deb, cred, ccy


def _money(value) -> str:
    try:
        return str(Decimal(value or "0").quantize(MONEY))
    except (InvalidOperation, TypeError, ValueError):
        return "0.00"


def _decimal_param(value, default: Decimal | None = None) -> Decimal | None:
    if value in (None, ""):
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _int_param(value, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _subledger_role(kind: ContactKind) -> str:
    return (
        AccountingAccount.Role.AR
        if kind == "customer"
        else AccountingAccount.Role.AP
    )


def _apply_running(kind: ContactKind, running: Decimal, debit: Decimal, credit: Decimal) -> Decimal:
    """AR: debit increases balance. AP: credit increases amount owed."""
    if kind == "customer":
        return running + debit - credit
    return running + credit - debit


def _opening_from_lines(kind: ContactKind, lines) -> Decimal:
    total = Decimal("0")
    for line in lines:
        deb, cred, _ = _line_debit_credit_account_currency(line)
        total = _apply_running(kind, total, deb, cred)
    return total


def contact_subledger_balances_by_currency(
    kind: ContactKind, contact_id: int
) -> dict[str, Decimal]:
    """Current AR/AP balance per account currency (all posted subledger lines)."""
    role = _subledger_role(kind)
    if kind == "customer":
        base_q = Q(customer_id=contact_id) & Q(account__role=role)
    else:
        base_q = Q(supplier_id=contact_id) & Q(account__role=role)

    balances: dict[str, Decimal] = defaultdict(lambda: ZERO)
    lines = (
        JournalLine.objects.filter(base_q)
        .select_related("account", "entry")
        .order_by("entry__entry_date", "entry_id", "id")
    )
    for line in lines:
        deb, cred, ccy = _line_debit_credit_account_currency(line)
        balances[ccy] = _apply_running(kind, balances[ccy], deb, cred)
    return dict(balances)


def financial_summary_from_invoices_and_subledger(
    *,
    kind: ContactKind,
    contact_id: int,
    invoice_totals_by_currency: dict[str, Decimal],
    paid_on_invoices_by_currency: dict[str, Decimal] | None = None,
) -> dict:
    """
    Build list-view financial summary (single amount totals — no currency split).

    Invoice totals come from Sale/Purchase documents; remaining balance comes from
    the AR/AP subledger (includes manual journal payments, not only received_amount).
    """
    balances = contact_subledger_balances_by_currency(kind, contact_id)
    paid_on = paid_on_invoices_by_currency or {}

    inv = sum((Decimal(v or 0) for v in invoice_totals_by_currency.values()), ZERO)
    bal = sum((Decimal(v or 0) for v in balances.values()), ZERO)
    on_invoice = sum((Decimal(v or 0) for v in paid_on.values()), ZERO)

    if bal > ZERO:
        remaining = bal.quantize(MONEY)
        advance = ZERO
    else:
        remaining = ZERO
        advance = abs(bal).quantize(MONEY)

    paid = (inv - remaining).quantize(MONEY)
    if paid < ZERO:
        paid = ZERO

    # Flat numbers for the UI (no AFN/USD keys).
    return {
        "total_amount": str(inv.quantize(MONEY)),
        "paid_amount": str(paid),
        "remaining_amount": str(remaining),
        "paid_on_invoices": str(on_invoice.quantize(MONEY)),
        "paid_in_advance": str(advance),
    }


def _period_subledger_payments(
    kind: ContactKind,
    contact_id: int,
    date_from: str,
    date_to: str,
    currency: str,
) -> Decimal:
    """Sum of later payments on AR/AP in the period (credits on AR, debits on AP).

    Excludes sales-return AR credits — those are returns, not cash collections.
    """
    role = _subledger_role(kind)
    if kind == "customer":
        base_q = Q(customer_id=contact_id) & Q(account__role=role)
    else:
        base_q = Q(supplier_id=contact_id) & Q(account__role=role)

    if currency:
        base_q &= Q(account__currency=currency)

    lines = (
        JournalLine.objects.filter(
            base_q
            & Q(entry__entry_date__gte=date_from)
            & Q(entry__entry_date__lte=date_to)
        )
        .exclude(entry__source_type=JournalEntry.SourceType.SALE_RETURN)
        .select_related("account", "entry")
    )

    total = ZERO
    for line in lines:
        deb, cred, _ = _line_debit_credit_account_currency(line)
        if kind == "customer":
            total += cred
        else:
            total += deb
    return total


def _period_total_payments(
    kind: ContactKind,
    contact_id: int,
    date_from: str,
    date_to: str,
    currency: str,
    invoice_total_in_period: Decimal,
) -> Decimal:
    """
    Total cash received/paid in the period.

    Includes amount recorded on invoices at sale/purchase time (cash/bank leg) plus
    separate AR/AP settlement lines (manual or payment journals). The first part does
    not appear on AR/AP because it hits cash at invoice time.
    """
    on_subledger = _period_subledger_payments(kind, contact_id, date_from, date_to, currency)

    if kind == "customer":
        qs = Sale.objects.filter(
            customer_id=contact_id,
            sale_date__date__gte=date_from,
            sale_date__date__lte=date_to,
        )
        on_invoice = Decimal(qs.aggregate(v=Sum("received_amount"))["v"] or 0)
    else:
        qs = Purchase.objects.filter(
            supplier_id=contact_id,
            purchase_date__gte=date_from,
            purchase_date__lte=date_to,
        )
        on_invoice = Decimal(qs.aggregate(v=Sum("received_amount"))["v"] or 0)

    total = (on_invoice + on_subledger).quantize(MONEY)
    cap = Decimal(invoice_total_in_period or 0).quantize(MONEY)
    if cap > ZERO and total > cap:
        return cap
    return total


def _transaction_type(kind: ContactKind, line: JournalLine) -> str:
    source_type = line.entry.source_type
    deb, cred, _ = _line_debit_credit_account_currency(line)
    role = line.account.role

    if kind == "customer":
        if source_type == JournalEntry.SourceType.SALE_PAYMENT and deb:
            return "ADVANCE_PAYMENT"
        if source_type == JournalEntry.SourceType.MANUAL and role == AccountingAccount.Role.AR and cred > ZERO:
            return "PAYMENT_RECEIVED"
        return SOURCE_TO_CUSTOMER_TYPE.get(source_type, "ADJUSTMENT")

    if source_type == JournalEntry.SourceType.PURCHASE_PAYMENT and cred:
        return "ADVANCE_PAYMENT"
    if source_type == JournalEntry.SourceType.MANUAL and role == AccountingAccount.Role.AP and deb > ZERO:
        return "PAYMENT_MADE"
    return SOURCE_TO_SUPPLIER_TYPE.get(source_type, "ADJUSTMENT")


def _status_for_amount(debit: Decimal, credit: Decimal, running: Decimal) -> str:
    if debit and credit:
        return "Partial"
    if running > 0:
        return "Pending"
    return "Paid"


def _product_summary(items, product_attr: str) -> tuple[str, str]:
    names = []
    quantities = []
    for item in items:
        product = getattr(item, product_attr, None)
        if product_attr == "inventory" and product:
            product = getattr(product, "product", None)
        if product:
            names.append(getattr(product, "name", str(product)))

        qty = getattr(item, "quantity", None)
        quantities.append(str(qty) if qty else "1")

    return ", ".join(names) or "-", ", ".join(quantities) or "-"


def _customer_profile(customer: Customer, opening: Decimal, closing: Decimal, last_txn) -> dict:
    return {
        "id": customer.id,
        "name": customer.name,
        "contact": customer.contact or "",
        "address": customer.address or "",
        "registration_date": customer.created_at.date().isoformat() if customer.created_at else "",
        "opening_balance": _money(opening),
        "current_balance": _money(closing),
        "last_transaction_date": last_txn.isoformat() if last_txn else "",
    }


def _supplier_profile(supplier: Supplier, opening: Decimal, closing: Decimal, last_txn) -> dict:
    return {
        "id": supplier.id,
        "name": supplier.name,
        "contact": supplier.contact or "",
        "address": supplier.address or "",
        "registration_date": supplier.created_at.date().isoformat() if supplier.created_at else "",
        "opening_balance": _money(opening),
        "current_balance": _money(closing),
        "last_transaction_date": last_txn.isoformat() if last_txn else "",
    }


def _sales_history(customer_id: int, date_from: str, date_to: str, currency: str) -> list[dict]:
    from api.models.data.sale_return import SaleReturn

    qs = (
        Sale.objects.filter(customer_id=customer_id, sale_date__date__gte=date_from, sale_date__date__lte=date_to)
        .prefetch_related("sale_items__inventory__product")
        .order_by("-sale_date", "-id")
    )
    history = []
    for sale in qs[:100]:
        products, qty = _product_summary(sale.sale_items.all(), "inventory")
        total = Decimal(sale.total_amount or 0)
        paid = Decimal(sale.received_amount or 0)
        history.append(
            {
                "invoice_number": f"SALE-{sale.id}",
                "products": products,
                "qty": qty,
                "total": _money(total),
                "status": "Paid" if sale.is_paid else ("Partial" if paid else "Pending"),
                "invoice_date": sale.sale_date.date().isoformat() if sale.sale_date else "",
                "doc_type": "SALE",
            }
        )

    ret_qs = SaleReturn.objects.filter(
        is_deleted=False,
        customer_id=customer_id,
        return_date__date__gte=date_from,
        return_date__date__lte=date_to,
    ).prefetch_related("items__inventory__product")
    for ret in ret_qs.order_by("-return_date", "-id")[:50]:
        products, qty = _product_summary(ret.items.all(), "inventory")
        total = Decimal(ret.total_amount or 0)
        history.append(
            {
                "invoice_number": f"SALE-RET-{ret.id}",
                "products": products,
                "qty": qty,
                "total": _money(-total),
                "status": "Return",
                "invoice_date": ret.return_date.date().isoformat()
                if hasattr(ret.return_date, "date")
                else str(ret.return_date)[:10],
                "doc_type": "RETURN",
            }
        )

    history.sort(key=lambda r: r.get("invoice_date") or "", reverse=True)
    return history[:100]


def _purchase_history(supplier_id: int, date_from: str, date_to: str, currency: str) -> list[dict]:
    qs = (
        Purchase.objects.filter(supplier_id=supplier_id, purchase_date__gte=date_from, purchase_date__lte=date_to)
        .prefetch_related("purchase_items__product")
        .order_by("-purchase_date", "-id")
    )
    history = []
    for purchase in qs[:100]:
        products, qty = _product_summary(purchase.purchase_items.all(), "product")
        total = Decimal(purchase.total_amount or 0)
        paid = Decimal(purchase.received_amount or 0)
        history.append(
            {
                "purchase_no": f"PUR-{purchase.id}",
                "products": products,
                "qty": qty,
                "total": _money(total),
                "status": "Paid" if purchase.is_paid else ("Partial" if paid else "Pending"),
                "purchase_date": purchase.purchase_date.isoformat() if purchase.purchase_date else "",
            }
        )
    return history


def _customer_payment_history(customer_id: int, date_from: str, date_to: str, currency: str) -> list[dict]:
    qs = Sale.objects.filter(
        customer_id=customer_id,
        sale_date__date__gte=date_from,
        sale_date__date__lte=date_to,
        received_amount__gt=0,
    ).order_by("-sale_date", "-id")
    return [
        {
            "payment_date": sale.sale_date.date().isoformat() if sale.sale_date else "",
            "amount": _money(sale.received_amount),
            "reference": f"SALE-{sale.id}",
            "description": "",
            "created_by": "",
        }
        for sale in qs[:100]
    ]


def _supplier_payment_history(supplier_id: int, date_from: str, date_to: str, currency: str) -> list[dict]:
    qs = Purchase.objects.filter(
        supplier_id=supplier_id,
        purchase_date__gte=date_from,
        purchase_date__lte=date_to,
        received_amount__gt=0,
    ).order_by("-purchase_date", "-id")
    return [
        {
            "payment_date": purchase.purchase_date.isoformat() if purchase.purchase_date else "",
            "amount": _money(purchase.received_amount),
            "reference": f"PUR-{purchase.id}",
            "description": "",
            "created_by": "",
        }
        for purchase in qs[:100]
    ]


def _customer_totals(contact_id: int, date_from: str, date_to: str, currency: str) -> dict:
    from api.models.data.sale_return import SaleReturn

    sales = Sale.objects.filter(
        customer_id=contact_id, sale_date__date__gte=date_from, sale_date__date__lte=date_to
    )
    returns = SaleReturn.objects.filter(
        is_deleted=False,
        customer_id=contact_id,
        return_date__date__gte=date_from,
        return_date__date__lte=date_to,
    )
    return {
        "total_sales": Decimal(sales.aggregate(v=Sum("total_amount"))["v"] or 0),
        "payments_received": Decimal(sales.aggregate(v=Sum("received_amount"))["v"] or 0),
        "total_returns": Decimal(returns.aggregate(v=Sum("total_amount"))["v"] or 0),
    }


def _supplier_totals(contact_id: int, date_from: str, date_to: str, currency: str) -> dict:
    purchases = Purchase.objects.filter(
        supplier_id=contact_id,
        purchase_date__gte=date_from,
        purchase_date__lte=date_to,
    )
    return {
        "total_purchases": Decimal(purchases.aggregate(v=Sum("total_amount"))["v"] or 0),
        "payments": Decimal(purchases.aggregate(v=Sum("received_amount"))["v"] or 0),
    }


def _ledger_section_for_currency(
    *,
    kind: ContactKind,
    contact_id: int,
    date_from: str,
    date_to: str,
    currency: str,
    transaction_type: str = "",
    status: str = "",
    search: str = "",
    amount_min: str = "",
    amount_max: str = "",
) -> dict:
    """Build one currency's ledger lines with its own opening / running / closing."""
    role = _subledger_role(kind)
    if kind == "customer":
        contact_q = Q(customer_id=contact_id)
    else:
        contact_q = Q(supplier_id=contact_id)

    base_q = contact_q & Q(account__role=role) & Q(account__currency=currency)

    opening_lines = (
        JournalLine.objects.filter(base_q & Q(entry__entry_date__lt=date_from))
        .select_related("entry", "account")
        .order_by("entry__entry_date", "entry_id", "id")
    )
    opening_balance = _opening_from_lines(kind, opening_lines)

    period_lines = (
        JournalLine.objects.filter(
            base_q
            & Q(entry__entry_date__gte=date_from)
            & Q(entry__entry_date__lte=date_to)
        )
        .select_related("entry", "entry__created_by", "account", "customer", "supplier")
        .order_by("entry__entry_date", "entry_id", "id")
    )

    running = opening_balance
    all_rows = []
    total_debit = Decimal("0")
    total_credit = Decimal("0")
    min_amount = _decimal_param(amount_min)
    max_amount = _decimal_param(amount_max)
    requested_type = (transaction_type or "").strip().upper()
    requested_status = (status or "").strip().lower()
    search_text = (search or "").strip().lower()

    for line in period_lines:
        deb, cred, line_ccy = _line_debit_credit_account_currency(line)
        total_debit += deb
        total_credit += cred
        running = _apply_running(kind, running, deb, cred)
        txn_type = _transaction_type(kind, line)
        row_status = _status_for_amount(deb, cred, running)
        voucher_no = line.entry.reference or f"JE-{line.entry_id}"
        amount = deb or cred
        description = line.line_memo or line.entry.memo or ""
        created_by = (
            line.entry.created_by.get_username()
            if getattr(line.entry, "created_by", None)
            else ""
        )

        if requested_type and txn_type != requested_type:
            continue
        if requested_status and requested_status not in row_status.lower():
            continue
        if min_amount is not None and amount < min_amount:
            continue
        if max_amount is not None and amount > max_amount:
            continue
        if search_text:
            haystack = " ".join(
                [
                    str(voucher_no),
                    str(line.entry.reference or ""),
                    str(txn_type),
                    str(description),
                    str(line.account.code),
                    str(line.account.name),
                ]
            ).lower()
            if search_text not in haystack:
                continue

        all_rows.append(
            {
                "id": line.id,
                "entry_id": line.entry_id,
                "source_id": line.entry.source_id,
                "date": str(line.entry.entry_date),
                "entry_date": str(line.entry.entry_date),
                "voucher_no": voucher_no,
                "voucher": voucher_no,
                "reference": line.entry.reference,
                "reference_no": line.entry.reference,
                "source_type": line.entry.source_type,
                "transaction_type": txn_type,
                "line_memo": line.line_memo,
                "description": description,
                "account": {
                    "id": line.account.id,
                    "code": line.account.code,
                    "name": line.account.name,
                },
                "debit": str(deb.quantize(Decimal("0.01"))),
                "credit": str(cred.quantize(Decimal("0.01"))),
                "debit_home": str(deb.quantize(Decimal("0.01"))),
                "credit_home": str(cred.quantize(Decimal("0.01"))),
                "running_balance": str(running.quantize(Decimal("0.01"))),
                "created_by": created_by,
                "status": row_status,
                "customer_id": line.customer_id,
                "supplier_id": line.supplier_id,
            }
        )

    last_txn = (
        JournalLine.objects.filter(base_q)
        .aggregate(v=Max("entry__entry_date"))
        .get("v")
    )
    outstanding = running if running > 0 else ZERO
    advance = abs(running) if running < 0 else ZERO

    if kind == "customer":
        totals = _customer_totals(contact_id, date_from, date_to, currency)
        net_sales = (totals["total_sales"] - totals["total_returns"]).quantize(MONEY)
        if net_sales < ZERO:
            net_sales = ZERO
        period_payments = _period_total_payments(
            kind, contact_id, date_from, date_to, currency, net_sales
        )
        summary = {
            "total_sales": _money(totals["total_sales"]),
            "total_payments_received": _money(period_payments),
            "outstanding_balance": _money(outstanding),
            "advance_balance": _money(advance),
            "total_returns": _money(totals["total_returns"]),
            "net_sales": _money(net_sales),
        }
    else:
        totals = _supplier_totals(contact_id, date_from, date_to, currency)
        period_payments = _period_total_payments(
            kind, contact_id, date_from, date_to, currency, totals["total_purchases"]
        )
        summary = {
            "total_purchases": _money(totals["total_purchases"]),
            "total_payments": _money(period_payments),
            "outstanding_balance": _money(outstanding),
            "advance_paid": _money(advance),
        }

    return {
        "opening_balance": str(opening_balance.quantize(Decimal("0.01"))),
        "period_debit": str(total_debit.quantize(Decimal("0.01"))),
        "period_credit": str(total_credit.quantize(Decimal("0.01"))),
        "closing_balance": str(running.quantize(Decimal("0.01"))),
        "current_balance": str(running.quantize(Decimal("0.01"))),
        "last_transaction_date": last_txn.isoformat() if last_txn else "",
        "all_line_count": len(all_rows),
        "summary": summary,
        "lines": all_rows,
        "has_activity": bool(all_rows)
        or opening_balance != ZERO
        or total_debit != ZERO
        or total_credit != ZERO,
    }


def build_contact_ledger_payload(
    *,
    kind: ContactKind,
    contact_id: int,
    date_from: str,
    date_to: str,
    currency_filter: str = "",
    transaction_type: str = "",
    status: str = "",
    search: str = "",
    amount_min: str = "",
    amount_max: str = "",
    page: str | int = 1,
    page_size: str | int = 25,
) -> dict:
    """
    Build ledger JSON for customer or supplier.

    Single ledger section (no multi-currency split).
    """
    contact = (
        Customer.objects.filter(pk=contact_id).first()
        if kind == "customer"
        else Supplier.objects.filter(pk=contact_id).first()
    )
    id_key = "customer_id" if kind == "customer" else "supplier_id"

    section = _ledger_section_for_currency(
        kind=kind,
        contact_id=contact_id,
        date_from=date_from,
        date_to=date_to,
        currency=AccountingAccount.Currency.AFN,
        transaction_type=transaction_type,
        status=status,
        search=search,
        amount_min=amount_min,
        amount_max=amount_max,
    )

    page_number = _int_param(page, 1)
    page_size_number = min(_int_param(page_size, 25), 100)
    all_rows = section["lines"]
    paginator = Paginator(all_rows, page_size_number)
    try:
        page_obj = paginator.page(page_number)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages or 1)
    page_rows = list(page_obj.object_list)
    pagination = {
        "page": page_obj.number,
        "page_size": page_size_number,
        "total": paginator.count,
        "total_pages": paginator.num_pages,
    }
    sections_out = [
        {
            "opening_balance": section["opening_balance"],
            "period_debit": section["period_debit"],
            "period_credit": section["period_credit"],
            "closing_balance": section["closing_balance"],
            "current_balance": section["current_balance"],
            "last_transaction_date": section["last_transaction_date"],
            "all_line_count": section["all_line_count"],
            "summary": section["summary"],
            "pagination": pagination,
            "lines": page_rows,
        }
    ]

    primary = sections_out[0]

    if kind == "customer":
        profile = (
            _customer_profile(
                contact,
                Decimal(primary["opening_balance"]),
                Decimal(primary["closing_balance"]),
                None,
            )
            if contact
            else {
                "name": "",
                "contact": "",
                "address": "",
                "opening_balance": primary["opening_balance"],
                "current_balance": primary["closing_balance"],
                "last_transaction_date": primary["last_transaction_date"],
            }
        )
        invoice_history = _sales_history(contact_id, date_from, date_to, "")
        purchase_history = []
        operational_payment_history = _customer_payment_history(
            contact_id, date_from, date_to, ""
        )
        txn_filter = CUSTOMER_TXN_FILTER
    else:
        profile = (
            _supplier_profile(
                contact,
                Decimal(primary["opening_balance"]),
                Decimal(primary["closing_balance"]),
                None,
            )
            if contact
            else {
                "name": "",
                "contact": "",
                "address": "",
                "opening_balance": primary["opening_balance"],
                "current_balance": primary["closing_balance"],
                "last_transaction_date": primary["last_transaction_date"],
            }
        )
        invoice_history = []
        purchase_history = _purchase_history(contact_id, date_from, date_to, "")
        operational_payment_history = _supplier_payment_history(
            contact_id, date_from, date_to, ""
        )
        txn_filter = SUPPLIER_TXN_FILTER

    payment_types = {"PAYMENT_RECEIVED", "PAYMENT_MADE"}
    gl_payment_history = []
    for section in sections_out:
        for row in section["lines"]:
            if row["transaction_type"] not in payment_types:
                continue
            gl_payment_history.append(
                {
                    "payment_date": row["date"],
                    "amount": row["credit"] if kind == "customer" else row["debit"],
                    "reference": row["reference_no"] or row["voucher_no"],
                    "description": row["description"],
                    "created_by": row["created_by"],
                }
            )
    gl_payment_history = gl_payment_history[:100]
    seen_payment_refs = {row.get("reference") for row in gl_payment_history}
    payment_history = gl_payment_history + [
        row
        for row in operational_payment_history
        if row.get("reference") not in seen_payment_refs
    ][: max(0, 100 - len(gl_payment_history))]

    payload = {
        id_key: contact_id,
        "from": date_from,
        "to": date_to,
        "sections": sections_out,
        "profile": profile,
        "summary": primary["summary"],
        "opening_balance": primary["opening_balance"],
        "period_debit": primary["period_debit"],
        "period_credit": primary["period_credit"],
        "closing_balance": primary["closing_balance"],
        "all_line_count": sum(s["all_line_count"] for s in sections_out),
        "pagination": primary["pagination"],
        "filters": {
            "transaction_type": (transaction_type or "").strip().upper(),
            "status": status,
            "search": search,
            "amount_min": amount_min or "",
            "amount_max": amount_max or "",
        },
        "lines": primary["lines"],
        "invoice_history": invoice_history,
        "purchase_history": purchase_history,
        "payment_history": payment_history,
        "available_transaction_types": txn_filter,
        "available_statuses": ["Paid", "Pending", "Partial"],
    }
    return payload
