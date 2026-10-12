"""Write audit log entries for business actions."""

from __future__ import annotations

from api.models.accounting_utils import AuditLog


def log_audit(
    *,
    user,
    action: str,
    module: str,
    object_type: str = "",
    object_id: str | int = "",
    summary: str = "",
) -> None:
    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        module=module,
        object_type=object_type,
        object_id=str(object_id) if object_id else "",
        summary=summary[:255],
    )
