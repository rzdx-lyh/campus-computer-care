/**
 * 用途：维修员上传给管理员的后台数据存储（仅服务端使用）。
 * 说明：维修员在工作台把工单统计与明细上传为「后台数据」，管理员在看板查看；
 * 数据持久化到 data/repair-reports.json，重启不丢失；只读环境退化为进程内存储。
 */

import fs from "node:fs";
import path from "node:path";

export interface RepairReportStats {
  total: number;
  pending: number;
  repairing: number;
  completed: number;
  completionRate: number;
  averageRating: number;
  ratingCount: number;
}

export interface RepairReportTicketItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dorm: string;
  repairNote: string;
}

export interface RepairReport {
  id: string;
  technician: string;
  username: string;
  createdAt: string;
  scope: string;
  note: string;
  stats: RepairReportStats;
  tickets: RepairReportTicketItem[];
}

const FILE_NAME = "repair-reports.json";
const MAX_REPORTS = 50;

function filePath(): string {
  return path.join(process.cwd(), "data", FILE_NAME);
}

function readReports(): RepairReport[] {
  try {
    const raw = fs.readFileSync(filePath(), "utf-8");
    const parsed = JSON.parse(raw) as RepairReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReports(reports: RepairReport[]): void {
  try {
    const target = filePath();
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(reports, null, 2), "utf-8");
  } catch {
    // 只读文件系统时保留进程内数据（演示可接受，重启丢失）。
  }
}

/** 读取全部上传记录（新的在前）。 */
export function listRepairReports(): RepairReport[] {
  return readReports().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/** 追加一条上传记录并返回。 */
export function addRepairReport(
  input: Omit<RepairReport, "id" | "createdAt">,
): RepairReport {
  const report: RepairReport = {
    ...input,
    id: `REPORT-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };

  const reports = readReports();
  reports.push(report);
  writeReports(reports.slice(-MAX_REPORTS));
  return report;
}
