"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { exportTicketsCsv } from "@/lib/csv-export";
import { getEvaluationStats, getStoredTickets } from "@/lib/storage";
import { useAuthorizedFetch, useRequireAuth } from "@/lib/auth-context";
import type { RepairReport } from "@/lib/repair-reports";
import type { Ticket, TicketStatus } from "@/lib/types";

const STATUS_META: Array<{ status: TicketStatus; label: string; color: string }> = [
  { status: "pending", label: "待接单", color: "#f59e0b" },
  { status: "repairing", label: "维修中", color: "#8b7cff" },
  { status: "completed", label: "已完成", color: "#10b981" },
];

const FAULT_KEYWORDS: Array<{ label: string; pattern: RegExp }> = [
  { label: "网络连接", pattern: /wifi|wi-fi|网络|断网|掉线|连不上|延迟/i },
  { label: "系统软件", pattern: /蓝屏|系统|更新|重启|崩溃|卡顿|软件/i },
  { label: "散热问题", pattern: /风扇|发烫|发热|噪音|温度/i },
  { label: "硬件外设", pattern: /键盘|鼠标|接口|屏幕|电池|无法开机/i },
];

function getFaultType(ticket: Ticket) {
  const content = `${ticket.title} ${ticket.description}`;
  return FAULT_KEYWORDS.find((item) => item.pattern.test(content))?.label ?? "其他问题";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function AdminWorkspace() {
  const authorizedFetch = useAuthorizedFetch();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [reports, setReports] = useState<RepairReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [expandedReportId, setExpandedReportId] = useState("");

  useEffect(() => {
    setTickets(getStoredTickets());
    setLoading(false);
  }, []);

  // 拉取维修员上传的后台数据。
  const loadReports = () => {
    setReportsLoading(true);
    setReportsError("");
    authorizedFetch("/api/repair-reports")
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          reports?: RepairReport[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "上传数据加载失败");
        }
        setReports(data.reports ?? []);
      })
      .catch((error: unknown) => {
        setReportsError(error instanceof Error ? error.message : "上传数据加载失败");
      })
      .finally(() => setReportsLoading(false));
  };

  useEffect(() => {
    loadReports();
    // 仅挂载时加载一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusCounts = useMemo(
    () =>
      STATUS_META.map((item) => ({
        ...item,
        count: tickets.filter((ticket) => ticket.status === item.status).length,
      })),
    [tickets],
  );

  const faultStats = useMemo(() => {
    const counts = tickets.reduce<Record<string, number>>((result, ticket) => {
      const type = getFaultType(ticket);
      result[type] = (result[type] ?? 0) + 1;
      return result;
    }, {});

    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const total = tickets.length;
  const completed = statusCounts.find((item) => item.status === "completed")?.count ?? 0;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const maxFaultCount = Math.max(...faultStats.map((item) => item.count), 1);
  const evaluationStats = useMemo(() => getEvaluationStats(tickets), [tickets]);

  let previousPercent = 0;
  const donutStops = statusCounts
    .map((item) => {
      const start = previousPercent;
      const percent = total ? (item.count / total) * 100 : 0;
      previousPercent += percent;
      return `${item.color} ${start}% ${previousPercent}%`;
    })
    .join(", ");

  const requestInsight = async () => {
    setInsightLoading(true);
    setInsightError("");
    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total,
          completionRate,
          statusCounts: statusCounts.map((item) => ({ label: item.label, count: item.count })),
          faultStats,
        }),
      });
      const data = (await response.json()) as { content?: string; error?: string };
      if (!response.ok || !data.content) {
        throw new Error(data.error ?? "AI 洞察生成失败");
      }
      setInsight(data.content);
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : "AI 洞察生成失败");
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="ADMIN DASHBOARD"
        title="管理看板"
        description="汇总校园电脑报修数据，快速掌握工单流转效率和常见故障类型。"
        action={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-500 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              数据实时更新
            </span>
            <button
              type="button"
              onClick={() => exportTicketsCsv(tickets)}
              disabled={loading}
              className="secondary-button px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="download" className="size-4" />
              导出工单 CSV
            </button>
            <Link href="/tickets" className="secondary-button px-4 py-2.5">
              全部工单
              <Icon name="arrow-right" className="size-4" />
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="工单总数" value={loading ? "--" : total} note="当前 LocalStorage 数据" icon="clipboard" tone="blue" />
        <StatCard
          label="待接单"
          value={loading ? "--" : statusCounts[0].count}
          note="需要尽快响应"
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="维修中"
          value={loading ? "--" : statusCounts[1].count}
          note="维修员正在处理"
          icon="wrench"
          tone="blue"
        />

        <StatCard
          label="完成率"
          value={loading ? "--" : `${completionRate}%`}
          note={`${completed} 份工单已完成`}
          icon="check"
          tone="green"
        />
        <StatCard
          label="平均评分"
          value={evaluationStats.count > 0 ? evaluationStats.average.toFixed(1) : "--"}
          note={`${evaluationStats.count} 条学生评价`}
          icon="check"
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-900">工单状态分布</h2>
              <p className="mt-1 text-xs text-slate-400">全部报修工单占比</p>
            </div>
            <Icon name="chart" className="size-5 text-slate-300" />
          </div>

          <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-around">
            <div
              className="relative grid size-44 shrink-0 place-items-center rounded-full"
              style={{
                background: total
                  ? `conic-gradient(${donutStops})`
                  : "conic-gradient(#e2e8f0 0% 100%)",
              }}
            >
              <div className="grid size-28 place-items-center rounded-full bg-[rgba(15,20,32,0.55)] shadow-inner">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{loading ? "--" : total}</p>
                  <p className="mt-1 text-[11px] text-slate-400">全部工单</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-52 space-y-4">
              {statusCounts.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900">{item.count}</span>
                    <span className="w-9 text-right text-[10px] text-slate-400">
                      {total ? Math.round((item.count / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 rounded-xl bg-campus-50 px-4 py-3 text-xs leading-5 text-campus-800/80">
            <span className="font-bold text-campus-800">运营提示：</span>
            待接单工单占全部工单的 {total ? Math.round((statusCounts[0].count / total) * 100) : 0}%，
            建议根据预约时间优先安排。
          </div>
        </section>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-900">故障类型统计</h2>
              <p className="mt-1 text-xs text-slate-400">根据工单标题与描述自动归类</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              演示分类
            </span>
          </div>

          <div className="mt-7 space-y-6">
            {loading
              ? [1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))
              : faultStats.map((item, index) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">{item.label}</span>
                      <span className="font-bold text-slate-900">{item.count} 单</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          index === 0
                            ? "bg-gradient-to-r from-campus-500 to-campus-400"
                            : index === 1
                              ? "bg-gradient-to-r from-sky-400 to-cyan-300"
                              : index === 2
                                ? "bg-gradient-to-r from-amber-400 to-orange-300"
                                : "bg-gradient-to-r from-slate-400 to-slate-300"
                        }`}
                        style={{ width: `${(item.count / maxFaultCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            {!loading && faultStats.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">暂无工单数据</p>
            ) : null}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
            <div>
              <p className="text-xl font-bold text-slate-900">{faultStats.length}</p>
              <p className="mt-1 text-[10px] text-slate-400">故障类别</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">
                {faultStats[0]?.label ?? "暂无"}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">最常见类型</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{completionRate}%</p>
              <p className="mt-1 text-[10px] text-slate-400">整体完成率</p>
            </div>
          </div>
        </section>
      </div>

      <section className="surface-card mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-campus-700">
              <Icon name="sparkles" className="size-4" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">AI 运维洞察</h2>
              <p className="mt-1 text-xs text-slate-400">
                让 AI 基于当前工单统计给出一句话结论与资源建议
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void requestInsight()}
            disabled={insightLoading || loading}
            className="secondary-button px-4 py-2.5"
          >
            <Icon name="sparkles" className="size-4" />
            {insightLoading ? "AI 正在分析…" : insight ? "重新生成洞察" : "生成 AI 洞察"}
          </button>
        </div>

        {insight ? (
          <div className="mt-4 rounded-xl border border-campus-100 bg-campus-50/70 p-4 text-sm leading-6 text-campus-900">
            {insight}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-400">
            点击「生成 AI 洞察」，AI 会结合上面的故障类型与工单状态，给出本周运维重点。
          </p>
        )}
        {insightError ? (
          <p className="mt-2 text-xs text-rose-500">{insightError}</p>
        ) : null}
      </section>

      <section className="surface-card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900">最近工单</h2>
            <p className="mt-1 text-xs text-slate-400">按提交时间倒序排列</p>
          </div>
          <Link href="/tickets" className="ghost-button">
            查看全部 <Icon name="arrow-right" className="size-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3">工单信息</th>
                <th className="px-4 py-3">设备 / 宿舍</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">提交时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.slice(0, 5).map((ticket) => (
                <tr key={ticket.id} className="text-xs transition hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{ticket.title}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{ticket.id}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    <p>{ticket.deviceType}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{ticket.dorm}</p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-400">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && tickets.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">暂无工单数据</p>
          ) : null}
        </div>
      </section>

      {/* 维修员上传的后台数据 */}
      <section className="surface-card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-campus-700">
              <Icon name="cloud-upload" className="size-4" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">维修员上传的后台数据</h2>
              <p className="mt-1 text-xs text-slate-400">
                维修员在维修工作台点击「上传后台数据」后，这里会显示统计与工单明细。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadReports}
            disabled={reportsLoading}
            className="ghost-button disabled:opacity-50"
          >
            <Icon name="refresh" className="size-4" />
            {reportsLoading ? "加载中…" : "刷新"}
          </button>
        </div>

        {reportsError ? (
          <p className="m-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
            {reportsError}
          </p>
        ) : reportsLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon name="cloud-upload" className="size-6" />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-700">还没有收到上传数据</p>
            <p className="mt-1 text-xs text-slate-400">
              请维修员登录后在「维修工作台 → 上传后台数据给管理员」提交。
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <article key={report.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-campus-50 px-2.5 py-1 text-[10px] font-bold text-campus-700">
                        {report.technician}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(report.createdAt).toLocaleString("zh-CN", { hour12: false })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      范围：{report.scope} · 工单 {report.stats.total} 单（待接单 {report.stats.pending} ·
                      维修中 {report.stats.repairing} · 已完成 {report.stats.completed}）· 完成率{" "}
                      {report.stats.completionRate}% · 平均评分 {report.stats.averageRating.toFixed(1)}
                    </p>
                    {report.note ? (
                      <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        维修员备注：{report.note}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReportId((current) => (current === report.id ? "" : report.id))
                    }
                    className="ghost-button px-3 py-2 text-xs"
                  >
                    {expandedReportId === report.id ? "收起明细" : `查看明细（${report.tickets.length}）`}
                  </button>
                </div>

                {expandedReportId === report.id ? (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full min-w-[560px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="px-4 py-2.5">工单</th>
                          <th className="px-4 py-2.5">宿舍</th>
                          <th className="px-4 py-2.5">状态</th>
                          <th className="px-4 py-2.5">维修记录</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.tickets.map((ticket) => (
                          <tr key={`${report.id}-${ticket.id}`}>
                            <td className="px-4 py-2.5 font-semibold text-slate-700">
                              {ticket.title}
                              <span className="ml-1.5 text-[10px] text-slate-400">{ticket.id}</span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{ticket.dorm}</td>
                            <td className="px-4 py-2.5 text-slate-500">{ticket.status}</td>
                            <td className="px-4 py-2.5 text-slate-500">{ticket.repairNote || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminPage() {
  const authorized = useRequireAuth("admin");

  if (!authorized) {
    return (
      <div className="surface-card mx-auto max-w-md p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-campus-50 text-campus-600">
          <Icon name="lock" className="size-6" />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-700">正在校验管理员登录状态…</p>
        <p className="mt-1 text-xs text-slate-400">未登录将自动跳转到登录页。</p>
      </div>
    );
  }

  return <AdminWorkspace />;
}





