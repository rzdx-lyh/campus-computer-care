"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { MascotAssistant } from "@/components/mascot-assistant";
import { useRole } from "@/lib/role-context";

const ROLE_DESCRIPTIONS = {
  student: "遇到电脑问题？先用 AI 快速定位，再提交维修工单。",
  technician: "查看待处理工单，记录维修过程并跟进服务进度。",
  admin: "掌握全校报修数据，了解工单流转与故障分布。",
};

const FACTS = [
  ["25", "条本地故障知识", "离线也能查"],
  ["9", "栋宿舍楼", "按楼栋就近派单"],
  ["3", "类使用角色", "学生 / 维修员 / 管理员"],
];

const STEPS = [
  ["01", "设备体检", "读取内存、CPU 核心、网络与电池状态"],
  ["02", "AI 初诊", "描述现象，得到原因、风险与处理建议"],
  ["03", "提交报修", "选时段、跟进度，可就近派给维修员"],
];

export default function HomePage() {
  const { role, roleLabel } = useRole();

  return (
    <div className="space-y-6">
      {/* Hero 控制台 */}
      <section className="relative grid items-stretch gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-[rgba(148,163,184,0.2)] bg-[rgba(24,30,45,0.88)] p-8 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.75)] backdrop-blur-md sm:p-10">
          <span
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.05)_50%,transparent_60%)]"
            aria-hidden
          />
          <div className="relative animate-fade-up">
            <span className="kicker">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-[#7c6cff] shadow-[0_0_10px_rgba(124,108,255,0.9)]" />
              学生自助通道 · AI 陪诊在线
            </span>
            <h1 className="gradient-text mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              故障<span className="text-[#a89bff] drop-shadow-[0_0_18px_rgba(124,108,255,0.45)]">扫描中</span>，
              <br />
              先诊断，再决定是否报修。
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-[15px]">
              {ROLE_DESCRIPTIONS[role]}全流程都在浏览器里完成，设备信息不会上传到服务器。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/checkup" className="primary-button">
                <Icon name="activity" className="size-4" />
                开始电脑体检
              </Link>
              <Link href="/diagnosis" className="secondary-button">
                <Icon name="sparkles" className="size-4" />
                直接描述故障
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-8 border-t border-white/10 pt-6">
              {FACTS.map(([value, label, note]) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">
                    {value}
                    <span className="ml-1 text-sm font-semibold text-[#a89bff]">
                      {label.startsWith("条") ? "条" : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{note}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs text-slate-500">
              当前身份：<span className="font-semibold text-[#a89bff]">{roleLabel}</span>
              ，可在右上角切换。
            </p>
          </div>
        </div>

        {/* 雷达 / 小管家卡 */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-[rgba(148,163,184,0.2)] bg-[rgba(24,30,45,0.88)] p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.75)] backdrop-blur-md">
          <div className="relative size-44">
            <svg viewBox="0 0 190 190" className="size-full">
              <circle cx="95" cy="95" r="90" fill="none" stroke="rgba(148,197,255,0.18)" />
              <circle cx="95" cy="95" r="60" fill="none" stroke="rgba(148,197,255,0.14)" />
              <circle cx="95" cy="95" r="30" fill="none" stroke="rgba(148,197,255,0.12)" />
              <line x1="95" y1="5" x2="95" y2="185" stroke="rgba(148,197,255,0.1)" />
              <line x1="5" y1="95" x2="185" y2="95" stroke="rgba(148,197,255,0.1)" />
              <g className="mascot-bob" style={{ transformOrigin: "95px 95px" }}>
                <path d="M95 95 L95 5 A90 90 0 0 1 158 32 Z" fill="rgba(124,108,255,0.25)" />
              </g>
              <circle cx="60" cy="60" r="4" fill="#5eead4" className="animate-pulse-soft" />
              <circle cx="135" cy="70" r="3.5" fill="#60a5fa" className="animate-pulse-soft" />
              <circle cx="110" cy="140" r="3" fill="#5eead4" className="animate-pulse-soft" />
              <circle cx="95" cy="95" r="4" fill="#e2e8f0" />
            </svg>
          </div>
          <MascotAssistant
            variant="hero"
            state="idle"
            interactive
            message="你好，我是小管家～跟我说说电脑哪里不舒服，我会跟着 AI 的诊断进度一起陪你排查。"
          />
        </div>
      </section>

      {/* 三步流程 */}
      <section className="surface-card p-6 sm:p-8">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a89bff]">HOW IT WORKS</p>
            <h2 className="mt-1 text-xl font-bold text-slate-100">三步走完一次报修</h2>
          </div>
          <span className="rounded-full border border-[rgba(124,108,255,0.3)] bg-[#7c6cff]/10 px-3 py-1 text-xs font-semibold text-[#a89bff]">
            约 3 分钟
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {STEPS.map(([step, title, description]) => (
            <div key={step} className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(30,39,55,0.92)] p-4">
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#8b7cff] to-[#5b4bd6] text-xs font-bold text-emerald-950">
                {step}
              </span>
              <p className="mt-3 text-sm font-bold text-slate-100">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 入口 + 小贴士 */}
      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="surface-card p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a89bff]">QUICK START</p>
              <h2 className="mt-1 text-xl font-bold text-slate-100">从哪里开始？</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-400">
              2 个入口
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/checkup"
              className="group rounded-2xl border border-white/10 p-5 transition hover:-translate-y-1 hover:border-[rgba(124,108,255,0.45)] hover:shadow-[0_0_40px_-16px_rgba(124,108,255,0.4)]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-blue-400/15 text-blue-300 transition group-hover:rotate-3 group-hover:bg-blue-400 group-hover:text-white">
                <Icon name="activity" className="size-5" />
              </span>
              <h3 className="mt-5 font-bold text-slate-100">电脑体检</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                查看内存、CPU 核心、网络连接与电池状态，为诊断补充设备信息。
              </p>
              <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#a89bff]">
                立即体验 <Icon name="arrow-right" className="size-4" />
              </span>
            </Link>

            <Link
              href="/diagnosis"
              className="group rounded-2xl border border-white/10 p-5 transition hover:-translate-y-1 hover:border-[rgba(124,108,255,0.45)] hover:shadow-[0_0_40px_-16px_rgba(124,108,255,0.4)]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-[#7c6cff]/15 text-[#a89bff] transition group-hover:-rotate-3 group-hover:bg-[#7c6cff] group-hover:text-emerald-950">
                <Icon name="sparkles" className="size-5" />
              </span>
              <h3 className="mt-5 font-bold text-slate-100">AI 故障诊断</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                用自然语言描述问题，获取可能原因、风险等级和处理建议。
              </p>
              <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#a89bff]">
                开始对话 <Icon name="arrow-right" className="size-4" />
              </span>
            </Link>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-white/10 bg-gradient-to-r from-[rgba(139,124,255,0.14)] to-[rgba(124,108,255,0.07)] px-6 py-5">
            <h2 className="font-bold text-slate-100">服务小贴士</h2>
            <p className="mt-1 text-xs text-[#a89bff]">让报修处理更顺利</p>
          </div>
          <div className="space-y-5 p-6">
            {[
              ["拍照留存", "提交工单前记录报错画面和设备外观。"],
              ["描述现象", "说明故障发生时间、频率和已尝试的方法。"],
              ["预约上门", "选择本人在宿舍的时段，避免错过维修。"],
            ].map(([title, description], index) => (
              <div key={title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8b7cff] to-[#5b4bd6] text-xs font-bold text-emerald-950">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                </div>
              </div>
            ))}
            <Link href="/tickets/new" className="secondary-button mt-2 w-full">
              <Icon name="plus" className="size-4" />
              直接提交报修
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
