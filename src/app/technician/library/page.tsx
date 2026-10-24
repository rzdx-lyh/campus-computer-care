"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { TutorialPlayer, type TutorialPlayerVideo } from "@/components/tutorial-player";
import { useAuthorizedFetch, useRequireAuth } from "@/lib/auth-context";

interface KnowledgeSummary {
  id: string;
  title: string;
  category: string;
  tags: string[];
  kind: "doc" | "video";
  durationLabel?: string;
  videoSrc?: string;
  videoEmbed?: string;
  videoCredit?: string;
  summary: string;
  score?: number;
}

interface KnowledgeDetail {
  id: string;
  title: string;
  content: string;
  kind: "doc" | "video";
  category: string;
  tags: string[];
  scenes?: Array<{ title: string; caption: string; art: string; duration: number }>;
  videoSrc?: string;
  videoEmbed?: string;
  videoPage?: string;
  videoCredit?: string;
  durationLabel?: string;
}

interface VectorStats {
  documents: number;
  chunks: number;
  dimension: number;
}

const CATEGORIES = ["全部", "硬件维修", "系统维护", "网络调试", "数据安全", "视频课件"];

export default function TechnicianLibraryPage() {
  const authorized = useRequireAuth("technician");
  const authorizedFetch = useAuthorizedFetch();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [results, setResults] = useState<KnowledgeSummary[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<VectorStats | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KnowledgeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", category: "硬件维修", tags: "", content: "" });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addMessage, setAddMessage] = useState("");

  // 搜索词防抖。
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadList = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (category !== "全部") params.set("category", category);

      const response = await authorizedFetch(`/api/technician/knowledge?${params.toString()}`);
      const data = (await response.json().catch(() => ({}))) as {
        results?: KnowledgeSummary[];
        mode?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "资料加载失败");
      }

      setResults(data.results ?? []);
      setSearchMode(data.mode === "search");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "资料加载失败");
    } finally {
      setLoading(false);
    }
  }, [authorized, authorizedFetch, debouncedQuery, category]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadStats = useCallback(async () => {
    if (!authorized) return;
    try {
      const response = await authorizedFetch("/api/technician/knowledge?stats=1");
      const data = (await response.json().catch(() => ({}))) as { stats?: VectorStats };
      if (response.ok && data.stats) setStats(data.stats);
    } catch {
      // 统计信息失败不影响主流程。
    }
  }, [authorized, authorizedFetch]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const openDetail = async (id: string) => {
    if (detailId === id) {
      setDetailId(null);
      setDetail(null);
      return;
    }

    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await authorizedFetch(`/api/technician/knowledge?id=${encodeURIComponent(id)}`);
      const data = (await response.json().catch(() => ({}))) as { document?: KnowledgeDetail; error?: string };
      if (!response.ok || !data.document) {
        throw new Error(data.error ?? "资料不存在");
      }
      setDetail(data.document);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "资料加载失败");
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // 支持 ?video=<id> 直达指定资料（分享与演示用）；等待登录态就绪后再请求。
  useEffect(() => {
    if (!authorized) return;
    const videoId = new URLSearchParams(window.location.search).get("video");
    if (videoId && detailId !== videoId) void openDetail(videoId);
    // 仅在授权就绪后解析一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const submitNewKnowledge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddSubmitting(true);
    setAddMessage("");

    try {
      const response = await authorizedFetch("/api/technician/knowledge", {
        method: "POST",
        body: JSON.stringify({
          title: addForm.title.trim(),
          category: addForm.category,
          tags: addForm.tags,
          content: addForm.content.trim(),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "提交失败");
      }

      setAddMessage("已写入本地向量库，检索即可命中。");
      setAddForm({ title: "", category: "硬件维修", tags: "", content: "" });
      setAddOpen(false);
      await loadList();
      await loadStats();
    } catch (submitError) {
      setAddMessage(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setAddSubmitting(false);
    }
  };

  const activeVideo = useMemo<TutorialPlayerVideo | null>(() => {
    if (!detail || detail.kind !== "video" || !detail.scenes) return null;
    return {
      id: detail.id,
      title: detail.title,
      durationLabel: detail.durationLabel ?? "短视频课件",
      scenes: detail.scenes,
      videoSrc: detail.videoSrc,
      videoEmbed: detail.videoEmbed,
      videoPage: detail.videoPage,
      videoCredit: detail.videoCredit,
    };
  }, [detail]);

  if (!authorized) {
    return (
      <div className="surface-card mx-auto max-w-md p-10 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-campus-50 text-campus-600">
          <Icon name="lock" className="size-6" />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-700">正在校验维修员登录状态…</p>
        <p className="mt-1 text-xs text-slate-400">未登录将自动跳转到登录页。</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="TECHNICIAN ONLY · VECTOR KNOWLEDGE"
        title="维修员特供资料库"
        description="仅维修员登录后可用：内置本地向量库检索，含维修图文资料与视频课件，可随时补充新资料。"
        action={
          <button type="button" onClick={() => setAddOpen((current) => !current)} className="secondary-button px-4 py-2.5">
            <Icon name="plus" className="size-4" />
            补充资料
          </button>
        }
      />

      {stats ? (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-campus-100 bg-campus-50/70 px-4 py-3 text-xs font-semibold text-campus-800">
          <span className="flex items-center gap-1.5">
            <Icon name="database" className="size-3.5" />
            本地向量库
          </span>
          <span>{stats.documents} 篇资料</span>
          <span>{stats.chunks} 个分片</span>
          <span>{stats.dimension} 维哈希向量</span>
          <span className="font-normal text-campus-800/70">离线检索 · 数据落盘 data/vector-db.json</span>
        </div>
      ) : null}

      {addOpen ? (
        <form onSubmit={submitNewKnowledge} className="surface-card mb-5 space-y-4 p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">补充维修资料</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kb-title" className="field-label">标题</label>
              <input
                id="kb-title"
                required
                minLength={2}
                maxLength={60}
                value={addForm.title}
                onChange={(event) => setAddForm((current) => ({ ...current, title: event.target.value }))}
                className="field-input"
                placeholder="例如：电池鼓包更换流程"
              />
            </div>
            <div>
              <label htmlFor="kb-category" className="field-label">分类</label>
              <select
                id="kb-category"
                value={addForm.category}
                onChange={(event) => setAddForm((current) => ({ ...current, category: event.target.value }))}
                className="field-input"
              >
                {CATEGORIES.filter((item) => item !== "全部").map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="kb-tags" className="field-label">标签（逗号分隔）</label>
            <input
              id="kb-tags"
              value={addForm.tags}
              onChange={(event) => setAddForm((current) => ({ ...current, tags: event.target.value }))}
              className="field-input"
              placeholder="例如：电池, 拆机, 安全"
            />
          </div>
          <div>
            <label htmlFor="kb-content" className="field-label">正文（至少 10 个字）</label>
            <textarea
              id="kb-content"
              required
              minLength={10}
              rows={4}
              value={addForm.content}
              onChange={(event) => setAddForm((current) => ({ ...current, content: event.target.value }))}
              className="field-input resize-y"
              placeholder="记录排查步骤、备件与验收标准…"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={addSubmitting} className="primary-button py-2.5 disabled:opacity-60">
              <Icon name="cloud-upload" className="size-4" />
              {addSubmitting ? "写入中…" : "写入向量库"}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="ghost-button">
              取消
            </button>
            {addMessage ? <span className="text-xs font-semibold text-campus-700">{addMessage}</span> : null}
          </div>
        </form>
      ) : null}

      {/* 搜索与分类 */}
      <div className="surface-card mb-5 p-4 sm:p-5">
        <label className="relative block">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field-input pl-10"
            placeholder="用自然语言搜索，例如：风扇异响怎么处理 / 蓝屏代码什么意思"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                category === item
                  ? "bg-[rgba(124,108,255,0.16)] text-[#7c6cff]"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {searchMode ? (
          <p className="mt-3 text-[11px] text-slate-400">
            向量检索模式：已按语义相关度排序（{debouncedQuery}）
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}

      {/* 结果列表 */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <Icon name="book" className="size-6" />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">没有找到相关资料</p>
          <p className="mt-1 text-xs text-slate-400">换个说法试试，或点击右上角「补充资料」写入向量库。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((item) => (
            <article key={item.id} className="surface-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    item.kind === "video"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-campus-50 text-campus-700"
                  }`}
                >
                  {item.kind === "video" ? "视频课件" : item.category}
                </span>
                {typeof item.score === "number" ? (
                  <span className="text-[10px] font-bold text-campus-600">相关度 {item.score}%</span>
                ) : null}
              </div>

              <h2 className="mt-3 text-sm font-bold leading-5 text-slate-900">{item.title}</h2>
              {detailId === item.id && detail ? (
                <div className="mt-2 flex-1 space-y-2">
                  {detail.content.split("\n").map((paragraph, index) => (
                    <p key={index} className="text-xs leading-5 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-slate-500">{item.summary}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    #{tag}
                  </span>
                ))}
                {item.kind === "video" ? (
                  <>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      {item.durationLabel}
                    </span>
                    {item.videoEmbed ? (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                        哔哩哔哩
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void openDetail(item.id)}
                className={`mt-4 w-full py-2.5 ${item.kind === "video" ? "primary-button" : "secondary-button"}`}
              >
                {item.kind === "video" ? (
                  <>
                    <Icon name="video" className="size-4" />
                    播放视频课件
                  </>
                ) : detailId === item.id ? (
                  "收起详情"
                ) : (
                  "查看详情"
                )}
              </button>
            </article>
          ))}
        </div>
      )}

      {/* 详情 / 播放器 */}
      {detailId ? (
        <section className="surface-card mt-5 p-5 sm:p-6">
          {detailLoading || !detail ? (
            <p className="py-10 text-center text-sm text-slate-400">正在加载…</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{detail.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {detail.category} · 标签：{detail.tags.join("、") || "无"}
                  </p>
                </div>
                <button type="button" onClick={() => { setDetailId(null); setDetail(null); }} className="ghost-button">
                  收起
                </button>
              </div>

              {activeVideo ? (
                <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
                  <TutorialPlayer video={activeVideo} />
                  <div className="rounded-2xl border border-campus-100 bg-campus-50/60 p-4">
                    <h3 className="text-sm font-bold text-campus-800">课程章节</h3>
                    <ol className="mt-3 space-y-2">
                      {activeVideo.scenes.map((scene, index) => (
                        <li key={`${scene.title}-${index}`} className="flex gap-2 text-xs leading-5 text-campus-800/80">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-campus-600 text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                          {scene.title}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-[11px] leading-5 text-campus-800/60">
                      视频课件来源为哔哩哔哩，需联网播放；无网络时可点击「播放内置动画课件」离线演示。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.content.split("\n").map((paragraph, index) => (
                    <p key={index} className="text-sm leading-6 text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
