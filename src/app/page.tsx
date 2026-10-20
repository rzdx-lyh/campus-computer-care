/**
 * 用途：系统首页，展示欢迎语、当前角色、电脑体检与 AI 诊断快捷入口。
 */
"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useRole } from "@/lib/role-context";

const ROLE_DESCRIPTIONS = {
  student: "遇到电脑问题？先用 AI 快速定位，再提交维修工单。",
  technician: "查看待处理工单，记录维修过程并跟进服务进度。",
  admin: "掌握全校报修数据，了解工单流转与故障分布。",
};

export default function HomePage() {
  const { role, roleLabel } = useRole();

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-campus-700 via-campus-600 to-sky-500 px-6 py-10 text-white shadow-2xl shadow-campus-200/80 sm:px-10 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full border-[50px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-36 right-24 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/10" />

        <div className="relative max-w-3xl animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
            <span className="size-2 animate-pulse-soft rounded-full bg-emerald-300" />
            {roleLabel}模式已启用
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            你好，欢迎来到
            <br className="hidden sm:block" />
            校园电脑管家
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-50 sm:text-base">
            {ROLE_DESCRIPTIONS[role]}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/checkup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-campus-700 shadow-xl shadow-blue-900/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Icon name="activity" className="size-5" />
              开始电脑体检
              <Icon name="arrow-right" className="size-4" />
            </Link>
            <Link
              href="/diagnosis"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Icon name="sparkles" className="size-5" />
              AI 智能诊断
            </Link>
          </div>
        </div>

        <div className="relative mt-10 grid gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
          {[
            ["01", "设备体检", "快速读取浏览器设备信息"],
            ["02", "AI 初诊", "结构化分析故障原因"],
            ["03", "提交报修", "预约时间并跟进工单"],
          ].map(([step, title, description]) => (
            <div key={step} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15 text-xs font-bold">
                {step}
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-blue-100">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="surface-card p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-campus-600">
                QUICK START
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">从哪里开始？</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              约 3 分钟
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/checkup"
              className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:border-campus-200 hover:bg-campus-50/50"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-campus-100 text-campus-700 transition group-hover:bg-campus-600 group-hover:text-white">
                <Icon name="activity" className="size-5" />
              </span>
              <h3 className="mt-5 font-bold text-slate-900">电脑体检</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                查看内存、CPU 核心、网络连接与电池状态，为诊断补充设备信息。
              </p>
              <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-campus-700">
                立即体验 <Icon name="arrow-right" className="size-4" />
              </span>
            </Link>

            <Link
              href="/diagnosis"
              className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:border-campus-200 hover:bg-campus-50/50"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white">
                <Icon name="sparkles" className="size-5" />
              </span>
              <h3 className="mt-5 font-bold text-slate-900">AI 故障诊断</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                用自然语言描述问题，获取可能原因、风险等级和处理建议。
              </p>
              <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-campus-700">
                开始对话 <Icon name="arrow-right" className="size-4" />
              </span>
            </Link>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
            <h2 className="font-bold text-slate-900">服务小贴士</h2>
            <p className="mt-1 text-xs text-slate-400">让报修处理更顺利</p>
          </div>
          <div className="space-y-5 p-6">
            {[
              ["拍照留存", "提交工单前记录报错画面和设备外观。"],
              ["描述现象", "说明故障发生时间、频率和已尝试的方法。"],
              ["预约上门", "选择本人在宿舍的时段，避免错过维修。"],
            ].map(([title, description], index) => (
              <div key={title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-campus-50 text-xs font-bold text-campus-700">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
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
