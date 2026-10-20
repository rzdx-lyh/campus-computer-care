/**
 * 用途：在诊断页与工单页之间传递 AI 诊断草稿，实现一键预填报修信息。
 */
import type { DiagnosisResult, TicketPriority } from "@/lib/types";

const DIAGNOSIS_DRAFT_KEY = "campus-computer-care:diagnosis-draft";

export interface DiagnosisTicketDraft {
  title: string;
  description: string;
  deviceType: string;
  priority: TicketPriority;
  createdAt: string;
}

function inferDeviceType(description: string): string {
  if (/台式|主机/.test(description)) return "台式电脑";
  if (/平板|iPad/i.test(description)) return "平板电脑";
  if (/显示器|屏幕/.test(description)) return "显示器";
  return "笔记本电脑";
}

function mapPriority(riskLevel: DiagnosisResult["riskLevel"]): TicketPriority {
  if (riskLevel === "high") return "high";
  if (riskLevel === "medium") return "medium";
  return "low";
}

export function createDiagnosisTicketDraft(
  result: DiagnosisResult,
  originalDescription: string,
): DiagnosisTicketDraft {
  const sourceNames = (result.sources ?? []).map((source) => source.faultType);
  const titleBase = result.summary.replace(/[。！？!?].*$/, "").trim();
  const title = (sourceNames[0] ? `${sourceNames[0]}：${titleBase}` : titleBase).slice(0, 60);

  const descriptionParts = [
    `故障现象：${originalDescription.trim()}`,
    `AI 初诊摘要：${result.summary}`,
    result.likelyCauses.length > 0
      ? `可能原因：\n${result.likelyCauses.map((item) => `- ${item}`).join("\n")}`
      : "",
    result.suggestedActions.length > 0
      ? `建议排查步骤：\n${result.suggestedActions.map((item) => `- ${item}`).join("\n")}`
      : "",
    sourceNames.length > 0 ? `知识库参考：${sourceNames.join("、")}` : "",
    "以上内容由 AI 初步诊断生成，仅供维修参考。",
  ].filter(Boolean);

  return {
    title: title || "电脑故障报修",
    description: descriptionParts.join("\n\n").slice(0, 1000),
    deviceType: inferDeviceType(originalDescription),
    priority: mapPriority(result.riskLevel),
    createdAt: new Date().toISOString(),
  };
}

export function saveDiagnosisTicketDraft(draft: DiagnosisTicketDraft): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(DIAGNOSIS_DRAFT_KEY, JSON.stringify(draft));
}

export function readDiagnosisTicketDraft(): DiagnosisTicketDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(DIAGNOSIS_DRAFT_KEY);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as DiagnosisTicketDraft;
    if (!draft.title || !draft.description) return null;

    const createdAt = Date.parse(draft.createdAt);
    const expired = !Number.isFinite(createdAt) || Date.now() - createdAt > 30 * 60 * 1000;
    if (expired) {
      window.sessionStorage.removeItem(DIAGNOSIS_DRAFT_KEY);
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function clearDiagnosisTicketDraft(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DIAGNOSIS_DRAFT_KEY);
}
