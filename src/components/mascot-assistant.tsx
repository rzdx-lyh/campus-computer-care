"use client";

import { useEffect, useRef, useState } from "react";

/** 数字人状态：与 AI 诊断过程一一对应 */
export type AssistantState = "idle" | "thinking" | "success" | "warning";

/** 点击吉祥物时的俏皮话（与 AI 无关的本地文案） */
const POKE_LINES = [
  "电脑蓝屏？先深呼吸三次，再跟我说～",
  "别急着砸键盘，那是钱，交给我来查。",
  "重启解决 80% 的问题，剩下 20% 交给我。",
  "风扇狂转？它可能只是在替你紧张。",
  "C 盘红了不算绝症，我帮你瘦身。",
  "报错看不懂？复制给我，我翻译成人话。",
  "我 24 小时在线，比宿管阿姨还靠谱。",
];

interface MascotAssistantProps {
  /** 当前状态，通常由 AI 是否流式输出、结果风险等级推导 */
  state: AssistantState;
  /** 是否正在语音播报（朗读 AI 回答时为 true，嘴部会动） */
  speaking?: boolean;
  /** 气泡文案，建议传入 AI 的真实输出摘要 */
  message: string;
  /** 显示样式：hero 用于首页淡蓝区，card 用于浅色卡片区 */
  variant?: "hero" | "card";
  /** 是否允许点击吉祥物闲聊 */
  interactive?: boolean;
  /** 传入后显示「读给我听」，用于朗读 AI 最新回答 */
  onSpeak?: () => void;
  /** 是否已有可朗读内容 */
  canSpeak?: boolean;
}

const STATE_META: Record<AssistantState, { label: string; color: string }> = {
  idle: { label: "待命中", color: "#2273eb" },
  thinking: { label: "分析中", color: "#3892f6" },
  success: { label: "已定位", color: "#10b981" },
  warning: { label: "建议报修", color: "#f59e0b" },
};

export function MascotAssistant({
  state,
  speaking = false,
  message,
  variant = "card",
  interactive = false,
  onSpeak,
  canSpeak = false,
}: MascotAssistantProps) {
  const [bubble, setBubble] = useState(message);
  const [reaction, setReaction] = useState<AssistantState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI 侧文案更新时同步气泡（例如拿到新的诊断结果）
  useEffect(() => {
    setBubble(message);
    setReaction(null);
  }, [message]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const activeState = reaction ?? state;
  const meta = STATE_META[activeState];
  const thinking = activeState === "thinking";
  const hero = variant === "hero";

  const handlePoke = () => {
    if (!interactive) return;
    const line = POKE_LINES[Math.floor(Math.random() * POKE_LINES.length)];
    setBubble(line);
    setReaction(Math.random() > 0.5 ? "success" : "thinking");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setReaction(null);
      setBubble(message);
    }, 3200);
  };

  const bobClass = thinking || activeState === "idle" ? "mascot-bob" : "";

  const mascotSvg = (
    <svg viewBox="0 0 120 120" className="size-20 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="mascotBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eb2fa" />
          <stop offset="100%" stopColor="#1a5dd8" />
        </linearGradient>
      </defs>

      {/* 天线：思考时闪烁 */}
      <line x1="60" y1="26" x2="60" y2="14" stroke="#1e458a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="11" r="5" fill={meta.color}>
        {thinking ? (
          <animate attributeName="opacity" values="1;0.25;1" dur="0.9s" repeatCount="indefinite" />
        ) : null}
      </circle>

      {/* 身体 */}
      <circle cx="60" cy="66" r="40" fill="url(#mascotBody)" />
      <circle cx="60" cy="62" r="30" fill="#ffffff" />

      {/* 腮红：定位成功时 */}
      {activeState === "success" ? (
        <>
          <circle cx="42" cy="70" r="5" fill="#fbcfe8" opacity="0.9" />
          <circle cx="78" cy="70" r="5" fill="#fbcfe8" opacity="0.9" />
        </>
      ) : null}

      {/* 眼睛：默认会眨眼 */}
      {activeState === "success" ? (
        <>
          <path d="M44 58 q6 -8 12 0" stroke="#1e458a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M64 58 q6 -8 12 0" stroke="#1e458a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : activeState === "warning" ? (
        <>
          <line x1="44" y1="54" x2="54" y2="58" stroke="#1e458a" strokeWidth="3" strokeLinecap="round" />
          <line x1="76" y1="54" x2="66" y2="58" stroke="#1e458a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="49" cy="62" r="3.5" fill="#1e458a" />
          <circle cx="71" cy="62" r="3.5" fill="#1e458a" />
        </>
      ) : (
        <>
          <ellipse cx="49" cy="60" rx="4" ry="4" fill="#1e458a">
            <animate attributeName="ry" values="4;4;0.4;4;4" keyTimes="0;0.82;0.86;0.9;1" dur="4.2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="71" cy="60" rx="4" ry="4" fill="#1e458a">
            <animate attributeName="ry" values="4;4;0.4;4;4" keyTimes="0;0.82;0.86;0.9;1" dur="4.2s" repeatCount="indefinite" />
          </ellipse>
        </>
      )}

      {/* 嘴：朗读时动嘴 */}
      {speaking ? (
        <ellipse cx="60" cy="76" rx="7" ry="5" fill="#1e458a">
          <animate attributeName="ry" values="3;9;3" dur="0.45s" repeatCount="indefinite" />
        </ellipse>
      ) : activeState === "success" ? (
        <path d="M50 74 q10 12 20 0" stroke="#1e458a" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : activeState === "warning" ? (
        <circle cx="60" cy="77" r="3.5" fill="#1e458a" />
      ) : activeState === "thinking" ? (
        <path d="M53 78 q7 -6 14 0" stroke="#1e458a" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M52 76 q8 7 16 0" stroke="#1e458a" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}

      {/* 思考气泡 */}
      {thinking ? (
        <g fill={meta.color}>
          <circle cx="92" cy="40" r="3" />
          <circle cx="100" cy="32" r="2.4" />
          <circle cx="106" cy="26" r="1.8" />
        </g>
      ) : null}

      {/* 状态徽标 */}
      {activeState === "success" ? (
        <g transform="translate(92 92)">
          <circle r="11" fill="#10b981" />
          <path d="M-4 0 l3 3 l5 -6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
      {activeState === "warning" ? (
        <g transform="translate(92 92)">
          <circle r="11" fill="#f59e0b" />
          <path d="M0 -5 v6 M0 4 v0.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );

  const shellClass = hero
    ? "rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-soft backdrop-blur-xl"
    : "surface-card overflow-hidden";

  return (
    <section className={shellClass}>
      {hero ? null : (
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-[#7c6cff]/10 text-[#a89bff]">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21a7 7 0 0 1 14 0" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-100">小管家 · AI 陪诊</h2>
            <p className="text-[10px] text-slate-400">跟着 AI 的诊断进度一起动</p>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-4 p-5 ${hero ? "" : "bg-gradient-to-b from-blue-400/[0.06] to-transparent"}`}>
        <div
          className={`${bobClass} ${interactive ? "cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95" : ""}`}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          title={interactive ? "点我聊聊" : undefined}
          onClick={interactive ? handlePoke : undefined}
          onKeyDown={
            interactive
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handlePoke();
                  }
                }
              : undefined
          }
        >
          {mascotSvg}
        </div>

        <div className="min-w-0 flex-1">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            {reaction ? "陪你聊聊" : meta.label}
          </span>
          <p className="mt-2 text-sm leading-6 text-slate-300">{bubble}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {speaking ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#a89bff]">
                <span className="size-1.5 animate-pulse rounded-full bg-[#7c6cff]" /> 正在朗读 AI 结论
              </span>
            ) : null}
            {onSpeak && canSpeak ? (
              <button type="button" onClick={onSpeak} className="text-[11px] font-bold text-[#a89bff] underline decoration-[rgba(124,108,255,0.45)] underline-offset-4 hover:decoration-[#8b7cff]">
                读给我听
              </button>
            ) : null}
            {interactive ? (
              <span className="text-[10px] text-slate-500">点一下小管家，它会回你一句</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
