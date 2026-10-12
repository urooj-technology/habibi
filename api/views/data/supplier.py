from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from api.serializers.data.supplier import SupplierSerializer
from api.models.data.supplier import Supplier
from api.views.data.pagination import CustomPagination
from api.views.data.base import DataRootViewSet


class SupplierViewSet(DataRootViewSet):
    queryset = Supplier.objects.all().order_by("-id")
    serializer_class = SupplierSerializer
    permission_classes = [ModuleCRUDPermission("contacts")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = [
        "name",
        "contact",
        "address",
    ]  # Filter by name, contact, and address
    search_fields = ["name", "contact"]  # Search by name and contact
    pagination_class = CustomPagination
