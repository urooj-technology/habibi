"""Operational report API views."""

from datetime import datetime

from rest_framework.permissions import IsAuthenticated
from account.permissions import HasPerm
from rest_framework.response import Response
from rest_framework.views import APIView

from api.services.accounting.operational_reports import (
    build_aging_detail,
    build_bank_book,
    build_cash_flow_statement,
    build_collection_report,
    build_employee_ledger,
    build_general_journal,
    build_outstanding_payables,
    build_outstanding_receivables,
    build_payroll_register,
    build_purchases_by_vendor,
    build_sales_by_customer,
    build_sales_returns_report,
    build_stock_ledger,
    build_stock_valuation,
    build_profit_by_category,
)
from api.services.accounting.financial_reports import (
    build_balance_sheet,
    build_profit_and_loss,
)


def _parse_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except ValueError:
        return None


def _currency(request) -> str:
    c = (request.query_params.get("currency") or "AFN").upper()
    return c if c in ("AFN", "USD") else "AFN"


class GeneralJournalReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_general_journal(date_from, date_to, _currency(request)))


class SalesByCustomerReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_sales_by_customer(date_from, date_to, _currency(request)))


class PurchasesByVendorReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_purchases_by_vendor(date_from, date_to, _currency(request)))


class CollectionReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_collection_report(date_from, date_to, _currency(request)))


class SalesReturnsReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_sales_returns_report(date_from, date_to, _currency(request)))


class AgingDetailReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        kind = (request.query_params.get("kind") or "customer").lower()
        if kind not in ("customer", "vendor"):
            return Response({"detail": "Query parameter `kind` must be customer or vendor."}, status=400)
        as_of = _parse_date(request.query_params.get("as_of"))
        from datetime import date as date_cls

        as_of_date = date_cls.fromisoformat(as_of) if as_of else None
        return Response(build_aging_detail(kind=kind, currency=_currency(request), as_of=as_of_date))


class StockLedgerReportAPIView(APIView):
    permission_classes = [HasPerm("inventory.view")]

    def get(self, request):
        return Response(build_stock_ledger(_currency(request)))


class StockValuationReportAPIView(APIView):
    permission_classes = [HasPerm("inventory.view")]

    def get(self, request):
        return Response(build_stock_valuation(_currency(request)))


class PayrollRegisterReportAPIView(APIView):
    permission_classes = [HasPerm("hr.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_payroll_register(date_from, date_to, _currency(request)))


class EmployeeLedgerReportAPIView(APIView):
    permission_classes = [HasPerm("hr.view")]

    def get(self, request, employee_id: int):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_employee_ledger(employee_id, date_from, date_to, _currency(request)))


class BankBookReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request, account_id: int):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_bank_book(account_id, date_from, date_to))


class CashFlowReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_cash_flow_statement(date_from, date_to, _currency(request)))


class OutstandingPayablesReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        as_of = _parse_date(request.query_params.get("as_of"))
        from datetime import date as date_cls

        as_of_date = date_cls.fromisoformat(as_of) if as_of else None
        return Response(build_outstanding_payables(_currency(request), as_of=as_of_date))


class OutstandingReceivablesReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        as_of = _parse_date(request.query_params.get("as_of"))
        from datetime import date as date_cls

        as_of_date = date_cls.fromisoformat(as_of) if as_of else None
        return Response(build_outstanding_receivables(_currency(request), as_of=as_of_date))


class BalanceSheetReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        as_of = _parse_date(request.query_params.get("as_of"))
        if not as_of:
            return Response({"detail": "Query parameter `as_of` is required."}, status=400)
        return Response(build_balance_sheet(as_of, _currency(request)))


class ProfitAndLossReportAPIView(APIView):
    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_profit_and_loss(date_from, date_to, _currency(request)))


class ProfitByCategoryReportAPIView(APIView):
    """Gross profit per product category — for partner / owner splits."""

    permission_classes = [HasPerm("accounting.view")]

    def get(self, request):
        date_from = _parse_date(request.query_params.get("from") or request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("to") or request.query_params.get("date_to"))
        if not date_from or not date_to:
            return Response({"detail": "Query parameters `from` and `to` are required."}, status=400)
        return Response(build_profit_by_category(date_from, date_to))
