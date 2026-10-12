import React, { useState, createContext, useContext, useEffect, useCallback } from "react";
import { setupAuthInterceptors } from "../api/authSession";

// Install axios/fetch 401 handlers as early as AuthProvider mounts.
setupAuthInterceptors();

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");

    try {
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const timestamp = localStorage.getItem("timestamp");

      const now = new Date().getTime();
      const isExpired = !timestamp || now - timestamp > 24 * 60 * 60 * 1000;

      if (isExpired) {
        localStorage.removeItem("user");
        localStorage.removeItem("timestamp");
        return null;
      }

      return parsed;
    } catch (_error) {
      localStorage.removeItem("user");
      localStorage.removeItem("timestamp");
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("timestamp", String(new Date().getTime()));
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("timestamp");
    }
  }, [user]);

  const login = useCallback((userData) => {
    if (!userData) return;
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("timestamp");
  }, []);

  /** Merge latest profile fields (role, permissions) into the stored session. */
  const refreshUser = useCallback((profileUser) => {
    if (!profileUser) return;
    setUser((prev) => {
      if (!prev?.token) return prev;
      return {
        ...prev,
        user: {
          ...(prev.user || {}),
          ...profileUser,
        },
      };
    });
  }, []);

  const isAuthenticated = Boolean(user?.token);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, refreshUser, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

