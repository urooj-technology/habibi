"""Operational and analytical reports from requirements doc."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone

from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalEntry, JournalLine
from api.models.data.customer import Customer
from api.models.data.employee import Employee
from api.models.data.inventory import Inventory
from api.models.data.purchase import Purchase
from api.models.data.sale import Sale, SaleItems
from api.models.data.sale_return import SaleReturn, SaleReturnItem
from api.models.data.category import Category
from api.choices import SaleDocumentKind
from api.models.data.supplier import Supplier
from api.models.payroll import PayrollRun
from api.services.accounting.aging import _contact_balance
from api.services.accounting.financial_reports import build_profit_and_loss


def _money(v: Decimal) -> str:
    return str(v.quantize(Decimal("0.01")))


def build_general_journal(date_from: str, date_to: str, currency: str) -> dict:
    """
    Flat journal lines for the period in one account currency.

    Amounts are in each account's posting currency (debit_home/credit_home):
    AFN accounts → AFN, USD accounts → USD.
    """
    entries = (
        JournalEntry.objects.filter(entry_date__gte=date_from, entry_date__lte=date_to)
        .prefetch_related("lines__account")
        .order_by("entry_date", "id")
    )
    rows = []
    for entry in entries:
        for line in entry.lines.all():
            ccy = line.account.currency or AccountingAccount.Currency.AFN
            if ccy != currency:
                continue
            rows.append(
                {
                    "entry_id": entry.id,
                    "date": entry.entry_date.isoformat(),
                    "reference": entry.reference,
                    "source_type": entry.source_type,
                    "account_code": line.account.code,
                    "account_name": line.account.name,
                    "currency": ccy,
                    "memo": line.line_memo or entry.memo,
                    "debit": _money(line.debit_home),
                    "credit": _money(line.credit_home),
                }
            )
    return {"from": date_from, "to": date_to, "currency": currency, "lines": rows}


def build_sales_by_customer(date_from: str, date_to: str, currency: str) -> dict:
    """Net sales by customer = gross invoices − sales returns in the period."""
    sales_qs = (
        Sale.objects.filter(
            sale_date__date__gte=date_from,
            sale_date__date__lte=date_to,
            currency=currency,
        )
        .values("customer_id", "customer__name")
        .annotate(gross=Sum("total_amount"))
    )
    returns_qs = (
        SaleReturn.objects.filter(
            is_deleted=False,
            return_date__date__gte=date_from,
            return_date__date__lte=date_to,
            currency=currency,
        )
        .values("customer_id", "customer__name")
        .annotate(returns=Sum("total_amount"))
    )

    by_customer: dict[int | None, dict] = {}
    for r in sales_qs:
        cid = r["customer_id"]
        by_customer[cid] = {
            "customer_id": cid,
            "name": r["customer__name"] or "—",
            "gross": Decimal(r["gross"] or 0),
            "returns": Decimal("0"),
        }
    for r in returns_qs:
        cid = r["customer_id"]
        if cid not in by_customer:
            by_customer[cid] = {
                "customer_id": cid,
                "name": r["customer__name"] or "—",
                "gross": Decimal("0"),
                "returns": Decimal("0"),
            }
        by_customer[cid]["returns"] = Decimal(r["returns"] or 0)

    rows = []
    for row in by_customer.values():
        net = (row["gross"] - row["returns"]).quantize(Decimal("0.01"))
        rows.append(
            {
                "customer_id": row["customer_id"],
                "name": row["name"],
                "gross": _money(row["gross"]),
                "returns": _money(row["returns"]),
                "total": _money(net),
            }
        )
    rows.sort(key=lambda x: Decimal(x["total"]), reverse=True)
    return {"from": date_from, "to": date_to, "currency": currency, "rows": rows}


def build_purchases_by_vendor(date_from: str, date_to: str, currency: str) -> dict:
    qs = (
        Purchase.objects.filter(purchase_date__gte=date_from, purchase_date__lte=date_to, currency=currency)
        .values("supplier_id", "supplier__name")
        .annotate(total=Sum("total_amount"))
        .order_by("-total")
    )
    rows = [
        {
            "supplier_id": r["supplier_id"],
            "name": r["supplier__name"] or "—",
            "total": _money(Decimal(r["total"] or 0)),
        }
        for r in qs
    ]
    return {"from": date_from, "to": date_to, "currency": currency, "rows": rows}


def build_collection_report(date_from: str, date_to: str, currency: str) -> dict:
    """
    Cash inflows at invoice time minus cash refunds on sales returns.
    AR-only credits (returns without refund) are not collections.
    """
    sales = Sale.objects.filter(
        sale_date__date__gte=date_from,
        sale_date__date__lte=date_to,
        currency=currency,
        received_amount__gt=0,
    ).select_related("customer")
    returns = SaleReturn.objects.filter(
        is_deleted=False,
        return_date__date__gte=date_from,
        return_date__date__lte=date_to,
        currency=currency,
        refunded_amount__gt=0,
    ).select_related("customer")

    rows = []
    for s in sales:
        rows.append(
            {
                "payment_id": s.id,
                "date": s.sale_date.date().isoformat()
                if hasattr(s.sale_date, "date")
                else str(s.sale_date)[:10],
                "customer": s.customer.name if s.customer else "—",
                "reference": f"INV-{s.id}",
                "type": "COLLECTION",
                "amount": _money(s.received_amount),
            }
        )
    for ret in returns:
        rows.append(
            {
                "payment_id": ret.id,
                "date": ret.return_date.date().isoformat()
                if hasattr(ret.return_date, "date")
                else str(ret.return_date)[:10],
                "customer": ret.customer.name if ret.customer else "—",
                "reference": f"SALE-RET-{ret.id}",
                "type": "REFUND",
                "amount": _money(-(ret.refunded_amount or Decimal("0"))),
            }
        )
    rows.sort(key=lambda r: r["date"] or "", reverse=True)
    collections = sum((s.received_amount or Decimal("0") for s in sales), Decimal("0"))
    refunds = sum((r.refunded_amount or Decimal("0") for r in returns), Decimal("0"))
    net = (collections - refunds).quantize(Decimal("0.01"))
    return {
        "from": date_from,
        "to": date_to,
        "currency": currency,
        "rows": rows,
        "collections_total": _money(collections),
        "refunds_total": _money(refunds),
        "total": _money(net),
    }


def build_sales_returns_report(date_from: str, date_to: str, currency: str) -> dict:
    """Sales return / credit note register for the period."""
    qs = (
        SaleReturn.objects.filter(
            is_deleted=False,
            return_date__date__gte=date_from,
            return_date__date__lte=date_to,
            currency=currency,
        )
        .select_related("customer", "sale")
        .order_by("-return_date", "-id")
    )
    rows = []
    total = Decimal("0")
    refunded = Decimal("0")
    for ret in qs:
        amt = Decimal(ret.total_amount or 0)
        ref = Decimal(ret.refunded_amount or 0)
        credited = (amt - ref).quantize(Decimal("0.01"))
        total += amt
        refunded += ref
        rows.append(
            {
                "id": ret.id,
                "date": ret.return_date.date().isoformat()
                if hasattr(ret.return_date, "date")
                else str(ret.return_date)[:10],
                "sale_id": ret.sale_id,
                "customer": ret.customer.name if ret.customer else "—",
                "reference": f"SALE-RET-{ret.id}",
                "total": _money(amt),
                "refunded": _money(ref),
                "credited": _money(credited),
            }
        )
    return {
        "from": date_from,
        "to": date_to,
        "currency": currency,
        "rows": rows,
        "total": _money(total),
        "refunded_total": _money(refunded),
        "credited_total": _money((total - refunded).quantize(Decimal("0.01"))),
    }


def build_aging_detail(*, kind: str, currency: str, as_of: date | None = None) -> dict:
    """Bucket open AR/AP balances by age (current, 30, 60, 90+ days)."""
    from api.services.accounting.aging import get_subledger_account

    as_of = as_of or timezone.now().date()
    account = get_subledger_account(kind=kind, currency=currency)
    if not account:
        return {"as_of": as_of.isoformat(), "currency": currency, "rows": []}

    contact_field = "customer_id" if kind == "customer" else "supplier_id"
    contact_model = Customer if kind == "customer" else Supplier
    buckets = {"current": Decimal("0"), "days_30": Decimal("0"), "days_60": Decimal("0"), "days_90_plus": Decimal("0")}
    rows = []

    for contact in contact_model.objects.all().order_by("name"):
        lines = JournalLine.objects.filter(
            account=account,
            entry__entry_date__lte=as_of,
            **{contact_field: contact.id},
        ).select_related("entry")
        open_amount = Decimal("0")
        for line in lines:
            if account.currency == AccountingAccount.Currency.USD and line.foreign_currency == "USD":
                open_amount += Decimal(line.debit_foreign or 0) - Decimal(line.credit_foreign or 0)
            else:
                open_amount += line.debit_home - line.credit_home
        if kind == "supplier":
            open_amount = -open_amount
        if open_amount <= 0:
            continue

        last_invoice = lines.filter(**{f"{'debit' if kind == 'customer' else 'credit'}_home__gt": 0}).order_by("-entry__entry_date").first()
        age_days = (as_of - last_invoice.entry.entry_date).days if last_invoice else 0
        if age_days <= 30:
            bucket = "current"
        elif age_days <= 60:
            bucket = "days_30"
        elif age_days <= 90:
            bucket = "days_60"
        else:
            bucket = "days_90_plus"
        buckets[bucket] += open_amount
        rows.append(
            {
                "contact_id": contact.id,
                "name": contact.name,
                "balance": _money(open_amount),
                "age_days": age_days,
                "bucket": bucket,
            }
        )

    return {
        "as_of": as_of.isoformat(),
        "currency": currency,
        "kind": kind,
        "rows": rows,
        "totals": {k: _money(v) for k, v in buckets.items()},
    }


def build_stock_ledger(currency: str = None) -> dict:
    rows = []
    for inv in Inventory.objects.select_related("product").filter(is_deleted=False):
        rows.append(
            {
                "inventory_id": inv.id,
                "product": inv.product.name if inv.product else "—",
                "quantity": _money(inv.quantity or 0),
                "buy_price": _money(inv.buy_price or 0),
            }
        )
    return {"rows": rows}


def build_stock_valuation(currency: str = None) -> dict:
    total = Decimal("0")
    rows = []
    for inv in Inventory.objects.select_related("product").filter(is_deleted=False):
        qty = inv.quantity or Decimal("0")
        value = (Decimal(str(qty or 0)) * Decimal(str(inv.buy_price or 0))).quantize(
            Decimal("0.01")
        )
        total += value
        if value > 0:
            rows.append(
                {
                    "inventory_id": inv.id,
                    "product": inv.product.name if inv.product else "—",
                    "quantity": _money(qty),
                    "buy_price": _money(inv.buy_price or 0),
                    "value": _money(value),
                }
            )
    return {"currency": currency, "rows": rows, "total": _money(total)}


def build_payroll_register(date_from: str, date_to: str, currency: str) -> dict:
    from api.choices import DocumentStatus

    runs = PayrollRun.objects.filter(
        run_date__gte=date_from,
        run_date__lte=date_to,
        status=DocumentStatus.POSTED,
    ).prefetch_related("lines__employee")
    rows = []
    for run in runs:
        for line in run.lines.all():
            rows.append(
                {
                    "run_id": run.id,
                    "run_date": run.run_date.isoformat(),
                    "employee": line.employee.name if line.employee else "—",
                    "gross": _money(line.gross_amount),
                    "deductions": _money(line.deductions),
                    "net": _money(line.net_amount),
                }
            )
    return {"from": date_from, "to": date_to, "currency": currency, "rows": rows}


def build_employee_ledger(employee_id: int, date_from: str, date_to: str, currency: str) -> dict:
    from api.choices import DocumentStatus
    from api.models.payroll import PayrollRunLine

    employee = Employee.objects.filter(pk=employee_id).first()
    if not employee:
        return {"employee_id": employee_id, "currency": currency, "lines": []}
    payroll_lines = PayrollRunLine.objects.filter(
        employee_id=employee_id,
        payroll_run__run_date__gte=date_from,
        payroll_run__run_date__lte=date_to,
        payroll_run__status=DocumentStatus.POSTED,
    ).select_related("payroll_run")
    lines = [
        {
            "date": line.payroll_run.run_date.isoformat()
            if hasattr(line.payroll_run.run_date, "isoformat")
            else str(line.payroll_run.run_date),
            "type": "PAYROLL",
            "amount": _money(line.net_amount or 0),
            "reference": f"PR-{line.payroll_run_id}",
        }
        for line in payroll_lines
    ]
    return {
        "employee_id": employee_id,
        "name": employee.name,
        "from": date_from,
        "to": date_to,
        "currency": currency,
        "lines": lines,
    }


def build_bank_book(account_id: int, date_from: str, date_to: str) -> dict:
    from api.services.accounting.financial_reports import build_general_ledger

    return build_general_ledger(account_id, date_from, date_to)


def build_cash_flow_statement(date_from: str, date_to: str, currency: str) -> dict:
    """Simplified cash flow: net profit + change in cash/bank accounts."""
    pnl = build_profit_and_loss(date_from, date_to, currency)
    cash_accounts = AccountingAccount.objects.filter(is_active=True, currency=currency, role__in=["CASH", "BANK"])
    opening = Decimal("0")
    closing = Decimal("0")
    for acc in cash_accounts:
        from api.services.accounting.financial_reports import account_balance_as_of

        opening += account_balance_as_of(acc.id, date_from, currency)
        closing += account_balance_as_of(acc.id, date_to, currency)
    net_change = closing - opening
    return {
        "from": date_from,
        "to": date_to,
        "currency": currency,
        "net_profit": pnl["net_profit"],
        "cash_opening": _money(opening),
        "cash_closing": _money(closing),
        "net_cash_change": _money(net_change),
    }


def build_outstanding_payables(currency: str, as_of: date | None = None) -> dict:
    from api.services.accounting.aging import build_vendor_aging

    return build_vendor_aging(currency=currency, as_of=as_of)


def build_outstanding_receivables(currency: str, as_of: date | None = None) -> dict:
    from api.services.accounting.aging import build_customer_receivables

    return build_customer_receivables(currency=currency, as_of=as_of)


def build_profit_by_category(date_from: str, date_to: str) -> dict:
    """
    Gross profit by product category for partner / owner splits.

    Each category row:
      net sales   = sold revenue − returned revenue
      COGS        = sold cost − returned cost (using line buy_price)
      gross profit = net sales − COGS
      margin %    = gross profit / net sales
    """
    money_field = DecimalField(max_digits=18, decimal_places=2)
    sales_expr = ExpressionWrapper(F("quantity") * F("sale_price"), output_field=money_field)
    cogs_expr = ExpressionWrapper(F("quantity") * F("buy_price"), output_field=money_field)

    sales_qs = (
        SaleItems.objects.filter(
            is_deleted=False,
            sale__is_deleted=False,
            sale__sale_date__date__gte=date_from,
            sale__sale_date__date__lte=date_to,
            sale__document_kind__in=[
                SaleDocumentKind.INVOICE,
                SaleDocumentKind.CASH_RECEIPT,
            ],
        )
        .values("inventory__product__category_id", "inventory__product__category__name")
        .annotate(
            qty_sold=Sum("quantity"),
            sales=Sum(sales_expr),
            cogs=Sum(cogs_expr),
        )
    )

    returns_qs = (
        SaleReturnItem.objects.filter(
            is_deleted=False,
            sale_return__is_deleted=False,
            sale_return__return_date__date__gte=date_from,
            sale_return__return_date__date__lte=date_to,
        )
        .values("inventory__product__category_id", "inventory__product__category__name")
        .annotate(
            qty_returned=Sum("quantity"),
            returns=Sum(sales_expr),
            return_cogs=Sum(cogs_expr),
        )
    )

    by_cat: dict[int | None, dict] = {}

    def _bucket(cid, name):
        if cid not in by_cat:
            by_cat[cid] = {
                "category_id": cid,
                "category": name or "—",
                "qty_sold": Decimal("0"),
                "qty_returned": Decimal("0"),
                "sales": Decimal("0"),
                "returns": Decimal("0"),
                "cogs_sold": Decimal("0"),
                "cogs_returned": Decimal("0"),
            }
        return by_cat[cid]

    for row in sales_qs:
        b = _bucket(row["inventory__product__category_id"], row["inventory__product__category__name"])
        b["qty_sold"] += Decimal(row["qty_sold"] or 0)
        b["sales"] += Decimal(row["sales"] or 0)
        b["cogs_sold"] += Decimal(row["cogs"] or 0)

    for row in returns_qs:
        b = _bucket(row["inventory__product__category_id"], row["inventory__product__category__name"])
        b["qty_returned"] += Decimal(row["qty_returned"] or 0)
        b["returns"] += Decimal(row["returns"] or 0)
        b["cogs_returned"] += Decimal(row["return_cogs"] or 0)

    # Include categories with no activity so every partner still appears.
    for cat in Category.objects.all().order_by("name"):
        _bucket(cat.id, cat.name)

    rows = []
    tot_qty_sold = tot_qty_ret = tot_sales = tot_returns = tot_cogs = tot_profit = Decimal("0")

    for b in by_cat.values():
        net_sales = (b["sales"] - b["returns"]).quantize(Decimal("0.01"))
        cogs = (b["cogs_sold"] - b["cogs_returned"]).quantize(Decimal("0.01"))
        profit = (net_sales - cogs).quantize(Decimal("0.01"))
        if net_sales != 0:
            margin = (profit / net_sales * Decimal("100")).quantize(Decimal("0.01"))
        else:
            margin = Decimal("0.00")

        tot_qty_sold += b["qty_sold"]
        tot_qty_ret += b["qty_returned"]
        tot_sales += b["sales"]
        tot_returns += b["returns"]
        tot_cogs += cogs
        tot_profit += profit

        rows.append(
            {
                "category_id": b["category_id"],
                "category": b["category"],
                "qty_sold": _money(b["qty_sold"]),
                "qty_returned": _money(b["qty_returned"]),
                "sales": _money(b["sales"]),
                "returns": _money(b["returns"]),
                "net_sales": _money(net_sales),
                "cogs": _money(cogs),
                "gross_profit": _money(profit),
                "margin_pct": _money(margin),
            }
        )

    rows.sort(key=lambda r: Decimal(r["gross_profit"]), reverse=True)
    net_sales_total = (tot_sales - tot_returns).quantize(Decimal("0.01"))
    margin_total = (
        (tot_profit / net_sales_total * Decimal("100")).quantize(Decimal("0.01"))
        if net_sales_total
        else Decimal("0.00")
    )

    return {
        "from": date_from,
        "to": date_to,
        "rows": rows,
        "totals": {
            "qty_sold": _money(tot_qty_sold),
            "qty_returned": _money(tot_qty_ret),
            "sales": _money(tot_sales),
            "returns": _money(tot_returns),
            "net_sales": _money(net_sales_total),
            "cogs": _money(tot_cogs),
            "gross_profit": _money(tot_profit),
            "margin_pct": _money(margin_total),
        },
    }
