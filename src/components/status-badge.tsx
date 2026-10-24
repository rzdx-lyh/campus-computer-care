import type { TicketPriority, TicketStatus } from "@/lib/types";

const STATUS_META: Record<TicketStatus, { label: string; className: string; dot: string }> = {
  pending: {
    label: "待接单",
    className: "bg-amber-400/12 text-amber-300 ring-amber-400/30",
    dot: "bg-amber-400",
  },
  repairing: {
    label: "维修中",
    className: "bg-blue-400/12 text-blue-300 ring-blue-400/30",
    dot: "bg-blue-400",
  },
  completed: {
    label: "已完成",
    className: "bg-emerald-400/12 text-emerald-300 ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
};

const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "普通", className: "text-slate-400" },
  medium: { label: "较急", className: "text-amber-300" },
  high: { label: "紧急", className: "text-rose-300" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`text-xs font-semibold ${PRIORITY_META[priority].className}`}>
      {PRIORITY_META[priority].label}
    </span>
  );
}
