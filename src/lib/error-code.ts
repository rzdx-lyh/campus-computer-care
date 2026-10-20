/**
 * 用途：从故障知识库现象关键词生成错误码映射，并在用户输入中识别蓝屏/启动错误码。
 */
import rawKnowledgeBase from "../../knowledge-base/data/knowledge_base.json";

interface KnowledgeEntry {
  故障类型: string;
  现象关键词: string[];
  追问问题: string[];
  可能原因: string[];
  排查步骤: string[];
  紧急程度: string;
}

export interface DetectedErrorCode {
  code: string;
  faultType: string;
  sourceKeyword: string;
}

const CODE_PATTERN = /(0x[0-9a-f]{8}|[A-Z][A-Z0-9_]{7,})/gi;
const KNOWLEDGE_BASE = rawKnowledgeBase as KnowledgeEntry[];

function buildErrorCodeMap(): Map<string, { faultType: string; sourceKeyword: string }> {
  const map = new Map<string, { faultType: string; sourceKeyword: string }>();

  for (const entry of KNOWLEDGE_BASE) {
    for (const keyword of entry.现象关键词) {
      const codes = keyword.match(CODE_PATTERN) ?? [];
      for (const code of codes) {
        map.set(code.toUpperCase(), {
          faultType: entry.故障类型,
          sourceKeyword: keyword,
        });
      }
    }
  }

  return map;
}

const ERROR_CODE_MAP = buildErrorCodeMap();

function inferFaultType(code: string): string {
  if (code.startsWith("0X")) return "蓝屏";
  if (/BOOT|DEVICE|DISK|STORAGE/.test(code)) return "开机异常";
  if (/MEMORY|TDR|VIDEO|KERNEL|SYSTEM|DRIVER/.test(code)) return "蓝屏";
  return "系统错误";
}

export function detectErrorCodes(text: string, limit = 3): DetectedErrorCode[] {
  const matches = text.match(CODE_PATTERN) ?? [];
  const uniqueCodes = [...new Set(matches.map((code) => code.toUpperCase()))].slice(0, limit);

  return uniqueCodes.map((code) => {
    const mapping = ERROR_CODE_MAP.get(code);
    return {
      code,
      faultType: mapping?.faultType ?? inferFaultType(code),
      sourceKeyword: mapping?.sourceKeyword ?? "用户输入错误码",
    };
  });
}

export function formatErrorCodeContext(codes: DetectedErrorCode[]): string {
  if (codes.length === 0) return "";
  return `\n\n【用户粘贴的错误码】\n${codes
    .map((item) => `${item.code} → ${item.faultType}（知识库关键词：${item.sourceKeyword}）`)
    .join("\n")}`;
}
