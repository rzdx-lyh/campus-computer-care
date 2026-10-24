"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { useRole } from "@/lib/role-context";
import type { DiagnosisResult, Ticket } from "@/lib/types";

const RISK_META: Record<DiagnosisResult["riskLevel"], { label: string; className: string }> = {
  low: { label: "低风险", className: "bg-emerald-50 text-emerald-700" },
  medium: { label: "中风险", className: "bg-amber-50 text-amber-700" },
  high: { label: "高风险", className: "bg-rose-50 text-rose-700" },
};

/**
 * 工单上的 AI 辅助诊断：
 * 维修员/管理员入口的独立 AI 诊断页已移除，AI 诊断能力收敛到工单上，
 * 基于工单标题与描述调用 /api/diagnose 流式生成结构化结论。
 */
export function TicketAiDiagnosis({ ticket }: { ticket: Ticket }) {
  const { role, roleLabel } = useRole();
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState("");

  const runDiagnosis = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setThinking("");

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `${ticket.title}。${ticket.description}`,
          role,
          history: [],
        }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "AI 诊断服务暂不可用");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const event = JSON.parse(trimmed) as {
              type: string;
              text?: string;
              result?: DiagnosisResult;
              message?: string;
            };
            if (event.type === "delta" && typeof event.text === "string") {
              setThinking((current) => current + event.text);
            } else if (event.type === "result" && event.result) {
              setResult(event.result);
            } else if (event.type === "error") {
              setError(event.message ?? "AI 诊断出现异常");
            }
          } catch {
            // 忽略不完整的行（流式分片）。
          }
        }
      }
    } catch (diagnosisError) {
      setError(diagnosisError instanceof Error ? diagnosisError.message : "AI 诊断失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const sources = result?.sources ?? [];

  return (
    <div className="mt-3 rounded-xl border border-campus-100 bg-campus-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-campus-800">
          <Icon name="sparkles" className="size-3.5" />
          工单 AI 辅助诊断
          <span className="font-normal text-campus-800/60">· {roleLabel}视角</span>
        </p>
        <button
          type="button"
          onClick={() => void runDiagnosis()}
          disabled={loading}
          className="rounded-lg border border-campus-200 bg-white px-3 py-1.5 text-[11px] font-bold text-campus-700 transition hover:bg-campus-50 disabled:opacity-60"
        >
          {loading ? "AI 诊断中…" : result ? "重新诊断" : "开始 AI 诊断"}
        </button>
      </div>

      {loading && thinking ? (
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-5 text-slate-500">
          {thinking}
        </pre>
      ) : null}

      {error ? <p className="mt-2 text-[11px] font-semibold text-rose-500">{error}</p> : null}

      {result ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${RISK_META[result.riskLevel].className}`}>
              {RISK_META[result.riskLevel].label}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
              {result.needRepair ? "建议送修" : "可先自行排查"}
            </span>
            {result.degraded ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600">
                兜底结果
              </span>
            ) : null}
          </div>

          <p className="text-xs leading-5 text-slate-700">{result.summary}</p>

          {result.likelyCauses.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">可能原因</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] leading-5 text-slate-600">
                {result.likelyCauses.map((cause) => (
                  <li key={cause}>{cause}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {result.suggestedActions.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">排查步骤</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] leading-5 text-slate-600">
                {result.suggestedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {sources.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">知识库依据</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {sources.map((source) => (
                  <span
                    key={source.id}
                    className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-campus-700"
                  >
                    {source.title ?? source.faultType} · {source.confidence}%
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-[10px] leading-4 text-slate-400">
            AI 结论基于本地知识库生成，仅供参考，请结合现场情况判断。
          </p>
        </div>
      ) : null}
    </div>
  );
}
