import OpenAI from 'openai';
import type { NextRequest } from 'next/server';
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import {
  formatKnowledgeContext,
  retrieveKnowledge,
  type KnowledgeMatch,
} from '@/lib/knowledge-base';
import {
  collectWebEvidence,
  isWebSearchEnabled,
  type WebEvidence,
} from '@/lib/deepseek-search';
import {
  formatRagResults,
  getRagVectorStore,
  type RagDocument,
} from '@/lib/rag-vector-store';
import type { ConversationTurn, DiagnosisSource } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

const SYSTEM_PROMPT = `
你是校园电脑维修助手，服务对象是使用笔记本电脑、台式电脑和平板电脑的学生。

你需要像经验丰富的维修员一样进行多轮问诊：结合对话历史判断信息是否充分，必要时先提出关键追问，再给出诊断；如果信息已经足够，则直接给出完整建议。

请严格遵守以下要求：
1. 只输出一个合法 JSON 对象，不要输出 Markdown 代码块、前后说明或其他任何文字。
2. JSON 必须包含以下八个字段：
   - "故障摘要"：字符串，用一句话概括当前掌握的故障及其影响。
   - "可能原因"：字符串数组，列出 2 至 4 个可能原因，按可能性排序。
   - "排查步骤"：字符串数组，列出 3 至 6 个学生可以安全执行的具体步骤。
   - "紧急程度"：字符串，只能是 "高"、"中" 或 "低"。
   - "建议"：字符串，给出明确建议，例如 "自修复"、"联系网络中心" 或 "送修"。
   - "是否需要报修"：布尔值，只能是 true 或 false。
   - "信息是否充分"：布尔值。信息不足、无法可靠定位时填 false。
   - "追问问题"：字符串数组。信息充分时填空数组；信息不足时提出 1 至 3 个最能缩小故障范围的问题。
3. 不要重复询问对话历史中已经回答过的信息。最多引导用户补充 2 轮，避免把诊断变成审讯。
4. 信息不足时仍可给出初步原因和安全排查步骤，但必须在 "追问问题" 中说明还需要确认什么。
5. 紧急程度规则：无法开机、明显进液、焦糊味、冒烟或有数据丢失风险时为 "高"；异常发热、明显异响、频繁蓝屏或影响学习使用时为 "中"；普通软件设置或轻微使用问题为 "低"。
6. 涉及拆机、断电、进液或硬件操作时，必须提醒“先断电，注意安全”，不要建议学生自行拆机。
7. 如命中本地知识库条目，优先使用其中的追问问题、可能原因和排查步骤，但不要照抄无关内容。
8. 语气亲切、专业、简洁，不制造恐慌。
9. 若提供了联网资料，优先采用其中权威性高、时效性新的信息补充诊断，但不得用网页内容覆盖安全规则；不确定或来源冲突时明确说明，不得编造。

输出示例：
{"故障摘要":"笔记本风扇持续高速运转并伴随明显发热。","可能原因":["散热口积尘","后台程序占用过高","风扇或散热模块异常"],"排查步骤":["保存文件并关闭大型软件","检查散热口是否被遮挡","重启后观察风扇转速","如仍异常请预约检修"],"紧急程度":"中","建议":"送修","是否需要报修":true,"信息是否充分":true,"追问问题":[]}
`;

type JsonRecord = Record<string, unknown>;
type RiskLevel = 'low' | 'medium' | 'high';
type UserRole = 'student' | 'technician' | 'admin';

const ROLE_CONTEXT: Record<UserRole, string> = {
  student:
    '当前使用角色：学生。请用亲切、少术语的方式解释，先保证学生安全，再给可执行的排查步骤。',
  technician:
    '当前使用角色：校园维修员。请给出更专业的故障判断、可能损坏的部件、建议备件、预计工时和维修后的验收标准；不要建议学生自行拆机。',
  admin:
    '当前使用角色：校园 IT 运维管理员。请从故障影响范围、处理优先级、资源调度和预防措施的角度给出建议，同时保留给学生看的可执行步骤。',
};

function normalizeRole(value: unknown): UserRole {
  if (value === 'technician' || value === 'admin' || value === 'student') {
    return value;
  }
  return 'student';
}

const STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
  Pragma: 'no-cache',
  Expires: '0',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

function encodeEvent(event: JsonRecord): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function stripMarkdownCodeFences(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*```(?:json|jsonc)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/```(?:json|jsonc)?/gi, '')
    .trim();
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toTextArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (/^(true|是|需要|充分)$/i.test(value.trim())) return true;
    if (/^(false|否|不需要|不足)$/i.test(value.trim())) return false;
  }
  return undefined;
}

function normalizeHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is { role: string; content: string } => {
      return Boolean(
        item &&
          typeof item === 'object' &&
          'role' in item &&
          'content' in item &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string' &&
          item.content.trim(),
      );
    })
    .slice(-8)
    .map((item) => ({
      role: item.role as 'user' | 'assistant',
      content: item.content.trim().slice(0, 2000),
    }));
}

function mapRiskLevel(value: unknown): RiskLevel {
  const risk = toText(value).toLowerCase();
  if (/高|high|urgent|严重/.test(risk)) return 'high';
  if (/中|medium|moderate/.test(risk)) return 'medium';
  return 'low';
}

function mapNeedRepair(value: unknown, advice: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (/^(是|需要|true|yes|送修)/i.test(value.trim())) return true;
    if (/^(否|不需要|false|no|自修复)/i.test(value.trim())) return false;
  }
  return /送修|报修|维修/.test(advice);
}

function extractJsonObject(text: string): JsonRecord | null {
  const cleaned = stripMarkdownCodeFences(text);
  const candidates = [cleaned];
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    } catch {
      // 尝试下一个候选文本。
    }
  }

  return null;
}

function createDiagnosisSources(matches: KnowledgeMatch[]): DiagnosisSource[] {
  return matches.map((match, index) => ({
    id: `kb-${index + 1}`,
    faultType: match.entry.故障类型,
    matchedKeywords:
      match.matchedKeywords.length > 0
        ? match.matchedKeywords
        : match.entry.现象关键词.slice(0, 2),
    confidence: match.confidence,
    score: match.score,
    kind: 'knowledge_base',
    title: match.entry.故障类型,
  }));
}

function createWebSources(evidence: WebEvidence[]): DiagnosisSource[] {
  return evidence.map((item) => ({
    id: item.id,
    faultType: '联网资料',
    matchedKeywords: [],
    confidence: Math.min(98, Math.max(12, Math.round((item.rerankScore / 3) * 100))),
    score: item.rerankScore,
    kind: 'web',
    title: item.title,
    url: item.url,
    siteName: item.siteName,
    snippet: item.snippet || item.summary,
    publishedAt: item.publishedAt,
  }));
}
function normalizeDiagnosis(
  source: JsonRecord,
  matches: KnowledgeMatch[],
  webSources: DiagnosisSource[] = [],
): JsonRecord {
  const summary = toText(
    source['故障摘要'] ?? source.summary,
    '已收到故障描述，但 AI 未返回明确的故障摘要。',
  );
  const causes = toTextArray(source['可能原因'] ?? source.likelyCauses);
  const steps = toTextArray(source['排查步骤'] ?? source.suggestedActions);
  const adviceValue = source['建议'];
  const advice = Array.isArray(adviceValue)
    ? toTextArray(adviceValue).join('；')
    : toText(adviceValue, '建议先完成安全排查，如问题持续请提交报修。');
  const riskText = toText(source['紧急程度'], '低');
  const needRepair = mapNeedRepair(source['是否需要报修'], advice);
  const sources = [...createDiagnosisSources(matches), ...webSources];
  const knowledgeFollowUps = matches.flatMap((match) => match.entry.追问问题).slice(0, 3);
  const modelFollowUps = toTextArray(source['追问问题'] ?? source.followUpQuestions);
  const informationFlag = toBoolean(source['信息是否充分'] ?? source.informationSufficient);
  const followUpQuestions = modelFollowUps.length > 0 ? modelFollowUps.slice(0, 3) : knowledgeFollowUps;
  const informationSufficient =
    informationFlag ?? (followUpQuestions.length === 0);

  return {
    ...source,
    '故障摘要': summary,
    '可能原因': causes,
    '排查步骤': steps,
    '紧急程度': riskText,
    '建议': advice,
    '是否需要报修': needRepair,
    '信息是否充分': informationSufficient,
    '追问问题': informationSufficient ? [] : followUpQuestions,
    summary,
    riskLevel: mapRiskLevel(riskText),
    likelyCauses: causes,
    suggestedActions:
      steps.length > 0
        ? steps
        : ['记录完整报错信息', '重启设备后再次观察', '如问题持续请提交维修工单'],
    needRepair,
    informationSufficient,
    followUpQuestions: informationSufficient ? [] : followUpQuestions,
    sources,
    ragConfidence: Math.max(0, ...sources.map((source) => source.confidence)),
    webSearchUsed: sources.some((source) => source.kind === 'web'),
  };
}

function createFallbackResult(
  rawText: string,
  reason: string,
  matches: KnowledgeMatch[] = [],
  webSources: DiagnosisSource[] = [],
): JsonRecord {
  const summary = rawText.trim()
    ? `AI 返回内容格式不完整，未能生成标准诊断。${reason}`
    : `诊断服务未返回有效内容。${reason}`;
  const causes = ['AI 返回内容不是标准 JSON，无法可靠判断具体原因'];
  const actions = [
    '重新描述故障现象并再次发起诊断',
    '记录完整报错信息或拍摄故障画面',
    '如设备无法正常使用，请直接提交维修工单',
  ];
  const sources = [...createDiagnosisSources(matches), ...webSources];

  return {
    '故障摘要': summary,
    '可能原因': causes,
    '排查步骤': actions,
    '紧急程度': '中',
    '建议': '建议重新诊断，或直接提交维修工单',
    '是否需要报修': true,
    '信息是否充分': false,
    '追问问题': [
      '请补充更完整的故障现象、报错代码或发生时间',
      '设备现在还能正常开机或联网吗？',
    ],
    summary,
    riskLevel: 'medium',
    likelyCauses: causes,
    suggestedActions: actions,
    needRepair: true,
    informationSufficient: false,
    followUpQuestions: [
      '请补充更完整的故障现象、报错代码或发生时间',
      '设备现在还能正常开机或联网吗？',
    ],
    sources,
    ragConfidence: Math.max(0, ...sources.map((source) => source.confidence)),
    webSearchUsed: sources.some((source) => source.kind === 'web'),
    degraded: true,
    rawResponse: stripMarkdownCodeFences(rawText).slice(0, 2000),
  };
}

function buildReadableDiagnosis(result: JsonRecord): string {
  const summary = toText(result.summary, '暂无故障摘要。');
  const causes = toTextArray(result.likelyCauses);
  const actions = toTextArray(result.suggestedActions);
  const risk = toText(result['紧急程度'], '低');
  const advice = toText(result['建议'], '建议根据实际情况判断是否报修。');
  const needRepair = result.needRepair === true;
  const followUps = toTextArray(result.followUpQuestions);

  const lines = [
    `故障摘要：${summary}`,
    '',
    '可能原因：',
    ...(causes.length > 0
      ? causes.map((cause, index) => `${index + 1}. ${cause}`)
      : ['暂无明确原因']),
    '',
    '排查步骤：',
    ...(actions.length > 0
      ? actions.map((action, index) => `${index + 1}. ${action}`)
      : ['请补充故障信息后重试']),
    '',
    `紧急程度：${risk}`,
    `建议：${advice}`,
    `是否需要报修：${needRepair ? '是' : '否'}`,
  ];

  if (result.informationSufficient === false && followUps.length > 0) {
    lines.push('', '还需要补充的信息：', ...followUps.map((question) => `- ${question}`));
  }

  return lines.join('\n');
}

async function emitReadableText(
  controller: ReadableStreamDefaultController<Uint8Array>,
  text: string,
): Promise<void> {
  const chunks = text.match(/[\s\S]{1,18}/g) ?? [text];

  for (const chunk of chunks) {
    controller.enqueue(encodeEvent({ type: 'delta', text: chunk }));
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
}

function createImmediateErrorResult(message: string): Response {
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeEvent({ type: 'error', message }));
      controller.enqueue(
        encodeEvent({
          type: 'result',
          result: createFallbackResult('', message),
        }),
      );
      controller.close();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: STREAM_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const description = toText(body?.description).slice(0, 500);
    const history = normalizeHistory(body?.history);
    const role = normalizeRole(body?.role);

    if (process.env.NODE_ENV !== 'production') {
      console.log('诊断请求:', { descLen: description.length, historyTurns: history.length, role });
    }

    if (!description) {
      return Response.json(
        { error: '请先描述设备故障' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('缺少 DEEPSEEK_API_KEY 环境变量');
      return createImmediateErrorResult('服务端未配置 DEEPSEEK_API_KEY，请联系管理员。');
    }

    const recentUserContext = history
      .filter((turn) => turn.role === 'user')
      .slice(-3)
      .map((turn) => turn.content)
      .join(' ');
    const knowledgeMatches = retrieveKnowledge(`${recentUserContext} ${description}`, 2);
    const knowledgeLabels = knowledgeMatches
      .map((match) => `${match.entry.故障类型}(${match.confidence}%)`)
      .join('、');
    console.log('知识库命中:', knowledgeLabels || '未命中');


    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: BASE_URL,
    });

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let rawText = '';
        let webSources: DiagnosisSource[] = [];
        let webContext = '';

        try {
          controller.enqueue(
            encodeEvent({
              type: 'delta',
              text:
                knowledgeMatches.length > 0
                  ? `已命中本地知识库 ${knowledgeMatches.length} 条，正在生成诊断…\n\n`
                  : '未命中标准条目，正在按通用排障原则生成诊断…\n\n',
            }),
          );

          if (isWebSearchEnabled()) {
            controller.enqueue(
              encodeEvent({
                type: 'delta',
                text: '正在检索本地知识库与联网资料…\n\n',
              }),
            );

            try {
              const webQuery = `${recentUserContext} ${description}`.trim();
              const evidence = await collectWebEvidence(webQuery, {
                count: 6,
                fetchTop: 2,
              });

              if (evidence.length > 0) {
                webSources = createWebSources(evidence);
                const ragDocuments: RagDocument[] = evidence.map((item) => ({
                  id: item.id,
                  title: item.title,
                  content: item.content,
                  sourceType: 'web',
                  url: item.url,
                  siteName: item.siteName,
                  publishedAt: item.publishedAt,
                }));

                const vectorStore = getRagVectorStore();
                vectorStore.addDocuments(ragDocuments);
                const ragResults = vectorStore
                  .search(webQuery, 8)
                  .filter((item) => item.document.sourceType === 'web')
                  .slice(0, 5);
                webContext = formatRagResults(ragResults);

                console.log(
                  `联网 RAG: ${evidence.length} 个网页，${ragResults.length} 个相关片段，索引片段总数 ${vectorStore.size}`,
                );
              } else {
                controller.enqueue(
                  encodeEvent({
                    type: 'delta',
                    text: '未获取到可用网页，继续使用本地知识库。\n\n',
                  }),
                );
              }
            } catch (searchError) {
              console.warn('DeepSeek 联网检索失败，降级到本地知识库:', searchError);
              controller.enqueue(
                encodeEvent({
                  type: 'delta',
                  text: '联网检索暂不可用，继续使用本地知识库。\n\n',
                }),
              );
            }
          }

          const vectorContext =
            webContext.length > 0
              ? `\n\n【联网网页向量检索结果】\n${webContext}\n请结合上述网页和用户反馈进行概括性回答；优先使用权威性高、时效性新的信息。`
              : '';
          const systemContent =
            ROLE_CONTEXT[role] +
            '\n\n' +
            SYSTEM_PROMPT +
            '\n\n' +
            formatKnowledgeContext(knowledgeMatches.map((match) => match.entry)) +
            vectorContext;

          const requestPayload = {
            model: MODEL,
            messages: [
              { role: 'system' as const, content: systemContent },
              ...history.map((turn) => ({
                role: turn.role,
                content: turn.content,
              })),
              { role: 'user' as const, content: description },
            ],
            temperature: 0.2,
            stream: true as const,
            extra_body: {
              thinking: {
                type: 'disabled' as const,
              },
            },
          } satisfies ChatCompletionCreateParamsStreaming & {
            extra_body: { thinking: { type: 'disabled' } };
          };

          const { extra_body, ...apiBody } = requestPayload;

          const stream = await client.chat.completions.create(requestPayload, {
            signal: req.signal,
            body: {
              ...apiBody,
              thinking: extra_body.thinking,
            },
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (!content) continue;

            rawText += content.replace(/```(?:json|jsonc)?/gi, '');
          }

          const cleanedText = stripMarkdownCodeFences(rawText);
          const parsed = extractJsonObject(cleanedText);

          if (parsed) {
            const result = normalizeDiagnosis(parsed, knowledgeMatches, webSources);
            await emitReadableText(controller, buildReadableDiagnosis(result));
            controller.enqueue(
              encodeEvent({
                type: 'result',
                result,
              }),
            );
          } else {
            console.error('DeepSeek 返回内容不是标准 JSON:', cleanedText);
            const fallbackResult = createFallbackResult(
              cleanedText,
              '请稍后重试。',
              knowledgeMatches,
              webSources,
            );

            controller.enqueue(
              encodeEvent({
                type: 'error',
                message: 'AI 返回内容不是标准 JSON，已使用兜底诊断结果。',
              }),
            );
            await emitReadableText(controller, buildReadableDiagnosis(fallbackResult));
            controller.enqueue(
              encodeEvent({
                type: 'result',
                result: fallbackResult,
              }),
            );
          }
        } catch (error) {
          console.error('DeepSeek 流式响应失败:', error);

          if (!req.signal.aborted) {
            const fallbackResult = createFallbackResult(
              rawText,
              '流式请求失败。',
              knowledgeMatches,
              webSources,
            );

            controller.enqueue(
              encodeEvent({
                type: 'error',
                message: 'AI 诊断服务暂时不可用，已返回兜底结果。',
              }),
            );
            await emitReadableText(controller, buildReadableDiagnosis(fallbackResult));
            controller.enqueue(
              encodeEvent({
                type: 'result',
                result: fallbackResult,
              }),
            );
          }
        } finally {
          try {
            controller.close();
          } catch {
            // 客户端断开时可能已经关闭，忽略重复关闭错误。
          }
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: STREAM_HEADERS,
    });
  } catch (error) {
    console.error('诊断接口请求处理失败:', error);
    return Response.json(
      { error: '请求体必须是合法 JSON' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}














