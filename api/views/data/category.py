from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from api.serializers.data.category import CategorySerializer
from api.models.data.category import Category
from api.views.data.pagination import CustomPagination
from api.views.data.base import DataRootViewSet


class CategoryViewSet(DataRootViewSet):
    queryset = Category.objects.all().order_by("-id")
    serializer_class = CategorySerializer
    permission_classes = [ModuleCRUDPermission("inventory")]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["name"]  # Filter by name and code
    search_fields = ["name"]  # Search by name and code
    pagination_class = CustomPagination
