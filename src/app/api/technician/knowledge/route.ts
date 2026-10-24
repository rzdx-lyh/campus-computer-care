import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-store";
import { getLocalVectorDb, type StoredVectorDocument } from "@/lib/local-vector-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function requireTechnician(req: NextRequest): boolean {
  const session = verifyToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  return Boolean(session && session.role === "technician");
}

function toSummary(document: StoredVectorDocument, score?: number) {
  return {
    id: document.id,
    title: document.title,
    category: document.category,
    tags: document.tags,
    kind: document.kind,
    durationLabel: document.durationLabel,
    videoSrc: document.videoSrc,
    videoEmbed: document.videoEmbed,
    videoCredit: document.videoCredit,
    summary: document.content.slice(0, 120),
    score: score === undefined ? undefined : Math.round(score * 100),
  };
}

/**
 * GET /api/technician/knowledge
 * - q：向量检索关键词（本地向量库，不依赖外部服务）
 * - category：分类筛选（无 q 时按分类浏览）
 * - id：查看单条资料详情（含视频场景）
 * - stats=1：返回向量库规模
 */
export async function GET(req: NextRequest) {
  if (!requireTechnician(req)) {
    return Response.json(
      { error: "特供资料库仅对维修员开放，请先登录" },
      { status: 401, headers: NO_STORE },
    );
  }

  const db = getLocalVectorDb();
  const params = req.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";
  const id = params.get("id")?.trim() ?? "";

  if (params.get("stats") === "1") {
    return Response.json({ stats: db.stats }, { status: 200, headers: NO_STORE });
  }

  if (id) {
    const document = db.getDocument(id);
    if (!document) {
      return Response.json({ error: "资料不存在或已下架" }, { status: 404, headers: NO_STORE });
    }
    return Response.json({ document }, { status: 200, headers: NO_STORE });
  }

  if (query) {
    const hits = db.search(query, 12).filter(
      (hit) => !category || category === "全部" || hit.document.category === category,
    );
    return Response.json(
      {
        mode: "search",
        query,
        results: hits.map((hit) => toSummary(hit.document, hit.score)),
        total: hits.length,
      },
      { status: 200, headers: NO_STORE },
    );
  }

  const documents = db.listByCategory(category);
  return Response.json(
    {
      mode: "browse",
      category: category || "全部",
      results: documents.map((document) => toSummary(document)),
      total: documents.length,
    },
    { status: 200, headers: NO_STORE },
  );
}

/** POST：维修员补充新资料，自动写入本地向量库。 */
export async function POST(req: NextRequest) {
  if (!requireTechnician(req)) {
    return Response.json(
      { error: "仅维修员可补充资料，请先登录" },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400, headers: NO_STORE });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (title.length < 2 || content.length < 10) {
    return Response.json(
      { error: "标题至少 2 个字，正文至少 10 个字" },
      { status: 400, headers: NO_STORE },
    );
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string")
    : typeof body.tags === "string"
      ? body.tags.split(/[,，、\s]+/)
      : [];

  const db = getLocalVectorDb();
  const document = db.addDocument({
    title,
    content,
    kind: "doc",
    category: typeof body.category === "string" ? body.category : "硬件维修",
    tags,
  });

  return Response.json({ document: toSummary(document) }, { status: 201, headers: NO_STORE });
}
