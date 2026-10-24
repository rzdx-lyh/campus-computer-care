"use client";

import { useMemo } from "react";
import { Icon } from "@/components/icon";
import { BUILDINGS, TECHNICIANS, recommendTechnician } from "@/lib/campus";

interface CampusMapProps {
  /** 宿舍楼号文本，例如「紫荆 3 号楼 402」 */
  dorm: string;
}

export function CampusMap({ dorm }: CampusMapProps) {
  const dispatch = useMemo(() => recommendTechnician(dorm), [dorm]);
  const studentId = dispatch?.studentBuilding.id ?? null;
  const recommendStationId = dispatch?.station.id ?? null;

  const pathD = dispatch
    ? `M ${dispatch.studentBuilding.x} ${dispatch.studentBuilding.y} L ${dispatch.station.x} ${dispatch.station.y}`
    : "";

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-campus-50 text-campus-700">
            <Icon name="building" className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">校园就近派单</h2>
            <p className="text-[10px] text-slate-400">按你的宿舍楼宇推荐最近空闲维修员</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-slate-50 to-white p-3">
        <svg viewBox="0 0 640 380" className="h-auto w-full" role="img" aria-label="校园宿舍楼与维修站地图">
          {/* 草坪底 */}
          <rect x="8" y="8" width="624" height="364" rx="20" fill="#f1f7ff" />
          {/* 主干道 */}
          <path d="M 8 182 H 632" stroke="#dbeafe" strokeWidth="14" strokeLinecap="round" />
          <path d="M 320 8 V 372" stroke="#dbeefe" strokeWidth="14" strokeLinecap="round" />

          {/* 推荐连线 */}
          {dispatch ? (
            <>
              <path
                id="dispatch-path"
                d={pathD}
                stroke="#2273eb"
                strokeWidth="3"
                strokeDasharray="6 6"
                fill="none"
              />
              <circle r="5" fill="#2273eb">
                <animateMotion dur="2.2s" repeatCount="indefinite" path={pathD} />
              </circle>
            </>
          ) : null}

          {/* 楼宇 */}
          {BUILDINGS.map((building) => {
            const isStudent = building.id === studentId;
            const isRecommend = building.id === recommendStationId;
            const fill = isStudent
              ? "rgba(124,108,255,0.22)"
              : isRecommend
                ? "rgba(16,185,129,0.22)"
                : building.isStation
                  ? "rgba(124,108,255,0.18)"
                  : "rgba(30,39,55,0.92)";
            const stroke = isStudent
              ? "#7c6cff"
              : isRecommend
                ? "#10b981"
                : building.isStation
                  ? "#7dd3fc"
                  : "#64748b";
            const strokeWidth = isStudent || isRecommend ? 3 : 1.5;
            return (
              <g key={building.id}>
                <rect
                  x={building.x - 38}
                  y={building.y - 26}
                  width="76"
                  height="52"
                  rx="10"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
                <rect x={building.x - 14} y={building.y - 40} width="28" height="14" rx="4" fill={stroke} />
                <text
                  x={building.x}
                  y={building.y - 2}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#e2e8f0"
                >
                  {building.name.replace(/ 号楼/g, "")}
                </text>
                <text x={building.x} y={building.y + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">
                  {building.isStation ? "维修驻点" : "宿舍楼"}
                </text>
                {isStudent ? (
                  <text x={building.x} y={building.y + 44} textAnchor="middle" fontSize="10" fontWeight="700" fill="#7c6cff">
                    你的位置
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* 维修员驻点标记 */}
          {TECHNICIANS.map((tech) => {
            const station = BUILDINGS.find((b) => b.id === tech.stationId);
            if (!station) return null;
            const color = tech.status === "available" ? "#10b981" : "#f59e0b";
            return (
              <g key={tech.id}>
                <circle cx={station.x + 30} cy={station.y - 26} r="12" fill={color} />
                <text
                  x={station.x + 30}
                  y={station.y - 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {tech.name.slice(0, 1)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex items-center justify-center gap-4 px-2 pb-1 pt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-[#10b981]" /> 空闲维修员
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-[#f59e0b]" /> 忙碌中
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full ring-2 ring-[#2273eb]" /> 你的楼宇
          </span>
        </div>
      </div>

      {/* 推荐结果 */}
      <div className="border-t border-slate-100 px-5 py-4">
        {dispatch ? (
          <div className="flex items-start gap-3 rounded-xl border border-campus-100 bg-campus-50/70 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-campus-600 text-sm font-bold text-white">
              {dispatch.technician.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">
                  {dispatch.technician.name}
                  <span className="ml-2 text-[10px] font-medium text-slate-400">
                    {dispatch.technician.status === "available" ? "空闲" : "忙碌"}
                  </span>
                </p>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {dispatch.eta}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-500">
                驻点 {dispatch.station.name} · 擅长 {dispatch.technician.skills.join("、")}
              </p>
              <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-4 text-campus-800">
                <Icon name="sparkles" className="mt-0.5 size-3 shrink-0 text-campus-600" />
                {dispatch.reason}
              </p>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs leading-5 text-slate-400">
            <Icon name="building" className="size-4 shrink-0" />
            在左侧填写宿舍楼号（如「紫荆 3 号楼」），即可自动推荐最近维修员。
          </p>
        )}
      </div>
    </section>
  );
}
