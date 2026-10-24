import type { NextRequest } from "next/server";
import { issueToken, verifyCredentials, type AuthRole } from "@/lib/auth-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function normalizeRole(value: unknown): AuthRole | null {
  return value === "technician" || value === "admin" ? value : null;
}

/** 账号密码登录：凭证只在服务端比对，通过后签发会话令牌。 */
export async function POST(req: NextRequest) {
  let body: { role?: unknown; username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400, headers: NO_STORE });
  }

  const role = normalizeRole(body.role);
  if (!role) {
    return Response.json({ error: "登录角色不合法" }, { status: 400, headers: NO_STORE });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  const account = verifyCredentials(role, username, password);
  if (!account) {
    return Response.json({ error: "账号或密码错误，请重试" }, { status: 401, headers: NO_STORE });
  }

  const { token, session } = issueToken(account);
  return Response.json({ token, session }, { status: 200, headers: NO_STORE });
}
