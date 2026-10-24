import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { SiteHeader } from "@/components/site-header";
import { OfflineStatus } from "@/components/offline-status";
import { PwaRegister } from "@/components/pwa-register";
import { Icon } from "@/components/icon";
import { LogoParticles } from "@/components/logo-particles";
import { RoleProvider } from "@/lib/role-context";
import { AuthProvider } from "@/lib/auth-context";

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
  themeColor: "#0a0e1a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <LogoParticles />
        <RoleProvider>
          <AuthProvider>
            <div className="relative z-10">
              <SiteHeader />
              <main className="mx-auto min-h-[calc(100vh-10rem)] max-w-7xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-16 lg:px-8 lg:pt-28 xl:pr-[260px]">
                {children}
              </main>
              <footer className="border-t border-white/10 bg-black/20">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                  <p>© 2026 校园电脑管家 · 校内 IT 服务</p>
                  <p className="flex items-center gap-1.5">
                    <Icon name="shield" className="size-3.5" />
                    设备信息仅在本机浏览器处理
                  </p>
                </div>
              </footer>
              <OfflineStatus />
              <PwaRegister />
            </div>
          </AuthProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
