"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import type { DeviceMetric } from "@/lib/types";

interface BatteryLike {
  level: number;
  charging: boolean;
}

interface ConnectionLike {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface NavigatorWithDeviceInfo extends Navigator {
  deviceMemory?: number;
  connection?: ConnectionLike;
  getBattery?: () => Promise<BatteryLike>;
}

const INITIAL_METRICS: DeviceMetric[] = [
  {
    id: "memory",
    label: "设备内存",
    value: "读取中…",
    description: "浏览器可访问的近似内存容量",
    supported: true,
  },
  {
    id: "cpu",
    label: "CPU 逻辑核心",
    value: "读取中…",
    description: "设备报告的硬件并发线程数",
    supported: true,
  },
  {
    id: "network",
    label: "网络连接",
    value: "读取中…",
    description: "当前网络类型、下行速度与延迟",
    supported: true,
  },
  {
    id: "battery",
    label: "电池状态",
    value: "读取中…",
    description: "当前电量与充电状态",
    supported: true,
  },
];

const METRIC_ICONS: Record<string, IconName> = {
  memory: "memory",
  cpu: "cpu",
  network: "wifi",
  battery: "battery",
};

export default function CheckupPage() {
  const [metrics, setMetrics] = useState<DeviceMetric[]>(INITIAL_METRICS);
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState("尚未完成检测");
  const [score, setScore] = useState<number | null>(null);

  const collectDeviceInfo = async () => {
    setScanning(true);
    setScore(null);
    setMetrics(INITIAL_METRICS.map((metric) => ({ ...metric })));

    const nav = navigator as NavigatorWithDeviceInfo;
    const nextMetrics: DeviceMetric[] = [];

    nextMetrics.push({
      id: "memory",
      label: "设备内存",
      value: nav.deviceMemory ? `约 ${nav.deviceMemory} GB` : "浏览器未开放",
      description: nav.deviceMemory
        ? "由 navigator.deviceMemory 提供的近似值"
        : "Firefox / Safari 等浏览器可能不提供该字段",
      supported: Boolean(nav.deviceMemory),
    });

    nextMetrics.push({
      id: "cpu",
      label: "CPU 逻辑核心",
      value: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} 核` : "浏览器未开放",
      description: nav.hardwareConcurrency
        ? "由 navigator.hardwareConcurrency 读取"
        : "当前浏览器未返回可用核心数",
      supported: Boolean(nav.hardwareConcurrency),
    });

    const connection = nav.connection;
    nextMetrics.push({
      id: "network",
      label: "网络连接",
      value: connection
        ? `${connection.effectiveType?.toUpperCase() ?? "未知类型"}${connection.downlink ? ` · ${connection.downlink} Mbps` : ""}`
        : "浏览器未开放",
      description: connection
        ? `估算往返延迟 ${connection.rtt ?? "未知"} ms`
        : "网络信息 API 在当前浏览器中不可用",
      supported: Boolean(connection),
    });

    let batteryLevel: number | null = null;
    let charging = false;
    let batterySupported = false;
    let batteryMetric: DeviceMetric = {
      id: "battery",
      label: "电池状态",
      value: "浏览器未开放",
      description: "当前设备或浏览器无法读取电池信息",
      supported: false,
    };

    if (nav.getBattery) {
      try {
        const battery = await nav.getBattery();
        batterySupported = true;
        batteryLevel = battery.level;
        charging = battery.charging;
        batteryMetric = {
          id: "battery",
          label: "电池状态",
          value: `${Math.round(battery.level * 100)}%${battery.charging ? " · 充电中" : ""}`,
          description: battery.charging ? "设备已连接电源" : "设备当前未处于充电状态",
          supported: true,
        };
      } catch {
        batteryMetric.description = "电池信息读取需要浏览器授权或被设备策略禁用";
      }
    }

    nextMetrics.push(batteryMetric);
    setMetrics(nextMetrics);
    setLastScan(new Date().toLocaleString("zh-CN", { hour12: false }));
    setScanning(false);

    const netType = nav.connection?.effectiveType;
    let health = 100;
    if (!navigator.onLine) health -= 20;
    if (netType === "slow-2g" || netType === "2g") health -= 20;
    else if (netType === "3g") health -= 8;
    if (typeof nav.hardwareConcurrency === "number") {
      if (nav.hardwareConcurrency < 4) health -= 12;
      else if (nav.hardwareConcurrency < 8) health -= 5;
    }
    if (typeof nav.deviceMemory === "number") {
      if (nav.deviceMemory < 4) health -= 12;
      else if (nav.deviceMemory < 8) health -= 5;
    }
    if (batterySupported && batteryLevel !== null && !charging && batteryLevel < 0.2) health -= 15;
    else if (batterySupported && batteryLevel !== null && !charging && batteryLevel < 0.4) health -= 8;
    setScore(Math.max(0, Math.min(100, Math.round(health))));
  };

  useEffect(() => {
    void collectDeviceInfo();
    // 仅在页面首次进入时执行一次设备检测。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supportedCount = metrics.filter((metric) => metric.supported).length;

  const RING_C = 2 * Math.PI * 60;
  const scoreColor =
    score === null ? "#64748B" : score >= 80 ? "#7C6CFF" : score >= 60 ? "#8B7CFF" : "#F59E0B";
  const scoreLabel =
    score === null ? "检测中" : score >= 80 ? "状态优秀" : score >= 60 ? "运行良好" : "建议关注";

  return (
    <div>
      <PageHeader
        eyebrow="DEVICE CHECKUP"
        title="电脑体检"
        description="快速了解当前浏览器和设备的公开能力。所有数据仅在本地读取，不会上传。"
        action={
          <button
            type="button"
            onClick={() => void collectDeviceInfo()}
            disabled={scanning}
            className="secondary-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="refresh" className={`size-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "检测中…" : "重新检测"}
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        <section className="surface-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">设备信息概览</h2>
              <p className="mt-1 text-xs text-slate-400">上次检测：{lastScan}</p>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              浏览器端安全检测
            </span>
          </div>

          <div className="hidden grid-cols-[1.1fr_1fr_1.4fr_5.5rem] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid">
            <span>检测项目</span>
            <span>读取结果</span>
            <span>说明</span>
            <span className="text-right">状态</span>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="grid gap-4 px-5 py-5 transition hover:bg-slate-50/60 sm:px-6 md:grid-cols-[1.1fr_1fr_1.4fr_5.5rem] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-campus-50 text-campus-600">
                    <Icon name={METRIC_ICONS[metric.id]} className="size-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{metric.label}</span>
                </div>
                <p className="pl-[3.25rem] text-sm font-bold text-slate-900 md:pl-0">
                  {scanning ? (
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-slate-200" />
                  ) : (
                    metric.value
                  )}
                </p>
                <p className="pl-[3.25rem] text-xs leading-5 text-slate-500 md:pl-0">
                  {metric.description}
                </p>
                <div className="pl-[3.25rem] md:pl-0 md:text-right">
                  {!scanning && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        metric.supported
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon
                        name={metric.supported ? "check" : "alert"}
                        className="size-3"
                      />
                      {metric.supported ? "已读取" : "不支持"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-xs leading-5 text-slate-400 sm:px-6">
            部分指标受浏览器隐私策略限制，显示“不支持”并不代表设备存在故障。
          </div>
        </section>

        <aside className="space-y-5">
          <div className="surface-card flex flex-col items-center p-6">
            <span className="self-start text-xs font-semibold text-slate-400">综合健康分</span>
            <div className="my-3">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="60" stroke="rgba(148,163,184,0.18)" strokeWidth="12" fill="none" />
                <circle
                  cx="75"
                  cy="75"
                  r="60"
                  stroke={scoreColor}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  style={{
                    strokeDashoffset: score === null ? RING_C : RING_C * (1 - score / 100),
                    transition: "stroke-dashoffset 1s ease",
                  }}
                  transform="rotate(-90 75 75)"
                />
                <text x="75" y="71" textAnchor="middle" fontSize="38" fontWeight="700" fill="#F1F5F9">
                  {score === null ? "--" : score}
                </text>
                <text x="75" y="96" textAnchor="middle" fontSize="13" fill="#9CA9BA">
                  {scoreLabel}
                </text>
              </svg>
            </div>
            <p className="text-center text-xs leading-5 text-slate-500">
              依据在线、电量、网络、CPU 与内存实时估算
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8b7cff] to-[#5b6cff] transition-all duration-700"
                style={{ width: `${score === null ? 0 : score}%` }}
              />
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-[rgba(124,108,255,0.18)] text-[#93c5fd] shadow-[0_6px_16px_-10px_rgba(124,108,255,0.6)]">
                <Icon name="activity" className="size-5" />
              </span>
              <span className="text-xs font-semibold text-slate-400">检测完成度</span>
            </div>
            <p className="mt-5 text-4xl font-bold tracking-tight text-slate-900">
              {scanning ? "--" : `${supportedCount}/4`}
            </p>
            <p className="mt-1 text-sm text-slate-500">项信息可被当前浏览器读取</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8b7cff] to-[#5b6cff] transition-all duration-700"
                style={{ width: `${scanning ? 8 : (supportedCount / 4) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-campus-100 bg-campus-50/70 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-campus-800">
              <Icon name="shield" className="size-4" />
              隐私说明
            </div>
            <p className="mt-2 text-xs leading-6 text-campus-800/70">
              体检页不会获取文件名、浏览记录或精确位置。设备数据只用于生成当前页面的检测结果。
            </p>
          </div>

          <div className="surface-card p-5">
            <p className="text-sm font-bold text-slate-800">发现异常？</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              体检结果仅供参考。如设备已经影响使用，建议继续描述故障并获得处理建议。
            </p>
            <a href="/diagnosis" className="ghost-button mt-3 w-full">
              前往 AI 诊断
              <Icon name="arrow-right" className="size-4" />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
