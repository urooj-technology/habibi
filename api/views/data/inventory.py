from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission

from api.models.data.inventory import Inventory
from api.serializers.data.inventory import InventorySerializer
from api.services.inventory.stock_export import (
    build_stock_export_rows,
    excel_stock_inventory_response,
    pdf_stock_inventory_response,
)
from api.services.notifications import notify_low_stock_if_needed
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination


class InventoryViewSet(DataRootViewSet):
    queryset = Inventory.objects.select_related("product").all().order_by("-id")
    serializer_class = InventorySerializer
    permission_classes = [ModuleCRUDPermission("inventory")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["product"]
    search_fields = [
        "product__name",
        "product__barcode",
    ]
    pagination_class = CustomPagination

    def perform_create(self, serializer):
        inventory = serializer.save()
        notify_low_stock_if_needed(inventory)

    def perform_update(self, serializer):
        inventory = serializer.save()
        notify_low_stock_if_needed(inventory)

    def _export_rows(self):
        qs = self.filter_queryset(self.get_queryset()).order_by("-id")
        return build_stock_export_rows(qs)

    @action(detail=False, methods=["get"], url_path="export/excel")
    def export_excel(self, request, *args, **kwargs):
        return excel_stock_inventory_response(self._export_rows())

    @action(detail=False, methods=["get"], url_path="export/pdf")
    def export_pdf(self, request, *args, **kwargs):
        return pdf_stock_inventory_response(self._export_rows())
