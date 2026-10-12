from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Role, Permission


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("code", "module", "action", "label")
    list_filter = ("module", "action")
    search_fields = ("code", "label")


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_system", "updated_at")
    list_filter = ("is_system",)
    search_fields = ("name", "slug")
    filter_horizontal = ("permissions",)
    prepopulated_fields = {"slug": ("name",)}


class UserAdmin(BaseUserAdmin):
    list_display = (
        "id",
        "username",
        "email",
        "phone",
        "role",
        "is_admin",
        "is_active",
    )
    list_filter = ("is_admin", "is_active", "is_superuser", "role")
    search_fields = ("username", "email", "phone", "first_name", "last_name")
    ordering = ("id",)
    filter_horizontal = ()
    autocomplete_fields = ("role",)

    fieldsets = (
        (
            _("Personal Info"),
            {
                "fields": (
                    "username",
                    "email",
                    "phone",
                    "first_name",
                    "last_name",
                    "profile_picture",
                )
            },
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_admin",
                    "is_superuser",
                    "is_staff",
                )
            },
        ),
        (_("Important Dates"), {"fields": ("last_login", "created_at", "updated_at")}),
    )

    readonly_fields = ("created_at", "updated_at", "last_login")

    add_fieldsets = (
        (
            _("Create New User"),
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "phone",
                    "first_name",
                    "last_name",
                    "role",
                    "is_admin",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    def get_queryset(self, request):
        """Ensure only superusers can see all users."""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(is_admin=False)


admin.site.register(User, UserAdmin)
