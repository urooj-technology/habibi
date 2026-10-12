"""Excel / PDF builders for stock inventory exports."""

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
    rows = []
    for inv in queryset:
        rows.append(
            {
                "id": inv.id,
                "product": inv.product.name if inv.product_id else "",
                "quantity": _dec(inv.quantity),
                "buy_price": _dec(inv.buy_price),
                "min_quantity": _dec(inv.min_quantity),
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

    headers = ["ID", "Product", "Quantity", "Buy Price", "Min Quantity"]

    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    ws["A1"] = "Stock Inventory"
    ws["A1"].font = title_font
    ws["A1"].alignment = align_left

    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
    ws["A2"] = f"Generated: {generated_at}"
    ws["A2"].font = subtitle_font

    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = border

    for r_idx, row in enumerate(rows, start=5):
        values = [
            row["id"],
            row["product"],
            row["quantity"],
            row["buy_price"],
            row["min_quantity"],
        ]
        for c_idx, value in enumerate(values, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=value)
            cell.border = border
            cell.alignment = align_right if c_idx > 2 else align_left

    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    response = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="stock_inventory.xlsx"'
    return response


def pdf_stock_inventory_response(rows) -> HttpResponse:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    except Exception as e:
        return HttpResponse(
            f"PDF export dependency missing: {e}",
            status=500,
            content_type="text/plain",
        )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Stock Inventory", styles["Title"]),
        Spacer(1, 12),
    ]

    data = [["ID", "Product", "Quantity", "Buy Price", "Min Qty"]]
    for row in rows:
        data.append(
            [
                str(row["id"]),
                row["product"],
                str(row["quantity"]),
                str(row["buy_price"]),
                str(row["min_quantity"]),
            ]
        )

    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    buf.seek(0)
    response = HttpResponse(buf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="stock_inventory.pdf"'
    return response
