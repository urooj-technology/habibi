import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import usePermissions from "../hooks/usePermissions";
import AccessDenied from "./AccessDenied";

/**
 * Gate a route by one or more permission codes.
 * @param {string|string[]} perm — required code(s); any match if array
 * @param {boolean} [any=true] — if array, require any (true) or all (false)
 */
export default function RequirePermission({
  perm,
  any = true,
  children,
  fallback = null,
}) {
  const auth = useAuth();
  const { can, canAny, canAll } = usePermissions();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const codes = Array.isArray(perm) ? perm : perm ? [perm] : [];
  const allowed =
    codes.length === 0
      ? true
      : any
        ? canAny(codes)
        : canAll(codes);

  if (!allowed) {
    return fallback ?? <AccessDenied />;
  }

  return children;
}

/** Convenience: render children only when permitted (no AccessDenied page). */
export function Can({ perm, any = true, children, fallback = null }) {
  const { canAny, canAll } = usePermissions();
  const codes = Array.isArray(perm) ? perm : perm ? [perm] : [];
  const allowed =
    codes.length === 0
      ? true
      : any
        ? canAny(codes)
        : canAll(codes);
  if (!allowed) return fallback;
  return children;
}
