import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useAdd from "../api/useAdd";
import { useAuth } from "../context/AuthContext";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  // Determine if this is a password change (from profile) or reset (from login)
  const isAuthenticated = auth.isAuthenticated;
  const isChangePassword = isAuthenticated && location.pathname.includes('/app/change-password');

  // Pre-fill email if authenticated
  const [email, setEmail] = useState(isAuthenticated ? auth.user?.email || "" : "");
  const [error, setError] = useState(null);

  const { handleAdd, loading, success, responseData } = useAdd(
    "password-reset",
    isAuthenticated ? auth.user?.token : null,
    null,
    t("auth.resetEmailSent", "Password reset email has been sent."),
    t("auth.resetError", "Error sending reset email.")
  );

  // Navigate to verify-otp page when success state changes to true
  useEffect(() => {
    if (success && responseData) {
      // Add a small delay to ensure state updates are processed
      setTimeout(() => {
        navigate("/verify-otp", { state: { email } });
      }, 500);
    }
  }, [success, responseData, navigate, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError(t("auth.emailRequired", "Email is required"));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("auth.invalidEmail", "Please enter a valid email address"));
      return;
    }

    try {
      // Send request to reset password
      await handleAdd({ email });

      // If we're in change password mode, also manually navigate if needed
      if (isChangePassword && !success) {
        console.log("Manually navigating to verify-otp from change password");
        setTimeout(() => {
          navigate("/verify-otp", { state: { email } });
        }, 1000);
      }
    } catch (error) {
      console.error("Error sending reset request:", error);
    }
  };

  // Handle navigation back
  const handleBack = () => {
    if (isChangePassword) {
      navigate("/app/profile");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-center text-xl font-semibold text-foreground">
        {isChangePassword
          ? t("auth.changePassword", "Change Password")
          : t("auth.resetPassword", "Reset Password")}
      </h1>

      <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
        {isChangePassword
          ? t(
              "auth.changePasswordInstructions",
              "Enter your email address below and we'll send you an OTP to change your password."
            )
          : t(
              "auth.resetInstructions",
              "Enter your email address below and we'll send you an OTP to reset your password."
            )}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && responseData && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {t("auth.resetEmailSent", "Password reset email has been sent.")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email", "Email")}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isChangePassword && !!auth.user?.email}
              className="ps-10"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading
            ? t("auth.sending", "Sending...")
            : t("auth.sendResetLink", "Send Reset Link")}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleBack}
        >
          {isChangePassword
            ? t("auth.backToProfile", "Back to Profile")
            : t("auth.backToLogin", "Back to Login")}
        </Button>
      </form>
    </div>
  );
};

export default ResetPassword;
