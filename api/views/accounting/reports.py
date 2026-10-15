"""
Trial balance report — amounts per account currency (AFN or USD).
"""
from __future__ import annotations

import io
from datetime import datetime
from decimal import Decimal

from django.db.models import Q
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from account.permissions import HasPerm
from rest_framework.response import Response
from rest_framework.views import APIView

from api.common.pdf_export import HEADER_BG, apply_unicode_table_fonts, pdf_header_cell, pdf_paragraph
from api.common.pdf_fonts import ensure_pdf_fonts
from api.models.accounting.account import AccountingAccount
from api.models.accounting.journal import JournalLine


def _parse_date(s: str | None) -> str | None:
    if not s:
        return None
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return s
    except ValueError:
        return None


def _currency_or_afn(request) -> str:
    c = (request.query_params.get("currency") or "AFN").upper()
    return c if c in ("AFN", "USD") else "AFN"


def _fmt(amount: Decimal) -> str:
    return str(amount.quantize(Decimal("0.01")))


def _split_dr_cr(signed: Decimal) -> tuple[str, str]:
    """Trial balance columns: debit side or credit side (not both)."""
    if signed >= 0:
        return _fmt(signed), ""
    return "", _fmt(-signed)


class AccountingTrialBalanceAPIView(APIView):
    """
    Trial balance for accounts in one currency for a date range.
    Opening = net (debit − credit) before `from`; period movement; closing.
    GET ?from=&to=&currency=AFN|USD
    """

    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, *args, **kwargs):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response(
                {"detail": "Query parameters `from` and `to` (YYYY-MM-DD) are required."},
                status=400,
            )
        if date_from > date_to:
            return Response({"detail": "`from` must be on or before `to`."}, status=400)

        currency = _currency_or_afn(request)
        accounts = AccountingAccount.objects.filter(is_active=True, currency=currency).order_by("code")

        rows = []
        sum_pd = Decimal("0")
        sum_pc = Decimal("0")
        tot_cl_dr = Decimal("0")
        tot_cl_cr = Decimal("0")
        period_net_by_type = {
            AccountingAccount.AccountType.ASSET: Decimal("0"),
            AccountingAccount.AccountType.LIABILITY: Decimal("0"),
            AccountingAccount.AccountType.EQUITY: Decimal("0"),
            AccountingAccount.AccountType.INCOME: Decimal("0"),
            AccountingAccount.AccountType.EXPENSE: Decimal("0"),
        }
        from api.services.accounting.balances import aggregate_line_totals, signed_balance

        for acc in accounts:
            opening_filter = Q(account_id=acc.id) & Q(entry__entry_date__lt=date_from)
            opening = aggregate_line_totals(
                JournalLine.objects.filter(opening_filter),
                account_currency=acc.currency,
            )
            ob = signed_balance(opening["debit"], opening["credit"], acc.account_type)

            period = aggregate_line_totals(
                JournalLine.objects.filter(
                    account_id=acc.id,
                    entry__entry_date__gte=date_from,
                    entry__entry_date__lte=date_to,
                ),
                account_currency=acc.currency,
            )
            pd = period["debit"]
            pc = period["credit"]
            closing = signed_balance(
                opening["debit"] + pd,
                opening["credit"] + pc,
                acc.account_type,
            )

            if ob == 0 and pd == 0 and pc == 0:
                continue

            ob_dr, ob_cr = _split_dr_cr(ob)
            cl_dr, cl_cr = _split_dr_cr(closing)

            rows.append(
                {
                    "code": acc.code,
                    "name": acc.name,
                    "account_type": acc.account_type,
                    "opening_debit": ob_dr,
                    "opening_credit": ob_cr,
                    "period_debit": _fmt(pd),
                    "period_credit": _fmt(pc),
                    "closing_debit": cl_dr,
                    "closing_credit": cl_cr,
                }
            )
            sum_pd += pd
            sum_pc += pc
            tot_cl_dr += Decimal(cl_dr or 0)
            tot_cl_cr += Decimal(cl_cr or 0)
            period_net = signed_balance(pd, pc, acc.account_type)
            period_net_by_type[acc.account_type] = (
                period_net_by_type.get(acc.account_type, Decimal("0")) + period_net
            )

        # Net income (period): Assets + Equity − Liabilities − Expenses
        # (each term is period net in account-type normal balance).
        asset_net = period_net_by_type[AccountingAccount.AccountType.ASSET]
        equity_net = period_net_by_type[AccountingAccount.AccountType.EQUITY]
        liability_net = period_net_by_type[AccountingAccount.AccountType.LIABILITY]
        expense_net = period_net_by_type[AccountingAccount.AccountType.EXPENSE]
        income_net = period_net_by_type[AccountingAccount.AccountType.INCOME]

        net_income = (
            asset_net + equity_net - liability_net - expense_net
        ).quantize(Decimal("0.01"))
        period_net_by_type_fmt = {k: _fmt(v) for k, v in period_net_by_type.items()}

        return Response(
            {
                "from": date_from,
                "to": date_to,
                "currency": currency,
                "rows": rows,
                "account_count": len(rows),
                "is_balanced": sum_pd == sum_pc and tot_cl_dr == tot_cl_cr,
                "net_profit": _fmt(net_income),
                "net_income": _fmt(net_income),
                "period_net_by_type": period_net_by_type_fmt,
                "net_income_formula": {
                    "assets": _fmt(asset_net),
                    "equity": _fmt(equity_net),
                    "liabilities": _fmt(liability_net),
                    "expenses": _fmt(expense_net),
                    "income": _fmt(income_net),
                },
            }
        )


def _excel_trial_balance(data: dict) -> HttpResponse:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = "Trial Balance"

    thin = Side(style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    header_fill = PatternFill("solid", fgColor="111827")
    header_font = Font(bold=True, color="FFFFFF")

    ws.merge_cells("A1:I1")
    ws["A1"] = "Trial Balance"
    ws["A1"].font = Font(bold=True, size=14)
    ws.merge_cells("A2:I2")
    ws["A2"] = f"Period: {data['from']} — {data['to']}"
    ws.append([])

    headers = [
        "Code",
        "Account",
        "Type",
        "Opening Dr",
        "Opening Cr",
        "Period Dr",
        "Period Cr",
        "Closing Dr",
        "Closing Cr",
    ]
    ws.append(headers)
    hr = ws.max_row
    for col, h in enumerate(headers, 1):
        c = ws.cell(row=hr, column=col, value=h)
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border

    def _f(v):
        return float(v) if v not in (None, "") else None

    for r in data["rows"]:
        ws.append(
            [
                r["code"],
                r["name"],
                r["account_type"],
                _f(r.get("opening_debit")),
                _f(r.get("opening_credit")),
                _f(r["period_debit"]),
                _f(r["period_credit"]),
                _f(r.get("closing_debit")),
                _f(r.get("closing_credit")),
            ]
        )

    for row in range(hr + 1, ws.max_row + 1):
        for col in range(1, 10):
            cell = ws.cell(row=row, column=col)
            cell.border = border
            if col >= 4:
                if cell.value is not None:
                    cell.number_format = "#,##0.00"
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    ws.append([])
    ws.append(["Net income", float(data.get("net_profit") or data.get("net_income") or 0)])
    ws.cell(row=ws.max_row, column=2).number_format = "#,##0.00"
    ws.cell(row=ws.max_row, column=1).font = Font(bold=True)
    formula = data.get("net_income_formula") or {}
    if formula:
        ws.append(
            [
                "Formula (A+E−L−X)",
                f"{formula.get('assets', '0')} + {formula.get('equity', '0')} "
                f"- {formula.get('liabilities', '0')} - {formula.get('expenses', '0')}",
            ]
        )

    widths = {1: 10, 2: 34, 3: 12, 4: 13, 5: 13, 6: 13, 7: 13, 8: 13, 9: 13}
    for col, w in widths.items():
        ws.column_dimensions[get_column_letter(col)].width = w

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    fname = f"trial-balance_{data['currency']}_{data['from']}_{data['to']}.xlsx"
    resp = HttpResponse(
        out.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{fname}"'
    return resp


def _pdf_trial_balance(data: dict) -> HttpResponse:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer

    font_regular, font_bold = ensure_pdf_fonts()
    styles = getSampleStyleSheet()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20,
        title="Trial Balance",
    )
    story = [
        pdf_paragraph("Trial Balance", styles["Title"], bold=True),
        pdf_paragraph(f"Period: {data['from']} — {data['to']}"),
        Spacer(1, 10),
    ]

    headers = [
        "Code",
        "Account",
        "Type",
        "Op. Dr",
        "Op. Cr",
        "Per. Dr",
        "Per. Cr",
        "Cl. Dr",
        "Cl. Cr",
    ]
    table_data = [[pdf_header_cell(h) for h in headers]]
    for r in data["rows"]:
        table_data.append(
            [
                pdf_paragraph(r["code"]),
                pdf_paragraph(str(r["name"])[:40]),
                pdf_paragraph(str(r["account_type"])[:12]),
                pdf_paragraph(r.get("opening_debit") or "—"),
                pdf_paragraph(r.get("opening_credit") or "—"),
                pdf_paragraph(r["period_debit"]),
                pdf_paragraph(r["period_credit"]),
                pdf_paragraph(r.get("closing_debit") or "—"),
                pdf_paragraph(r.get("closing_credit") or "—"),
            ]
        )
    page_w, _ = landscape(A4)
    usable = page_w - 40
    col_widths = [usable * w for w in (0.07, 0.22, 0.08, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09)]
    tbl = Table(table_data, repeatRows=1, colWidths=col_widths)
    tbl.setStyle(
        TableStyle(
            apply_unicode_table_fonts(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), font_bold),
                    ("FONTNAME", (0, 1), (-1, -1), font_regular),
                    ("FONTSIZE", (0, 0), (-1, -1), 7),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D1D5DB")),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#F9FAFB")],
                    ),
                    ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
    )
    story.append(tbl)
    story.append(Spacer(1, 10))
    net_val = data.get("net_income") or data.get("net_profit", "0.00")
    story.append(pdf_paragraph(f"Net income: {net_val}", bold=True))
    formula = data.get("net_income_formula") or {}
    if formula:
        story.append(
            pdf_paragraph(
                "Formula (Assets + Equity − Liabilities − Expenses): "
                f"{formula.get('assets', '0')} + {formula.get('equity', '0')} "
                f"− {formula.get('liabilities', '0')} − {formula.get('expenses', '0')}"
            )
        )
    by_type = data.get("period_net_by_type") or {}
    if by_type:
        parts = [f"{k}: {v}" for k, v in by_type.items()]
        story.append(pdf_paragraph("Period net by type: " + ", ".join(parts)))
    doc.build(story)
    pdf = buf.getvalue()
    buf.close()
    fname = f"trial-balance_{data.get('currency') or 'AFN'}_{data['from']}_{data['to']}.pdf"
    resp = HttpResponse(pdf, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="{fname}"'
    return resp


class AccountingTrialBalanceExportExcelAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, *args, **kwargs):
        view = AccountingTrialBalanceAPIView()
        resp = view.get(request)
        if resp.status_code != 200:
            return resp
        try:
            return _excel_trial_balance(resp.data)
        except Exception as e:
            return HttpResponse(str(e), status=500, content_type="text/plain")


class AccountingTrialBalanceExportPdfAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, *args, **kwargs):
        view = AccountingTrialBalanceAPIView()
        resp = view.get(request)
        if resp.status_code != 200:
            return resp
        try:
            return _pdf_trial_balance(resp.data)
        except Exception as e:
            return HttpResponse(str(e), status=500, content_type="text/plain")
