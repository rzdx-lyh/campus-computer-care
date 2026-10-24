import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-store";
import { addRepairReport, listRepairReports, type RepairReport } from "@/lib/repair-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function toStats(value: unknown): RepairReport["stats"] {
  const source = (value ?? {}) as Record<string, unknown>;
  const number = (key: string): number => {
    const raw = source[key];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  };
  return {
    total: number("total"),
    pending: number("pending"),
    repairing: number("repairing"),
    completed: number("completed"),
    completionRate: number("completionRate"),
    averageRating: number("averageRating"),
    ratingCount: number("ratingCount"),
  };
}

function toTickets(value: unknown): RepairReport["tickets"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      return {
        id: typeof record.id === "string" ? record.id : "",
        title: typeof record.title === "string" ? record.title : "",
        status: typeof record.status === "string" ? record.status : "",
        priority: typeof record.priority === "string" ? record.priority : "",
        dorm: typeof record.dorm === "string" ? record.dorm : "",
        repairNote: typeof record.repairNote === "string" ? record.repairNote : "",
      };
    })
    .filter((ticket) => ticket.id && ticket.title)
    .slice(0, 100);
}

/** GET：管理员读取维修员上传的后台数据。 */
export async function GET(req: NextRequest) {
  const session = verifyToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.role !== "admin") {
    return Response.json(
      { error: "仅管理员可查看上传数据，请先登录" },
      { status: 401, headers: NO_STORE },
    );
  }

  return Response.json({ reports: listRepairReports() }, { status: 200, headers: NO_STORE });
}

/** POST：维修员上传后台数据（工单统计与明细）给管理员。 */
export async function POST(req: NextRequest) {
  const session = verifyToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.role !== "technician") {
    return Response.json(
      { error: "仅维修员可上传后台数据，请先登录" },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400, headers: NO_STORE });
  }

  const report = addRepairReport({
    technician: session.displayName,
    username: session.username,
    scope: typeof body.scope === "string" && body.scope.trim() ? body.scope.trim() : "全部工单",
    note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : "",
    stats: toStats(body.stats),
    tickets: toTickets(body.tickets),
  });

  return Response.json({ report }, { status: 201, headers: NO_STORE });
}
