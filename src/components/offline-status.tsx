/**
 * 用途：全局显示在线/离线状态，并提示 25 条故障知识可离线查看。
 */
"use client";

import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineStatus() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur-sm ${
        isOnline
          ? "border-emerald-200 bg-white/95 text-emerald-700"
          : "border-amber-200 bg-amber-50/95 text-amber-800"
      }`}
      role="status"
      aria-live="polite"
    >
      <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
      {isOnline ? "在线" : "离线"} · 25 条故障可离线查看
    </div>
  );
}
