/**
 * 用途：在浏览器中把诊断结果绘制为动画并用 MediaRecorder 生成可下载的演示视频。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import type { DiagnosisResult } from "@/lib/types";

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
const TOTAL_DURATION = 14_000;

interface DemoVideoRecorderProps {
  result: DiagnosisResult;
  className?: string;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
): number {
  const characters = Array.from(text);
  let line = "";
  let lineIndex = 0;

  for (const character of characters) {
    const testLine = line + character;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = character;
      lineIndex += 1;
      if (lineIndex >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }

  if (lineIndex < maxLines) {
    context.fillText(line, x, y + lineIndex * lineHeight);
    lineIndex += 1;
  }

  return lineIndex;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawBackground(context: CanvasRenderingContext2D): void {
  const gradient = context.createLinearGradient(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  gradient.addColorStop(0, "#0f2f73");
  gradient.addColorStop(0.55, "#1a5dd8");
  gradient.addColorStop(1, "#38bdf8");
  context.fillStyle = gradient;
  context.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  context.globalAlpha = 0.12;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(1110, 80, 240, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(1040, 660, 190, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
}

function drawHeader(context: CanvasRenderingContext2D, slideLabel: string): void {
  context.fillStyle = "rgba(255,255,255,0.82)";
  context.font = '700 26px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.fillText("校园电脑管家 · AI 诊断演示", 72, 72);

  context.fillStyle = "rgba(255,255,255,0.7)";
  context.font = '500 18px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.fillText(slideLabel, 72, 108);
}

function drawPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.fillStyle = "rgba(255,255,255,0.94)";
  context.shadowColor = "rgba(15,23,42,0.28)";
  context.shadowBlur = 34;
  context.shadowOffsetY = 18;
  roundRect(context, x, y, width, height, 30);
  context.fill();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
}

function drawBulletList(
  context: CanvasRenderingContext2D,
  title: string,
  items: string[],
  accent: string,
): void {
  drawPanel(context, 72, 146, 1136, 500);
  context.fillStyle = "#0f172a";
  context.font = '700 38px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.fillText(title, 122, 218);

  context.font = '500 25px "Microsoft YaHei", "PingFang SC", sans-serif';
  let y = 282;
  const visibleItems = items.slice(0, 4);
  for (const item of visibleItems) {
    context.fillStyle = accent;
    context.beginPath();
    context.arc(135, y - 8, 10, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#334155";
    const lines = wrapText(context, item, 168, y, 940, 34, 2);
    y += Math.max(1, lines) * 42 + 24;
  }
}

function drawFrame(
  context: CanvasRenderingContext2D,
  result: DiagnosisResult,
  elapsed: number,
): void {
  context.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  drawBackground(context);

  if (elapsed < 3000) {
    drawHeader(context, "01 · 故障摘要");
    drawPanel(context, 72, 146, 1136, 500);
    context.fillStyle = "#2273eb";
    context.font = '700 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText("AI 诊断摘要", 122, 214);
    context.fillStyle = "#0f172a";
    context.font = '700 40px "Microsoft YaHei", "PingFang SC", sans-serif';
    wrapText(context, result.summary, 122, 290, 1010, 58, 4);
    context.fillStyle = "#64748b";
    context.font = '500 20px "Microsoft YaHei", "PingFang SC", sans-serif';
    const riskLabel =
      result.riskLevel === "high" ? "高" : result.riskLevel === "medium" ? "中" : "低";
    context.fillText(`风险等级：${riskLabel}`, 122, 584);
  } else if (elapsed < 6500) {
    drawHeader(context, "02 · 可能原因");
    drawBulletList(context, "AI 推测的可能原因", result.likelyCauses, "#f59e0b");
  } else if (elapsed < 10_500) {
    drawHeader(context, "03 · 操作建议");
    drawBulletList(context, "建议按顺序完成排查", result.suggestedActions, "#10b981");
  } else {
    drawHeader(context, "04 · 处理建议");
    drawPanel(context, 72, 146, 1136, 500);
    context.fillStyle = "#2273eb";
    context.font = '700 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText("下一步", 122, 214);
    context.fillStyle = "#0f172a";
    context.font = '700 40px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(result.needRepair ? "建议提交维修工单" : "可先自助排查", 122, 286);
    context.fillStyle = "#475569";
    context.font = '500 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(
      result.needRepair
        ? "请补充宿舍与预约时间，维修员会继续跟进。"
        : "若排查后仍异常，可再提交维修工单。",
      122,
      342,
    );

    const sources = (result.sources ?? []).slice(0, 2);
    context.fillStyle = "#64748b";
    context.font = '500 19px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText("参考来源", 122, 418);
    sources.forEach((source, index) => {
      context.fillStyle = "#334155";
      context.font = '500 20px "Microsoft YaHei", "PingFang SC", sans-serif';
      wrapText(
        context,
        `${index + 1}. ${source.kind === "web" ? source.title ?? source.faultType : source.faultType}`,
        140,
        462 + index * 44,
        960,
        30,
        1,
      );
    });
  }

  context.fillStyle = "rgba(255,255,255,0.7)";
  context.font = '500 17px "Microsoft YaHei", "PingFang SC", sans-serif';
  context.fillText("本视频由 AI 根据本次诊断自动生成 · 仅供操作参考", 72, 686);
}

export function DemoVideoRecorder({ result, className }: DemoVideoRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoUrlRef = useRef("");
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setIsOpen(true);
      setError("当前浏览器不支持生成视频，请使用最新版 Chrome 或 Edge。");
      return;
    }

    setIsOpen(true);
    setIsGenerating(true);
    setProgress(0);
    setError("");

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = "";
      setVideoUrl("");
    }

    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("无法创建画布上下文");

      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      drawFrame(context, result, 0);

      const stream = canvas.captureStream(30);
      const mimeCandidates = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      const recording = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error("视频编码失败"));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
      });

      recorder.start(200);
      const startedAt = performance.now();

      await new Promise<void>((resolve) => {
        const animate = (now: number) => {
          const elapsed = Math.min(now - startedAt, TOTAL_DURATION);
          drawFrame(context, result, elapsed);
          setProgress(Math.round((elapsed / TOTAL_DURATION) * 100));

          if (elapsed >= TOTAL_DURATION) {
            resolve();
            return;
          }
          requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      });

      recorder.stop();
      const blob = await recording;
      stream.getTracks().forEach((track) => track.stop());

      const url = URL.createObjectURL(blob);
      videoUrlRef.current = url;
      setVideoUrl(url);
    } catch (generationError) {
      console.error("演示视频生成失败:", generationError);
      setError("演示视频生成失败，请重试或更换浏览器。");
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  return (
    <>
      <button type="button" onClick={() => void generateVideo()} className={className}>
        <Icon name="activity" className="size-4" />
        生成演示视频
      </button>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-white/20 bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-campus-600">
                  AI DEMO VIDEO
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">本次诊断演示视频</h2>
                <p className="mt-1 text-xs text-slate-400">
                  浏览器端自动生成 WebM 视频，约 14 秒。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
                className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
                aria-label="关闭视频窗口"
              >
                ×
              </button>
            </div>

            {isGenerating ? (
              <div className="mt-6 rounded-2xl border border-campus-100 bg-campus-50/60 p-8 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-campus-600 text-white">
                  <Icon name="activity" className="size-6 animate-pulse" />
                </span>
                <p className="mt-4 text-sm font-bold text-slate-800">正在生成演示视频…</p>
                <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-campus-500 to-sky-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">{progress}%</p>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {videoUrl && !isGenerating ? (
              <div className="mt-6">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full rounded-2xl bg-slate-950 shadow-lg"
                />
                <a
                  href={videoUrl}
                  download="campus-pc-diagnosis-demo.webm"
                  className="primary-button mt-4 w-full"
                >
                  <Icon name="arrow-right" className="size-4" />
                  下载演示视频（WebM）
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

