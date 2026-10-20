/**
 * 用途：全站顶部导航与角色切换器，导航项会随角色自动调整。
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";
import { useRole } from "@/lib/role-context";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

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
    { href: "/", label: "首页", icon: "home" },
    { href: "/technician", label: "维修工作台", icon: "wrench" },
    { href: "/tickets", label: "工单列表", icon: "clipboard" },
    { href: "/diagnosis", label: "AI 辅助诊断", icon: "sparkles" },
    { href: "/graph", label: "知识图谱", icon: "graph" },
  ],
  admin: [
    { href: "/", label: "首页", icon: "home" },
    { href: "/admin", label: "管理看板", icon: "chart" },
    { href: "/tickets", label: "全部工单", icon: "clipboard" },
    { href: "/diagnosis", label: "AI 诊断", icon: "sparkles" },
    { href: "/graph", label: "知识图谱", icon: "graph" },
  ],
};

export function SiteHeader() {
  const pathname = usePathname();
  const { role, setRole } = useRole();
  const navItems = NAV_BY_ROLE[role];
  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-campus-500 to-campus-700 text-white shadow-lg shadow-campus-200 transition-transform group-hover:-rotate-3">
              <Icon name="monitor" className="size-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight text-slate-900">
                校园电脑管家
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide text-slate-400 sm:block">
                CAMPUS PC CARE
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive(item.href)
                    ? "bg-campus-50 text-campus-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <label className="relative flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-2 text-sm">
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">当前角色</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="cursor-pointer appearance-none bg-transparent pr-5 font-semibold text-slate-700 outline-none"
              aria-label="切换当前角色"
            >
              <option value="student">学生</option>
              <option value="technician">维修员</option>
              <option value="admin">管理员</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-slate-400">⌄</span>
          </label>
        </div>

        <nav
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden"
          aria-label="移动端主导航"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                isActive(item.href) ? "bg-campus-50 text-campus-700" : "text-slate-500"
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

