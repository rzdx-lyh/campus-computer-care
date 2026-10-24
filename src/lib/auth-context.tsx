"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/lib/role-context";
import type { AuthRole, AuthSession } from "@/lib/auth-store";

const TOKEN_STORAGE_KEY = "campus-computer-care:auth-token";

export type AuthStatus = "loading" | "ready";

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  token: string | null;
  login: (
    role: AuthRole,
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setRole } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const applySession = useCallback(
    (nextToken: string | null, nextSession: AuthSession | null) => {
      setToken(nextToken);
      setSession(nextSession);

      if (nextToken && nextSession) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        setRole(nextSession.role);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    },
    [setRole],
  );

  // 刷新页面后凭本地令牌恢复登录态。
  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: storedToken }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          session?: AuthSession;
        };
        if (cancelled) return;

        if (response.ok && data.session) {
          setToken(storedToken);
          setSession(data.session);
          setRole(data.session.role);
        } else {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => {
        // 网络异常时保留令牌，下次进入再试。
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [setRole]);

  const login = useCallback<AuthContextValue["login"]>(
    async (role, username, password) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, username, password }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          token?: string;
          session?: AuthSession;
          error?: string;
        };

        if (!response.ok || !data.token || !data.session) {
          return { ok: false, error: data.error ?? "登录失败，请稍后重试" };
        }

        applySession(data.token, data.session);
        return { ok: true };
      } catch {
        return { ok: false, error: "网络异常，请稍后重试" };
      }
    },
    [applySession],
  );

  const logout = useCallback(() => {
    applySession(null, null);
    setRole("student");
    router.push("/");
  }, [applySession, router, setRole]);

  const value: AuthContextValue = { session, status, token, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return context;
}

/**
 * 页面级登录守卫：未登录或角色不匹配时跳转登录页。
 * 返回是否已获得授权（授权前页面应展示加载占位）。
 */
export function useRequireAuth(role: AuthRole): boolean {
  const { session, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "ready") return;
    if (!session || session.role !== role) {
      router.replace(`/login?role=${role}&next=${encodeURIComponent(pathname)}`);
    }
  }, [status, session, role, router, pathname]);

  return status === "ready" && session?.role === role;
}

/** 携带登录令牌调用受保护 API 的便捷方法。 */
export function useAuthorizedFetch(): (
  input: string,
  init?: RequestInit,
) => Promise<Response> {
  const { token } = useAuth();

  return useCallback(
    (input: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(input, { ...init, headers });
    },
    [token],
  );
}
