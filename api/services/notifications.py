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
    """Return human-readable reasons why this stock row is low (empty list if OK)."""
    product = getattr(inventory, "product", None)
    reasons = []

    checks = []
    if product is None:
        checks = [
            ("weight", inventory.weight_amount, inventory.min_weight_amount),
            ("meter", inventory.meter_amount, inventory.min_meter_amount),
            ("khada", inventory.khada_amount, inventory.min_khada_amount),
            ("grain", inventory.grain_amount, inventory.min_grain_amount),
        ]
    else:
        if getattr(product, "is_weight", False):
            checks.append(
                ("weight", inventory.weight_amount, inventory.min_weight_amount)
            )
        if getattr(product, "is_meter", False):
            checks.append(("meter", inventory.meter_amount, inventory.min_meter_amount))
        if getattr(product, "is_khada", False):
            checks.append(("khada", inventory.khada_amount, inventory.min_khada_amount))
        if getattr(product, "is_grain", False):
            checks.append(("grain", inventory.grain_amount, inventory.min_grain_amount))
        if not checks:
            checks = [
                ("weight", inventory.weight_amount, inventory.min_weight_amount),
                ("meter", inventory.meter_amount, inventory.min_meter_amount),
                ("khada", inventory.khada_amount, inventory.min_khada_amount),
                ("grain", inventory.grain_amount, inventory.min_grain_amount),
            ]

    for label, current, minimum in checks:
        cur = _d(current)
        mn = _d(minimum)
        if cur <= mn:
            reasons.append(f"{label} {cur} ≤ min {mn}")
    return reasons


def notify_low_stock_if_needed(inventory) -> list:
    """
    Call explicitly after inventory quantities change (sale / purchase / edit).
    No signals.
    """
    if inventory is None or not getattr(inventory, "pk", None):
        return []

    # Ensure product is available for unit flags.
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

    thickness = (inventory.thickness or "").strip()
    title = f"Low stock: {product_name}"
    message = f"{product_name}"
    if thickness:
        message += f" ({thickness})"
    message += " — " + "; ".join(reasons)

    return notify_staff(
        type=Notification.Type.LOW_STOCK,
        title=title[:255],
        message=message,
        link=f"/app/inventory/stock",
        ref_type="inventory",
        ref_id=inventory.pk,
        dedupe_unread=True,
    )
