"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useRole } from "@/lib/role-context";
import type { UserRole } from "@/lib/types";

interface RoleGateProps {
  /** 允许访问的角色 */
  allow: UserRole[];
  children: React.ReactNode;
}

const BLOCKED_MESSAGE: Record<string, string> = {
  technician: "该功能已从维修员入口移除，请在工作台与工单页面继续处理。",
  admin: "该功能已从管理员入口移除，请在看板与工单页面继续处理。",
};

const BLOCKED_HOME: Record<string, string> = {
  technician: "/technician",
  admin: "/admin",
};

/**
 * 角色守卫：仅 allow 中的角色可见。
 * 维修员/管理员的知识图谱与 AI 诊断页入口已按需求移除，直接访问时给出迁移提示。
 */
export function RoleGate({ allow, children }: RoleGateProps) {
  const { role, roleLabel } = useRole();

  if (allow.includes(role)) {
    return <>{children}</>;
  }

  const home = BLOCKED_HOME[role] ?? "/";

  return (
    <div className="surface-card mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name="shield" className="size-6" />
      </span>
      <h1 className="mt-4 text-lg font-bold text-slate-800">当前角色不可用</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {roleLabel}视图下{BLOCKED_MESSAGE[role] ?? "该功能暂未开放。"}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={home} className="primary-button py-2.5">
          <Icon name="arrow-right" className="size-4" />
          返回{roleLabel}主页
        </Link>
        <Link href="/tickets" className="secondary-button py-2.5">
          <Icon name="clipboard" className="size-4" />
          前往工单页面
        </Link>
      </div>
    </div>
  );
}
