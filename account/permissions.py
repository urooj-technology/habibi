from rest_framework.permissions import BasePermission, SAFE_METHODS


def HasPerm(code):
    """Return a DRF permission class requiring `code` (admin/superuser bypass)."""

    class _HasPerm(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user or not user.is_authenticated:
                return False
            return user.has_perm_code(code)

    _HasPerm.__name__ = f"HasPerm_{code.replace('.', '_')}"
    return _HasPerm


def HasAnyPerm(*codes):
    """Return a DRF permission class requiring any of the given codes."""

    class _HasAnyPerm(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user or not user.is_authenticated:
                return False
            return user.has_any_perm_code(*codes)

    return _HasAnyPerm


def ModuleCRUDPermission(module, manage_action=None):
    """
    Map HTTP methods to module.action codes.
    GET → view, POST → create (or manage), PUT/PATCH → edit, DELETE → delete (or manage).
    """

    class _ModuleCRUD(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user or not user.is_authenticated:
                return False
            if user.is_admin or user.is_superuser:
                return True

            method = request.method.upper()
            if method in SAFE_METHODS:
                code = f"{module}.view"
            elif method == "POST":
                code = (
                    f"{module}.{manage_action}"
                    if manage_action
                    else f"{module}.create"
                )
            elif method in ("PUT", "PATCH"):
                code = f"{module}.edit"
            elif method == "DELETE":
                code = (
                    f"{module}.{manage_action}"
                    if manage_action
                    else f"{module}.delete"
                )
            else:
                return False
            return user.has_perm_code(code)

    _ModuleCRUD.__name__ = f"ModuleCRUD_{module}"
    return _ModuleCRUD
