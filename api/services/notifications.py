"""
Create notifications explicitly from views/services (no Django signals).

Shared hosting friendly: plain ORM writes at the call site.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Q

from api.models.data.notification import Notification

User = get_user_model()


def _d(value) -> Decimal:
    try:
        return Decimal(str(value if value is not None else "0"))
    except Exception:
        return Decimal("0")


def create_notification(
    *,
    recipient,
    title,
    message="",
    type=Notification.Type.SYSTEM,
    link="",
    ref_type="",
    ref_id=None,
):
    return Notification.objects.create(
        recipient=recipient,
        type=type,
        title=title,
        message=message or "",
        link=link or "",
        ref_type=ref_type or "",
        ref_id=ref_id,
    )


def staff_recipients():
    """Users who should receive operational alerts (admin/staff or sales access)."""
    return (
        User.objects.filter(is_active=True)
        .filter(
            Q(is_admin=True)
            | Q(is_staff=True)
            | Q(is_superuser=True)
            | Q(role__permissions__code="sales.view")
            | Q(role__slug="admin")
        )
        .distinct()
    )


def notify_staff(
    *,
    title,
    message="",
    type=Notification.Type.SYSTEM,
    link="",
    ref_type="",
    ref_id=None,
    dedupe_unread=True,
):
    """
    Fan-out a notification to staff/admin/seller users.
    If dedupe_unread and the same unread ref already exists for a user, skip.
    """
    created = []
    for user in staff_recipients().iterator():
        if (
            dedupe_unread
            and ref_type
            and ref_id is not None
            and Notification.objects.filter(
                recipient=user,
                type=type,
                ref_type=ref_type,
                ref_id=ref_id,
                is_read=False,
                is_deleted=False,
            ).exists()
        ):
            continue
        created.append(
            create_notification(
                recipient=user,
                type=type,
                title=title,
                message=message,
                link=link,
                ref_type=ref_type,
                ref_id=ref_id,
            )
        )
    return created


def low_stock_reasons(inventory) -> list[str]:
    """Return reasons why this stock row is low (empty list if OK)."""
    cur = _d(getattr(inventory, "quantity", 0))
    mn = _d(getattr(inventory, "min_quantity", 0))
    if cur <= mn:
        return [f"quantity {cur} ≤ min {mn}"]
    return []


def notify_low_stock_if_needed(inventory) -> list:
    """Call after inventory quantities change (sale / purchase / edit)."""
    if inventory is None or not getattr(inventory, "pk", None):
        return []

    if getattr(inventory, "product_id", None) and not getattr(inventory, "product", None):
        inventory.refresh_from_db()

    reasons = low_stock_reasons(inventory)
    if not reasons:
        return []

    product_name = ""
    if getattr(inventory, "product", None):
        product_name = inventory.product.name
    elif inventory.product_id:
        product_name = f"#{inventory.product_id}"

    title = f"Low stock: {product_name}"
    message = f"{product_name} — " + "; ".join(reasons)

    return notify_staff(
        type=Notification.Type.LOW_STOCK,
        title=title[:255],
        message=message,
        link="/app/inventory/stock",
        ref_type="inventory",
        ref_id=inventory.pk,
        dedupe_unread=True,
    )
