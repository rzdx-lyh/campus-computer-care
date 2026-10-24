/**
 * 用途：字符 n-gram 哈希向量嵌入与余弦相似度的共享纯函数层。
 * 说明：不依赖任何外部模型，离线可用； rag-vector-store（进程内）与
 * local-vector-db（本地持久化向量库）复用同一套向量语义，保证检索结果一致。
 */

/** 向量维度：384 维哈希特征空间。 */
export const VECTOR_DIMENSION = 384;

/** 归一化文本：小写、去除非字母数字字符、截断超长文本。 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 5000);
}

/** FNV-1a 32 位哈希，用于把字符特征映射到向量维度。 */
export function hashFeature(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 把文本嵌入为 384 维归一化向量。
 * 特征：unigram（权重 1）+ bigram（1.35）+ trigram（0.8），
 * 用 1 + log(frequency) 做词频阻尼，符号哈希减少碰撞。
 */
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

/** 余弦相似度：两个已归一化向量的点积。 */
export function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  let score = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    score += left[index] * right[index];
  }
  return score;
}

/** 按段落与句子边界把长文本切分为带重叠的分片。 */
export function splitIntoChunks(text: string, maxLength = 700, overlap = 100): string[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}|(?<=[。！？!?])\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length <= maxLength) {
      current += `${current ? "\n" : ""}${paragraph}`;
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
    current = "";
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

/** Float32Array 与普通数组互转（用于 JSON 持久化）。 */
export function vectorToArray(vector: Float32Array): number[] {
  return Array.from(vector);
}

export function arrayToVector(values: number[]): Float32Array {
  return new Float32Array(values);
}
