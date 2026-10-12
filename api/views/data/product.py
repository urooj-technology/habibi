from django.db import IntegrityError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from api.serializers.data.product import ProductSerializer
from api.models.data.product import Product
from api.views.data.pagination import CustomPagination
from api.views.data.base import DataRootViewSet


class ProductViewSet(DataRootViewSet):
    queryset = Product.objects.all().order_by("-id")
    serializer_class = ProductSerializer
    permission_classes = [ModuleCRUDPermission("inventory")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["name", "category"]
    search_fields = ["name"]
    pagination_class = CustomPagination

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {
                    "name": [
                        "A product with this name already exists. Choose a different name or edit the existing product."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
