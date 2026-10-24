import type { Ticket } from "@/lib/types";

export const TICKETS_CSV_BOM = "\uFEFF";

const COLUMNS: Array<keyof Pick<
  Ticket,
  "id" | "title" | "deviceType" | "dorm" | "status" | "priority" | "createdAt" | "repairNote"
>> = [
  "id",
  "title",
  "deviceType",
  "dorm",
  "status",
  "priority",
  "createdAt",
  "repairNote",
];

function escapeCsvValue(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildTicketsCsv(tickets: Ticket[]): string {
  const header = COLUMNS.map((column) => escapeCsvValue(column)).join(",");
  const rows = tickets.map((ticket) =>
    COLUMNS.map((column) => escapeCsvValue(ticket[column])).join(","),
  );
  return [header, ...rows].join("\r\n");
}

export function exportTicketsCsv(tickets: Ticket[]): void {
  if (typeof window === "undefined") return;

  const csv = buildTicketsCsv(tickets);
  const blob = new Blob([`${TICKETS_CSV_BOM}${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `校园电脑管家-工单-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

