import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { KeyRound, Mail, Phone, Building2, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import LoadingIndicator from "../components/LoadingIndicator";
import { useAuth } from "../context/AuthContext";
import useFetchObjects from "../api/useFetchObjects";
import { logButtonClick, logNavigation, logError } from "./RedirectLogger";

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();

  // Use the useFetchObjects hook to get user profile data
  const { data: user, isLoading, isError, error } = useFetchObjects(
    ["profile"],
    "profile/",
    auth.user?.token
  );

  const handleChangePassword = () => {
    // Try a different navigation approach for more reliable redirection
    logButtonClick("Change Password");
    console.log("Change password button clicked, redirecting to /reset-password");

    try {
      // First try using navigate
      navigate("/reset-password");
      logNavigation("/app/profile", "/reset-password");

      // As a fallback, use direct window location change after a small delay
      setTimeout(() => {
        if (window.location.pathname !== "/reset-password") {
          console.log("Using window.location as fallback");
          logNavigation("/app/profile", "/reset-password (fallback)");
          window.location.href = "/reset-password";
        }
      }, 100);
    } catch (err) {
      logError(err);
      console.error("Navigation error:", err);
      // Last resort
      window.location.href = "/reset-password";
    }
  };

  if (isLoading) {
    return <LoadingIndicator text={t("common.loading", "Loading...")} />;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-destructive">
            {error?.message || t("common.errorOccurred")}
          </p>
          <Button className="mt-4" onClick={() => navigate("/login")}>
            {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  const initial =
    user?.name?.charAt(0) || user?.username?.charAt(0) || null;

  const infoItems = [
    {
      icon: Mail,
      label: t("profile.email", "Email"),
      value: user?.email || t("common.notAvailable", "Not available"),
    },
    {
      icon: Phone,
      label: t("profile.phone", "Phone"),
      value: user?.phone || t("common.notAvailable", "Not available"),
    },
    {
      icon: Building2,
      label: t("profile.company", "Company"),
      value: user?.company || t("common.notAvailable", "Not available"),
    },
    {
      icon: MapPin,
      label: t("profile.address", "Address"),
      value: user?.address || t("common.notAvailable", "Not available"),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {t("profile.profile", "User Profile")}
          </h1>
          <Button onClick={handleChangePassword}>
            <KeyRound className="me-2 h-4 w-4" />
            {t("profile.changePassword", "Change Password")}
          </Button>
        </div>

        <Separator className="mb-8" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center md:col-span-1">
            <Avatar className="mb-3 h-28 w-28 text-3xl">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initial || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-semibold text-foreground">
              {user?.name || user?.username || t("profile.unnamed", "User")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.role || user?.user_type || t("profile.userRole", "User")}
            </p>
          </div>

          <div className="md:col-span-2">
            <ul className="divide-y divide-border">
              {infoItems.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-center gap-4 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {label}
                    </p>
                    <p className="text-sm text-muted-foreground">{value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
