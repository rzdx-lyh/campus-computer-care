import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** 校验会话令牌：页面刷新后用于恢复登录态。 */
export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400, headers: NO_STORE });
  }

  const session = verifyToken(typeof body.token === "string" ? body.token : null);
  if (!session) {
    return Response.json({ error: "登录已失效，请重新登录" }, { status: 401, headers: NO_STORE });
  }

  return Response.json({ session }, { status: 200, headers: NO_STORE });
}
