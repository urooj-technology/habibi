from decimal import Decimal

import io
from datetime import datetime

from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce

from api.services.accounting.balances import annotate_account_balance_totals
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework import viewsets
from rest_framework.decorators import action

from api.models.accounting.account import AccountingAccount
from api.serializers.accounting.account import AccountingAccountSerializer
from api.views.data.pagination import StandardResultsPagination


class AccountingAccountViewSet(viewsets.ModelViewSet):
    """Chart of accounts (AFN home currency on journal lines)."""

    queryset = AccountingAccount.objects.all().order_by("code")
    serializer_class = AccountingAccountSerializer
    permission_classes = [ModuleCRUDPermission("accounting")]
    pagination_class = StandardResultsPagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["account_type", "role", "currency"]
    search_fields = ["code", "name"]

    def get_queryset(self):
        qs = super().get_queryset()
        out_f = DecimalField(max_digits=18, decimal_places=4)
        zero_f = Value(Decimal("0.0000"), output_field=out_f)
        qs = annotate_account_balance_totals(qs)
        debit_f = Coalesce(
            Sum("journal_lines__debit_foreign", output_field=out_f),
            zero_f,
            output_field=out_f,
        )
        credit_f = Coalesce(
            Sum("journal_lines__credit_foreign", output_field=out_f),
            zero_f,
            output_field=out_f,
        )
        return qs.annotate(
            _debit_foreign_raw=debit_f,
            _credit_foreign_raw=credit_f,
        )

    def _export_queryset(self):
        qs = self.filter_queryset(self.get_queryset())
        return qs.order_by("code")

    @action(detail=False, methods=["get"], url_path="export/excel")
    def export_excel(self, request, *args, **kwargs):
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
            from openpyxl.utils import get_column_letter
        except Exception as e:  # pragma: no cover
            return HttpResponse(
                f"Excel export dependency missing: {e}",
                status=500,
                content_type="text/plain",
            )

        rows = AccountingAccountSerializer(self._export_queryset(), many=True).data

        wb = Workbook()
        ws = wb.active
        ws.title = "Chart of Accounts"

        generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Styles
        title_font = Font(bold=True, size=16, color="1F2937")
        subtitle_font = Font(size=10, color="6B7280")
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill("solid", fgColor="111827")
        thin = Side(style="thin", color="D1D5DB")
        border = Border(left=thin, right=thin, top=thin, bottom=thin)
        align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
        align_center = Alignment(horizontal="center", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")

        # Title rows
        ws.merge_cells("A1:L1")
        ws["A1"] = "Chart of Accounts"
        ws["A1"].font = title_font
        ws["A1"].alignment = Alignment(horizontal="left", vertical="center")

        ws.merge_cells("A2:L2")
        ws["A2"] = f"Generated at: {generated_at}"
        ws["A2"].font = subtitle_font
        ws["A2"].alignment = Alignment(horizontal="left", vertical="center")

        ws.append([])  # row 3 spacer

        headers = [
            "Code",
            "Account Name",
            "Type",
            "Role",
            "Currency",
            "Active",
            "Debit",
            "Credit",
            "Balance",
            "Debit (AFN book)",
            "Credit (AFN book)",
            "Balance (AFN book)",
        ]
        ws.append(headers)  # row 4

        header_row = ws.max_row
        for col_idx, name in enumerate(headers, start=1):
            cell = ws.cell(row=header_row, column=col_idx, value=name)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = border

        def d2(v):
            try:
                return float(Decimal(str(v or "0")).quantize(Decimal("0.01")))
            except Exception:
                return 0.0

        def d4(v):
            try:
                return float(Decimal(str(v or "0")).quantize(Decimal("0.0001")))
            except Exception:
                return 0.0

        data_start = ws.max_row + 1
        for r in rows:
            ws.append(
                [
                    r.get("code", ""),
                    r.get("name", ""),
                    r.get("account_type", ""),
                    r.get("role", ""),
                    r.get("currency", ""),
                    "Yes" if r.get("is_active") else "No",
                    d2(r.get("total_debit")),
                    d2(r.get("total_credit")),
                    d2(r.get("balance")),
                    d2(r.get("total_debit_afn")),
                    d2(r.get("total_credit_afn")),
                    d2(r.get("balance_afn")),
                ]
            )

        data_end = ws.max_row

        # Formats & borders for data
        money_cols = [7, 8, 9, 10, 11, 12]
        for row in range(data_start, data_end + 1):
            for col in range(1, 13):
                c = ws.cell(row=row, column=col)
                c.border = border
                if col in (1, 5, 6):
                    c.alignment = align_center
                elif col in money_cols:
                    c.alignment = align_right
                    c.number_format = "#,##0.00"
                else:
                    c.alignment = align_left

        # Freeze panes under header row
        ws.freeze_panes = f"A{data_start}"

        # Auto-filter on header
        ws.auto_filter.ref = f"A{header_row}:L{data_end}"

        # Column widths (balanced for readability)
        widths = {
            1: 10,   # code
            2: 34,   # name
            3: 14,   # type
            4: 16,   # role
            5: 10,   # currency
            6: 10,   # active
            7: 16,
            8: 16,
            9: 16,
            10: 18,
            11: 18,
            12: 18,
        }
        for col_idx, w in widths.items():
            ws.column_dimensions[get_column_letter(col_idx)].width = w

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        fname = f"chart-of-accounts_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
        resp = HttpResponse(
            out.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="{fname}"'
        return resp

    @action(detail=False, methods=["get"], url_path="export/pdf")
    def export_pdf(self, request, *args, **kwargs):
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
        except Exception as e:  # pragma: no cover
            return HttpResponse(
                f"PDF export dependency missing: {e}",
                status=500,
                content_type="text/plain",
            )

        rows = AccountingAccountSerializer(self._export_queryset(), many=True).data

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A4),
            leftMargin=20,
            rightMargin=20,
            topMargin=20,
            bottomMargin=20,
            title="Chart of Accounts",
        )
        styles = getSampleStyleSheet()

        generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        title = Paragraph("Chart of Accounts", styles["Title"])
        subtitle = Paragraph(f"Generated at: {generated_at}", styles["Normal"])

        data = [
            [
                "Code",
                "Name",
                "Type",
                "Role",
                "Cur",
                "Debit",
                "Credit",
                "Balance",
            ]
        ]
        for r in rows:
            ccy = r.get("currency", "")
            data.append(
                [
                    r.get("code", ""),
                    r.get("name", ""),
                    r.get("account_type", ""),
                    r.get("role", ""),
                    ccy,
                    str(r.get("total_debit", "0.00")),
                    str(r.get("total_credit", "0.00")),
                    str(r.get("balance", "0.00")),
                ]
            )

        page_w, _page_h = landscape(A4)
        usable_w = page_w - doc.leftMargin - doc.rightMargin
        col_widths = [
            usable_w * 0.08,  # code
            usable_w * 0.32,  # name
            usable_w * 0.12,  # type
            usable_w * 0.14,  # role
            usable_w * 0.06,  # currency
            usable_w * 0.09,  # debit
            usable_w * 0.09,  # credit
            usable_w * 0.10,  # balance
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
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),  # code
                    ("ALIGN", (4, 0), (4, -1), "CENTER"),  # currency
                    ("ALIGN", (5, 0), (-1, -1), "RIGHT"),  # money columns
                ]
            )
        )

        doc.build([title, subtitle, Spacer(1, 10), table])
        pdf = buf.getvalue()
        buf.close()

        fname = f"chart-of-accounts_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{fname}"'
        return resp
