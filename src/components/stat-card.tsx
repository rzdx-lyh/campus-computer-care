/**
 * 用途：仪表盘统计卡片，用于管理员看板与工作台概览。
 */
import { Icon, type IconName } from "@/components/icon";

interface StatCardProps {
  label: string;
  value: string | number;
  note: string;
  icon: IconName;
  tone?: "blue" | "amber" | "green" | "slate";
}

const TONES = {
  blue: "bg-campus-50 text-campus-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({ label, value, note, icon, tone = "blue" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{note}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon name={icon} className="size-5" />
        </span>
      </div>
    </div>
  );
}
