/**
 * 用途：校园电脑管家核心纯函数与知识库配置的自动化测试。
 */
import assert from "node:assert/strict";
import test from "node:test";
import rawKnowledgeBase from "../knowledge-base/data/knowledge_base.json";
import { retrieveKnowledge } from "../src/lib/knowledge-base";
import { detectErrorCodes } from "../src/lib/error-code";
import { buildTicketsCsv, TICKETS_CSV_BOM } from "../src/lib/csv-export";
import { buildDiagnosisReport } from "../src/lib/report-export";
import { createDiagnosisTicketDraft } from "../src/lib/diagnosis-draft";
import { RagVectorStore } from "../src/lib/rag-vector-store";
import { matchBuilding, recommendTechnician, estimateEta } from "../src/lib/campus";
import type { DiagnosisResult, Ticket } from "../src/lib/types";

const baseDiagnosis: DiagnosisResult = {
  summary: "笔记本风扇噪音明显并伴随发热。",
  riskLevel: "high",
  likelyCauses: ["散热口积尘", "风扇模块异常"],
  suggestedActions: ["关闭高负载程序", "检查散热口", "预约清灰"],
  needRepair: true,
  informationSufficient: true,
  followUpQuestions: [],
  sources: [
    {
      id: "kb-1",
      faultType: "风扇噪音",
      matchedKeywords: ["风扇", "发热"],
      confidence: 92,
      score: 30,
      kind: "knowledge_base",
      title: "风扇噪音",
    },
  ],
  ragConfidence: 92,
};

const sampleTicket: Ticket = {
  id: "TICKET-TEST-001",
  title: "风扇异响, 需要清灰",
  description: "运行一段时间后风扇声音很大",
  deviceType: "笔记本电脑",
  dorm: "紫荆 3 号楼 402",
  photo: "",
  status: "completed",
  priority: "high",
  createdAt: "2026-10-20T00:00:00.000Z",
  repairNote: '已清灰, 复测正常；备注 "无异常"',
};

test("知识库正向召回：键盘失灵", () => {
  const matches = retrieveKnowledge("键盘有几个按键失灵", 3);
  assert.ok(matches.some((match) => match.entry.故障类型 === "键盘失灵"));
});

test("知识库负样本：无关问题为空，电脑卡不命中风扇噪音", () => {
  assert.deepEqual(retrieveKnowledge("怎么申请奖学金", 3), []);
  const slowComputer = retrieveKnowledge("电脑卡", 5);
  assert.ok(!slowComputer.some((match) => match.entry.故障类型 === "风扇噪音"));
});

test("错误码识别：0x0000007B 和 INACCESSIBLE_BOOT_DEVICE", () => {
  const codes = detectErrorCodes("蓝屏代码 0x0000007B，随后提示 INACCESSIBLE_BOOT_DEVICE");
  assert.equal(codes.length, 2);
  assert.equal(codes.find((item) => item.code === "0X0000007B")?.faultType, "蓝屏");
  assert.equal(
    codes.find((item) => item.code === "INACCESSIBLE_BOOT_DEVICE")?.faultType,
    "蓝屏",
  );
});

test("CSV：表头、逗号与引号转义、UTF-8 BOM", () => {
  const csv = buildTicketsCsv([sampleTicket]);
  const [header, row] = csv.split("\r\n");
  assert.equal(
    header,
    '"id","title","deviceType","dorm","status","priority","createdAt","repairNote"',
  );
  assert.ok(row.includes('"风扇异响, 需要清灰"'));
  assert.ok(row.includes('"已清灰, 复测正常；备注 ""无异常"""'));
  assert.equal(TICKETS_CSV_BOM, "\uFEFF");
  assert.equal(TICKETS_CSV_BOM.charCodeAt(0), 0xfeff);
});

test("诊断报告包含摘要、来源和免责声明", () => {
  const report = buildDiagnosisReport(baseDiagnosis, {
    description: "风扇声音很大",
    roleLabel: "学生",
    createdAt: new Date("2026-10-20T12:00:00+08:00"),
  });
  assert.ok(report.includes(baseDiagnosis.summary));
  assert.ok(report.includes("风扇噪音"));
  assert.ok(report.includes("仅供维修参考"));
});

test("诊断草稿：高风险映射 high，标题和描述长度受控", () => {
  const draft = createDiagnosisTicketDraft(
    {
      ...baseDiagnosis,
      summary: "风扇持续高速运转并伴随明显发热".repeat(6),
    },
    "电脑开机后风扇声音很大，机身很烫",
  );
  assert.equal(draft.priority, "high");
  assert.ok(draft.title.length <= 60);
  assert.ok(draft.description.length <= 1000);
});

test("RAG 向量库：同 id 去重且空查询无 NaN", () => {
  const store = new RagVectorStore();
  const document = {
    id: "same-doc",
    title: "风扇噪音知识",
    content: "风扇积尘会导致噪音和发热。检查散热口并清灰。",
    sourceType: "knowledge_base" as const,
  };
  store.addDocuments([document]);
  const sizeAfterFirstAdd = store.size;
  store.addDocuments([document]);
  assert.equal(store.size, sizeAfterFirstAdd);
  assert.deepEqual(store.search(""), []);
  assert.ok(store.search("风扇噪音").every((item) => !Number.isNaN(item.score)));
});

test("知识库配置：25 条且六元组字段完整", () => {
  assert.equal(rawKnowledgeBase.length, 25);
  for (const entry of rawKnowledgeBase) {
    assert.equal(typeof entry.故障类型, "string");
    assert.ok(Array.isArray(entry.现象关键词));
    assert.ok(Array.isArray(entry.追问问题));
    assert.ok(Array.isArray(entry.可能原因));
    assert.ok(Array.isArray(entry.排查步骤));
    assert.equal(typeof entry.紧急程度, "string");
  }
});

test("校园派单：宿舍楼号识别与就近推荐", () => {
  const building = matchBuilding("紫荆 3 号楼 402");
  assert.equal(building?.id, "zj3");
  assert.equal(matchBuilding(""), null);
  assert.equal(matchBuilding("图书馆二楼"), null);

  const dispatch = recommendTechnician("紫荆 3 号楼");
  assert.ok(dispatch);
  // 紫荆 3 号楼驻点空闲维修员为王浩
  assert.equal(dispatch?.technician.id, "tech-wang");
  assert.equal(dispatch?.station.id, "zj3");
  assert.equal(dispatch?.studentBuilding.id, "zj3");

  // 无法识别楼宇时不推荐
  assert.equal(recommendTechnician("火星宿舍"), null);
});

test("校园派单：到校时长估算输出格式", () => {
  const eta = estimateEta(0);
  assert.match(eta, /约 \d+ 分钟/);
  assert.ok(estimateEta(1000).length > 0);
});

