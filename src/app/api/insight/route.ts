import OpenAI from "openai";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

interface InsightStat {
  label: string;
  count: number;
}

interface InsightPayload {
  total?: number;
  completionRate?: number;
  statusCounts?: InsightStat[];
  faultStats?: InsightStat[];
}

const SYSTEM_PROMPT = `
你是校园 IT 运维数据分析助手。根据给定的报修统计，用 2-3 句中文给出管理洞察：
1. 指出最突出的故障类型与占比；
2. 指出待接单/完成率反映的问题；
3. 给一条可执行的资源调度或预防建议。
不得编造统计中没有的数字，不要输出 Markdown 列表，只输出一段话。
`;

function buildLocalInsight(payload: InsightPayload): string {
  const total = payload.total ?? 0;
  const faultStats = (payload.faultStats ?? []).filter((item) => item.count > 0);
  const statusCounts = payload.statusCounts ?? [];
  const pending = statusCounts.find((item) => item.label === "待接单")?.count ?? 0;
  const completionRate = payload.completionRate ?? 0;

  if (total === 0) {
    return "当前还没有工单数据，建议先提交几条演示工单或等待学生报修，再生成运维洞察。";
  }

  const top = faultStats[0];
  const topShare = top ? Math.round((top.count / total) * 100) : 0;
  const parts = [
    top
      ? `当前最常见的是「${top.label}」类故障，占 ${topShare}%（${top.count}/${total} 单）`
      : "当前故障类型分布较分散",
    `整体完成率 ${completionRate}%，仍有 ${pending} 单待接单`,
    pending > 0
      ? "建议优先安排待接单中高优先级工单，并针对高频故障准备对应备件与排查指引。"
      : "建议把高频故障整理成标准排查卡，降低后续同类工单的处理时间。",
  ];
  return `${parts.join("；")}。`;
}

function normalizeStats(value: unknown): InsightStat[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is InsightStat => {
      return (
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as InsightStat).label === "string" &&
        typeof (item as InsightStat).count === "number"
      );
    })
    .slice(0, 8);
}

export async function POST(req: NextRequest) {
  let payload: InsightPayload = {};

  try {
    const body = (await req.json()) as InsightPayload;
    payload = {
      total: typeof body.total === "number" ? body.total : 0,
      completionRate: typeof body.completionRate === "number" ? body.completionRate : 0,
      statusCounts: normalizeStats(body.statusCounts),
      faultStats: normalizeStats(body.faultStats),
    };

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json({ content: buildLocalInsight(payload), degraded: true });
    }

    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: BASE_URL,
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    return Response.json({
      content: content || buildLocalInsight(payload),
      degraded: !content,
    });
  } catch (error) {
    console.error("AI 洞察生成失败:", error);
    return Response.json({ content: buildLocalInsight(payload), degraded: true });
  }
}
