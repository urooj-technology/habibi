# api/views/data/employee.py

from decimal import Decimal
from datetime import datetime
from django.db.models import Sum

from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from api.choices import DocumentStatus
from api.models.data.employee import Employee
from api.models.payroll import PayrollRunLine
from api.serializers.data.employee import EmployeeSerializer
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination


class EmployeeViewSet(DataRootViewSet):
    queryset = Employee.objects.all().order_by("-id")
    serializer_class = EmployeeSerializer
    permission_classes = [ModuleCRUDPermission("hr")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["name", "contact", "salary"]
    search_fields = ["name", "contact"]
    pagination_class = CustomPagination

    def _get_period(self):
        now = datetime.now()
        params = self.request.query_params

        try:
            month = int(params.get("month", now.month))
            if not 1 <= month <= 12:
                month = now.month
        except (TypeError, ValueError):
            month = now.month

        try:
            year = int(params.get("year", now.year))
        except (TypeError, ValueError):
            year = now.year

        return month, year

    def _add_finance_fields(self, employee, data, month, year):
        """Summarize posted payroll net pay for the selected month."""
        salary = employee.salary or Decimal("0.00")
        qs = PayrollRunLine.objects.filter(
            employee_id=employee.id,
            payroll_run__run_date__year=year,
            payroll_run__run_date__month=month,
            payroll_run__status=DocumentStatus.POSTED,
        )
        paid = qs.aggregate(total=Sum("net_amount"))["total"] or Decimal("0.00")
        data["finance"] = {
            "name": "finance",
            "payroll_amount": paid,
            "advance_amount": Decimal(0),
            "total_paid": paid,
            "remaining_amount": max(salary - paid, Decimal("0.00")),
        }

    def list(self, request, *args, **kwargs):
        month, year = self._get_period()
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            items = serializer.data
            for emp_obj, emp_data in zip(page, items):
                self._add_finance_fields(emp_obj, emp_data, month, year)
            return self.get_paginated_response(items)

        serializer = self.get_serializer(queryset, many=True)
        items = serializer.data
        for emp_obj, emp_data in zip(queryset, items):
            self._add_finance_fields(emp_obj, emp_data, month, year)
        return Response(items)

    def retrieve(self, request, *args, **kwargs):
        month, year = self._get_period()
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        self._add_finance_fields(instance, data, month, year)
        return Response(data)
