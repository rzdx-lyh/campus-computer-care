/**
 * 用途：为维修员工单生成 AI 维修建议（原因 / 备件 / 工时 / 验收步骤），失败时给本地兜底。
 */
import OpenAI from "openai";
import type { NextRequest } from "next/server";
import type { RepairAdvice } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

interface TicketInput {
  title?: string;
  description?: string;
  deviceType?: string;
  priority?: string;
  repairNote?: string;
}

const SYSTEM_PROMPT = `
你是校园电脑维修员的技术助理。根据工单信息，给出可执行的维修建议。
只输出一个合法 JSON 对象，字段必须是：
{"summary":"一句话判断","causes":["可能原因"],"parts":["建议备件或工具"],"estimate":"预计工时，如 20-40 分钟","steps":["验收/维修步骤"]}
要求：
1. 原因按可能性排序，2-4 条；
2. 备件没有就写 "无需备件"，不要编造型号；
3. 涉及拆机、进液、焦糊味时，先提醒断电并转专业维修；
4. 不要建议学生自行拆机；
5. 语言简洁、专业，中文。
`;

function stripFences(text: string): string {
  return text
    .replace(/```(?:json|jsonc)?/gi, "")
    .replace(/^\s*```\s*$/gm, "")
    .trim();
}

function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = stripFences(text);
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // 尝试下一个候选
    }
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 6);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeAdvice(source: Record<string, unknown> | null): RepairAdvice {
  if (!source) throw new Error("invalid json");
  return {
    summary:
      typeof source.summary === "string" && source.summary.trim()
        ? source.summary.trim()
        : "已根据工单信息生成维修建议。",
    causes: toStringArray(source.causes ?? source["可能原因"]),
    parts: toStringArray(source.parts ?? source["建议备件"]),
    estimate:
      typeof source.estimate === "string" && source.estimate.trim()
        ? source.estimate.trim()
        : "30-60 分钟",
    steps: toStringArray(source.steps ?? source["验收步骤"]),
  };
}

function buildLocalAdvice(ticket: TicketInput): RepairAdvice {
  const text = `${ticket.title ?? ""} ${ticket.description ?? ""}`;

  if (/风扇|发热|发烫|噪音|温度/i.test(text)) {
    return {
      summary: "优先排查散热风道与风扇积尘，清灰后复测温度。",
      causes: ["散热口/风扇积尘", "后台程序占用过高", "散热硅脂老化"],
      parts: ["压缩空气", "螺丝刀（拆后盖用）", "硅脂（视情况）"],
      estimate: "30-50 分钟",
      steps: ["记录维修前温度与风扇转速", "断电后清理风道与风扇", "复测 15 分钟压力温度", "确认无异常异响后交付"],
      degraded: true,
    };
  }

  if (/蓝屏|重启|更新|系统|驱动/i.test(text)) {
    return {
      summary: "先确认蓝屏代码与最近更新/驱动变更，再决定回滚或修复引导。",
      causes: ["显卡/存储驱动冲突", "系统更新不完整", "硬盘出现坏道"],
      parts: ["无需备件", "PE 启动盘（排查用）"],
      estimate: "40-90 分钟",
      steps: ["记录蓝屏代码与发生场景", "回滚最近更新或驱动", "检查硬盘 SMART", "连续运行 30 分钟确认稳定"],
      degraded: true,
    };
  }

  if (/wifi|wi-fi|网络|断网|掉线|连不上/i.test(text)) {
    return {
      summary: "按账号认证、信号干扰、网卡驱动三层顺序排查。",
      causes: ["校园网认证失效", "无线网卡驱动异常", "AP 信号干扰或过载"],
      parts: ["无需备件"],
      estimate: "20-40 分钟",
      steps: ["确认账号在线状态", "重装/更新无线网卡驱动", "更换频段或位置复测", "记录丢包率与延迟"],
      degraded: true,
    };
  }

  if (/键盘|按键|鼠标|接口|屏幕|花屏|电池/i.test(text)) {
    return {
      summary: "先做外设替换法定位，再判断是否需要更换部件。",
      causes: ["外设硬件故障", "排线松动", "接口接触不良"],
      parts: ["同型号外设（测试用）", "排线（视检测结果）"],
      estimate: "30-60 分钟",
      steps: ["外接同类型设备交叉测试", "检查排线与接口", "确认故障部件后更换", "完成后做 10 分钟功能验证"],
      degraded: true,
    };
  }

  return {
    summary: "信息不足，建议先补充故障现象、发生时间与报错信息。",
    causes: ["故障描述不完整，暂无法定位"],
    parts: ["无需备件"],
    estimate: "先补充信息",
    steps: ["联系学生补充现象", "记录报错代码", "现场复现后再次生成建议"],
    degraded: true,
  };
}

export async function POST(req: NextRequest) {
  let ticket: TicketInput = {};

  try {
    const body = (await req.json()) as { ticket?: TicketInput };
    ticket = body?.ticket ?? {};
    if (!ticket.title?.trim() || !ticket.description?.trim()) {
      return Response.json({ error: "缺少工单标题或故障描述" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json({ advice: buildLocalAdvice(ticket) });
    }

    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: BASE_URL,
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(ticket) },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const advice = normalizeAdvice(parseJson(content));
    return Response.json({ advice });
  } catch (error) {
    console.error("维修建议生成失败:", error);
    if (ticket.title?.trim() && ticket.description?.trim()) {
      return Response.json({ advice: buildLocalAdvice(ticket) });
    }
    return Response.json({ error: "维修建议生成失败，请稍后重试" }, { status: 500 });
  }
}
