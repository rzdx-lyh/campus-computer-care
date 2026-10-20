/**
 * 用途：把一次 AI 诊断导出为 Markdown 报告，并触发浏览器下载。
 */
import type { DiagnosisResult } from "@/lib/types";

const RISK_LABELS: Record<DiagnosisResult["riskLevel"], string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

export interface DiagnosisReportOptions {
  description?: string;
  roleLabel?: string;
  createdAt?: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildDiagnosisReport(
  result: DiagnosisResult,
  options: DiagnosisReportOptions = {},
): string {
  const createdAt = options.createdAt ?? new Date();
  const sources = result.sources ?? [];
  const lines: string[] = [
    "# 校园电脑管家 · AI 诊断报告",
    "",
    `- 生成时间：${formatTime(createdAt)}`,
    `- 使用角色：${options.roleLabel ?? "学生"}`,
    `- 风险等级：${RISK_LABELS[result.riskLevel]}`,
    `- 是否需要报修：${result.needRepair ? "是" : "否"}`,
    "",
    "## 故障摘要",
    result.summary,
    "",
    "## 用户描述",
    options.description?.trim() || "（未提供）",
    "",
    "## 可能原因",
    ...(result.likelyCauses.length > 0
      ? result.likelyCauses.map((cause, index) => `${index + 1}. ${cause}`)
      : ["暂未定位到明确原因。"]),
    "",
    "## 建议排查步骤",
    ...(result.suggestedActions.length > 0
      ? result.suggestedActions.map((action, index) => `${index + 1}. ${action}`)
      : ["请补充故障信息后重新诊断。"]),
  ];

  if (result.followUpQuestions && result.followUpQuestions.length > 0) {
    lines.push("", "## 还需要补充的信息", ...result.followUpQuestions.map((item) => `- ${item}`));
  }

  if (sources.length > 0) {
    lines.push("", "## 诊断依据");
    sources.forEach((source, index) => {
      const label =
        source.kind === "web"
          ? `联网资料 · ${source.siteName ?? source.faultType}`
          : `知识库 · ${source.faultType}`;
      lines.push(
        `${index + 1}. ${label}（匹配度 ${source.confidence}%）`,
        source.url ? `   - 链接：${source.url}` : "",
        source.snippet ? `   - 摘要：${source.snippet}` : "",
      );
    });
  }

  lines.push(
    "",
    "---",
    "> 本报告由 AI 辅助生成，仅供维修参考；涉及硬件拆装、进液或数据风险时，请先断电并联系专业维修人员。",
  );

  return lines.filter((line) => line !== "").join("\n");
}

export function downloadDiagnosisReport(
  result: DiagnosisResult,
  options: DiagnosisReportOptions = {},
): void {
  if (typeof window === "undefined") return;

  const content = buildDiagnosisReport(result, options);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href = url;
  link.download = `校园电脑管家-诊断报告-${stamp}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
