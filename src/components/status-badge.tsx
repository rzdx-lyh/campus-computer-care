/**
 * 用途：工单状态与优先级标签组件，统一颜色和中文文案。
 */
import type { TicketPriority, TicketStatus } from "@/lib/types";

const STATUS_META: Record<TicketStatus, { label: string; className: string; dot: string }> = {
  pending: {
    label: "待接单",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  repairing: {
    label: "维修中",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  completed: {
    label: "已完成",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "普通", className: "text-slate-500" },
  medium: { label: "较急", className: "text-amber-600" },
  high: { label: "紧急", className: "text-rose-600" },
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
