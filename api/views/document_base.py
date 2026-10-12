"""Mixin for ERP documents that post to the general ledger."""

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from api.choices import DocumentStatus
from api.models.accounting_utils import AuditLog
from api.services.accounting.document_posting import check_period_for_document
from api.utils.audit import log_audit


class PostableDocumentMixin:
    """
    Adds POST /{id}/post/ and POST /{id}/cancel/ actions.
    Subclasses set `posting_sync` to a callable(document) -> None.

    Note: assign with staticmethod(...) so the callable is not bound as a
    ViewSet instance method (which would pass `self` as an extra argument).
    """

    posting_sync = None
    audit_module = ""

    def _resolve_posting_sync(self):
        """Return the raw callable, unwrapping bound-method / staticmethod."""
        sync = getattr(type(self), "posting_sync", None)
        if sync is None:
            return None
        # staticmethod descriptor on the class
        if isinstance(sync, staticmethod):
            return sync.__func__
        # Accidentally bound as a method when assigned as a bare function
        return getattr(sync, "__func__", sync)

    def _audit(self, request, doc, action: str, summary: str = "") -> None:
        log_audit(
            user=request.user,
            action=action,
            module=self.audit_module or self.__class__.__name__,
            object_type=doc.__class__.__name__,
            object_id=doc.pk,
            summary=summary or f"{action} {doc.__class__.__name__} #{doc.pk}",
        )

    @action(detail=True, methods=["post"], url_path="post")
    def post_document(self, request, pk=None):
        doc = self.get_object()
        if doc.status == DocumentStatus.POSTED:
            return Response(
                {"detail": "Document is already posted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if doc.status == DocumentStatus.CANCELLED:
            return Response(
                {"detail": "Cancelled documents cannot be posted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            check_period_for_document(doc)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sync = self._resolve_posting_sync()
        previous_status = doc.status

        try:
            with transaction.atomic():
                doc.status = DocumentStatus.POSTED
                doc.save(update_fields=["status", "updated_at"])
                if sync:
                    sync(doc)
        except Exception as exc:
            # Re-fetch in case atomic rolled back the status change
            doc.refresh_from_db(fields=["status", "updated_at"])
            if doc.status == DocumentStatus.POSTED and doc.status != previous_status:
                doc.status = previous_status
                doc.save(update_fields=["status", "updated_at"])
            detail = str(exc) or exc.__class__.__name__
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        doc.refresh_from_db()
        self._audit(request, doc, AuditLog.Action.POST)
        serializer = self.get_serializer(doc)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_document(self, request, pk=None):
        doc = self.get_object()
        if doc.status == DocumentStatus.CANCELLED:
            return Response(
                {"detail": "Document is already cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sync = self._resolve_posting_sync()
        previous_status = doc.status

        try:
            with transaction.atomic():
                doc.status = DocumentStatus.CANCELLED
                doc.save(update_fields=["status", "updated_at"])
                if sync:
                    sync(doc)
        except Exception as exc:
            doc.refresh_from_db(fields=["status", "updated_at"])
            if doc.status == DocumentStatus.CANCELLED and doc.status != previous_status:
                doc.status = previous_status
                doc.save(update_fields=["status", "updated_at"])
            detail = str(exc) or exc.__class__.__name__
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        doc.refresh_from_db()
        self._audit(
            request,
            doc,
            AuditLog.Action.UPDATE,
            summary=f"Cancelled {doc.__class__.__name__} #{doc.pk}",
        )
        serializer = self.get_serializer(doc)
        return Response(serializer.data)
