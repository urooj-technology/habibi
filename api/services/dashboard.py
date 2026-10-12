"""Daily operational dashboard aggregates (not accounting trial balance)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from api.models.data.purchase import Purchase
from api.models.data.sale import Sale
from api.models.data.sale_return import SaleReturn


def _money(v) -> str:
    return str(Decimal(v or 0).quantize(Decimal("0.01")))


def _d(v) -> Decimal:
    return Decimal(v or 0)


def build_daily_ops_dashboard(*, days: int = 14) -> dict:
    """
    Operational snapshot for the home dashboard.

    Sales KPIs are net of sales returns. Collections are cash in minus cash refunds.
    """
    days = max(7, min(int(days or 14), 31))

    today = timezone.localdate()
    start = today - timedelta(days=days - 1)

    sales = Sale.objects.filter(
        sale_date__date__gte=start,
        sale_date__date__lte=today,
    )
    returns = SaleReturn.objects.filter(
        is_deleted=False,
        return_date__date__gte=start,
        return_date__date__lte=today,
    )
    purchases = Purchase.objects.filter(
        purchase_date__gte=start,
        purchase_date__lte=today,
    )

    today_sales = sales.filter(sale_date__date=today)
    today_returns = returns.filter(return_date__date=today)
    today_purchases = purchases.filter(purchase_date=today)

    today_sales_agg = today_sales.aggregate(
        total=Sum("total_amount"),
        collected=Sum("received_amount"),
        count=Count("id"),
    )
    today_returns_agg = today_returns.aggregate(
        total=Sum("total_amount"),
        refunded=Sum("refunded_amount"),
        count=Count("id"),
    )
    today_unpaid = today_sales.filter(is_paid=False).count()
    today_purchases_agg = today_purchases.aggregate(
        total=Sum("total_amount"),
        paid=Sum("received_amount"),
        count=Count("id"),
    )

    period_sales_agg = sales.aggregate(
        total=Sum("total_amount"),
        collected=Sum("received_amount"),
        count=Count("id"),
    )
    period_returns_agg = returns.aggregate(
        total=Sum("total_amount"),
        refunded=Sum("refunded_amount"),
        count=Count("id"),
    )
    period_purchases_agg = purchases.aggregate(
        total=Sum("total_amount"),
        paid=Sum("received_amount"),
        count=Count("id"),
    )

    sales_by_day = {
        r["day"]: r
        for r in sales.annotate(day=TruncDate("sale_date"))
        .values("day")
        .annotate(
            sales=Sum("total_amount"),
            collections=Sum("received_amount"),
            invoices=Count("id"),
        )
    }
    returns_by_day = {
        r["day"]: r
        for r in returns.annotate(day=TruncDate("return_date"))
        .values("day")
        .annotate(
            returns=Sum("total_amount"),
            refunds=Sum("refunded_amount"),
            count=Count("id"),
        )
    }
    purchases_by_day = {
        r["purchase_date"]: r
        for r in purchases.values("purchase_date").annotate(
            purchases=Sum("total_amount"),
            payments=Sum("received_amount"),
            bills=Count("id"),
        )
    }

    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        s = sales_by_day.get(d) or {}
        ret = returns_by_day.get(d) or {}
        p = purchases_by_day.get(d) or {}
        net_sales = _d(s.get("sales")) - _d(ret.get("returns"))
        net_collections = _d(s.get("collections")) - _d(ret.get("refunds"))
        series.append(
            {
                "date": d.isoformat(),
                "label": d.strftime("%d %b"),
                "sales": _money(net_sales),
                "collections": _money(net_collections),
                "returns": _money(ret.get("returns")),
                "purchases": _money(p.get("purchases")),
                "payments": _money(p.get("payments")),
                "invoice_count": int(s.get("invoices") or 0),
                "return_count": int(ret.get("count") or 0),
                "bill_count": int(p.get("bills") or 0),
            }
        )

    sales_by_customer = {
        r["customer_id"]: {
            "name": r["customer__name"] or "—",
            "gross": _d(r["total"]),
            "invoices": r["invoices"],
            "returns": Decimal("0"),
        }
        for r in sales.filter(customer_id__isnull=False)
        .values("customer_id", "customer__name")
        .annotate(total=Sum("total_amount"), invoices=Count("id"))
    }
    for r in (
        returns.filter(customer_id__isnull=False)
        .values("customer_id", "customer__name")
        .annotate(total=Sum("total_amount"))
    ):
        cid = r["customer_id"]
        if cid not in sales_by_customer:
            sales_by_customer[cid] = {
                "name": r["customer__name"] or "—",
                "gross": Decimal("0"),
                "invoices": 0,
                "returns": Decimal("0"),
            }
        sales_by_customer[cid]["returns"] = _d(r["total"])

    top_customer_rows = sorted(
        (
            {
                "customer_id": cid,
                "name": row["name"],
                "total": _money(row["gross"] - row["returns"]),
                "invoices": row["invoices"],
            }
            for cid, row in sales_by_customer.items()
        ),
        key=lambda x: Decimal(x["total"]),
        reverse=True,
    )[:8]

    recent_sales = [
        {
            "id": s.id,
            "date": s.sale_date.date().isoformat()
            if hasattr(s.sale_date, "date")
            else str(s.sale_date)[:10],
            "customer": s.customer.name if s.customer_id else "—",
            "total": _money(s.total_amount),
            "received": _money(s.received_amount),
            "is_paid": bool(s.is_paid),
        }
        for s in today_sales.select_related("customer").order_by("-id")[:8]
    ]
    recent_purchases = [
        {
            "id": p.id,
            "date": p.purchase_date.isoformat(),
            "supplier": p.supplier.name if p.supplier_id else "—",
            "total": _money(p.total_amount),
            "paid": _money(p.received_amount),
            "is_paid": bool(p.is_paid),
        }
        for p in today_purchases.select_related("supplier").order_by("-id")[:8]
    ]

    today_net_sales = _d(today_sales_agg["total"]) - _d(today_returns_agg["total"])
    today_net_collections = _d(today_sales_agg["collected"]) - _d(
        today_returns_agg["refunded"]
    )
    period_net_sales = _d(period_sales_agg["total"]) - _d(period_returns_agg["total"])
    period_net_collections = _d(period_sales_agg["collected"]) - _d(
        period_returns_agg["refunded"]
    )

    return {
        "as_of": today.isoformat(),
        "from": start.isoformat(),
        "to": today.isoformat(),
        "days": days,
        "today": {
            "sales_total": _money(today_net_sales),
            "returns_total": _money(today_returns_agg["total"]),
            "collections": _money(today_net_collections),
            "sales_count": int(today_sales_agg["count"] or 0),
            "return_count": int(today_returns_agg["count"] or 0),
            "unpaid_invoices": today_unpaid,
            "purchases_total": _money(today_purchases_agg["total"]),
            "purchase_payments": _money(today_purchases_agg["paid"]),
            "purchase_count": int(today_purchases_agg["count"] or 0),
        },
        "period": {
            "sales_total": _money(period_net_sales),
            "returns_total": _money(period_returns_agg["total"]),
            "collections": _money(period_net_collections),
            "sales_count": int(period_sales_agg["count"] or 0),
            "return_count": int(period_returns_agg["count"] or 0),
            "purchases_total": _money(period_purchases_agg["total"]),
            "purchase_payments": _money(period_purchases_agg["paid"]),
            "purchase_count": int(period_purchases_agg["count"] or 0),
        },
        "daily_series": series,
        "top_customers": top_customer_rows,
        "recent_sales": recent_sales,
        "recent_purchases": recent_purchases,
    }
