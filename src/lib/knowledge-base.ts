/**
 * 用途：加载并检索校园电脑故障知识库，为 AI 诊断提供带置信度的本地 RAG 上下文。
 */
import rawKnowledgeBase from "../../knowledge-base/data/knowledge_base.json";

export interface KnowledgeEntry {
  故障类型: string;
  现象关键词: string[];
  追问问题: string[];
  可能原因: string[];
  排查步骤: string[];
  紧急程度: string;
}

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  score: number;
  confidence: number;
  matchedKeywords: string[];
}

const KNOWLEDGE_BASE = rawKnowledgeBase as KnowledgeEntry[];

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function overlapRatio(query: string, candidate: string): number {
  const uniqueCharacters = [...new Set(candidate)];
  if (uniqueCharacters.length === 0) return 0;

  const matched = uniqueCharacters.filter((character) => query.includes(character)).length;
  return matched / uniqueCharacters.length;
}

function scoreEntry(
  entry: KnowledgeEntry,
  query: string,
): { score: number; matchedKeywords: string[] } {
  let score = 0;
  const matchedKeywords: string[] = [];
  const normalizedType = normalize(entry.故障类型);

  if (query.includes(normalizedType)) {
    score += 12;
  } else {
    score += Math.round(overlapRatio(query, normalizedType) * 6);
  }

  for (const keyword of entry.现象关键词) {
    const normalizedKeyword = normalize(keyword);

    if (query.includes(normalizedKeyword)) {
      score += 16;
      matchedKeywords.push(keyword);
      continue;
    }

    const ratio = overlapRatio(query, normalizedKeyword);
    if (ratio >= 0.5) {
      score += Math.round(ratio * 8);
      matchedKeywords.push(keyword);
    }
  }

  return { score, matchedKeywords };
}

function toKnowledgeMatch(entry: KnowledgeEntry, query: string): KnowledgeMatch {
  const { score, matchedKeywords } = scoreEntry(entry, query);

  return {
    entry,
    score,
    confidence: score > 0 ? Math.min(98, Math.max(12, Math.round((score / 42) * 100))) : 0,
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 4),
  };
}

export function retrieveKnowledge(description: string, limit = 2): KnowledgeMatch[] {
  const query = normalize(description);
  if (!query) return [];

  return KNOWLEDGE_BASE.map((entry) => toKnowledgeMatch(entry, query))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findRelevantKnowledge(
  description: string,
  limit = 2,
): KnowledgeEntry[] {
  return retrieveKnowledge(description, limit).map((match) => match.entry);
}

export function formatKnowledgeContext(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) {
    return `
【本地知识库检索结果】
未命中标准故障条目。请依据通用电脑排障原则给出保守建议；无法确定时优先提出追问或建议提交维修工单。
`;
  }

  const context = entries
    .map(
      (entry, index) => `
【知识库参考条目 ${index + 1}】
故障类型：${entry.故障类型}
现象关键词：${entry.现象关键词.join("、")}
建议追问：${entry.追问问题.join("；")}
可能原因：${entry.可能原因.join("；")}
标准排查步骤：${entry.排查步骤.join("；")}
参考紧急程度：${entry.紧急程度}
`,
    )
    .join("\n");

  return `
【本地知识库检索结果】
以下是校园故障知识库中与当前描述最接近的条目，请优先参考，但不要照抄无关内容，也不得违反系统提示词中的安全要求。
${context}
`;
}

export const KNOWLEDGE_BASE_SIZE = KNOWLEDGE_BASE.length;
