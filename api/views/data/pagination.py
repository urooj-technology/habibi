from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """
    Always paginates list responses as {count, next, previous, results}.
    Matches DRF defaults; max page size caps client ?page_size= requests.
    """

    page_size = 25
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 500


class CustomPagination(PageNumberPagination):
    page_size_query_param = (
        "page_size"  # Enable dynamic page size through query parameter
    )
    max_page_size = 500

    def paginate_queryset(self, queryset, request, view=None):
        # Check if 'page_size' is provided in the request
        page_size = request.query_params.get(self.page_size_query_param, None)

        # If 'page_size' is not provided, return all data (disable pagination)
        if not page_size:
            return None

        try:
            parsed = int(page_size)
            self.page_size = max(1, min(parsed, self.max_page_size))
        except (TypeError, ValueError):
            self.page_size = StandardResultsPagination.page_size

        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,  # Total number of items in the queryset
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )

    def paginate_and_serialize(self, queryset, serializer_class, request):
        # Use the updated paginate_queryset logic
        page = self.paginate_queryset(queryset, request)
        if page is not None:
            serializer = serializer_class(page, many=True)
            return self.get_paginated_response(serializer.data)
        else:
            # If pagination is disabled (page_size not provided), return all data
            serializer = serializer_class(queryset, many=True)
            return Response(serializer.data)
