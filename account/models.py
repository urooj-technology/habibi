from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser


# Custom User Manager
class UserManager(BaseUserManager):
    def create_user(
        self,
        username,
        email,
        phone=None,
        first_name=None,
        last_name=None,
        password=None,
    ):
        if not username:
            raise ValueError("User must have a username")

        if not email:
            raise ValueError("User must have an email")

        username = username.lower()
        email = self.normalize_email(email)

        user = self.model(
            username=username,
            email=email,
            phone=phone,
            first_name=first_name,
            last_name=last_name,
        )

        if not password:
            raise ValueError("Users must have a password.")
        user.set_password(password)

        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None):
        if not username:
            raise ValueError("Superusers must have a username.")
        if not email:
            raise ValueError("Superusers must have an email.")
        if not password:
            raise ValueError("Superusers must have a password.")

        user = self.create_user(username=username, email=email, password=password)

        user.is_admin = user.is_staff = user.is_superuser = True
        user.save(using=self._db)
        return user


class Permission(models.Model):
    """ERP page/action permission code (e.g. sales.view)."""

    code = models.CharField(max_length=64, unique=True)
    module = models.CharField(max_length=64, db_index=True)
    action = models.CharField(max_length=32, db_index=True)
    label = models.CharField(max_length=128)

    class Meta:
        ordering = ["module", "action"]

    def __str__(self):
        return self.code


class Role(models.Model):
    """Named role with a set of permissions. One role per user."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    is_system = models.BooleanField(
        default=False,
        help_text="System roles cannot be deleted.",
    )
    permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name="roles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def get_permission_codes(self):
        return set(self.permissions.values_list("code", flat=True))


class User(AbstractBaseUser):
    username = models.CharField(verbose_name="username", max_length=255, unique=True)
    email = models.EmailField(verbose_name="email address", max_length=255, unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    first_name = models.CharField(max_length=200, null=True, blank=True)
    last_name = models.CharField(max_length=200, null=True, blank=True)
    profile_picture = models.ImageField(upload_to="authors/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

    def has_perm(self, perm, obj=None):
        """Admin users have all permissions."""
        return self.is_admin or self.is_superuser

    def has_module_perms(self, app_label):
        """Admin users have permissions to view any app."""
        return self.is_admin or self.is_superuser

    def get_permission_codes(self):
        """Return set of permission codes for this user."""
        if self.is_admin or self.is_superuser:
            from account.permission_catalog import ALL_CODES

            return set(ALL_CODES)
        if self.role_id:
            return self.role.get_permission_codes()
        return set()

    def has_perm_code(self, code):
        """Check a single ERP permission code. Admin/superuser bypass."""
        if self.is_admin or self.is_superuser:
            return True
        if not code:
            return False
        return code in self.get_permission_codes()

    def has_any_perm_code(self, *codes):
        if self.is_admin or self.is_superuser:
            return True
        owned = self.get_permission_codes()
        return any(c in owned for c in codes if c)
