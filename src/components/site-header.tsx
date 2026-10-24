"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import { useRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/**
 * 角色导航：
 * - 学生保留完整入口（含首页、AI 诊断、知识图谱）；
 * - 维修员/管理员去掉「首页」「知识图谱」「AI 辅助诊断」，
 *   维修员新增「特供资料库」，工单 AI 诊断在工单页面内完成。
 */
const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { href: "/", label: "首页", icon: "home" },
    { href: "/checkup", label: "电脑体检", icon: "activity" },
    { href: "/diagnosis", label: "AI 诊断", icon: "sparkles" },
    { href: "/graph", label: "知识图谱", icon: "graph" },
    { href: "/tickets/new", label: "提交工单", icon: "plus" },
    { href: "/tickets", label: "我的工单", icon: "clipboard" },
  ],
  technician: [
    { href: "/technician", label: "维修工作台", icon: "wrench" },
    { href: "/tickets", label: "工单列表", icon: "clipboard" },
    { href: "/technician/library", label: "特供资料库", icon: "book" },
  ],
  admin: [
    { href: "/admin", label: "管理看板", icon: "chart" },
    { href: "/tickets", label: "全部工单", icon: "clipboard" },
  ],
};

const HOME_BY_ROLE: Record<UserRole, string> = {
  student: "/",
  technician: "/technician",
  admin: "/admin",
};

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole } = useRole();
  const { session, logout } = useAuth();
  const navItems = NAV_BY_ROLE[role];
  const isActive = (href: string) => pathname === href;
  const homeHref = HOME_BY_ROLE[role];

  /**
   * 角色切换行为：
   * - 学生：直接切回学生视角并自动跳转首页；
   * - 维修员/管理员：先进入登录页，登录通过后才允许进入页面。
   */
  const handleRoleChange = (nextRole: UserRole) => {
    if (nextRole === "student") {
      setRole("student");
      router.push("/");
      return;
    }
    router.push(`/login?role=${nextRole}`);
  };

  const needsLogin = (role === "technician" || role === "admin") && !session;

  return (
    <header className="sticky top-0 z-50 rounded-b-2xl border-b border-white/10 bg-[#0a0e1a]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href={homeHref} className="group flex shrink-0 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#8b7cff] to-[#5b4bd6] text-white shadow-[0_0_24px_-4px_rgba(124,108,255,0.5)] transition group-hover:rotate-6">
              <Icon name="monitor" className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="gradient-text block text-[15px] font-bold tracking-tight">
                校园电脑管家
              </span>
              <span className="hidden text-[11px] font-medium tracking-[0.2em] text-slate-500 sm:block">
                CAMPUS PC CARE · MISSION CTRL
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  isActive(item.href)
                    ? "bg-[#7c6cff]/10 text-[#a89bff] shadow-[inset_0_0_0_1px_rgba(124,108,255,0.3),0_0_18px_-6px_rgba(124,108,255,0.4)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                }`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {session ? (
              <>
                <span className="hidden items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 sm:inline-flex">
                  <Icon name="shield" className="size-3.5" />
                  {session.displayName}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.12] hover:text-white"
                  title="退出登录"
                >
                  <Icon name="logout" className="size-3.5" />
                  退出
                </button>
              </>
            ) : needsLogin ? (
              <Link
                href={`/login?role=${role}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20"
              >
                <Icon name="lock" className="size-3.5" />
                未登录 · 点击登录
              </Link>
            ) : null}

            <label className="relative flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-1.5 pl-3 pr-2 text-sm">
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">当前角色</span>
              <select
                value={role}
                onChange={(event) => handleRoleChange(event.target.value as UserRole)}
                className="cursor-pointer appearance-none bg-transparent pr-5 font-bold text-[#a89bff] outline-none"
                aria-label="切换当前角色"
              >
                <option value="student">学生</option>
                <option value="technician">维修员</option>
                <option value="admin">管理员</option>
              </select>
              <span className="pointer-events-none absolute right-2 text-slate-500">⌄</span>
            </label>
          </div>
        </div>

        <nav
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden"
          aria-label="移动端主导航"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                isActive(item.href) ? "bg-[#7c6cff]/10 text-[#a89bff]" : "text-slate-400"
              }`}
            >
              <Icon name={item.icon} className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
