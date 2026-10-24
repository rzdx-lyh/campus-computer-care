/**
 * 用途：本地向量库与账号鉴权的自动化测试。
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VECTOR_DIMENSION,
  cosineSimilarity,
  embedText,
  splitIntoChunks,
} from "../src/lib/vector-core";
import { LocalVectorDb } from "../src/lib/local-vector-db";
import { issueToken, verifyCredentials, verifyToken } from "../src/lib/auth-store";

function createTempDataDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "campus-vector-db-"));
}

test("vector-core：嵌入确定性、空文本与自相似度", () => {
  const left = embedText("笔记本风扇噪音很大，需要清灰");
  const right = embedText("笔记本风扇噪音很大，需要清灰");
  assert.equal(left.length, VECTOR_DIMENSION);
  assert.deepEqual(Array.from(left), Array.from(right));
  assert.equal(embedText("").every((value) => value === 0), true);
  assert.equal(embedText("   ").every((value) => value === 0), true);
  assert.ok(cosineSimilarity(left, left) > 0.999);
});

test("vector-core：语义相近文本相似度高于无关文本", () => {
  const query = embedText("风扇异响 发热");
  const related = embedText("笔记本风扇噪音大，机身发热，需要清灰");
  const unrelated = embedText("如何申请奖学金与助学金");
  assert.ok(cosineSimilarity(query, related) > cosineSimilarity(query, unrelated));
});

test("vector-core：分片保留内容且不产生空片", () => {
  const text = "第一段讲清灰步骤。\n\n第二段讲验收标准，温度不超 85 摄氏度。";
  const chunks = splitIntoChunks(text, 20, 5);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks.every((chunk) => chunk.trim().length > 0));
  assert.ok(chunks.join("").includes("清灰"));
});

test("本地向量库：种子初始化、检索与分类浏览", () => {
  const dataDir = createTempDataDir();
  const db = new LocalVectorDb(dataDir);

  // 首次运行自动写入种子资料（8 篇图文 + 4 个视频课件）。
  assert.equal(db.stats.documents, 12);
  assert.ok(db.stats.chunks >= 12);

  const hits = db.search("风扇异响怎么处理", 5);
  assert.ok(hits.length > 0);
  assert.ok(hits[0].score > 0.04);
  assert.ok(hits.every((hit) => hit.score <= 1));

  // 视频课件的内容（字幕）也应可被检索到。
  const videoHits = db.search("清灰 硅脂 实操", 8);
  assert.ok(videoHits.some((hit) => hit.document.kind === "video"));

  const systemDocs = db.listByCategory("系统维护");
  assert.ok(systemDocs.length > 0);
  assert.ok(systemDocs.every((document) => document.category === "系统维护"));

  // 混合检索：关键词加权让「散热异响」精确命中文档，而不是仅靠字面重叠的无关文档。
  const heatHits = db.search("散热异响怎么处理", 5);
  assert.equal(heatHits[0]?.document.id, "doc-heat-pipe");
  assert.ok(heatHits[0].score <= 0.99);

  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("本地向量库：新增、去重与落盘持久化", () => {
  const dataDir = createTempDataDir();
  const db = new LocalVectorDb(dataDir);

  const created = db.addDocument({
    title: "电池鼓包更换流程",
    content: "发现电池鼓包后立即停用，断电后拆后盖，按排线顺序更换电池并登记序列号。",
    category: "硬件维修",
    tags: ["电池", "拆机"],
  });
  assert.equal(db.getDocument(created.id)?.title, "电池鼓包更换流程");

  // 同一 id 重复添加不产生重复分片。
  const chunksBefore = db.stats.chunks;
  db.addDocument({
    id: created.id,
    title: "电池鼓包更换流程（更新）",
    content: "更新后的内容：停用、断电、更换、登记。",
  });
  assert.equal(db.getDocument(created.id)?.title, "电池鼓包更换流程（更新）");
  assert.ok(db.stats.documents === 13);

  // 新实例从磁盘恢复索引。
  const reloaded = new LocalVectorDb(dataDir);
  assert.equal(reloaded.stats.documents, 13);
  const hits = reloaded.search("电池鼓包", 3);
  assert.ok(hits.length > 0);
  assert.equal(hits[0].document.id, created.id);

  // 删除后同步移除分片：被删资料不再出现在检索结果中。
  assert.equal(reloaded.removeDocument(created.id), true);
  assert.equal(reloaded.getDocument(created.id), null);
  assert.ok(reloaded.search("电池鼓包", 5).every((hit) => hit.document.id !== created.id));

  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("鉴权：默认演示账号校验与错误口令拒绝", () => {
  const admin = verifyCredentials("admin", "admin", "admin123");
  assert.equal(admin?.role, "admin");
  assert.equal(admin?.displayName, "系统管理员");

  const tech = verifyCredentials("technician", "tech", "tech123");
  assert.equal(tech?.role, "technician");

  assert.equal(verifyCredentials("admin", "admin", "wrong-password"), null);
  assert.equal(verifyCredentials("admin", "tech", "tech123"), null);
  assert.equal(verifyCredentials("technician", "admin", "admin123"), null);
  assert.equal(verifyCredentials("admin", "", ""), null);
});

test("鉴权：令牌签发、校验与篡改拒绝", () => {
  const account = {
    username: "tech",
    displayName: "维修员 · 王浩",
    role: "technician" as const,
  };
  const { token, session } = issueToken(account);
  assert.equal(session.expiresAt > session.issuedAt, true);

  const verified = verifyToken(token);
  assert.equal(verified?.username, "tech");
  assert.equal(verified?.role, "technician");

  assert.equal(verifyToken(`${token}x`), null);
  assert.equal(verifyToken("not-a-token"), null);
  assert.equal(verifyToken(""), null);
  assert.equal(verifyToken(null), null);

  // 重放签名不匹配的载荷应被拒绝。
  const [payload] = token.split(".");
  const forged = `${payload}.${"0".repeat(64)}`;
  assert.equal(verifyToken(forged), null);
});

test("鉴权：过期令牌被拒绝", () => {
  const account = {
    username: "admin",
    displayName: "系统管理员",
    role: "admin" as const,
  };
  const { token } = issueToken(account);

  // 把系统时间推到 8 小时以后，令牌应判定过期。
  const realNow = Date.now;
  Date.now = () => realNow() + 9 * 60 * 60 * 1000;
  try {
    assert.equal(verifyToken(token), null);
  } finally {
    Date.now = realNow;
  }
});
