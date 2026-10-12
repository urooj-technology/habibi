"""
Excel / PDF builders for stock inventory exports.
"""

import io
from datetime import datetime
from decimal import Decimal

from django.http import HttpResponse


def _dec(value, places="0.01"):
    try:
        return float(Decimal(str(value or "0")).quantize(Decimal(places)))
    except Exception:
        return 0.0


def build_stock_export_rows(queryset):
    """Serialize inventory queryset into plain row dicts for export builders."""
    rows = []
    for inv in queryset:
        rows.append(
            {
                "id": inv.id,
                "product": inv.product.name if inv.product_id else "",
                "weight_amount": _dec(inv.weight_amount),
                "khada_amount": _dec(inv.khada_amount),
                "meter_amount": _dec(inv.meter_amount),
                "grain_amount": _dec(inv.grain_amount),
                "thickness": inv.thickness or "",
                "buy_price": _dec(inv.buy_price),
                "currency": inv.currency or "AFN",
            }
        )
    return rows


def excel_stock_inventory_response(rows) -> HttpResponse:
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
    except Exception as e:
        return HttpResponse(
            f"Excel export dependency missing: {e}",
            status=500,
            content_type="text/plain",
        )

    wb = Workbook()
    ws = wb.active
    ws.title = "Stock"

    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    title_font = Font(bold=True, size=16, color="1F2937")
    subtitle_font = Font(size=10, color="6B7280")
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="111827")
    thin = Side(style="thin", color="D1D5DB")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_center = Alignment(horizontal="center", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    headers = [
        "ID",
        "Product",
        "Weight",
        "Khada",
        "Meter",
        "Grain",
        "Thickness",
        "Buy Price",
        "Currency",
    ]

    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    ws["A1"] = "Stock Inventory"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
    ws["A2"] = f"Generated at: {generated_at}  |  Rows: {len(rows)}"
    ws["A2"].font = subtitle_font

    ws.append([])
    ws.append(headers)

    header_row = ws.max_row
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=header_row, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = border

    data_start = ws.max_row + 1
    for r in rows:
        ws.append(
            [
                r["id"],
                r["product"],
                r["weight_amount"],
                r["khada_amount"],
                r["meter_amount"],
                r["grain_amount"],
                r["thickness"],
                r["buy_price"],
                r["currency"],
            ]
        )
    data_end = ws.max_row

    money_cols = {3, 4, 5, 6, 8}
    for row in range(data_start, data_end + 1):
        for col in range(1, len(headers) + 1):
            c = ws.cell(row=row, column=col)
            c.border = border
            if col in (1, 9):
                c.alignment = align_center
            elif col in money_cols:
                c.alignment = align_right
                c.number_format = "#,##0.00"
            else:
                c.alignment = align_left

    ws.freeze_panes = f"A{data_start}"
    if data_end >= header_row:
        ws.auto_filter.ref = (
            f"A{header_row}:{get_column_letter(len(headers))}{data_end}"
        )

    widths = {1: 8, 2: 32, 3: 12, 4: 12, 5: 12, 6: 12, 7: 12, 8: 12, 9: 10}
    for col_idx, w in widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = w

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    fname = f"stock-inventory_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    resp = HttpResponse(
        out.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{fname}"'
    return resp


def pdf_stock_inventory_response(rows) -> HttpResponse:
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import (
            SimpleDocTemplate,
            Table,
            TableStyle,
            Paragraph,
            Spacer,
        )
    except Exception as e:
        return HttpResponse(
            f"PDF export dependency missing: {e}",
            status=500,
            content_type="text/plain",
        )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20,
        title="Stock Inventory",
    )
    styles = getSampleStyleSheet()
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    title = Paragraph("Stock Inventory", styles["Title"])
    subtitle = Paragraph(
        f"Generated at: {generated_at}  |  Rows: {len(rows)}",
        styles["Normal"],
    )

    data = [
        [
            "ID",
            "Product",
            "Weight",
            "Khada",
            "Meter",
            "Grain",
            "Thickness",
            "Buy Price",
            "Cur",
        ]
    ]
    for r in rows:
        data.append(
            [
                str(r["id"]),
                r["product"] or "—",
                f"{r['weight_amount']:.2f}",
                f"{r['khada_amount']:.2f}",
                f"{r['meter_amount']:.2f}",
                f"{r['grain_amount']:.2f}",
                str(r["thickness"] or "—"),
                f"{r['buy_price']:.2f}",
                r["currency"],
            ]
        )

    page_w, _page_h = landscape(A4)
    usable_w = page_w - doc.leftMargin - doc.rightMargin
    col_widths = [
        usable_w * 0.06,
        usable_w * 0.26,
        usable_w * 0.10,
        usable_w * 0.10,
        usable_w * 0.10,
        usable_w * 0.10,
        usable_w * 0.10,
        usable_w * 0.10,
        usable_w * 0.08,
    ]

    table = Table(data, repeatRows=1, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D1D5DB")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.white, colors.HexColor("#F9FAFB")],
                ),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("ALIGN", (2, 0), (5, -1), "RIGHT"),
                ("ALIGN", (7, 0), (7, -1), "RIGHT"),
                ("ALIGN", (8, 0), (8, -1), "CENTER"),
            ]
        )
    )

    doc.build([title, subtitle, Spacer(1, 10), table])
    pdf = buf.getvalue()
    buf.close()

    fname = f"stock-inventory_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    resp = HttpResponse(pdf, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="{fname}"'
    return resp
