import rawKnowledgeBase from "../../knowledge-base/data/knowledge_base.json";
import {
  cosineSimilarity,
  embedText,
  splitIntoChunks,
} from "./vector-core";

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

const KNOWLEDGE_BASE = rawKnowledgeBase as KnowledgeEntry[];

/** 进程内轻量 RAG 向量索引：服务重启后重建，Embedding 逻辑见 vector-core。 */
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
    sourceType: 'knowledge_base' as const,
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
