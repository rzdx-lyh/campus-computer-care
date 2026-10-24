const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const API_BASE = BASE_URL.endsWith('/v1') ? BASE_URL : `${BASE_URL}/v1`;

export interface DeepSeekSearchItem {
  rerank_score: number;
  title: string;
  url: string;
  snippet: string;
  summary: string;
  content: string;
  site_name: string | null;
  site_icon: string | null;
  date: string | null;
  authority: number;
}

export interface WebEvidence {
  id: string;
  title: string;
  url: string;
  snippet: string;
  summary: string;
  content: string;
  siteName: string;
  publishedAt?: string;
  authority: number;
  rerankScore: number;
  fetched: boolean;
}

interface SearchResponse {
  results?: DeepSeekSearchItem[];
}

interface FetchResponse {
  title?: string;
  content?: string;
}

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('缺少 DEEPSEEK_API_KEY 环境变量');
  return key;
}

async function postDeepSeek<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`DeepSeek ${path} 请求失败: ${response.status} ${detail.slice(0, 300)}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function searchWeb(query: string, count: number): Promise<DeepSeekSearchItem[]> {
  const data = await postDeepSeek<SearchResponse>('/tools/search', {
    query: query.slice(0, 128),
    ori_question: query.slice(0, 128),
    count: Math.min(10, Math.max(1, count)),
    need_content: true,
  });

  return Array.isArray(data.results) ? data.results : [];
}

async function fetchWebPage(url: string): Promise<FetchResponse> {
  return postDeepSeek<FetchResponse>('/tools/fetch', { url });
}

function sanitizeContent(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 14_000);
}

export function isWebSearchEnabled(): boolean {
  // 联网检索默认关闭：现网结果相关性不稳定，演示时按需用 DEEPSEEK_WEB_SEARCH=true 打开。
  return process.env.DEEPSEEK_WEB_SEARCH === 'true';
}

export async function collectWebEvidence(
  query: string,
  options: { count?: number; fetchTop?: number } = {},
): Promise<WebEvidence[]> {
  if (!isWebSearchEnabled()) return [];

  const count = options.count ?? 6;
  const fetchTop = options.fetchTop ?? 2;
  const searchResults = await searchWeb(query, count);
  if (searchResults.length === 0) return [];

  // 宁缺毋滥：只保留相关性足够高、标题可读的网页，避免把无关页面当证据。
  const highQuality = searchResults
    .filter((item) => item.rerank_score >= 0.45)
    .filter((item) => (item.title ?? "").trim().length >= 4)
    .filter((item) => !/^(未命名|无标题)/.test((item.title ?? "").trim()));
  const candidates = highQuality.slice(0, Math.min(2, highQuality.length));
  if (candidates.length === 0) return [];

  return Promise.all(
    candidates.map(async (item, index) => {
      let title = item.title || '未命名网页';
      let content = sanitizeContent(item.content || '');
      let fetched = false;

      if (index < fetchTop) {
        try {
          const page = await fetchWebPage(item.url);
          if (page.content?.trim()) {
            content = sanitizeContent(page.content);
            fetched = true;
          }
          if (page.title?.trim()) title = page.title.trim();
        } catch (error) {
          console.warn(`DeepSeek Fetch 失败，使用搜索结果摘要: ${item.url}`, error);
        }
      }

      if (!content) {
        content = sanitizeContent([item.summary, item.snippet].filter(Boolean).join('\n'));
      }

      return {
        id: `web-${index + 1}-${item.url}`,
        title,
        url: item.url,
        snippet: item.snippet || item.summary || '',
        summary: item.summary || item.snippet || '',
        content,
        siteName: item.site_name || (() => {
          try {
            return new URL(item.url).hostname;
          } catch {
            return '网页来源';
          }
        })(),
        publishedAt: item.date || undefined,
        authority: item.authority,
        rerankScore: item.rerank_score,
        fetched,
      } satisfies WebEvidence;
    }),
  );
}

