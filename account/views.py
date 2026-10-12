from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.contrib.auth import login
import random
import string
from datetime import timedelta
from django.utils import timezone

from django.db.models import Count

from account.serializers import (
    UserSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    VerifyOTPSerializer,
    RoleSerializer,
    RoleListSerializer,
    PermissionSerializer,
    user_auth_payload,
)
from account.models import User, Role, Permission
from account.permissions import HasPerm
from knox.models import AuthToken
from knox.views import LoginView as KnoxLoginView


class LoginView(KnoxLoginView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        login(request, user)
        token_instance, token = AuthToken.objects.create(user)

        # Prefetch role permissions for auth payload
        if user.role_id:
            user = (
                User.objects.select_related("role")
                .prefetch_related("role__permissions")
                .get(pk=user.pk)
            )

        return Response(
            {
                "token": token,
                "user": user_auth_payload(user),
            },
            status=status.HTTP_200_OK,
        )


class UserListView(generics.ListAPIView):
    queryset = User.objects.select_related("role").all()
    serializer_class = UserSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasPerm("users.view"),
    ]


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.select_related("role").all()
    serializer_class = UserSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasPerm("users.view"),
    ]


class UserEditView(generics.UpdateAPIView):
    queryset = User.objects.select_related("role").all()
    serializer_class = UserSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasPerm("users.edit"),
    ]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)


class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasPerm("users.delete"),
    ]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionListView(generics.ListAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasPerm("roles.view"),
    ]
    pagination_class = None


class RoleListCreateView(generics.ListCreateAPIView):
    pagination_class = None

    def get_queryset(self):
        return Role.objects.prefetch_related("permissions").annotate(
            user_count=Count("users")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RoleSerializer
        return RoleListSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), HasPerm("roles.create")()]
        return [permissions.IsAuthenticated(), HasPerm("roles.view")()]


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated(), HasPerm("roles.edit")()]
        if self.request.method == "DELETE":
            return [permissions.IsAuthenticated(), HasPerm("roles.delete")()]
        return [permissions.IsAuthenticated(), HasPerm("roles.view")()]

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return Response(
                {"detail": "System roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    model = User
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, queryset=None):
        return self.request.user

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            if not self.object.check_password(
                serializer.validated_data.get("current_password")
            ):
                return Response(
                    {"current_password": ["Wrong password."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Change password
            self.object.set_password(serializer.validated_data.get("new_password"))
            self.object.save()

            # Invalidate all tokens for the user
            AuthToken.objects.filter(user=self.object).delete()

            return Response(
                {
                    "detail": "Password updated successfully. Please login again with your new password.",
                    "require_login": True,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def generate_otp():
    return "".join(random.choices(string.digits, k=6))


class PasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "User with this email does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate OTP
        otp = generate_otp()
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()

        # Send email with OTP
        subject = "Password Reset OTP"
        html_message = render_to_string(
            "emails/password_reset_otp.html",
            {
                "user": user,
                "otp": otp,
                "valid_for": "10 minutes",
                "frontend_url": "http://localhost:3000/app/login",
            },
        )

        # Create a plain text version for email clients that don't support HTML
        plain_message = f"""
Password Reset OTP

Hello {user.first_name or user.username},

We received a request to reset your password. Please use the following One-Time Password (OTP) to complete your password reset:

{otp}

This OTP is valid for 10 minutes only.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Thank you,
The Poshak Habibi Team
        """

        # Send both HTML and plain text versions
        send_mail(
            subject=subject,
            message=plain_message,  # Plain text fallback
            html_message=html_message,  # HTML version
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )

        return Response(
            {"detail": "Password reset OTP has been sent to your email."},
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]
        new_password = serializer.validated_data["new_password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "User with this email does not exist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if OTP is valid
        if not user.otp or user.otp != otp:
            return Response(
                {"detail": "Invalid OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if OTP is expired (10 minutes validity)
        if not user.otp_created_at or timezone.now() > user.otp_created_at + timedelta(
            minutes=10
        ):
            return Response(
                {"detail": "OTP has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset password
        user.set_password(new_password)
        # Clear OTP fields
        user.otp = None
        user.otp_created_at = None
        user.save()

        # Invalidate all tokens for the user
        AuthToken.objects.filter(user=user).delete()

        return Response(
            {
                "detail": "Password has been reset successfully. You can now login with your new password."
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return (
            User.objects.select_related("role")
            .prefetch_related("role__permissions")
            .get(pk=self.request.user.pk)
        )

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        return Response(user_auth_payload(user))

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        # Profile self-edit must not change role / admin flags
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        for key in (
            "role_id",
            "role",
            "is_admin",
            "is_staff",
            "is_superuser",
            "permissions",
        ):
            data.pop(key, None)

        serializer = self.get_serializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            user = self.get_object()
            return Response(
                {
                    "detail": "Profile updated successfully",
                    "user": user_auth_payload(user),
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasPerm("users.create"),
    ]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Registration successful!",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
