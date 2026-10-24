/**
 * 用途：校园地图与就近派单的纯逻辑层（无副作用，可直接单测）。
 * 说明：坐标为 SVG 画布（viewBox 640 x 380）中的位置，仅用于演示级距离估算。
 */

export type TechnicianStatus = "available" | "busy";

export interface CampusBuilding {
  /** 楼宇唯一标识 */
  id: string;
  /** 展示名称 */
  name: string;
  /** SVG 画布坐标（楼宇中心） */
  x: number;
  y: number;
  /** 用于从宿舍文本中匹配楼宇的关键词（命中其一即可） */
  keywords: string[];
  /** 是否为维修驻点 */
  isStation?: boolean;
}

export interface Technician {
  id: string;
  name: string;
  /** 所属驻点楼宇 id */
  stationId: string;
  skills: string[];
  status: TechnicianStatus;
  /** 当前在途工单数 */
  activeTickets: number;
}

export interface DispatchResult {
  technician: Technician;
  station: CampusBuilding;
  studentBuilding: CampusBuilding;
  /** 两点直线距离（画布坐标单位） */
  distance: number;
  /** 预计到场时长描述 */
  eta: string;
  /** 派单理由，用于前端展示 */
  reason: string;
}

export const BUILDINGS: CampusBuilding[] = [
  { id: "zj1", name: "紫荆 1 号楼", x: 96, y: 96, keywords: ["紫荆1", "紫荆 1"] },
  { id: "zj2", name: "紫荆 2 号楼", x: 208, y: 96, keywords: ["紫荆2", "紫荆 2"] },
  { id: "zj3", name: "紫荆 3 号楼", x: 320, y: 96, keywords: ["紫荆3", "紫荆 3"] },
  { id: "zj4", name: "紫荆 4 号楼", x: 432, y: 96, keywords: ["紫荆4", "紫荆 4"] },
  { id: "lt1", name: "兰亭 1 号楼", x: 96, y: 268, keywords: ["兰亭1", "兰亭 1"] },
  { id: "lt2", name: "兰亭 2 号楼", x: 208, y: 268, keywords: ["兰亭2", "兰亭 2"] },
  {
    id: "station",
    name: "工程中心维修站",
    x: 320,
    y: 268,
    keywords: ["工程中心", "维修站"],
    isStation: true,
  },
  { id: "hd1", name: "海德 1 号楼", x: 432, y: 268, keywords: ["海德1", "海德 1"] },
  { id: "hd2", name: "海德 2 号楼", x: 544, y: 268, keywords: ["海德2", "海德 2"] },
];

export const TECHNICIANS: Technician[] = [
  {
    id: "tech-wang",
    name: "王浩",
    stationId: "zj3",
    skills: ["笔记本清灰", "风扇异响", "拆机"],
    status: "available",
    activeTickets: 1,
  },
  {
    id: "tech-li",
    name: "李娜",
    stationId: "lt1",
    skills: ["网络故障", "系统重装", "驱动"],
    status: "available",
    activeTickets: 0,
  },
  {
    id: "tech-zhang",
    name: "张伟",
    stationId: "hd1",
    skills: ["主板维修", "硬盘恢复", "进水处理"],
    status: "busy",
    activeTickets: 3,
  },
  {
    id: "tech-chen",
    name: "陈静",
    stationId: "station",
    skills: ["综合诊断", "外设", "屏幕"],
    status: "available",
    activeTickets: 2,
  },
  {
    id: "tech-liu",
    name: "刘洋",
    stationId: "zj1",
    skills: ["外设", "屏幕更换", "接口"],
    status: "available",
    activeTickets: 1,
  },
];

function buildingById(id: string): CampusBuilding | undefined {
  return BUILDINGS.find((building) => building.id === id);
}

/** 从宿舍文本中识别楼宇；命中关键词即返回，优先靠前的楼宇。 */
export function matchBuilding(dorm: string): CampusBuilding | null {
  const text = dorm.trim();
  if (!text) return null;
  for (const building of BUILDINGS) {
    if (building.keywords.some((keyword) => text.includes(keyword))) {
      return building;
    }
  }
  return null;
}

function euclidean(a: CampusBuilding, b: CampusBuilding): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** 把画布距离估算为到场时长描述。 */
export function estimateEta(distance: number): string {
  const minutes = Math.max(3, Math.round(4 + distance / 18));
  return `约 ${minutes} 分钟`;
}

/**
 * 就近派单：在学生所在楼宇附近，优先选择空闲且距离最近的维修员。
 * 若全部忙碌，则退化为距离最近的维修员并提示。
 */
export function recommendTechnician(dorm: string): DispatchResult | null {
  const studentBuilding = matchBuilding(dorm);
  if (!studentBuilding) return null;

  const candidates = TECHNICIANS.map((technician) => {
    const station = buildingById(technician.stationId)!;
    return { technician, station, distance: euclidean(studentBuilding, station) };
  })
    .filter((item) => item.station)
    .sort((a, b) => {
      // 优先空闲，其次在途工单少，最后按距离
      const aScore = (a.technician.status === "available" ? 0 : 1) * 1000 + a.technician.activeTickets * 100 + a.distance;
      const bScore = (b.technician.status === "available" ? 0 : 1) * 1000 + b.technician.activeTickets * 100 + b.distance;
      return aScore - bScore;
    });

  const best = candidates[0];
  if (!best) return null;

  const allBusy = TECHNICIANS.every((technician) => technician.status === "busy");
  const reason = allBusy
    ? "当前全员忙碌，已为你安排距离最近的维修员"
    : best.technician.status === "busy"
      ? "最近空闲驻点已满负荷，已就近分配"
      : `距离你最近的空闲驻点（${best.station.name}）`;

  return {
    technician: best.technician,
    station: best.station,
    studentBuilding,
    distance: Math.round(best.distance),
    eta: estimateEta(best.distance),
    reason,
  };
}
