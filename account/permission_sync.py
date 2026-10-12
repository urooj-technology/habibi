"""
Sync ERP permission catalog + seeded system roles into the database.

Called from the post_migrate signal so permissions always exist after migrate
(and stay in sync when the catalog in permission_catalog.py grows).
"""

from django.db.models import Q

from account.permission_catalog import (
    PERMISSION_CATALOG,
    SEEDED_ROLE_PERMISSIONS,
    SEEDED_ROLES,
)


def sync_permission_catalog(*, assign_system_role_perms=True):
    """
    Upsert all catalog Permission rows and ensure system Roles exist.

    For system roles, permission sets are refreshed from SEEDED_ROLE_PERMISSIONS
    so Admin/Seller/Buyer/Finance stay aligned with the catalog.
    Custom (non-system) roles are left untouched.
    """
    from account.models import Permission, Role, User

    code_to_perm = {}
    for code, module, action, label in PERMISSION_CATALOG:
        perm, _ = Permission.objects.update_or_create(
            code=code,
            defaults={
                "module": module,
                "action": action,
                "label": label,
            },
        )
        code_to_perm[code] = perm

    # Drop obsolete catalog rows that are no longer defined
    valid_codes = set(code_to_perm.keys())
    Permission.objects.exclude(code__in=valid_codes).delete()

    if not assign_system_role_perms:
        return code_to_perm

    slug_to_role = {}
    for role_def in SEEDED_ROLES:
        role, created = Role.objects.update_or_create(
            slug=role_def["slug"],
            defaults={
                "name": role_def["name"],
                "description": role_def["description"],
                "is_system": role_def["is_system"],
            },
        )
        # Only seed permissions on first create — keep admin edits afterwards
        if created or not role.permissions.exists():
            codes = SEEDED_ROLE_PERMISSIONS.get(role_def["slug"], [])
            role.permissions.set(
                [code_to_perm[c] for c in codes if c in code_to_perm]
            )
        slug_to_role[role_def["slug"]] = role

    # Admins / superusers without a role get the Admin role
    admin_role = slug_to_role.get("admin")
    if admin_role:
        User.objects.filter(role__isnull=True).filter(
            Q(is_admin=True) | Q(is_superuser=True)
        ).update(role=admin_role)

    return code_to_perm
