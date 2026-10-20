/**
 * 用途：封装工单的 LocalStorage 读写、初始化和状态流转工具。
 */
import { DEMO_TICKETS } from "@/lib/mock-data";
import type { Ticket, TicketStatus } from "@/lib/types";

const TICKETS_KEY = "campus-computer-care:tickets";

export function getStoredTickets(): Ticket[] {
  if (typeof window === "undefined") {
    return DEMO_TICKETS.map((ticket) => ({ ...ticket }));
  }

  const rawTickets = window.localStorage.getItem(TICKETS_KEY);
  if (rawTickets === null) {
    window.localStorage.setItem(TICKETS_KEY, JSON.stringify(DEMO_TICKETS));
    return DEMO_TICKETS.map((ticket) => ({ ...ticket }));
  }

  try {
    const tickets = JSON.parse(rawTickets) as Ticket[];
    return Array.isArray(tickets) ? tickets : [];
  } catch {
    return [];
  }
}

export function saveStoredTickets(tickets: Ticket[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export function addStoredTicket(ticket: Ticket): void {
  const tickets = getStoredTickets();
  saveStoredTickets([ticket, ...tickets]);
}

export function updateStoredTicket(
  id: string,
  patch: Partial<Pick<Ticket, "status" | "repairNote" | "evaluation">>,
): void {
  const tickets = getStoredTickets().map((ticket) =>
    ticket.id === id ? { ...ticket, ...patch } : ticket,
  );
  saveStoredTickets(tickets);
}

export function getNextTicketStatus(status: TicketStatus): TicketStatus {
  if (status === "pending") return "repairing";
  if (status === "repairing") return "completed";
  return "completed";
}

export function createTicketId(): string {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TICKET-${datePart}-${randomPart}`;
}

export function getEvaluationStats(tickets: Ticket[]): { average: number; count: number } {
  const evaluations = tickets
    .map((ticket) => ticket.evaluation)
    .filter((evaluation): evaluation is NonNullable<Ticket["evaluation"]> => Boolean(evaluation));

  if (evaluations.length === 0) return { average: 0, count: 0 };

  const total = evaluations.reduce((sum, evaluation) => sum + evaluation.rating, 0);
  return {
    average: Math.round((total / evaluations.length) * 10) / 10,
    count: evaluations.length,
  };
}
