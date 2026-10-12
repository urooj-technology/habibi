import django_filters
from django.db.models import Q

from api.models.data.sale import Sale


class SaleFilter(django_filters.FilterSet):
    """Filters for sale list: customer, currency, sale date range, payment bucket."""

    date_from = django_filters.DateFilter(
        field_name="sale_date",
        lookup_expr="date__gte",
    )
    date_to = django_filters.DateFilter(
        field_name="sale_date",
        lookup_expr="date__lte",
    )
    payment_status = django_filters.ChoiceFilter(
        choices=[
            ("paid", "Paid"),
            ("partial", "Partial"),
            ("unpaid", "Unpaid"),
        ],
        method="filter_payment_status",
    )

    class Meta:
        model = Sale
        fields = ["customer", "currency"]

    def filter_payment_status(self, queryset, name, value):
        if not value:
            return queryset
        if value == "paid":
            return queryset.filter(is_paid=True)
        if value == "partial":
            return queryset.filter(is_paid=False, received_amount__gt=0)
        if value == "unpaid":
            return queryset.filter(is_paid=False).filter(
                Q(received_amount__isnull=True) | Q(received_amount=0)
            )
        return queryset
