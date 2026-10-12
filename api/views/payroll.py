from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission

from api.models.payroll import PayrollRun
from api.serializers.payroll import PayrollRunSerializer
from api.services.accounting import document_posting
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination
from api.views.document_base import PostableDocumentMixin


class PayrollRunViewSet(PostableDocumentMixin, DataRootViewSet):
    posting_sync = staticmethod(document_posting.sync_payroll_run)
    queryset = PayrollRun.objects.prefetch_related("lines").all()
    serializer_class = PayrollRunSerializer
    permission_classes = [ModuleCRUDPermission("hr")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["status", "currency"]
    search_fields = ["reference", "memo"]
    pagination_class = CustomPagination
