"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { PriorityLabel, StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { useAuthorizedFetch, useRequireAuth } from "@/lib/auth-context";
import { getEvaluationStats, getStoredTickets, updateStoredTicket } from "@/lib/storage";
import type { RepairAdvice, Ticket } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function TechnicianWorkspace() {
  const authorizedFetch = useAuthorizedFetch();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [advices, setAdvices] = useState<Record<string, RepairAdvice>>({});
  const [adviceLoading, setAdviceLoading] = useState("");
  const [adviceError, setAdviceError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savedId, setSavedId] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const refreshTickets = () => {
    const storedTickets = getStoredTickets();
    setTickets(storedTickets);
    setNotes((current) => {
      const next = { ...current };
      storedTickets.forEach((ticket) => {
        if (next[ticket.id] === undefined) next[ticket.id] = ticket.repairNote;
      });
      return next;
    });
    setLoading(false);
  };

  useEffect(() => {
    refreshTickets();
  }, []);

  const pendingTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "pending"),
    [tickets],
  );
  const repairingTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "repairing"),
    [tickets],
  );
  const completedCount = tickets.filter((ticket) => ticket.status === "completed").length;
  const evaluationStats = useMemo(() => getEvaluationStats(tickets), [tickets]);

  const acceptTicket = (id: string) => {
    updateStoredTicket(id, {
      status: "repairing",
      repairNote: "已接单，正在联系学生确认上门时间。",
    });
    refreshTickets();
  };

  const saveNote = (id: string) => {
    updateStoredTicket(id, { repairNote: notes[id] ?? "" });
    refreshTickets();
    setSavedId(id);
    window.setTimeout(() => setSavedId(""), 1600);
  };

  const completeTicket = (id: string) => {
    updateStoredTicket(id, {
      status: "completed",
      repairNote: notes[id]?.trim() || "维修完成，设备已通过基础功能测试。",
    });
    refreshTickets();
  };

  const requestAdvice = async (ticket: Ticket) => {
    setAdviceLoading(ticket.id);
    setAdviceError("");
    try {
      const response = await fetch("/api/repair-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: {
            title: ticket.title,
            description: ticket.description,
            deviceType: ticket.deviceType,
            priority: ticket.priority,
            repairNote: ticket.repairNote,
          },
        }),
      });
      const data = (await response.json()) as { advice?: RepairAdvice; error?: string };
      if (!response.ok || !data.advice) {
        throw new Error(data.error ?? "AI 维修建议生成失败");
      }
      setAdvices((current) => ({ ...current, [ticket.id]: data.advice as RepairAdvice }));
    } catch (error) {
      setAdviceError(error instanceof Error ? error.message : "AI 维修建议生成失败");
    } finally {
      setAdviceLoading("");
    }
  };

  const applyAdvice = (ticket: Ticket, advice: RepairAdvice) => {
    const text = [
      `AI 维修摘要：${advice.summary}`,
      `可能原因：${advice.causes.join("；") || "待现场确认"}`,
      `建议备件：${advice.parts.join("；") || "无需备件"}`,
      `预计工时：${advice.estimate}`,
      advice.steps.length > 0
        ? `维修与验收步骤：\n${advice.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    setNotes((current) => ({ ...current, [ticket.id]: text }));
    updateStoredTicket(ticket.id, { repairNote: text });
    refreshTickets();
    setSavedId(ticket.id);
    window.setTimeout(() => setSavedId(""), 1600);
  };

  /** 上传后台数据给管理员：工单统计 + 明细 + 备注。 */
  const uploadReport = async () => {
    setUploading(true);
    setUploadMessage("");
    try {
      const response = await authorizedFetch("/api/repair-reports", {
        method: "POST",
        body: JSON.stringify({
          scope: "全部工单",
          note: uploadNote.trim(),
          stats: {
            total: tickets.length,
            pending: pendingTickets.length,
            repairing: repairingTickets.length,
            completed: completedCount,
            completionRate: tickets.length ? Math.round((completedCount / tickets.length) * 100) : 0,
            averageRating: evaluationStats.average,
            ratingCount: evaluationStats.count,
          },
          tickets: tickets.map((ticket) => ({
            id: ticket.id,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            dorm: ticket.dorm,
            repairNote: ticket.repairNote,
          })),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "上传失败，请稍后重试");
      }

      setUploadMessage("上传成功，管理员已可在看板查看本次后台数据。");
      setUploadNote("");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="TECHNICIAN WORKSPACE"
        title="维修员工作台"
        description="处理待接单任务、记录维修过程，将后台数据上传给管理员，并维护特供资料库。"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/technician/library" className="secondary-button px-4 py-2.5">
              <Icon name="book" className="size-4" />
              特供资料库
            </Link>
            <Link href="/tickets" className="secondary-button px-4 py-2.5">
              <Icon name="clipboard" className="size-4" />
              查看全部工单
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="待接单" value={pendingTickets.length} note="等待维修员响应" icon="clock" tone="amber" />
        <StatCard label="维修中" value={repairingTickets.length} note="当前处理任务" icon="wrench" tone="blue" />
        <StatCard label="今日已完成" value={completedCount} note="演示数据统计" icon="check" tone="green" />
        <StatCard
          label="服务评分"
          value={evaluationStats.count > 0 ? evaluationStats.average.toFixed(1) : "--"}
          note={`${evaluationStats.count} 条学生评价`}
          icon="check"
          tone="slate"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">待接单队列</h2>
              <p className="mt-1 text-xs text-slate-400">按紧急程度优先处理</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              {pendingTickets.length} 单
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2].map((item) => (
                <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : pendingTickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
                <Icon name="check" className="size-6" />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-700">待接单队列已清空</p>
              <p className="mt-1 text-xs text-slate-400">所有报修任务都已被响应。</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingTickets.map((ticket) => (
                <article key={ticket.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <PriorityLabel priority={ticket.priority} />
                        <span className="text-[10px] text-slate-400">{ticket.id}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-slate-900">{ticket.title}</h3>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{ticket.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Icon name="building" className="size-3" />
                      {ticket.dorm}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="clock" className="size-3" />
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                  {ticket.appointment ? (
                    <p className="mt-3 rounded-lg bg-campus-50 px-3 py-2 text-[11px] font-medium text-campus-700">
                      预约时段：{ticket.appointment}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => acceptTicket(ticket.id)}
                    className="primary-button mt-4 w-full py-2.5"
                  >
                    <Icon name="wrench" className="size-4" />
                    接单并开始维修
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-bold text-slate-900">正在处理</h2>
              <p className="mt-1 text-xs text-slate-400">接单后请补充维修记录</p>
            </div>
            <span className="text-xs font-semibold text-campus-700">{repairingTickets.length} 个任务</span>
          </div>

          {!loading && repairingTickets.length === 0 ? (
            <div className="surface-card flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-campus-50 text-campus-500">
                <Icon name="wrench" className="size-6" />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-700">还没有进行中的维修</p>
              <p className="mt-1 text-xs text-slate-400">从左侧队列接单后会显示在这里。</p>
            </div>
          ) : (
            repairingTickets.map((ticket) => (
              <article key={ticket.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <span className="text-[10px] text-slate-400">{ticket.id}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-slate-900">{ticket.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {ticket.deviceType} · {ticket.dorm}
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-400">
                    {ticket.appointment || "未预约"}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">故障描述</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600">{ticket.description}</p>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void requestAdvice(ticket)}
                    disabled={adviceLoading === ticket.id}
                    className="secondary-button w-full py-2.5"
                  >
                    <Icon name="sparkles" className="size-4 text-campus-600" />
                    {adviceLoading === ticket.id
                      ? "AI 正在分析工单…"
                      : advices[ticket.id]
                        ? "重新生成 AI 维修建议"
                        : "AI 维修建议"}
                  </button>
                  {adviceError ? (
                    <p className="mt-2 text-center text-[10px] text-rose-500">{adviceError}</p>
                  ) : null}
                  {advices[ticket.id] ? (
                    <div className="mt-3 rounded-xl border border-campus-100 bg-campus-50/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-bold text-campus-800">
                          <Icon name="sparkles" className="size-3.5" />
                          AI 维修摘要
                        </p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-campus-700">
                          预计 {advices[ticket.id].estimate}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{advices[ticket.id].summary}</p>
                      <div className="mt-2 grid gap-1.5 text-[11px] leading-5 text-slate-500">
                        <p>
                          <span className="font-semibold text-slate-700">可能原因：</span>
                          {advices[ticket.id].causes.join("；") || "待现场确认"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">建议备件：</span>
                          {advices[ticket.id].parts.join("；") || "无需备件"}
                        </p>
                        {advices[ticket.id].steps.length > 0 ? (
                          <div>
                            <span className="font-semibold text-slate-700">维修与验收：</span>
                            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                              {advices[ticket.id].steps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAdvice(ticket, advices[ticket.id])}
                        className="mt-3 w-full rounded-lg border border-campus-200 bg-white px-3 py-2 text-[11px] font-semibold text-campus-700 transition hover:bg-campus-50"
                      >
                        填入维修记录
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <label htmlFor={`note-${ticket.id}`} className="field-label text-xs">
                    维修记录
                  </label>
                  <textarea
                    id={`note-${ticket.id}`}
                    rows={3}
                    value={notes[ticket.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [ticket.id]: event.target.value }))
                    }
                    className="field-input resize-y text-xs"
                    placeholder="记录检测结果、处理方式和更换配件…"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveNote(ticket.id)}
                    className="secondary-button flex-1 py-2.5"
                  >
                    {savedId === ticket.id ? (
                      <>
                        <Icon name="check" className="size-4 text-emerald-500" />
                        已保存
                      </>
                    ) : (
                      "保存记录"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => completeTicket(ticket.id)}
                    className="primary-button flex-1 py-2.5"
                  >
                    <Icon name="check" className="size-4" />
                    标记完成
                  </button>
                </div>
              </article>
            ))
          )}

          <div className="rounded-2xl border border-campus-100 bg-campus-50/70 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-campus-800">
              <Icon name="shield" className="size-4" />
              维修规范提醒
            </div>
            <p className="mt-2 text-xs leading-5 text-campus-800/70">
              涉及学生个人数据时，请先征得同意；更换硬件后请记录配件型号和保修信息。
            </p>
          </div>

          {/* 上传后台数据给管理员 */}
          <section className="surface-card p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-campus-700">
                <Icon name="cloud-upload" className="size-4" />
              </span>
              <div>
                <h2 className="font-bold text-slate-900">上传后台数据给管理员</h2>
                <p className="mt-1 text-xs text-slate-400">
                  把当前工单统计与维修明细上传到服务端，管理员登录后即可在看板查看。
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["工单总数", tickets.length],
                ["待接单", pendingTickets.length],
                ["维修中", repairingTickets.length],
                ["已完成", completedCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <dt className="text-[10px] text-slate-400">{label}</dt>
                  <dd className="mt-0.5 text-lg font-bold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <label htmlFor="upload-note" className="field-label text-xs">
                备注（可选，最多 500 字）
              </label>
              <textarea
                id="upload-note"
                rows={2}
                maxLength={500}
                value={uploadNote}
                onChange={(event) => setUploadNote(event.target.value)}
                className="field-input resize-y text-xs"
                placeholder="例如：本周散热类工单偏多，建议安排集中清灰。"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void uploadReport()}
                disabled={uploading}
                className="primary-button py-2.5 disabled:opacity-60"
              >
                <Icon name="cloud-upload" className="size-4" />
                {uploading ? "上传中…" : "上传后台数据"}
              </button>
              {uploadMessage ? (
                <span className="text-xs font-semibold text-campus-700">{uploadMessage}</span>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

export default function TechnicianPage() {
  const authorized = useRequireAuth("technician");

  if (!authorized) {
    return (
      <div className="surface-card mx-auto max-w-md p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-campus-50 text-campus-600">
          <Icon name="lock" className="size-6" />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-700">正在校验维修员登录状态…</p>
        <p className="mt-1 text-xs text-slate-400">未登录将自动跳转到登录页。</p>
      </div>
    );
  }

  return <TechnicianWorkspace />;
}
