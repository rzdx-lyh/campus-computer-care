import { Icon, type IconName } from "@/components/icon";

interface StatCardProps {
  label: string;
  value: string | number;
  note: string;
  icon: IconName;
  tone?: "blue" | "amber" | "green" | "slate";
}

const TONES = {
  blue: "bg-blue-400/15 text-blue-300",
  amber: "bg-amber-400/15 text-amber-300",
  green: "bg-emerald-400/15 text-emerald-300",
  slate: "bg-white/10 text-slate-300",
};

export function StatCard({ label, value, note, icon, tone = "blue" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-soft backdrop-blur-xl transition duration-300 hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-100">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon name={icon} className="size-5" />
        </span>
      </div>
    </div>
  );
}
