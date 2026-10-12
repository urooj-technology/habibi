import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Read permission codes from the logged-in user payload.
 * Admins/superusers are treated as having every code (backend also bypasses).
 */
export default function usePermissions() {
  const auth = useAuth();
  const user = auth?.user?.user;

  const permissions = useMemo(() => {
    const list = user?.permissions;
    if (Array.isArray(list)) return list;
    return [];
  }, [user?.permissions]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const isAdmin = Boolean(user?.is_admin || user?.is_superuser);

  const can = useCallback(
    (code) => {
      if (!code) return true;
      if (isAdmin) return true;
      return permissionSet.has(code);
    },
    [isAdmin, permissionSet]
  );

  const canAny = useCallback(
    (codes = []) => {
      if (!codes?.length) return true;
      if (isAdmin) return true;
      return codes.some((c) => permissionSet.has(c));
    },
    [isAdmin, permissionSet]
  );

  const canAll = useCallback(
    (codes = []) => {
      if (!codes?.length) return true;
      if (isAdmin) return true;
      return codes.every((c) => permissionSet.has(c));
    },
    [isAdmin, permissionSet]
  );

  return {
    permissions,
    role: user?.role || null,
    isAdmin,
    can,
    canAny,
    canAll,
  };
}
