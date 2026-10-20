/**
 * 用途：工单列表页，支持状态筛选、搜索、详情展示与演示性状态流转。
 */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { PriorityLabel, StatusBadge } from "@/components/status-badge";
import { useRole } from "@/lib/role-context";
import { getEvaluationStats, getNextTicketStatus, getStoredTickets, updateStoredTicket } from "@/lib/storage";
import type { Ticket, TicketRating, TicketStatus } from "@/lib/types";

const FILTERS: Array<{ value: "all" | TicketStatus; label: string }> = [
  { value: "all", label: "全部工单" },
  { value: "pending", label: "待接单" },
  { value: "repairing", label: "维修中" },
  { value: "completed", label: "已完成" },
];

const STATUS_STEPS: Array<{ value: TicketStatus; label: string }> = [
  { value: "pending", label: "待接单" },
  { value: "repairing", label: "维修中" },
  { value: "completed", label: "已完成" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface TicketEvaluationPanelProps {
  ticket: Ticket;
  canEvaluate: boolean;
  onSubmit: (rating: TicketRating, comment: string) => void;
}

function TicketEvaluationPanel({ ticket, canEvaluate, onSubmit }: TicketEvaluationPanelProps) {
  const [rating, setRating] = useState<TicketRating | 0>(ticket.evaluation?.rating ?? 0);
  const [comment, setComment] = useState(ticket.evaluation?.comment ?? "");

  if (ticket.evaluation) {
    return (
      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-800">学生评价</span>
          <span className="text-sm tracking-[0.15em] text-amber-500" aria-label={`${ticket.evaluation.rating} 星`}>
            {"★".repeat(ticket.evaluation.rating)}
            {"☆".repeat(5 - ticket.evaluation.rating)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {ticket.evaluation.comment || "未填写文字评价"}
        </p>
      </div>
    );
  }

  if (!canEvaluate) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-amber-800">为本次维修评分</p>
          <p className="mt-0.5 text-[10px] text-amber-700/60">维修完成后可评价一次</p>
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="维修评分">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} 星`}
              onClick={() => setRating(value as TicketRating)}
              className={`text-xl transition hover:-translate-y-0.5 ${
                value <= rating ? "text-amber-500" : "text-amber-200"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={100}
          placeholder="一句话说说本次维修体验…"
          className="field-input flex-1 py-2 text-xs"
        />
        <button
          type="button"
          disabled={rating === 0}
          onClick={() => onSubmit(rating as TicketRating, comment.trim())}
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-200"
        >
          提交评价
        </button>
      </div>
    </div>
  );
}
export default function TicketsPage() {
  const { role } = useRole();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreated, setShowCreated] = useState(false);
  const evaluationStats = useMemo(() => getEvaluationStats(tickets), [tickets]);

  const refreshTickets = () => {
    setTickets(getStoredTickets());
    setLoading(false);
  };

  useEffect(() => {
    refreshTickets();
    setShowCreated(new URLSearchParams(window.location.search).get("created") === "1");
  }, []);

  const filteredTickets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesFilter = filter === "all" || ticket.status === filter;
      const matchesKeyword =
        !keyword ||
        ticket.title.toLowerCase().includes(keyword) ||
        ticket.dorm.toLowerCase().includes(keyword) ||
        ticket.deviceType.toLowerCase().includes(keyword) ||
        ticket.id.toLowerCase().includes(keyword);
      return matchesFilter && matchesKeyword;
    });
  }, [filter, query, tickets]);

  const advanceStatus = (ticket: Ticket) => {
    const nextStatus = getNextTicketStatus(ticket.status);
    updateStoredTicket(ticket.id, {
      status: nextStatus,
      repairNote:
        nextStatus === "completed"
          ? ticket.repairNote || "维修完成，设备已通过基础功能测试。"
          : ticket.repairNote,
    });
    refreshTickets();
  };

  const submitEvaluation = (id: string, rating: TicketRating, comment: string) => {
    updateStoredTicket(id, {
      evaluation: {
        rating,
        comment,
        createdAt: new Date().toISOString(),
      },
    });
    refreshTickets();
  };
  return (
    <div>
      <PageHeader
        eyebrow={role === "student" ? "MY REPAIR TICKETS" : "REPAIR TICKETS"}
        title={role === "student" ? "我的工单" : "工单列表"}
        description="查看工单进度、预约信息和维修记录。演示模式下，维修员与管理员可推进工单状态。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700">
              评分 {evaluationStats.count > 0 ? evaluationStats.average.toFixed(1) : "--"} · {evaluationStats.count} 条评价
            </span>
            <Link href="/tickets/new" className="primary-button">
              <Icon name="plus" className="size-4" />
              提交新工单
            </Link>
          </div>
        }
      />

      {showCreated ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-500 text-white">
            <Icon name="check" className="size-4" />
          </span>
          <span className="font-semibold">工单提交成功</span>
          <span className="text-emerald-700/70">维修员接单后会通过预留信息联系你。</span>
          <button
            type="button"
            onClick={() => setShowCreated(false)}
            className="ml-auto text-emerald-600"
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {FILTERS.map((item) => {
              const count =
                item.value === "all"
                  ? tickets.length
                  : tickets.filter((ticket) => ticket.status === item.value).length;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filter === item.value
                      ? "bg-white text-campus-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block w-full lg:w-64">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-campus-400 focus:ring-4 focus:ring-campus-100"
              placeholder="搜索标题、宿舍或编号"
            />
          </label>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon name="clipboard" className="size-6" />
            </span>
            <h2 className="mt-4 font-bold text-slate-800">暂时没有匹配的工单</h2>
            <p className="mt-2 text-sm text-slate-400">更换筛选条件，或提交一份新的维修工单。</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => {
              const currentStep = STATUS_STEPS.findIndex((step) => step.value === ticket.status);
              return (
                <article key={ticket.id} className="p-4 transition hover:bg-slate-50/60 sm:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <StatusBadge status={ticket.status} />
                        <PriorityLabel priority={ticket.priority} />
                        <span className="text-[11px] font-medium text-slate-400">{ticket.id}</span>
                      </div>
                      <h2 className="mt-3 text-base font-bold text-slate-900">{ticket.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {ticket.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Icon name="monitor" className="size-3.5" />
                          {ticket.deviceType}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="building" className="size-3.5" />
                          {ticket.dorm}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" className="size-3.5" />
                          {formatDate(ticket.createdAt)}
                        </span>
                        {ticket.appointment ? (
                          <span className="font-medium text-campus-600">预约 {ticket.appointment}</span>
                        ) : null}
                      </div>
                      {ticket.repairNote ? (
                        <div className="mt-3 rounded-xl bg-slate-100/80 px-3 py-2 text-xs leading-5 text-slate-600">
                          <span className="font-semibold text-slate-700">维修记录：</span>
                          {ticket.repairNote}
                        </div>
                      ) : null}
                      {ticket.status === "completed" ? (
                        <TicketEvaluationPanel
                          ticket={ticket}
                          canEvaluate={role === "student"}
                          onSubmit={(rating, comment) => submitEvaluation(ticket.id, rating, comment)}
                        />
                      ) : null}
                    </div>

                    <div className="w-full shrink-0 xl:w-64">
                      <div className="flex items-center">
                        {STATUS_STEPS.map((step, index) => (
                          <div key={step.value} className="flex flex-1 items-center last:flex-none">
                            <div className="flex flex-col items-center">
                              <span
                                className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                                  index <= currentStep
                                    ? "bg-campus-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-400"
                                }`}
                              >
                                {index < currentStep ? <Icon name="check" className="size-3" /> : index + 1}
                              </span>
                              <span className="mt-1.5 whitespace-nowrap text-[10px] text-slate-400">
                                {step.label}
                              </span>
                            </div>
                            {index < STATUS_STEPS.length - 1 ? (
                              <span
                                className={`mx-2 mb-5 h-px flex-1 ${
                                  index < currentStep ? "bg-campus-400" : "bg-slate-200"
                                }`}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {role !== "student" && ticket.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => advanceStatus(ticket)}
                          className="mt-4 w-full rounded-lg border border-campus-200 bg-campus-50 px-3 py-2 text-xs font-semibold text-campus-700 transition hover:bg-campus-100"
                        >
                          推进到{getNextTicketStatus(ticket.status) === "repairing" ? "维修中" : "已完成"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}




