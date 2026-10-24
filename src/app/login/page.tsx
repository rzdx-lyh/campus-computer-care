"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import type { AuthRole } from "@/lib/auth-store";

const ROLE_META: Record<AuthRole, { label: string; dashboard: string; description: string }> = {
  technician: {
    label: "维修员",
    dashboard: "/technician",
    description: "处理维修工单、维护特供资料库，并向后台上传维修数据。",
  },
  admin: {
    label: "管理员",
    dashboard: "/admin",
    description: "查看全校报修数据、工单流转与维修员上传的后台数据。",
  },
};

const ROLE_ORDER: AuthRole[] = ["technician", "admin"];

function isAuthRole(value: string | null): value is AuthRole {
  return value === "technician" || value === "admin";
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="surface-card mx-auto max-w-md p-10 text-center text-sm text-slate-400">
          正在加载登录页…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, status, login } = useAuth();
  const { setRole } = useRole();

  const requestedRole = useMemo<AuthRole>(() => {
    const value = searchParams.get("role");
    return isAuthRole(value) ? value : "technician";
  }, [searchParams]);
  const nextPath = searchParams.get("next") || "";

  const [role, setRoleState] = useState<AuthRole>(requestedRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 已持有对应角色的有效会话时直接进入页面。
  useEffect(() => {
    if (status === "ready" && session?.role === role) {
      router.replace(nextPath || ROLE_META[role].dashboard);
    }
  }, [status, session, role, nextPath, router]);

  useEffect(() => {
    setRoleState(requestedRole);
  }, [requestedRole]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await login(role, username.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "登录失败，请稍后重试");
      return;
    }

    setRole(role);
    router.replace(nextPath || ROLE_META[role].dashboard);
  };

  const meta = ROLE_META[role];
  const checkingSession = status === "loading" || (status === "ready" && session?.role === role);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="surface-card p-7 sm:p-9">
        <div className="text-center">
          <span className="kicker mx-auto">
            <Icon name="shield" className="size-3.5" />
            内部通道 · 需账号登录
          </span>
          <h1 className="gradient-text mt-4 text-2xl font-bold">
            {meta.label}登录
          </h1>
          <p className="mt-2 text-xs leading-5 text-slate-400">{meta.description}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {ROLE_ORDER.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setRoleState(item);
                setError("");
              }}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                role === item
                  ? "bg-white text-campus-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {ROLE_META[item].label}
            </button>
          ))}
        </div>

        {checkingSession ? (
          <p className="mt-8 text-center text-sm text-slate-400">正在校验登录状态…</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-username" className="field-label">
                账号
              </label>
              <input
                id="login-username"
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="field-input"
                placeholder="请输入账号"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="field-label">
                密码
              </label>
              <input
                id="login-password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
                placeholder="请输入密码"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
              >
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={submitting} className="primary-button w-full disabled:opacity-60">
              <Icon name="lock" className="size-4" />
              {submitting ? "正在登录…" : `登录并进入${meta.label}页面`}
            </button>
          </form>
        )}

        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-400">
          账号口令由服务端校验，不存放在页面中。演示账号请查看项目
          README「演示账号」一节；如需修改账号，可通过环境变量覆盖。
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        学生通道无需登录，点击右上角「学生」即可返回首页。
      </p>
    </div>
  );
}
