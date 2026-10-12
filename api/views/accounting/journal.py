from decimal import Decimal

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from api.models.accounting.journal import JournalEntry
from api.serializers.accounting.journal import (
    JournalEntryDetailSerializer,
    JournalEntryListSerializer,
    ManualJournalEntryCreateSerializer,
)
from api.views.data.pagination import CustomPagination
from rest_framework.exceptions import PermissionDenied


class JournalEntryViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    List/retrieve journal entries. Create is restricted to manual, balanced entries (home AFN).
    System-generated entries use the same model but are created by posting services.
    """

    permission_classes = [ModuleCRUDPermission("accounting")]
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["source_type", "entry_date"]
    ordering_fields = ["entry_date", "id"]
    ordering = ["-entry_date", "-id"]

    def get_queryset(self):
        qs = JournalEntry.objects.all().prefetch_related(
            "lines__account",
            "lines__customer",
            "lines__supplier",
        )

        out = DecimalField(max_digits=18, decimal_places=2)
        zero = Value(Decimal("0.00"), output_field=out)
        debit = Coalesce(Sum("lines__debit_home", output_field=out), zero, output_field=out)
        credit = Coalesce(Sum("lines__credit_home", output_field=out), zero, output_field=out)

        return qs.annotate(
            _line_count=Count("lines"),
            _total_debit_home=debit,
            _total_credit_home=credit,
        )

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ManualJournalEntryCreateSerializer
        if self.action == "retrieve":
            return JournalEntryDetailSerializer
        return JournalEntryListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(
            JournalEntryDetailSerializer(entry, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = False
        return self._update_entry(request, partial=partial, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._update_entry(request, partial=True, *args, **kwargs)

    def _update_entry(self, request, partial: bool, *args, **kwargs):
        instance = self.get_object()
        if instance.source_type != JournalEntry.SourceType.MANUAL:
            raise PermissionDenied("Only MANUAL journal entries can be updated.")

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()

        return Response(
            JournalEntryDetailSerializer(entry, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    def perform_destroy(self, instance):
        if instance.source_type != JournalEntry.SourceType.MANUAL:
            raise PermissionDenied("Only MANUAL journal entries can be deleted.")
        instance.delete()
