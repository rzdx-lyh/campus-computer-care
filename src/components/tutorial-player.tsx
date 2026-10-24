"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";

export interface TutorialPlayerScene {
  title: string;
  caption: string;
  art: string;
  duration: number;
}

export interface TutorialPlayerVideo {
  id: string;
  title: string;
  durationLabel: string;
  scenes: TutorialPlayerScene[];
  videoSrc?: string;
  /** 哔哩哔哩嵌入播放器地址（优先播放真实视频） */
  videoEmbed?: string;
  /** 哔哩哔哩原始视频页地址 */
  videoPage?: string;
  /** 视频来源标注 */
  videoCredit?: string;
}

/** 场景插画键名 → SVG（浅色舞台，校园蓝紫配色）。 */
function SceneArt({ art }: { art: string }) {
  const common = { fill: "none", stroke: "#2273eb", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (art) {
    case "power-off":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="断电与工具准备">
          <rect x="96" y="34" width="128" height="80" rx="8" {...common} fill="#eff8ff" />
          <rect x="108" y="46" width="104" height="56" rx="4" fill="#dbeefe" />
          <path d="M160 114v14M138 128h44" {...common} />
          <path d="M250 60h22v28h-22z" {...common} fill="#fef3c7" />
          <path d="M250 74h-22" {...common} />
          <path d="M160 20l-10 18h20z" {...common} fill="#f59e0b" stroke="#d97706" />
          <path d="M160 28v6" stroke="#d97706" strokeWidth={2} />
          <circle cx="70" cy="140" r="10" {...common} fill="#fee2e2" stroke="#dc2626" className="animate-pulse-soft" />
          <path d="M70 135v8m0-12h0" stroke="#dc2626" strokeWidth={2.5} />
        </svg>
      );
    case "screwdriver":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="拆卸与工具">
          <g transform="rotate(-24 160 90)">
            <rect x="146" y="30" width="28" height="64" rx="10" fill="#7c6cff" />
            <rect x="152" y="94" width="16" height="52" rx="4" fill="#c7d2fe" />
            <path d="M158 146l4 16 4-16z" fill="#64748b" />
          </g>
          <circle cx="252" cy="52" r="12" {...common} fill="#e2e8f0" />
          <path d="M252 52h0" {...common} />
          <circle cx="276" cy="80" r="10" {...common} fill="#e2e8f0" />
          <circle cx="240" cy="86" r="8" {...common} fill="#e2e8f0" />
          <path d="M60 140h200" stroke="#94a3b8" strokeDasharray="6 6" />
        </svg>
      );
    case "fan-clean":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="清理风道与风扇">
          <circle cx="140" cy="90" r="52" {...common} fill="#eff8ff" />
          <g className="animate-pulse-soft" style={{ transformOrigin: "140px 90px" }}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <path
                key={angle}
                d="M140 90 Q158 44 176 90 Q158 136 140 90z"
                fill="#92cefd"
                opacity={0.85}
                transform={`rotate(${angle} 140 90)`}
              />
            ))}
          </g>
          <circle cx="140" cy="90" r="10" fill="#2273eb" />
          <circle cx="70" cy="52" r="5" fill="#94a3b8" className="animate-pulse-soft" />
          <circle cx="92" cy="36" r="4" fill="#94a3b8" className="animate-pulse-soft" />
          <circle cx="52" cy="76" r="3.5" fill="#94a3b8" className="animate-pulse-soft" />
          <rect x="216" y="60" width="60" height="60" rx="10" {...common} fill="#fef3c7" stroke="#d97706" />
          <path d="M246 72v28m-12-14h24" stroke="#d97706" strokeWidth={2.5} />
          <path d="M216 90h-24m8-8v16m8-8v16" {...common} stroke="#94a3b8" />
        </svg>
      );
    case "thermal-paste":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="涂抹硅脂">
          <rect x="88" y="70" width="144" height="72" rx="8" {...common} fill="#eff8ff" />
          <rect x="120" y="88" width="80" height="36" rx="4" fill="#dbeefe" />
          <rect x="132" y="98" width="56" height="16" rx="2" fill="#94a3b8" />
          <g transform="rotate(38 236 60)">
            <rect x="226" y="18" width="20" height="44" rx="6" fill="#e2e8f0" stroke="#64748b" strokeWidth={2} />
            <path d="M236 62v10m-4-6h8" stroke="#64748b" strokeWidth={2} />
          </g>
          <circle cx="160" cy="106" r="7" fill="#cbd5e1" className="animate-pulse-soft" />
          <path d="M160 106l14-18" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" />
          <text x="160" y="162" textAnchor="middle" fontSize="11" fill="#64748b">米粒大小 · 薄涂均匀</text>
        </svg>
      );
    case "memory-stick":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="内存条安装">
          <rect x="70" y="60" width="180" height="64" rx="6" {...common} fill="#eff8ff" />
          <rect x="84" y="44" width="152" height="20" rx="4" {...common} fill="#7c6cff" stroke="#5b4bd6" />
          {[104, 128, 152, 176, 200, 224].map((x) => (
            <rect key={x} x={x} y={70} width={8} height={44} rx={2} fill="#fbbf24" stroke="#d97706" strokeWidth={1.5} />
          ))}
          <path d="M250 92l24-24m0 24l-24-24" {...common} stroke="#16a34a" />
          <text x="160" y="152" textAnchor="middle" fontSize="11" fill="#64748b">对准防呆缺口垂直下压</text>
        </svg>
      );
    case "bsod":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="蓝屏代码采集">
          <rect x="72" y="26" width="176" height="112" rx="8" {...common} fill="#1e3a8a" stroke="#1d4ed8" />
          <text x="160" y="66" textAnchor="middle" fontSize="15" fill="#e0e7ff" fontWeight="bold">:(</text>
          <text x="160" y="92" textAnchor="middle" fontSize="10" fill="#bfdbfe">0x0000007B</text>
          <text x="160" y="110" textAnchor="middle" fontSize="8" fill="#93c5fd">INACCESSIBLE_BOOT_DEVICE</text>
          <rect x="120" y="146" width="80" height="16" rx="8" fill="#f59e0b" className="animate-pulse-soft" />
          <text x="160" y="158" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">手机拍照留存</text>
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="网络排查">
          <rect x="118" y="86" width="84" height="52" rx="8" {...common} fill="#eff8ff" />
          <circle cx="138" cy="104" r="4" fill="#16a34a" className="animate-pulse-soft" />
          <circle cx="152" cy="104" r="4" fill="#16a34a" className="animate-pulse-soft" />
          <circle cx="166" cy="104" r="4" fill="#f59e0b" className="animate-pulse-soft" />
          <path d="M160 86V64" {...common} />
          <path d="M132 64a34 34 0 0 1 56 0" {...common} />
          <path d="M142 52a20 20 0 0 1 36 0" {...common} />
          <circle cx="160" cy="42" r="4" fill="#2273eb" />
          <path d="M96 138h128" {...common} stroke="#94a3b8" />
        </svg>
      );
    case "checklist":
    default:
      return (
        <svg viewBox="0 0 320 180" className="size-full" role="img" aria-label="验收清单">
          <rect x="92" y="24" width="136" height="132" rx="10" {...common} fill="#ffffff" />
          <rect x="92" y="24" width="136" height="26" rx="10" fill="#2273eb" />
          <text x="160" y="42" textAnchor="middle" fontSize="12" fill="#ffffff" fontWeight="bold">验收 CHECKLIST</text>
          {[
            { y: 68, done: true },
            { y: 96, done: true },
            { y: 124, done: true },
            { y: 148, done: false },
          ].map((item) => (
            <g key={item.y}>
              <rect x="106" y={item.y - 10} width={14} height={14} rx={3} {...common} fill={item.done ? "#16a34a" : "#e2e8f0"} stroke={item.done ? "#15803d" : "#94a3b8"} />
              {item.done ? <path d={`M${109} ${item.y - 3}l3 3 5-6`} stroke="#fff" strokeWidth={2} fill="none" /> : null}
              <rect x="130" y={item.y - 7} width={item.done ? 76 : 58} height={8} rx={4} fill="#e2e8f0" />
            </g>
          ))}
        </svg>
      );
  }
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * 维修员特供视频课件播放器：
 * - 配置 videoEmbed（哔哩哔哩）或 videoSrc（本地 mp4）时播放真实视频；
 * - 真实视频加载失败或无网络时，可一键切换内置 SVG 动画课件（离线可演示）；
 * - 内置动画模式支持播放/暂停、进度条、场景切换与字幕。
 */
export function TutorialPlayer({ video }: { video: TutorialPlayerVideo }) {
  const scenes = useMemo(() => video.scenes, [video.scenes]);
  const totalDuration = useMemo(
    () => scenes.reduce((sum, scene) => sum + scene.duration, 0),
    [scenes],
  );

  const hasExternalVideo = Boolean(video.videoEmbed || video.videoSrc);
  const [stageMode, setStageMode] = useState<"external" | "animation">(
    hasExternalVideo ? "external" : "animation",
  );
  // 切换资料时回到默认模式。
  useEffect(() => {
    setStageMode(hasExternalVideo ? "external" : "animation");
  }, [video.id, hasExternalVideo]);

  const isExternal = stageMode === "external" && hasExternalVideo;

  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);

  // 依据播放进度推导当前场景。
  useEffect(() => {
    let accumulated = 0;
    for (let index = 0; index < scenes.length; index += 1) {
      accumulated += scenes[index].duration;
      if (elapsed < accumulated) {
        setSceneIndex(index);
        return;
      }
    }
    setSceneIndex(scenes.length - 1);
  }, [elapsed, scenes]);

  // 播放时钟。
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        const next = current + 100;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, totalDuration]);

  const goToScene = useCallback(
    (index: number) => {
      const bounded = Math.min(Math.max(index, 0), scenes.length - 1);
      const start = scenes.slice(0, bounded).reduce((sum, scene) => sum + scene.duration, 0);
      setElapsed(start);
      setSceneIndex(bounded);
    },
    [scenes],
  );

  const restart = useCallback(() => {
    setElapsed(0);
    setSceneIndex(0);
    setPlaying(true);
  }, []);

  const scene = scenes[sceneIndex];
  const progress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
  const finished = elapsed >= totalDuration;

  return (
    <div className="overflow-hidden rounded-2xl border border-campus-100 bg-white shadow-sm">
      {/* 舞台 */}
      <div className="relative bg-gradient-to-br from-slate-50 to-campus-50">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-campus-700 shadow-sm">
          {isExternal ? (
            <>
              <span className="size-1.5 rounded-full bg-rose-500" />
              {video.videoEmbed ? "哔哩哔哩视频" : "本地视频"}
            </>
          ) : (
            <>
              <span className={`size-1.5 rounded-full ${playing ? "animate-pulse-soft bg-emerald-500" : "bg-slate-400"}`} />
              {playing ? "播放中" : finished ? "已播完" : "待播放"}
            </>
          )}
        </div>
        <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
          {video.durationLabel}
        </div>

        <div className="mx-auto aspect-[16/9] w-full max-w-lg p-4">
          {isExternal && video.videoEmbed ? (
            <iframe
              src={video.videoEmbed}
              title={video.title}
              allowFullScreen
              className="size-full rounded-xl border-0 bg-black"
            />
          ) : isExternal && video.videoSrc ? (
            <video className="size-full rounded-xl" controls src={video.videoSrc} />
          ) : (
            <div key={`${scene?.art}-${sceneIndex}`} className="size-full animate-fade-up">
              {scene ? <SceneArt art={scene.art} /> : null}
            </div>
          )}
        </div>
      </div>

      {isExternal ? (
        <>
          {/* 真实视频：课程字幕 + 来源与回退入口 */}
          <div className="border-t border-campus-100 bg-campus-50/60 px-4 py-3">
            <p className="text-xs font-bold text-campus-800">课程字幕（对照视频观看）</p>
            <ol className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
              {scenes.map((item, index) => (
                <li key={`${item.title}-${index}`} className="text-[11px] leading-5 text-slate-600">
                  <span className="mr-1.5 font-bold text-campus-700">{index + 1}.</span>
                  <span className="font-semibold text-slate-700">{item.title}</span>
                  <span className="text-slate-400"> — {item.caption}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4 pt-3">
            <div className="min-w-0">
              {video.videoCredit ? (
                <p className="truncate text-[11px] text-slate-400" title={video.videoCredit}>
                  视频来源：{video.videoCredit}
                </p>
              ) : null}
              {video.videoPage ? (
                <a
                  href={video.videoPage}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-campus-600 hover:text-campus-700 hover:underline"
                >
                  去哔哩哔哩观看
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setStageMode("animation")}
              className="ghost-button shrink-0 px-3 py-2 text-xs"
            >
              播放内置动画课件
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 字幕 */}
          <div className="border-t border-campus-100 bg-campus-50/60 px-4 py-3">
            <p className="text-xs font-bold text-campus-800">
              场景 {sceneIndex + 1}/{scenes.length} · {scene?.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{scene?.caption}</p>
          </div>

          {/* 进度 */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2">
              <span className="w-10 text-[10px] font-semibold tabular-nums text-slate-400">
                {formatClock(elapsed)}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-campus-500 to-campus-400 transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
                {scenes.map((item, index) => {
                  const start = scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
                  return (
                    <span
                      key={`${item.title}-${index}`}
                      className="absolute top-0 h-full w-0.5 bg-white/80"
                      style={{ left: `${totalDuration ? (start / totalDuration) * 100 : 0}%` }}
                    />
                  );
                })}
              </div>
              <span className="w-10 text-right text-[10px] font-semibold tabular-nums text-slate-400">
                {formatClock(totalDuration)}
              </span>
            </div>
          </div>

          {/* 控制栏 */}
          <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToScene(sceneIndex - 1)}
                disabled={sceneIndex === 0}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="上一个场景"
              >
                <Icon name="refresh" className="size-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => (finished ? restart() : setPlaying((current) => !current))}
                className="grid size-11 place-items-center rounded-xl bg-campus-600 text-white shadow-sm transition hover:bg-campus-700"
                aria-label={playing ? "暂停" : finished ? "重新播放" : "播放"}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-5 translate-x-0.5" fill="currentColor" aria-hidden>
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => goToScene(sceneIndex + 1)}
                disabled={sceneIndex >= scenes.length - 1}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="下一个场景"
              >
                <Icon name="refresh" className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {hasExternalVideo ? (
                <button
                  type="button"
                  onClick={() => setStageMode("external")}
                  className="ghost-button px-3 py-2 text-xs"
                >
                  回到真实视频
                </button>
              ) : null}
              <button type="button" onClick={restart} className="ghost-button px-3 py-2 text-xs">
                重新播放
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
