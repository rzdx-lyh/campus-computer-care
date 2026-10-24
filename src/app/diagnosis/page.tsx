"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { MascotAssistant } from "@/components/mascot-assistant";
import { PageHeader } from "@/components/page-header";
import { OperationDiagram } from "@/components/operation-diagram";
import { DemoVideoRecorder } from "@/components/demo-video-recorder";
import {
  createDiagnosisTicketDraft,
  saveDiagnosisTicketDraft,
} from "@/lib/diagnosis-draft";
import { downloadDiagnosisReport } from "@/lib/report-export";
import { detectErrorCodes, formatErrorCodeContext } from "@/lib/error-code";
import { useRole } from "@/lib/role-context";
import { useSpeechRecognition, useSpeechSynthesis } from "@/lib/use-speech";
import { useOnlineStatus } from "@/lib/use-online-status";
import type {
  ChatMessage,
  ConversationTurn,
  DiagnosisResult,
  DiagnosisStreamEvent,
} from "@/lib/types";

const QUICK_PROMPTS = [
  "电脑开机后风扇声音很大",
  "宿舍 Wi-Fi 频繁掉线",
  "系统更新后经常蓝屏",
  "键盘有几个按键失灵",
];

const RISK_META = {
  low: { label: "低风险", className: "bg-emerald-50 text-emerald-700" },
  medium: { label: "中风险", className: "bg-amber-50 text-amber-700" },
  high: { label: "高风险", className: "bg-rose-50 text-rose-700" },
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "你好，我是校园电脑管家 AI 助手。请描述电脑出现的故障现象，我会根据知识库进行多轮问诊，逐步缩小故障范围。",
};

interface DiagnosisResultCardProps {
  result: DiagnosisResult;
  sourceDescription: string;
  roleLabel: string;
  learningMode: boolean;
  disabled: boolean;
  speaking: boolean;
  onFollowUp: (question: string) => void;
  onCreateTicket: (result: DiagnosisResult, sourceDescription: string) => void;
  onSpeak: (text: string) => void;
}

function DiagnosisResultCard({
  result,
  sourceDescription,
  roleLabel,
  learningMode,
  disabled,
  speaking,
  onFollowUp,
  onCreateTicket,
  onSpeak,
}: DiagnosisResultCardProps) {
  const sources = result.sources ?? [];
  const webSourceCount = sources.filter((source) => source.kind === "web").length;
  const localSourceCount = sources.length - webSourceCount;
  const followUps = result.followUpQuestions ?? [];
  const informationSufficient = result.informationSufficient !== false;
  const [stepIndex, setStepIndex] = useState(0);
  const currentStepIndex = Math.min(stepIndex, Math.max(0, followUps.length - 1));
  const currentFollowUp = followUps[currentStepIndex];

  return (
    <div className="mt-3 rounded-2xl border border-campus-100 bg-white p-4 text-left shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {result.degraded ? "兜底诊断结果" : "结构化诊断结果"}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            AI Agent · {roleLabel}视角 · 多轮问诊与知识库协同
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.degraded ? (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
              本地兜底
            </span>
          ) : null}
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              informationSufficient
                ? "bg-sky-50 text-sky-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {informationSufficient ? "信息充分" : "待补充信息"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${RISK_META[result.riskLevel].className}`}
          >
            {RISK_META[result.riskLevel].label}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <Icon name="search" className="size-3.5 text-campus-600" />
            知识库与联网检索依据
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {sources.length > 0
              ? `${sources.length} 条（本地 ${localSourceCount} · 联网 ${webSourceCount}）· 最高匹配 ${result.ragConfidence ?? sources[0]?.confidence ?? 0}%`
              : "未命中标准条目 · 使用通用诊断"}
          </span>
        </div>

        {sources.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {sources.map((source, index) => (
              <div
                key={`${source.id}-${source.faultType}-${index}`}
                className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    #{index + 1}{" "}
                    {source.kind === "web"
                      ? `联网 · ${source.siteName ?? source.faultType}`
                      : source.faultType}
                  </span>
                  <span className="rounded-full bg-campus-50 px-2 py-0.5 text-[9px] font-bold text-campus-700">
                    {source.confidence}%
                  </span>
                </div>
                {source.kind === "web" ? (
                  <>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 line-clamp-2 block text-[10px] font-semibold leading-4 text-campus-700 hover:underline"
                      >
                        {source.title ?? "打开网页来源"}
                      </a>
                    ) : (
                      <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-600">
                        {source.title}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-400">
                      {source.snippet || "已抓取网页内容并参与向量检索"}
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-400">
                    命中：{source.matchedKeywords.join("、") || "按故障类型近似匹配"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            当前描述未稳定匹配本地知识条目，AI 已降低结论强度并给出保守建议。
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            可能原因
          </p>
          <ul className="mt-2 space-y-2">
            {result.likelyCauses.map((cause) => (
              <li key={cause} className="flex gap-2 text-xs leading-5 text-slate-600">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-amber-400" />
                {cause}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            建议操作
          </p>
          <ul className="mt-2 space-y-2">
            {result.suggestedActions.map((action) => (
              <li key={action} className="flex gap-2 text-xs leading-5 text-slate-600">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!informationSufficient && followUps.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <Icon name="message" className="size-3.5" />
            {learningMode ? "一步一步教我" : "继续补充以下信息，AI 会进一步缩小范围"}
          </p>
          <p className="mt-1 text-[10px] text-amber-700/60">
            {learningMode
              ? "按顺序完成追问，每一步只处理一个问题。"
              : "点击问题会填入输入框，补充答案后发送。"}
          </p>

          {learningMode ? (
            <div className="mt-3 rounded-xl border border-amber-100 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                  步骤 {currentStepIndex + 1} / {followUps.length}
                </span>
                <div className="flex gap-1">
                  {followUps.map((question, index) => (
                    <span
                      key={`${question}-dot`}
                      className={`size-1.5 rounded-full ${
                        index === currentStepIndex ? "bg-amber-500" : "bg-amber-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                {currentFollowUp}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={currentStepIndex === 0}
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  上一步
                </button>
                <button
                  type="button"
                  disabled={currentStepIndex >= followUps.length - 1}
                  onClick={() =>
                    setStepIndex((current) => Math.min(followUps.length - 1, current + 1))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  下一步
                </button>
                <button
                  type="button"
                  disabled={disabled || !currentFollowUp}
                  onClick={() => currentFollowUp && onFollowUp(currentFollowUp)}
                  className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  回答这个问题
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {followUps.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={disabled}
                  onClick={() => onFollowUp(question)}
                  className="flex w-full items-start gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 transition hover:border-amber-300 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="plus" className="mt-0.5 size-3 shrink-0 text-amber-500" />
                  {question}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <OperationDiagram result={result} />

      <button
        type="button"
        onClick={() => onCreateTicket(result, sourceDescription)}
        className="primary-button mt-5 flex w-full items-center justify-center gap-2 py-3 text-sm font-medium"
      >
        <Icon name="plus" className="size-4" />
        一键转工单：用 AI 诊断结果预填报修单
        <Icon name="arrow-right" className="size-4" />
      </button>
      <p className="mt-1 text-center text-[11px] leading-4 text-slate-400">
        标题、设备类型、故障描述、优先级已自动填好，并附带完整问诊记录；跳转后只需补宿舍与预约时间
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <DemoVideoRecorder
          result={result}
          className="secondary-button w-full py-2.5"
        />
        <button
          type="button"
          onClick={() =>
            downloadDiagnosisReport(result, {
              description: sourceDescription,
              roleLabel,
            })
          }
          className="secondary-button w-full py-2.5"
        >
          <Icon name="download" className="size-4" />
          导出诊断报告
        </button>
        <button
          type="button"
          onClick={() => {
            const text = [
              result.summary,
              ...result.suggestedActions.slice(0, 2),
            ].join("。");
            onSpeak(text);
          }}
          className="secondary-button w-full py-2.5"
        >
          <Icon name="volume" className="size-4" />
          {speaking ? "正在朗读…" : "朗读诊断结果"}
        </button>
      </div>
    </div>
  );
}

/**
 * AI 辅助诊断页仅对学生开放：
 * 维修员/管理员入口的独立诊断页已按需求移除，AI 诊断收敛到工单页面，
 * 这里对两类内部角色展示迁移提示。
 */
export default function DiagnosisPage() {
  const { role, roleLabel } = useRole();

  if (role !== "student") {
    return (
      <div className="surface-card mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-campus-50 text-campus-600">
          <Icon name="sparkles" className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-800">AI 辅助诊断已调整到工单页面</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {roleLabel}视角不再保留独立诊断页。请前往工单列表，在具体工单上点击「工单 AI
          辅助诊断」使用 AI 能力；维修员还可使用维修建议与特供资料库。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/tickets" className="primary-button py-2.5">
            <Icon name="clipboard" className="size-4" />
            前往工单页面
          </Link>
          {role === "technician" ? (
            <Link href="/technician/library" className="secondary-button py-2.5">
              <Icon name="book" className="size-4" />
              特供资料库
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return <DiagnosisWorkspace />;
}

function DiagnosisWorkspace() {
  const router = useRouter();
  const { role, roleLabel } = useRole();
  const isOnline = useOnlineStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [learningMode, setLearningMode] = useState(false);
  const detectedErrorCodes = detectErrorCodes(input);
  const voice = useSpeechRecognition();
  const { speaking, speak } = useSpeechSynthesis();
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q");
    if (!query?.trim()) return;

    setInput(query.trim().slice(0, 500));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  // ---- 数字人：状态与文案全部由 AI 的真实输出推导 ----
  const lastResult = useMemo(
    () => [...messages].reverse().find((message) => message.result)?.result ?? null,
    [messages],
  );

  const assistantState = isStreaming
    ? "thinking"
    : lastResult
      ? lastResult.riskLevel === "high" || lastResult.needRepair
        ? "warning"
        : "success"
      : "idle";

  const assistantMessage = useMemo(() => {
    if (isStreaming) return "正在结合 25 条本地故障知识分析，稍等一下～";
    if (!lastResult) return "描述一下电脑哪里不舒服，我跟着 AI 一起看～";
    const summary = lastResult.summary.length > 34 ? `${lastResult.summary.slice(0, 34)}…` : lastResult.summary;
    return assistantState === "warning" ? `风险偏高：${summary}` : `已定位：${summary}`;
  }, [isStreaming, lastResult, assistantState]);

  /** 可朗读内容：优先读 AI 的诊断结论，其次读最近一条 AI 回复 */
  const speakText = useMemo(() => {
    if (lastResult) {
      return [lastResult.summary, ...lastResult.suggestedActions.slice(0, 2)].join("。");
    }
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    return lastAssistant?.content?.trim() ?? "";
  }, [lastResult, messages]);

  const submitMessage = async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || isStreaming) return;

    const history: ConversationTurn[] = messages
      .filter((message) => message.id !== "welcome" && message.content.trim())
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const errorCodeContext = formatErrorCodeContext(detectErrorCodes(content));
    const requestDescription = `${content}${errorCodeContext}`;
    const userContext = [
      ...history.filter((turn) => turn.role === "user").map((turn) => turn.content),
      requestDescription,
    ]
      .slice(-3)
      .join("；");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      sourceDescription: userContext,
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setStreamError("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: requestDescription, history, role }),
      });

      if (!response.ok || !response.body) {
        throw new Error("诊断服务未返回有效响应");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: DiagnosisResult | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: DiagnosisStreamEvent;
          try {
            event = JSON.parse(line) as DiagnosisStreamEvent;
          } catch {
            continue;
          }

          if (event.type === "error") {
            setStreamError(event.message ?? "AI 服务降级，已使用本地兜底结果。");
          }
          if (event.type === "delta" && event.text) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + event.text }
                  : message,
              ),
            );
          }
          if (event.type === "result" && event.result) {
            finalResult = event.result;
          }
        }
      }

      if (finalResult) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, result: finalResult } : message,
          ),
        );
      }
    } catch {
      setStreamError("诊断服务暂时不可用，已保留当前对话，请稍后重试。");
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: "诊断服务暂时不可用，请稍后重试，或直接提交维修工单。",
              }
            : message,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFollowUp = (question: string) => {
    setInput((current) => {
      const prefix = current.trim();
      return prefix ? `${prefix}\n补充：${question} ` : `补充：${question} `;
    });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const handleCreateTicket = (result: DiagnosisResult, sourceDescription: string) => {
    const conversation = messages
      .filter(
        (message) =>
          message.id !== "welcome" &&
          message.content.trim() &&
          (message.role === "user" || message.role === "assistant"),
      )
      .map((message) => `${message.role === "user" ? "学生" : "AI"}：${message.content.trim()}`)
      .join("\n");
    const draft = createDiagnosisTicketDraft(result, sourceDescription, { conversation });
    saveDiagnosisTicketDraft(draft);
    router.push("/tickets/new?from=diagnosis");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(input);
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI DIAGNOSIS AGENT"
        title="AI 故障诊断"
        description="AI 会结合对话上下文和多轮追问分析故障，并展示本地知识库检索依据。"
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-campus-100 bg-white px-3 py-2 text-xs font-semibold text-campus-700 shadow-sm">
            <span className="size-2 animate-pulse-soft rounded-full bg-emerald-500" />
            {roleLabel}视角 · 多轮问诊在线
          </span>
        }
      />

      {!isOnline ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-500 text-white">
            <Icon name="alert" className="size-4" />
          </span>
          <div className="flex-1">
            <p className="font-bold">当前处于离线状态</p>
            <p className="mt-0.5 text-xs leading-5 text-amber-800/80">
              AI 需要联网，可先查看
              <a href="/graph" className="mx-1 font-bold underline underline-offset-2">故障知识图谱</a>
              与本地知识库。
            </p>
          </div>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        <section className="surface-card chat-ambient flex min-h-[620px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-campus-500 to-campus-700 text-white">
                <Icon name="sparkles" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">管家 AI Agent</p>
                <p className="text-[11px] text-slate-400">对话追问 · 知识库检索 · 工单协同</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMessages([INITIAL_MESSAGE]);
                setStreamError("");
              }}
              className="text-xs font-semibold text-slate-400 transition hover:text-campus-700"
            >
              清空对话
            </button>
          </div>

          <div className="chat-gradient-bg flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {streamError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                <p className="font-bold">AI 服务降级</p>
                <p className="mt-1">{streamError}</p>
                <p className="mt-1 text-amber-700/70">
                  本次结果可能由本地知识库兜底生成，请结合设备实际情况判断。
                </p>
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-[#8b7cff] to-[#5b4bd6] text-white shadow-[0_0_16px_-4px_rgba(124,108,255,0.7)]"
                      : "bg-[rgba(124,108,255,0.2)] text-[#93c5fd]"
                  }`}
                >
                  {message.role === "assistant" ? <Icon name="sparkles" className="size-4" /> : "我"}
                </span>
                <div className={`max-w-[86%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm leading-6 ${
                      message.role === "assistant"
                        ? "bubble-breathe rounded-tl-md border border-[rgba(148,163,184,0.22)] bg-[rgba(30,39,55,0.94)] text-[#e2e8f0]"
                        : "rounded-tr-md bg-gradient-to-br from-[#8b7cff] to-[#5b4bd6] text-white shadow-[0_8px_20px_-12px_rgba(124,108,255,0.6)]"
                    }`}
                  >
                    {message.content || (
                      <span className="inline-flex items-center gap-1 py-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-campus-400 [animation-delay:-0.2s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-campus-400 [animation-delay:-0.1s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-campus-400" />
                      </span>
                    )}
                  </div>

                  {message.result ? (
                    <DiagnosisResultCard
                      result={message.result}
                      sourceDescription={message.sourceDescription ?? message.result.summary}
                      roleLabel={roleLabel}
                      learningMode={learningMode}
                      disabled={isStreaming}
                      speaking={speaking}
                      onFollowUp={handleFollowUp}
                      onCreateTicket={handleCreateTicket}
                      onSpeak={speak}
                    />
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={scrollAnchorRef} />
          </div>

          <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => void submitMessage(prompt)}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:border-campus-200 hover:bg-campus-50 hover:text-campus-700 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {role === "student" ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={learningMode}
                  onClick={() => setLearningMode((current) => !current)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    learningMode
                      ? "border-[rgba(124,108,255,0.45)] bg-[rgba(124,108,255,0.14)] text-[#7c6cff]"
                      : "border-[rgba(148,163,184,0.2)] bg-[rgba(30,39,55,0.92)] text-[#9ca9ba]"
                  }`}
                >
                  <span
                    className={`relative h-5 w-9 rounded-full transition ${
                      learningMode ? "bg-[#7c6cff]" : "bg-[rgba(148,163,184,0.35)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-[#f1f5f9] shadow-sm transition-all ${
                        learningMode ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </span>
                  一步一步教我
                </button>
              ) : null}
            </div>
            {detectedErrorCodes.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-campus-100 bg-campus-50/70 px-3 py-2">
                <span className="flex items-center gap-1 text-[10px] font-bold text-campus-700">
                  <Icon name="alert" className="size-3.5" />
                  识别到错误码
                </span>
                {detectedErrorCodes.map((item) => (
                  <span
                    key={item.code}
                    className="rounded-full border border-campus-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                  >
                    {item.code} <span className="text-campus-600">→ {item.faultType}</span>
                  </span>
                ))}
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              {voice.supported ? (
                <button
                  type="button"
                  onClick={() => {
                    if (voice.listening) {
                      voice.stopListening();
                      return;
                    }
                    voice.startListening((text) => {
                      setInput((current) => {
                        const prefix = current.trim();
                        return prefix ? `${prefix}\n${text}` : text;
                      });
                    });
                  }}
                  disabled={isStreaming}
                  className={`grid size-12 shrink-0 place-items-center rounded-xl border transition ${
                    voice.listening
                      ? "animate-pulse border-rose-200 bg-rose-500 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-campus-200 hover:text-campus-700"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-label={voice.listening ? "停止语音输入" : "语音输入故障描述"}
                  title={voice.listening ? "正在聆听，点击停止" : "语音输入"}
                >
                  <Icon name="mic" className="size-5" />
                </button>
              ) : null}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage(input);
                  }
                }}
                rows={2}
                placeholder="描述故障，或直接回答 AI 的追问…"
                className="field-input min-h-12 flex-1 resize-none py-3"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-[rgba(124,108,255,0.18)] text-[#93c5fd] shadow-[0_6px_16px_-10px_rgba(124,108,255,0.6)] transition hover:bg-campus-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                aria-label="发送消息"
              >
                <Icon name="arrow-right" className="size-5" />
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              AI 建议仅供参考，涉及硬件拆装请联系专业维修人员。
            </p>
            {voice.listening ? (
              <p className="mt-1 text-center text-[10px] font-semibold text-rose-500">
                正在聆听，请说出故障现象…
              </p>
            ) : null}
            {voice.error ? (
              <p className="mt-1 text-center text-[10px] text-rose-500">{voice.error}</p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-5">
          <MascotAssistant
            state={assistantState}
            speaking={speaking}
            message={assistantMessage}
            interactive
            canSpeak={Boolean(speakText)}
            onSpeak={() => speak(speakText)}
          />

          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-campus-50 text-campus-700">
                <Icon name="message" className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">多轮问诊</h2>
                <p className="text-[10px] text-slate-400">AI 会主动补齐关键条件</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["先描述现象", "黑屏、蓝屏、异响、断网或无法开机。"],
                ["回答追问", "电源灯、外接屏、报错码等关键条件。"],
                ["查看依据", "诊断卡会展示知识库命中来源。"],
              ].map(([title, text], index) => (
                <div key={title} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-campus-50 text-[11px] font-bold text-campus-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="text-sm font-bold text-slate-900">描述技巧</h2>
            <div className="mt-4 space-y-4">
              {[
                ["发生了什么", "黑屏、蓝屏、异响还是无法联网？"],
                ["何时开始", "更新系统、摔碰或安装软件之后？"],
                ["出现频率", "每次开机都会出现，还是偶发？"],
              ].map(([title, text], index) => (
                <div key={title} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <Icon name="alert" className="size-4" />
              安全提醒
            </div>
            <p className="mt-2 text-xs leading-5 text-amber-800/70">
              如设备出现焦糊味、冒烟或明显进液，请立即断电并停止尝试开机。
            </p>
          </div>

          <a href="/tickets/new" className="secondary-button w-full">
            <Icon name="plus" className="size-4" />
            直接提交维修工单
          </a>
        </aside>
      </div>
    </div>
  );
}
















