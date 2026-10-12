import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useAdd from "../api/useAdd";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { t, i18n } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState(i18n.language);

  const [error, setError] = useState(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const { handleAdd, loading, success, responseData } = useAdd("login", null);

  const [formData, setFormDate] = useState({
    email: "",
    password: "",
  });

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);

    // Update document direction based on language
    if (lang === "da" || lang === "ps") {
      document.dir = "rtl";
      document.body.style.direction = "rtl";
      document.body.style.textAlign = "right";
    } else {
      document.dir = "ltr";
      document.body.style.direction = "ltr";
      document.body.style.textAlign = "left";
    }
  };

  const handleChange = (e) => {
    setFormDate({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    // Check if we're already logged in
    if (auth.isAuthenticated) {
      navigate("/app/dashboard");
    }
  }, [auth.isAuthenticated, navigate]);

  useEffect(() => {
    if (success && responseData) {
      try {
        // Directly pass response data to auth context
        auth.login(responseData);

        // Added timeout to ensure state is updated before navigation
        setTimeout(() => {
          navigate("/app/dashboard");
        }, 500);
      } catch (error) {
        setError(t("auth.loginProcessError"));
      }
    }
  }, [success, responseData, auth, navigate, t]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear any previous errors

    if (!formData.email || !formData.password) {
      setError(t("auth.credentialsRequired"));
      return;
    }

    handleAdd(formData);
  };

  return (
    <div className="w-full">
      {/* Language Selector */}
      <div className="mb-4 flex justify-end">
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[130px]">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("settings.language")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="da">دری</SelectItem>
            <SelectItem value="ps">پښتو</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <h1 className="text-center text-xl font-semibold text-foreground">
        {t("auth.signIn")}
      </h1>

      <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
        {t("auth.signInText")}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="email">{t("auth.email", "Email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder={t("auth.emailPlaceholder")}
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative w-full min-w-0">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              className="pe-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={t("common.accessibility.togglePasswordVisibility")}
              onClick={handleShowPassword}
              className="absolute inset-y-0 end-0 z-10 flex h-10 w-10 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground shadow-none outline-none hover:text-foreground focus-visible:ring-0"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              onCheckedChange={(checked) =>
                handleChange({
                  target: { name: "rememberMe", value: checked },
                })
              }
            />
            <Label htmlFor="rememberMe" className="cursor-pointer font-normal">
              {t("auth.rememberMe")}
            </Label>
          </div>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => navigate("/reset-password")}
          >
            {t("auth.forgotPassword")}
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "logining" : t("auth.login")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">{t("auth.loginHelp")}</p>
      </div>
    </div>
  );
};

export default Login;
