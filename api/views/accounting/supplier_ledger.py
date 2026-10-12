from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from account.permissions import HasPerm
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.data.supplier import Supplier
from api.services.accounting.contact_ledger import build_contact_ledger_payload
from api.views.accounting.contact_ledger_export import (
    csv_contact_ledger_response,
    excel_contact_ledger_response,
    pdf_contact_ledger_response,
)


class SupplierLedgerAPIView(APIView):
    """
    Supplier subledger: accounts payable lines only, in each line's account currency.
    Optional ?currency=AFN|USD filters by AP account currency.
    """

    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, supplier_id: int):
        date_from = request.query_params.get("from") or request.query_params.get("date_from")
        date_to = request.query_params.get("to") or request.query_params.get("date_to")

        if not date_from or not date_to:
            return Response(
                {"detail": "Query parameters `from` and `to` (YYYY-MM-DD) are required."},
                status=400,
            )

        currency = (request.query_params.get("currency") or "").strip().upper()
        if currency and currency not in ("AFN", "USD"):
            return Response(
                {"detail": "Optional `currency` must be AFN or USD."},
                status=400,
            )

        return Response(
            build_contact_ledger_payload(
                kind="supplier",
                contact_id=supplier_id,
                date_from=date_from,
                date_to=date_to,
                currency_filter=currency,
                transaction_type=request.query_params.get("transaction_type", ""),
                status=request.query_params.get("status", ""),
                search=request.query_params.get("search", ""),
                amount_min=request.query_params.get("amount_min", ""),
                amount_max=request.query_params.get("amount_max", ""),
                page=request.query_params.get("page", 1),
                page_size=request.query_params.get("page_size", 25),
            )
        )


class SupplierLedgerExportExcelAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, supplier_id: int):
        inner = SupplierLedgerAPIView()
        resp = inner.get(request, supplier_id)
        if resp.status_code != 200:
            return resp
        name = Supplier.objects.filter(pk=supplier_id).values_list("name", flat=True).first() or ""
        try:
            return excel_contact_ledger_response(
                resp.data,
                ledger_label="Supplier ledger",
                contact_name=name,
                entity_key="supplier-ledger",
                entity_id=supplier_id,
            )
        except Exception as e:
            return HttpResponse(str(e), status=500, content_type="text/plain")


class SupplierLedgerExportPdfAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, supplier_id: int):
        inner = SupplierLedgerAPIView()
        resp = inner.get(request, supplier_id)
        if resp.status_code != 200:
            return resp
        name = Supplier.objects.filter(pk=supplier_id).values_list("name", flat=True).first() or ""
        try:
            return pdf_contact_ledger_response(
                resp.data,
                ledger_label="Supplier ledger",
                contact_name=name,
                entity_key="supplier-ledger",
                entity_id=supplier_id,
            )
        except Exception as e:
            return HttpResponse(str(e), status=500, content_type="text/plain")


class SupplierLedgerExportCsvAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, supplier_id: int):
        inner = SupplierLedgerAPIView()
        resp = inner.get(request, supplier_id)
        if resp.status_code != 200:
            return resp
        name = Supplier.objects.filter(pk=supplier_id).values_list("name", flat=True).first() or ""
        try:
            return csv_contact_ledger_response(
                resp.data,
                ledger_label="Supplier ledger",
                contact_name=name,
                entity_key="supplier-ledger",
                entity_id=supplier_id,
            )
        except Exception as e:
            return HttpResponse(str(e), status=500, content_type="text/plain")
