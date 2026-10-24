export type UserRole = "student" | "technician" | "admin";

export type TicketStatus = "pending" | "repairing" | "completed";

export type TicketPriority = "low" | "medium" | "high";

export type TicketRating = 1 | 2 | 3 | 4 | 5;

export interface TicketEvaluation {
  rating: TicketRating;
  comment: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  deviceType: string;
  dorm: string;
  photo: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  repairNote: string;
  appointment?: string;
  evaluation?: TicketEvaluation;
}

export interface RepairAdvice {
  summary: string;
  causes: string[];
  parts: string[];
  estimate: string;
  steps: string[];
  degraded?: boolean;
}

export type DiagnosisSourceKind = "knowledge_base" | "web";

export interface DiagnosisSource {
  id: string;
  faultType: string;
  matchedKeywords: string[];
  confidence: number;
  score: number;
  kind?: DiagnosisSourceKind;
  title?: string;
  url?: string;
  siteName?: string;
  snippet?: string;
  publishedAt?: string;
}

export interface DiagnosisResult {
  summary: string;
  riskLevel: "low" | "medium" | "high";
  likelyCauses: string[];
  suggestedActions: string[];
  needRepair: boolean;
  informationSufficient?: boolean;
  followUpQuestions?: string[];
  sources?: DiagnosisSource[];
  ragConfidence?: number;
  webSearchUsed?: boolean;
  degraded?: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface DeviceMetric {
  id: string;
  label: string;
  value: string;
  description: string;
  supported: boolean;
}

export interface DiagnosisStreamEvent {
  type: "delta" | "result" | "error";
  text?: string;
  result?: DiagnosisResult;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: DiagnosisResult;
  sourceDescription?: string;
}





