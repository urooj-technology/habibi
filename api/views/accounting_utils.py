from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission

from api.models.accounting_utils import OpeningBalanceEntry
from api.serializers.accounting_utils import OpeningBalanceEntrySerializer
from api.services.accounting.document_posting import sync_opening_balance
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination
from api.views.document_base import PostableDocumentMixin


class OpeningBalanceEntryViewSet(PostableDocumentMixin, DataRootViewSet):
    posting_sync = staticmethod(sync_opening_balance)
    queryset = OpeningBalanceEntry.objects.select_related("account").all()
    serializer_class = OpeningBalanceEntrySerializer
    permission_classes = [ModuleCRUDPermission("accounting")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "account"]
    pagination_class = CustomPagination
