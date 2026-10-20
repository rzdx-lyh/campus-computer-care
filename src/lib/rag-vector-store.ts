/**
 * 用途：提供轻量级本地 RAG 向量库，使用字符 n-gram 哈希向量和余弦相似度检索知识块。
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

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  sourceType: 'knowledge_base' | 'web';
  url?: string;
  siteName?: string;
  publishedAt?: string;
}

export interface RagSearchResult {
  document: RagDocument;
  chunk: string;
  score: number;
}

interface StoredChunk {
  document: RagDocument;
  text: string;
  vector: Float32Array;
}

const VECTOR_DIMENSION = 384;
const KNOWLEDGE_BASE = rawKnowledgeBase as KnowledgeEntry[];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 5000);
}

function hashFeature(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function embedText(text: string): Float32Array {
  const normalized = normalizeText(text);
  const vector = new Float32Array(VECTOR_DIMENSION);
  if (!normalized) return vector;

  const frequencies = new Map<string, number>();
  for (let index = 0; index < normalized.length; index += 1) {
    const unigram = normalized[index];
    frequencies.set(unigram, (frequencies.get(unigram) ?? 0) + 1);

    if (index < normalized.length - 1) {
      const bigram = normalized.slice(index, index + 2);
      frequencies.set(bigram, (frequencies.get(bigram) ?? 0) + 1.35);
    }

    if (index < normalized.length - 2) {
      const trigram = normalized.slice(index, index + 3);
      frequencies.set(trigram, (frequencies.get(trigram) ?? 0) + 0.8);
    }
  }

  for (const [feature, frequency] of frequencies) {
    const index = hashFeature(feature) % VECTOR_DIMENSION;
    const sign = (hashFeature(`sign:${feature}`) & 1) === 0 ? 1 : -1;
    vector[index] += sign * (1 + Math.log(frequency));
  }

  let magnitude = 0;
  for (const value of vector) magnitude += value * value;
  magnitude = Math.sqrt(magnitude);
  if (magnitude > 0) {
    for (let index = 0; index < vector.length; index += 1) {
      vector[index] /= magnitude;
    }
  }

  return vector;
}

function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  let score = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    score += left[index] * right[index];
  }
  return score;
}

function splitIntoChunks(text: string, maxLength = 700, overlap = 100): string[] {
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}|(?<=[。！？!?])\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length <= maxLength) {
      current += `${current ? '\n' : ''}${paragraph}`;
      continue;
    }

    if (current) chunks.push(current);
    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }

    for (let start = 0; start < paragraph.length; start += maxLength - overlap) {
      chunks.push(paragraph.slice(start, start + maxLength));
    }
    current = '';
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

export class RagVectorStore {
  private chunks: StoredChunk[] = [];
  private documentIds = new Set<string>();

  addDocuments(documents: RagDocument[]): number {
    let added = 0;

    for (const document of documents) {
      if (this.documentIds.has(document.id)) continue;
      this.documentIds.add(document.id);

      const chunks = splitIntoChunks(`${document.title}\n${document.content}`);
      for (const [index, chunk] of chunks.entries()) {
        this.chunks.push({
          document,
          text: chunk,
          vector: embedText(chunk),
        });
        added += 1;
      }
    }

    return added;
  }

  search(query: string, limit = 5): RagSearchResult[] {
    const queryVector = embedText(query);
    const results: RagSearchResult[] = [];

    for (const chunk of this.chunks) {
      const score = cosineSimilarity(queryVector, chunk.vector);
      if (score > 0.04) {
        results.push({
          document: chunk.document,
          chunk: chunk.text,
          score,
        });
      }
    }

    return results
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  get size(): number {
    return this.chunks.length;
  }
}

function buildKnowledgeDocuments(): RagDocument[] {
  return KNOWLEDGE_BASE.map((entry, index) => ({
    id: `knowledge-${index + 1}`,
    title: `${entry.故障类型}｜${entry.现象关键词.slice(0, 3).join('、')}`,
    sourceType: 'knowledge_base',
    content: [
      `故障类型：${entry.故障类型}`,
      `现象关键词：${entry.现象关键词.join('、')}`,
      `追问问题：${entry.追问问题.join('；')}`,
      `可能原因：${entry.可能原因.join('；')}`,
      `排查步骤：${entry.排查步骤.join('；')}`,
      `紧急程度：${entry.紧急程度}`,
    ].join('\n'),
  }));
}

const globalForRag = globalThis as typeof globalThis & {
  __campusRagVectorStore?: RagVectorStore;
};

export function getRagVectorStore(): RagVectorStore {
  if (!globalForRag.__campusRagVectorStore) {
    const store = new RagVectorStore();
    store.addDocuments(buildKnowledgeDocuments());
    globalForRag.__campusRagVectorStore = store;
  }

  return globalForRag.__campusRagVectorStore;
}

export function formatRagResults(results: RagSearchResult[]): string {
  return results
    .map(
      (result, index) => `
【向量检索片段 ${index + 1}｜${result.document.sourceType === 'web' ? '联网资料' : '本地知识库'}】
标题：${result.document.title}
${result.document.url ? `来源：${result.document.url}` : ''}
相关度：${Math.round(result.score * 100)}%
内容：
${result.chunk}
`,
    )
    .join('\n');
}
