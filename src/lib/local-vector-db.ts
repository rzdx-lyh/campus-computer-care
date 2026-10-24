/**
 * 用途：本地持久化向量库（服务端专用，不随客户端打包）。
 * 说明：文档与分片向量以 JSON 形式落盘到 data/vector-db.json，服务重启不丢失；
 * 首次运行自动用维修员特供资料种子初始化。检索复用 vector-core 的哈希嵌入，
 * 与进程内 RAG 使用同一套向量语义。
 */

import fs from "node:fs";
import path from "node:path";
import {
  VECTOR_DIMENSION,
  arrayToVector,
  cosineSimilarity,
  embedText,
  normalizeText,
  splitIntoChunks,
  vectorToArray,
} from "./vector-core";
import {
  TECHNICIAN_KNOWLEDGE_SEED,
} from "./technician-knowledge";

export interface StoredVectorDocument {
  id: string;
  title: string;
  content: string;
  kind: "doc" | "video";
  category: string;
  tags: string[];
  /** 视频课件场景（kind 为 video 时携带，供前端播放器渲染） */
  scenes?: Array<{ title: string; caption: string; art: string; duration: number }>;
  videoSrc?: string;
  /** 哔哩哔哩嵌入播放器地址（优先播放） */
  videoEmbed?: string;
  /** 哔哩哔哩原始视频页地址 */
  videoPage?: string;
  /** 视频来源标注 */
  videoCredit?: string;
  durationLabel?: string;
  createdAt: string;
}

interface StoredChunkRecord {
  documentId: string;
  text: string;
  vector: number[];
}

interface VectorDbFile {
  version: number;
  dimension: number;
  updatedAt: string;
  documents: StoredVectorDocument[];
  chunks: StoredChunkRecord[];
}

export interface VectorSearchHit {
  document: StoredVectorDocument;
  chunk: string;
  score: number;
}

const DB_VERSION = 1;
const FILE_NAME = "vector-db.json";
/** 低于该分数的片段视为不相关。 */
const SCORE_THRESHOLD = 0.04;
/** 混合检索后相关度上限，避免展示超过 100%。 */
const MAX_SCORE = 0.99;
/** 标签命中与标题二元组重叠的加权幅度。 */
const TAG_HIT_BONUS = 0.3;
const TITLE_OVERLAP_BONUS = 0.5;
const MAX_KEYWORD_BONUS = 0.6;

function defaultDataDir(): string {
  return path.join(process.cwd(), "data");
}

function seedDocuments(): StoredVectorDocument[] {
  const now = new Date().toISOString();
  return TECHNICIAN_KNOWLEDGE_SEED.map((entry) => ({
    id: entry.id,
    title: entry.title,
    content: entry.content,
    kind: entry.kind,
    category: entry.category,
    tags: entry.tags,
    scenes: entry.video?.scenes,
    videoSrc: entry.video?.videoSrc,
    videoEmbed: entry.video?.videoEmbed,
    videoPage: entry.video?.videoPage,
    videoCredit: entry.video?.videoCredit,
    durationLabel: entry.video?.durationLabel,
    createdAt: now,
  }));
}

/** 提取二元组集合（中文短查询的关键词重叠度量）。 */
function bigramSet(text: string): Set<string> {
  const set = new Set<string>();
  for (let index = 0; index + 1 < text.length; index += 1) {
    set.add(text.slice(index, index + 2));
  }
  return set;
}

/**
 * 混合检索的关键词加权：
 * 标签被查询完整命中 +0.3；查询二元组与「标题+标签+分类」的重叠比例 ×0.5。
 * 哈希向量对中文短查询的区分度有限，关键词项可显著提升实操场景的排序精度。
 */
function keywordBoost(document: StoredVectorDocument, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;

  let bonus = 0;
  for (const tag of document.tags) {
    const normalizedTag = normalizeText(tag);
    if (normalizedTag && normalizedQuery.includes(normalizedTag)) {
      bonus += TAG_HIT_BONUS;
    }
  }

  const queryBigrams = bigramSet(normalizedQuery);
  if (queryBigrams.size > 0) {
    const titleBigrams = bigramSet(
      normalizeText(`${document.title} ${document.tags.join("")} ${document.category}`),
    );
    let shared = 0;
    for (const bigram of queryBigrams) {
      if (titleBigrams.has(bigram)) shared += 1;
    }
    bonus += (shared / queryBigrams.size) * TITLE_OVERLAP_BONUS;
  }

  return Math.min(bonus, MAX_KEYWORD_BONUS);
}

/**
 * 本地向量库：文档去重、分片、持久化与检索。
 * 通过工厂函数创建，测试可传入临时目录，默认单例指向项目 data/ 目录。
 */
export class LocalVectorDb {
  private readonly filePath: string;
  private readonly memoryFallback = new Map<string, string>();
  private documents = new Map<string, StoredVectorDocument>();
  private chunks: Array<{ documentId: string; text: string; vector: Float32Array }> = [];
  private loaded = false;

  constructor(dataDir: string = defaultDataDir()) {
    this.filePath = path.join(dataDir, FILE_NAME);
  }

  /** 惰性加载：首次使用时读盘，没有文件则写入种子数据。 */
  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;

    const raw = this.readFile();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as VectorDbFile;
        if (parsed.version === DB_VERSION && Array.isArray(parsed.documents)) {
          for (const document of parsed.documents) {
            this.documents.set(document.id, document);
          }
          for (const chunk of parsed.chunks ?? []) {
            this.chunks.push({
              documentId: chunk.documentId,
              text: chunk.text,
              vector: arrayToVector(chunk.vector),
            });
          }
          return;
        }
      } catch {
        // 文件损坏时重建，不阻塞服务。
      }
    }

    for (const document of seedDocuments()) {
      this.indexDocument(document);
    }
    this.persist();
  }

  private readFile(): string | null {
    try {
      return fs.readFileSync(this.filePath, "utf-8");
    } catch {
      return null;
    }
  }

  private persist(): void {
    const payload: VectorDbFile = {
      version: DB_VERSION,
      dimension: VECTOR_DIMENSION,
      updatedAt: new Date().toISOString(),
      documents: [...this.documents.values()],
      chunks: this.chunks.map((chunk) => ({
        documentId: chunk.documentId,
        text: chunk.text,
        vector: vectorToArray(chunk.vector),
      })),
    };

    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(payload), "utf-8");
    } catch {
      // 只读文件系统（如部分 Serverless 环境）时退化为进程内存储。
      this.memoryFallback.set(FILE_NAME, JSON.stringify(payload));
    }
  }

  private indexDocument(document: StoredVectorDocument): void {
    this.documents.set(document.id, document);

    const text = [
      document.title,
      document.tags.join("、"),
      document.content,
      ...(document.scenes ?? []).flatMap((scene) => [scene.title, scene.caption]),
    ].join("\n");

    for (const chunk of splitIntoChunks(text)) {
      this.chunks.push({
        documentId: document.id,
        text: chunk,
        vector: embedText(chunk),
      });
    }
  }

  /** 新增文档并落盘；同 id 覆盖（先删旧分片）。返回是否新增。 */
  addDocument(input: {
    id?: string;
    title: string;
    content: string;
    kind?: "doc" | "video";
    category?: string;
    tags?: string[];
  }): StoredVectorDocument {
    this.ensureLoaded();

    const id =
      input.id?.trim() ||
      `kb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    if (this.documents.has(id)) {
      this.removeDocument(id);
    }

    const document: StoredVectorDocument = {
      id,
      title: input.title.trim(),
      content: input.content.trim(),
      kind: input.kind ?? "doc",
      category: input.category?.trim() || "硬件维修",
      tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
      createdAt: new Date().toISOString(),
    };

    this.indexDocument(document);
    this.persist();
    return document;
  }

  /** 删除文档及其分片。 */
  removeDocument(id: string): boolean {
    this.ensureLoaded();
    const existed = this.documents.delete(id);
    this.chunks = this.chunks.filter((chunk) => chunk.documentId !== id);
    if (existed) this.persist();
    return existed;
  }

  /** 混合检索：向量余弦相似度 + 关键词加权，按综合相关度排序。 */
  search(query: string, limit = 8): VectorSearchHit[] {
    this.ensureLoaded();

    const queryVector = embedText(query);
    // 查询归一化后为空（无有效字符）时直接返回空结果。
    if (queryVector.every((value) => value === 0)) {
      return [];
    }
    const normalizedQuery = normalizeText(query);

    const bestByDocument = new Map<string, VectorSearchHit>();
    for (const chunk of this.chunks) {
      const score = cosineSimilarity(queryVector, chunk.vector);
      if (score <= SCORE_THRESHOLD) continue;

      const document = this.documents.get(chunk.documentId);
      if (!document) continue;

      const current = bestByDocument.get(chunk.documentId);
      if (!current || score > current.score) {
        bestByDocument.set(chunk.documentId, { document, chunk: chunk.text, score });
      }
    }

    return [...bestByDocument.values()]
      .map((hit) => ({
        ...hit,
        score: Math.min(MAX_SCORE, hit.score + keywordBoost(hit.document, normalizedQuery)),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  /** 按分类浏览（无搜索词时使用）。 */
  listByCategory(category?: string): StoredVectorDocument[] {
    this.ensureLoaded();
    const documents = [...this.documents.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
    if (!category || category === "全部") return documents;
    return documents.filter((document) => document.category === category);
  }

  getDocument(id: string): StoredVectorDocument | null {
    this.ensureLoaded();
    return this.documents.get(id) ?? null;
  }

  get stats(): { documents: number; chunks: number; dimension: number } {
    this.ensureLoaded();
    return {
      documents: this.documents.size,
      chunks: this.chunks.length,
      dimension: VECTOR_DIMENSION,
    };
  }
}

const globalForVectorDb = globalThis as typeof globalThis & {
  __campusLocalVectorDb?: LocalVectorDb;
};

/** 进程级单例：Next.js 热更新与多路由共享同一份索引。 */
export function getLocalVectorDb(): LocalVectorDb {
  if (!globalForVectorDb.__campusLocalVectorDb) {
    globalForVectorDb.__campusLocalVectorDb = new LocalVectorDb();
  }
  return globalForVectorDb.__campusLocalVectorDb;
}
