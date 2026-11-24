/**
 * src/context/AuthContext.jsx
 * Centralized Authentication & Role-Based Access Control (RBAC) Provider.
 * Manages active user sessions, token storage, login/logout workflows, and route/action permissions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const AuthContext = createContext(null);

export const AUTH_TOKEN_KEY = "casetrack_auth_token";
export const AUTH_REMEMBER_KEY = "casetrack_auth_remember";

// Granular route-to-permission mapping
export const ROUTE_PERMISSION_MAP = {
  "/dashboard": "dashboard:view",
  "/students/all": "students:view",
  "/students/pending": "pending:view",
  "/students/case-ready": "ready:view",
  "/students/sent": "sent:view",
  "/students/returned": "returned:view",
  "/students/received": "received:view",
  "/history": "history:view",
  "/data-management": "data_management:view",
  "/settings": "settings:view",
  "/users": "users:view"
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return (
        localStorage.getItem(AUTH_TOKEN_KEY) ||
        sessionStorage.getItem(AUTH_TOKEN_KEY) ||
        null
      );
    } catch {
      return null;
    }
  });
  const [permissions, setPermissions] = useState([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Helper to persist or remove token from browser storage
  const persistToken = useCallback((newToken, rememberMe = false) => {
    try {
      if (newToken) {
        if (rememberMe) {
          localStorage.setItem(AUTH_TOKEN_KEY, newToken);
          localStorage.setItem(AUTH_REMEMBER_KEY, "true");
          sessionStorage.removeItem(AUTH_TOKEN_KEY);
        } else {
          sessionStorage.setItem(AUTH_TOKEN_KEY, newToken);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_REMEMBER_KEY);
        }
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_REMEMBER_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn("Storage access warning:", e);
    }
  }, []);

  // Check active session on mount
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const storedToken =
        localStorage.getItem(AUTH_TOKEN_KEY) ||
        sessionStorage.getItem(AUTH_TOKEN_KEY);

      if (!storedToken) {
        if (isMounted) {
          setCurrentUser(null);
          setToken(null);
          setPermissions([]);
          setIsLoadingAuth(false);
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.ok && data.user) {
            setCurrentUser(data.user);
            setToken(storedToken);
            setPermissions(data.permissions || []);
            setIsLoadingAuth(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Auth session verification offline or failed:", err);
      }

      // If token is invalid or expired
      if (isMounted) {
        persistToken(null);
        setCurrentUser(null);
        setToken(null);
        setPermissions([]);
        setIsLoadingAuth(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [persistToken]);

  // Login handler
  const login = useCallback(
    async (usernameOrEmail, password, rememberMe = false) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usernameOrEmail: usernameOrEmail.trim(),
            password,
            rememberMe
          })
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          setCurrentUser(data.user);
          setToken(data.token);
          setPermissions(data.permissions || []);
          persistToken(data.token, rememberMe);
          return { ok: true, user: data.user };
        }

        return {
          ok: false,
          error: data.error || "Authentication failed. Please check credentials."
        };
      } catch (err) {
        return {
          ok: false,
          error: "Connection error: Unable to reach authentication server."
        };
      }
    },
    [persistToken]
  );

  // Logout handler
  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ token })
        });
      } catch {}
    }

    persistToken(null);
    setCurrentUser(null);
    setToken(null);
    setPermissions([]);
  }, [token, persistToken]);

  // Permission checking utility
  const hasPermission = useCallback(
    (permissionKey) => {
      if (!currentUser) return false;
      if (currentUser.role === "super_admin") return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(permissionKey);
    },
    [currentUser, permissions]
  );

  // Route access utility
  const canAccessRoute = useCallback(
    (pathname) => {
      if (!currentUser) return false;
      if (currentUser.role === "super_admin") return true;

      // Direct route match
      if (ROUTE_PERMISSION_MAP[pathname]) {
        return hasPermission(ROUTE_PERMISSION_MAP[pathname]);
      }

      // Prefix match for dynamic student routes e.g. /students/pending
      for (const [routePrefix, perm] of Object.entries(ROUTE_PERMISSION_MAP)) {
        if (pathname === routePrefix || (routePrefix !== "/dashboard" && pathname.startsWith(routePrefix))) {
          return hasPermission(perm);
        }
      }

      return true;
    },
    [currentUser, hasPermission]
  );

  const value = useMemo(
    () => ({
      currentUser,
      token,
      isAuthenticated: !!currentUser,
      userRole: currentUser?.role || "guest",
      permissions,
      isLoadingAuth,
      login,
      logout,
      hasPermission,
      canAccessRoute
    }),
    [
      currentUser,
      token,
      permissions,
      isLoadingAuth,
      login,
      logout,
      hasPermission,
      canAccessRoute
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
