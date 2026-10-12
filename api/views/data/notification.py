from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models.data.notification import Notification
from api.serializers.data.notification import NotificationSerializer
from api.views.data.base import DataRootViewSet
from api.views.data.pagination import CustomPagination


class NotificationViewSet(DataRootViewSet):
    """List / mark-read notifications for the authenticated user only."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by("-id")

    def create(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def list(self, request, *args, **kwargs):
        unread_only = str(request.query_params.get("unread") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        type_filter = (request.query_params.get("type") or "").strip().lower()
        qs = self.get_queryset()
        if unread_only:
            qs = qs.filter(is_read=False)
        if type_filter and type_filter != "all":
            qs = qs.filter(type=type_filter)
        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request, *args, **kwargs):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, *args, **kwargs):
        notif = self.get_object()
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=["is_read", "updated_at"])
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request, *args, **kwargs):
        updated = (
            self.get_queryset()
            .filter(is_read=False)
            .update(is_read=True)
        )
        return Response({"updated": updated}, status=status.HTTP_200_OK)
