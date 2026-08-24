import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "./lib/adminApi";
import { ApiError } from "../lib/apiClient";

type AuthStatus = "checking" | "authenticated" | "anonymous";

interface AdminAuthValue {
  status: AuthStatus;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Call this when any admin request comes back 401 mid-session (expired session). */
  handleUnauthorized: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    authApi
      .session()
      .then((res) => setStatus(res.authenticated ? "authenticated" : "anonymous"))
      .catch(() => setStatus("anonymous"));
  }, []);

  const login = useCallback(async (password: string) => {
    await authApi.login(password);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setStatus("anonymous");
    }
  }, []);

  const handleUnauthorized = useCallback(() => setStatus("anonymous"), []);

  return (
    <AdminAuthContext.Provider value={{ status, login, logout, handleUnauthorized }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

/** True if err is an ApiError representing an expired/invalid session. */
export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
