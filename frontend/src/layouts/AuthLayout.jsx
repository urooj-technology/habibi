import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";

const AuthLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [direction, setDirection] = useState(document.dir || "ltr");

  // Set direction based on current language on mount and when language changes
  useEffect(() => {
    const dir = ["da", "ps"].includes(i18n.language) ? "rtl" : "ltr";
    setDirection(dir);
  }, [i18n.language]);

  return (
    <div
      dir={direction}
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-gradient-to-b from-background to-muted/40"
    >
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-6">
        <div className="w-full min-w-0 max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-lg shadow-black/5 sm:p-10">
          <div className="mb-8 flex items-center justify-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">
              {t("common.shortName", "Poshak Habibi")}
            </h1>
          </div>
          <main dir={direction} className="min-w-0">
            {children}
          </main>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()}{" "}
          {t("common.nameProject", "Poshak Habibi")}.{" "}
          {t("common.allRightsReserved")}
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
