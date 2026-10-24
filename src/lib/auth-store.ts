/**
 * 用途：管理员与维修员的账号密码鉴权（仅服务端使用，不随客户端打包）。
 * 说明：
 * - 账号口令不写入任何页面与客户端组件，页面表单只提交到 /api/auth/login 校验；
 * - 口令使用 node:crypto scrypt 加盐哈希，常量时间比较，不明文落盘；
 * - 登录成功后签发 HMAC 签名令牌（默认 8 小时有效），密钥优先取环境变量
 *   AUTH_SECRET，未配置时生成并持久化到 data/.auth-secret（已 gitignore）；
 * - 演示账号可用环境变量覆盖：AUTH_ADMIN_USERNAME / AUTH_ADMIN_PASSWORD /
 *   AUTH_TECHNICIAN_USERNAME / AUTH_TECHNICIAN_PASSWORD。
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type AuthRole = "technician" | "admin";

export interface AuthAccount {
  username: string;
  displayName: string;
  role: AuthRole;
}

export interface AuthSession {
  username: string;
  displayName: string;
  role: AuthRole;
  issuedAt: number;
  expiresAt: number;
}

interface AccountCredential extends AuthAccount {
  salt: string;
  passwordHash: string;
}

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const SECRET_FILE_NAME = ".auth-secret";

/** 内置演示账号（服务端默认值，可通过环境变量覆盖）。 */
const DEFAULT_ACCOUNTS: Array<AuthAccount & { password: string }> = [
  {
    username: process.env.AUTH_ADMIN_USERNAME || "admin",
    password: process.env.AUTH_ADMIN_PASSWORD || "admin123",
    displayName: "系统管理员",
    role: "admin",
  },
  {
    username: process.env.AUTH_TECHNICIAN_USERNAME || "tech",
    password: process.env.AUTH_TECHNICIAN_PASSWORD || "tech123",
    displayName: "维修员 · 王浩",
    role: "technician",
  },
];

function scryptHash(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

/** 每次调用按当前环境变量重新派生账号，保证改配置即生效。 */
function listCredentials(): AccountCredential[] {
  return DEFAULT_ACCOUNTS.map((account) => {
    const salt = `campus-care:${account.role}:${account.username}`;
    return {
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      salt,
      passwordHash: scryptHash(account.password, salt),
    };
  });
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/** 校验账号口令；成功返回账号信息，失败返回 null。 */
export function verifyCredentials(
  role: AuthRole,
  username: string,
  password: string,
): AuthAccount | null {
  const input = username.trim();
  if (!input || !password) return null;

  const account = listCredentials().find(
    (item) => item.role === role && item.username === input,
  );
  if (!account) return null;

  const candidate = scryptHash(password, account.salt);
  return safeEqualHex(candidate, account.passwordHash)
    ? { username: account.username, displayName: account.displayName, role: account.role }
    : null;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function getTokenSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;

  // 已持久化的密钥优先读回，保证重启后会话仍然有效。
  try {
    const filePath = path.join(process.cwd(), "data", SECRET_FILE_NAME);
    const existing = fs.readFileSync(filePath, "utf-8").trim();
    if (existing) return existing;
  } catch {
    // 密钥文件不存在时继续生成。
  }

  // 首次运行生成随机密钥并落盘。
  try {
    const generated = crypto.randomBytes(32).toString("hex");
    const filePath = path.join(process.cwd(), "data", SECRET_FILE_NAME);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, generated, "utf-8");
    return generated;
  } catch {
    // 只读环境退化为进程内随机密钥（重启后失效，仅影响演示体验）。
    return crypto.randomBytes(32).toString("hex");
  }
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getTokenSecret()).update(payload).digest("hex");
}

/** 签发登录令牌。 */
export function issueToken(account: AuthAccount): { token: string; session: AuthSession } {
  const now = Date.now();
  const session: AuthSession = {
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };

  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(payload);
  return { token: `${payload}.${signature}`, session };
}

/** 校验令牌；无效或过期返回 null。 */
export function verifyToken(token: string | undefined | null): AuthSession | null {
  if (!token || typeof token !== "string") return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }

  const signatureBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(expected, "utf-8");
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AuthSession;
    if (
      !session ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt < Date.now() ||
      (session.role !== "technician" && session.role !== "admin") ||
      typeof session.username !== "string"
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
