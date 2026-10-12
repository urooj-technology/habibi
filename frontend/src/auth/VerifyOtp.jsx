import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, KeyRound, Hash } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useAdd from "../api/useAdd";
import { useAuth } from "../context/AuthContext";

const VerifyOtp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  // Get email from navigation state or from auth context
  const email = location.state?.email || auth.user?.email || "";

  // Determine if we're coming from the change password flow or reset password flow
  const isAuthenticated = auth.isAuthenticated;

  const [formData, setFormData] = useState({
    email: email,
    otp: "",
    new_password: "",
    confirm_password: "",
  });

  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { handleAdd, loading, success, responseData } = useAdd(
    "verify-otp",
    null,
    null,
    t("auth.passwordResetSuccess", "Password reset successfully."),
    t("auth.passwordResetError", "Error resetting password.")
  );

  // Redirect if email is not provided
  useEffect(() => {
    if (!email) {
      // If authenticated, go to change password, otherwise to reset password
      if (isAuthenticated) {
        navigate("/app/change-password");
      } else {
        navigate("/reset-password");
      }
    }
  }, [email, navigate, isAuthenticated]);

  // Handle successful password reset
  useEffect(() => {
    if (success && responseData) {
      // Add delay before redirect to show success message
      const timer = setTimeout(() => {
        // If authenticated, return to profile, otherwise to login
        if (isAuthenticated) {
          navigate("/app/profile");
        } else {
          navigate("/login");
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [success, responseData, navigate, isAuthenticated]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate form fields
    if (!formData.otp) {
      setError(t("auth.otpRequired", "OTP is required"));
      return;
    }

    if (!formData.new_password) {
      setError(t("auth.newPasswordRequired", "New password is required"));
      return;
    }

    if (formData.new_password.length < 8) {
      setError(t("auth.passwordTooShort", "Password must be at least 8 characters"));
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError(t("auth.passwordsDoNotMatch", "Passwords do not match"));
      return;
    }

    // Submit data to reset password
    await handleAdd({
      email: formData.email,
      otp: formData.otp,
      new_password: formData.new_password,
    });
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle navigation back
  const handleBack = () => {
    if (isAuthenticated) {
      navigate("/app/change-password");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-center text-xl font-semibold text-foreground">
        {t("auth.verifyOtp", "Verify OTP")}
      </h1>

      <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
        {t(
          "auth.verifyOtpInstructions",
          "Enter the OTP sent to your email and set your new password."
        )}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && responseData && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {t("auth.passwordResetSuccess", "Password reset successfully.")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email", "Email")}</Label>
          <div className="relative">
            <Hash className="pointer-events-none absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              className="ps-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="otp">{t("auth.otp", "OTP")}</Label>
          <div className="relative">
            <Hash className="pointer-events-none absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="otp"
              name="otp"
              placeholder={t("auth.otpPlaceholder", "Enter OTP sent to your email")}
              value={formData.otp}
              onChange={handleChange}
              required
              className="ps-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new_password">{t("auth.newPassword", "New Password")}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="new_password"
              name="new_password"
              type={showPassword ? "text" : "password"}
              value={formData.new_password}
              onChange={handleChange}
              required
              className="ps-10 pe-10"
            />
            <button
              type="button"
              aria-label={t("common.accessibility.togglePasswordVisibility")}
              onClick={handleTogglePasswordVisibility}
              className="absolute inset-y-0 end-0 z-10 flex w-10 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground shadow-none outline-none hover:text-foreground focus-visible:ring-0"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">
            {t("auth.confirmPassword", "Confirm Password")}
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute inset-y-0 start-0 my-auto ms-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirm_password}
              onChange={handleChange}
              required
              className="ps-10 pe-10"
            />
            <button
              type="button"
              aria-label={t(
                "common.accessibility.toggleConfirmPasswordVisibility"
              )}
              onClick={handleToggleConfirmPasswordVisibility}
              className="absolute inset-y-0 end-0 z-10 flex w-10 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground shadow-none outline-none hover:text-foreground focus-visible:ring-0"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading
            ? t("auth.processing", "Processing...")
            : t("auth.resetPassword", "Reset Password")}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleBack}
        >
          {isAuthenticated
            ? t("auth.backToProfile", "Back to Profile")
            : t("auth.backToLogin", "Back to Login")}
        </Button>
      </form>
    </div>
  );
};

export default VerifyOtp;
