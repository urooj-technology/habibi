from account.models import User, Role, Permission
from api.serializers.data.base import DataRootSerializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password


def user_auth_payload(user):
    """Shared login/profile shape including role + permissions."""
    role_data = None
    if user.role_id:
        role_data = {
            "id": user.role_id,
            "name": user.role.name,
            "slug": user.role.slug,
        }
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_admin": user.is_admin,
        "is_superuser": user.is_superuser,
        "role": role_data,
        "role_id": user.role_id,
        "permissions": sorted(user.get_permission_codes()),
    }


class PermissionSerializer(DataRootSerializer):
    class Meta:
        model = Permission
        fields = ["id", "code", "module", "action", "label"]


class RoleSerializer(DataRootSerializer):
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        source="permissions",
        required=False,
    )
    permission_codes = serializers.SerializerMethodField(read_only=True)
    permissions_detail = PermissionSerializer(
        source="permissions", many=True, read_only=True
    )

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_system",
            "permission_ids",
            "permission_codes",
            "permissions_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_permission_codes(self, obj):
        return sorted(obj.permissions.values_list("code", flat=True))

    def validate_slug(self, value):
        value = (value or "").strip().lower().replace(" ", "-")
        if not value:
            raise serializers.ValidationError("Slug is required.")
        return value

    def create(self, validated_data):
        permissions = validated_data.pop("permissions", [])
        role = Role.objects.create(**validated_data)
        if permissions:
            role.permissions.set(permissions)
        return role

    def update(self, instance, validated_data):
        permissions = validated_data.pop("permissions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if permissions is not None:
            instance.permissions.set(permissions)
        return instance


class RoleListSerializer(DataRootSerializer):
    permission_codes = serializers.SerializerMethodField()
    user_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_system",
            "permission_codes",
            "user_count",
            "created_at",
            "updated_at",
        ]

    def get_permission_codes(self, obj):
        return sorted(obj.permissions.values_list("code", flat=True))


class UserSerializer(DataRootSerializer):
    role_detail = RoleListSerializer(source="role", read_only=True)
    permissions = serializers.SerializerMethodField()
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source="role",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "first_name",
            "last_name",
            "profile_picture",
            "is_active",
            "is_admin",
            "is_superuser",
            "is_staff",
            "role_id",
            "role_detail",
            "permissions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def get_permissions(self, obj):
        return sorted(obj.get_permission_codes())


class LoginSerializer(DataRootSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["email", "password"]

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(
                request=self.context.get("request"), email=email, password=password
            )
            if not user:
                raise serializers.ValidationError(
                    "Invalid credentials", code="authorization"
                )
        else:
            raise serializers.ValidationError(
                'Must include "email" and "password".', code="authorization"
            )

        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(DataRootSerializer):
    current_password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["current_password", "new_password"]

    def validate_new_password(self, value):
        validate_password(value)
        return value


class PasswordResetSerializer(DataRootSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["email"]


class VerifyOTPSerializer(DataRootSerializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6)
    new_password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["email", "otp", "new_password"]

    def validate_new_password(self, value):
        validate_password(value)
        return value


class RegisterSerializer(DataRootSerializer):
    password = serializers.CharField(write_only=True, required=True)
    profile_picture = serializers.ImageField(required=False)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source="role",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
            "profile_picture",
            "role_id",
        ]
        extra_kwargs = {
            "profile_picture": {"required": False},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = validated_data.pop("role", None)
        validated_data.pop("is_admin", None)
        validated_data["is_admin"] = False
        validated_data["is_staff"] = False
        validated_data["is_superuser"] = False

        user = User.objects.create(**validated_data)
        user.set_password(password)

        # Never allow assigning the Admin role via register
        if role and role.slug != "admin":
            user.role = role

        user.save()
        return user
