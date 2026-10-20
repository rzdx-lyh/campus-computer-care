/**
 * 用途：故障知识图谱页，使用纯 SVG 展示故障类型、知识条目、现象和原因节点。
 */
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import rawKnowledgeBase from "../../../knowledge-base/data/knowledge_base.json";

interface KnowledgeEntry {
  故障类型: string;
  现象关键词: string[];
  追问问题: string[];
  可能原因: string[];
  排查步骤: string[];
  紧急程度: string;
}

const KNOWLEDGE_BASE = rawKnowledgeBase as KnowledgeEntry[];
const COLORS = ["#2273eb", "#0891b2", "#0d9488", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#7c3aed", "#475569"];
const ROW_HEIGHT = 142;
const TOP = 72;

function wrapLines(text: string, maxChars: number, maxLines = 2): string[] {
  const characters = Array.from(text);
  const lines: string[] = [];
  let current = "";

  for (const character of characters) {
    if ((current + character).length > maxChars && current) {
      lines.push(current);
      current = character;
      if (lines.length === maxLines) break;
    } else {
      current += character;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && characters.length > lines.join("").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return lines;
}

function diagnosisHref(query: string): string {
  return `/diagnosis?q=${encodeURIComponent(query.slice(0, 500))}`;
}

function GraphText({
  lines,
  x,
  y,
  className,
  anchor = "start",
}: {
  lines: string[];
  x: number;
  y: number;
  className: string;
  anchor?: "start" | "middle";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={className}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : 17}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export default function GraphPage() {
  const grouped = new Map<string, KnowledgeEntry[]>();
  for (const entry of KNOWLEDGE_BASE) {
    const list = grouped.get(entry.故障类型) ?? [];
    list.push(entry);
    grouped.set(entry.故障类型, list);
  }

  const categories = Array.from(grouped.entries()).map(([type, entries], categoryIndex) => ({
    type,
    entries,
    color: COLORS[categoryIndex % COLORS.length],
  }));

  let rowIndex = 0;
  const rows = categories.flatMap((category) =>
    category.entries.map((entry) => {
      const row = {
        entry,
        category,
        y: TOP + rowIndex * ROW_HEIGHT,
        index: rowIndex,
      };
      rowIndex += 1;
      return row;
    }),
  );

  const height = TOP + rows.length * ROW_HEIGHT + 50;
  const categoryPositions = categories.map((category) => {
    const categoryRows = rows.filter((row) => row.category.type === category.type);
    const first = categoryRows[0]?.y ?? TOP;
    const last = categoryRows[categoryRows.length - 1]?.y ?? first;
    return {
      ...category,
      y: (first + last) / 2 + 22,
      rows: categoryRows,
    };
  });

  return (
    <div>
      <PageHeader
        eyebrow="FAULT KNOWLEDGE GRAPH"
        title="故障知识图谱"
        description="把 10 类校园电脑故障、25 条知识条目以及现象与原因关联起来。点击任意节点可带着问题进入 AI 诊断。"
        action={
          <Link href="/diagnosis" className="primary-button">
            <Icon name="sparkles" className="size-4" />
            打开 AI 诊断
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["10", "故障类型", "开机、蓝屏、网络、散热等"],
          ["25", "知识条目", "来自 knowledge_base.json"],
          ["50+", "现象与原因节点", "点击即可进入诊断"],
        ].map(([value, label, note]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-campus-700">{value}</span>
              <span className="text-xs font-bold text-slate-700">{label}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{note}</p>
          </div>
        ))}
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">知识关系图</h2>
            <p className="mt-1 text-[11px] text-slate-400">左侧为故障类型，中间为知识条目，右侧为现象与可能原因</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-campus-600" />故障类型</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-white ring-1 ring-campus-300" />知识条目</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-sky-100" />现象</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-100" />原因</span>
          </div>
        </div>

        <div className="overflow-x-auto bg-gradient-to-br from-slate-50/80 via-white to-campus-50/30">
          <svg
            viewBox={`0 0 1360 ${height}`}
            style={{ minWidth: 1080, width: "100%", height: "auto" }}
            role="img"
            aria-label="校园电脑故障知识图谱"
          >
            <defs>
              <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#1e458a" floodOpacity="0.12" />
              </filter>
            </defs>

            {categoryPositions.map((category) => (
              <g key={`category-lines-${category.type}`}>
                {category.rows.map((row) => (
                  <path
                    key={`category-line-${row.entry.故障类型}-${row.index}`}
                    d={`M 226 ${category.y} C 260 ${category.y}, 260 ${row.y + 44}, 292 ${row.y + 44}`}
                    fill="none"
                    stroke={category.color}
                    strokeWidth="1.5"
                    opacity="0.35"
                  />
                ))}
              </g>
            ))}

            {rows.map((row) => {
              const phenomenon = row.entry.现象关键词[0] ?? "未记录现象";
              const cause = row.entry.可能原因[0] ?? "未记录原因";
              return (
                <g key={`${row.entry.故障类型}-${row.index}`}>
                  <path
                    d={`M 570 ${row.y + 44} C 610 ${row.y + 44}, 610 ${row.y + 36}, 646 ${row.y + 36}`}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    opacity="0.55"
                  />
                  <path
                    d={`M 570 ${row.y + 44} C 620 ${row.y + 44}, 920 ${row.y + 36}, 1006 ${row.y + 36}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    opacity="0.45"
                  />

                  <a href={diagnosisHref(`${row.entry.故障类型} ${phenomenon}`)} aria-label={`诊断知识条目 ${row.entry.故障类型}`}>
                    <g filter="url(#node-shadow)" className="cursor-pointer">
                      <rect x="292" y={row.y} width="278" height="88" rx="15" fill="#ffffff" stroke={row.category.color} strokeWidth="1.5" />
                      <circle cx="314" cy={row.y + 24} r="5" fill={row.category.color} />
                      <GraphText
                        lines={wrapLines(row.entry.故障类型, 14, 2)}
                        x={330}
                        y={row.y + 26}
                        className="fill-slate-800 text-[12px] font-bold"
                      />
                      <GraphText
                        lines={wrapLines(phenomenon, 24, 2)}
                        x={310}
                        y={row.y + 56}
                        className="fill-slate-400 text-[10px]"
                      />
                      <text x="548" y={row.y + 79} textAnchor="end" className="fill-campus-600 text-[9px] font-semibold">点击诊断 →</text>
                    </g>
                  </a>

                  <a href={diagnosisHref(phenomenon)} aria-label={`诊断现象 ${phenomenon}`}>
                    <g filter="url(#node-shadow)" className="cursor-pointer">
                      <rect x="646" y={row.y + 3} width="312" height="66" rx="14" fill="#eff8ff" stroke="#92cefd" strokeWidth="1.3" />
                      <text x="664" y={row.y + 22} className="fill-sky-600 text-[9px] font-bold">现象节点</text>
                      <GraphText
                        lines={wrapLines(phenomenon, 22, 2)}
                        x={664}
                        y={row.y + 41}
                        className="fill-slate-700 text-[10px] font-medium"
                      />
                    </g>
                  </a>

                  <a href={diagnosisHref(`${row.entry.故障类型} ${cause}`)} aria-label={`诊断原因 ${cause}`}>
                    <g filter="url(#node-shadow)" className="cursor-pointer">
                      <rect x="1006" y={row.y + 3} width="300" height="66" rx="14" fill="#fffbeb" stroke="#fcd34d" strokeWidth="1.3" />
                      <text x="1024" y={row.y + 22} className="fill-amber-600 text-[9px] font-bold">可能原因</text>
                      <GraphText
                        lines={wrapLines(cause, 21, 2)}
                        x={1024}
                        y={row.y + 41}
                        className="fill-slate-700 text-[10px] font-medium"
                      />
                    </g>
                  </a>
                </g>
              );
            })}

            {categoryPositions.map((category) => (
              <a key={category.type} href={diagnosisHref(category.type)} aria-label={`诊断故障类型 ${category.type}`}>
                <g filter="url(#node-shadow)" className="cursor-pointer">
                  <rect x="48" y={category.y - 29} width="178" height="58" rx="17" fill={category.color} />
                  <GraphText
                    lines={wrapLines(category.type, 11, 2)}
                    x={137}
                    y={category.y - 3}
                    anchor="middle"
                    className="fill-white text-[12px] font-bold"
                  />
                  <text x="137" y={category.y + 19} textAnchor="middle" className="fill-white/70 text-[9px]">{category.entries.length} 条知识</text>
                </g>
              </a>
            ))}
          </svg>
        </div>
      </section>
    </div>
  );
}
