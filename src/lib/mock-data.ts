/**
 * 用途：提供首次打开系统时展示的校园维修演示工单。
 */
import type { Ticket } from "@/lib/types";

export const DEMO_TICKETS: Ticket[] = [
  {
    id: "TICKET-20261018-001",
    title: "宿舍 Wi-Fi 频繁掉线",
    description: "连接宿舍 Wi-Fi 后每隔十分钟左右自动断开，重新连接后速度也很慢。",
    deviceType: "笔记本电脑",
    dorm: "紫荆 3 号楼 402",
    photo: "",
    status: "pending",
    priority: "high",
    createdAt: "2026-10-18T09:25:00.000Z",
    repairNote: "",
    appointment: "2026-10-20 14:00-16:00",
  },
  {
    id: "TICKET-20261017-002",
    title: "开机后风扇噪音很大",
    description: "电脑开机约五分钟后风扇持续高速转动，机身左侧明显发热。",
    deviceType: "笔记本电脑",
    dorm: "丁香 1 号楼 215",
    photo: "",
    status: "repairing",
    priority: "medium",
    createdAt: "2026-10-17T12:40:00.000Z",
    repairNote: "已接单，初步判断为散热口积尘，等待上门清理。",
    appointment: "2026-10-19 09:00-11:00",
  },
  {
    id: "TICKET-20261016-003",
    title: "系统更新后频繁蓝屏",
    description: "Windows 更新完成后，打开大型软件时会蓝屏并自动重启，错误代码暂未记录。",
    deviceType: "台式电脑",
    dorm: "梧桐 5 号楼 108",
    photo: "",
    status: "completed",
    priority: "high",
    createdAt: "2026-10-16T03:15:00.000Z",
    repairNote: "已回滚冲突驱动并完成系统稳定性测试。",
    appointment: "2026-10-17 15:00-17:00",
  },
  {
    id: "TICKET-20261015-004",
    title: "键盘部分按键失灵",
    description: "键盘右侧数字键和退格键偶尔没有响应，外接键盘使用正常。",
    deviceType: "笔记本电脑",
    dorm: "紫荆 6 号楼 318",
    photo: "",
    status: "pending",
    priority: "low",
    createdAt: "2026-10-15T07:30:00.000Z",
    repairNote: "",
    appointment: "2026-10-21 10:00-12:00",
  },
];
