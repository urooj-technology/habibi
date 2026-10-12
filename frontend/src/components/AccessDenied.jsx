import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldOff className="h-7 w-7" />
      </div>
      <div className="max-w-md space-y-1.5">
        <h1 className="text-xl font-semibold text-foreground">
          {t("permissions.accessDenied", "Access denied")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "permissions.accessDeniedHint",
            "You do not have permission to view this page. Ask an administrator to update your role."
          )}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          {t("common.goBack", "Go back")}
        </Button>
        <Button type="button" onClick={() => navigate("/app/profile")}>
          {t("common.profile", "Profile")}
        </Button>
      </div>
    </div>
  );
}
