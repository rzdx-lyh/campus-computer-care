/**
 * 用途：应用根布局，挂载全局样式、角色 Provider、顶部导航与页脚。
 */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { SiteHeader } from "@/components/site-header";
import { OfflineStatus } from "@/components/offline-status";
import { PwaRegister } from "@/components/pwa-register";
import { Icon } from "@/components/icon";
import { RoleProvider } from "@/lib/role-context";

export const metadata: Metadata = {
  title: {
    default: "校园电脑管家 | AI 诊断与报修",
    template: "%s | 校园电脑管家",
  },
  description: "面向学生的电脑健康体检、AI 故障诊断与校园维修工单系统。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2273eb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <RoleProvider>
          <SiteHeader />
          <main className="mx-auto min-h-[calc(100vh-10rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-slate-200/70 bg-white/60">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p>© 2026 校园电脑管家 · 让每一次报修更简单</p>
              <p className="flex items-center gap-1.5">
                <Icon name="shield" className="size-3.5" />
                设备信息仅在本机浏览器处理
              </p>
            </div>
          </footer>
          <OfflineStatus />
          <PwaRegister />
        </RoleProvider>
      </body>
    </html>
  );
}




