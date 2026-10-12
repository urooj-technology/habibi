import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";
import {
  registerUnauthorizedHandler,
  triggerUnauthorized,
  validateAuthToken,
} from "../api/authSession";

/**
 * Watches API auth failures and validates the stored token on mount.
 * Must render inside BrowserRouter + AuthProvider + QueryClientProvider.
 */
export default function AuthSessionWatcher() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const authRef = useRef(auth);
  const navigateRef = useRef(navigate);
  const queryClientRef = useRef(queryClient);
  const tRef = useRef(t);

  useEffect(() => {
    authRef.current = auth;
    navigateRef.current = navigate;
    queryClientRef.current = queryClient;
    tRef.current = t;
  }, [auth, navigate, queryClient, t]);

  useEffect(() => {
    return registerUnauthorizedHandler(() => {
      const current = authRef.current;
      if (!current?.user) return;

      current.logout();
      queryClientRef.current?.clear();
      toast.info(
        tRef.current("auth.sessionExpired", "Your session has expired. Please log in again."),
        { autoClose: 4000 }
      );
      navigateRef.current("/login", { replace: true });
    });
  }, []);

  // Validate token and refresh role/permissions from profile.
  useEffect(() => {
    const token = auth.user?.token;
    if (!token) return undefined;

    let cancelled = false;
    (async () => {
      const result = await validateAuthToken(token);
      if (cancelled) return;
      if (result?.ok === false) {
        triggerUnauthorized("token_invalid");
        return;
      }
      if (result?.ok === true && result.user) {
        authRef.current?.refreshUser?.(result.user);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.user?.token]);

  return null;
}
