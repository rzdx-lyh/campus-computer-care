/**
 * 用途：根据诊断类型生成简易 SVG 操作示意图，帮助用户理解安全排查动作。
 */
import { Icon } from '@/components/icon';
import type { DiagnosisResult } from '@/lib/types';

type DiagramKind = 'power' | 'display' | 'network' | 'cooling' | 'system' | 'peripheral';

function getDiagramKind(result: DiagnosisResult): DiagramKind {
  const text = [
    result.summary,
    ...result.likelyCauses,
    ...result.suggestedActions,
    ...(result.sources ?? []).map((source) => `${source.faultType} ${source.title ?? ''}`),
  ].join(' ');

  if (/风扇|散热|发热|温度|清灰/.test(text)) return 'cooling';
  if (/wifi|wi-fi|网络|断网|认证|路由器/i.test(text)) return 'network';
  if (/蓝屏|系统|重启|驱动|错误码|更新/.test(text)) return 'system';
  if (/键盘|鼠标|接口|usb|外设/i.test(text)) return 'peripheral';
  if (/屏幕|黑屏|显示器|花屏|画面|背光/.test(text)) return 'display';
  return 'power';
}

function DiagramArt({ kind }: { kind: DiagramKind }) {
  const stroke = '#1e458a';
  const accent = '#3892f6';
  const warm = '#f59e0b';

  return (
    <svg viewBox="0 0 320 190" className="h-auto w-full" role="img" aria-label="操作示意图">
      <defs>
        <linearGradient id="screen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#dbeefe" />
          <stop offset="100%" stopColor="#eff8ff" />
        </linearGradient>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill={accent} />
        </marker>
      </defs>

      {kind === 'cooling' ? (
        <>
          <rect x="52" y="54" width="216" height="105" rx="14" fill="url(#screen)" stroke={stroke} strokeWidth="3" />
          <rect x="38" y="155" width="244" height="10" rx="5" fill="#bfe1fe" />
          <circle cx="160" cy="103" r="31" fill="white" stroke={accent} strokeWidth="3" />
          <path d="M160 83c11 5 14 13 8 19-5 5-13 2-16-5M179 113c-4 11-12 15-19 10-6-4-4-13 3-17M142 120c-11-3-16-10-11-18 4-7 13-5 17 1" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <path d="M87 76c-13 8-18 20-13 31M232 76c13 8 18 20 13 31" fill="none" stroke={warm} strokeWidth="5" strokeLinecap="round" />
          <path d="M76 117h-20M264 117h-20" stroke={accent} strokeWidth="3" markerEnd="url(#arrow)" />
          <text x="160" y="48" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">保持通风 · 先关闭高负载程序</text>
          <text x="160" y="182" textAnchor="middle" fill="#64748b" fontSize="10">不要遮挡散热口，异常时停止使用</text>
        </>
      ) : null}

      {kind === 'network' ? (
        <>
          <rect x="52" y="92" width="102" height="65" rx="9" fill="url(#screen)" stroke={stroke} strokeWidth="3" />
          <rect x="84" y="157" width="38" height="5" rx="2" fill="#bfe1fe" />
          <rect x="209" y="118" width="63" height="38" rx="9" fill="white" stroke={stroke} strokeWidth="3" />
          <circle cx="225" cy="137" r="3" fill="#10b981" />
          <circle cx="239" cy="137" r="3" fill="#10b981" />
          <path d="M252 132v10M188 105c13-13 34-13 47 0M199 116c8-8 19-8 27 0M213 127c1-1 2-1 3 0" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <path d="M154 126h55" stroke={accent} strokeWidth="3" strokeDasharray="5 5" markerEnd="url(#arrow)" />
          <text x="160" y="42" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">检查 Wi-Fi 开关与校园网认证</text>
          <text x="160" y="61" textAnchor="middle" fill="#64748b" fontSize="10">先重启网络，再更换设备交叉测试</text>
        </>
      ) : null}

      {kind === 'system' ? (
        <>
          <rect x="53" y="42" width="214" height="117" rx="12" fill="url(#screen)" stroke={stroke} strokeWidth="3" />
          <rect x="132" y="159" width="56" height="7" rx="3" fill="#bfe1fe" />
          <circle cx="160" cy="100" r="28" fill="#eff6ff" stroke={accent} strokeWidth="3" />
          <path d="M160 84v21M160 114h.1" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
          <path d="M239 70c13 9 18 22 13 36M68 70c-13 9-18 22-13 36" fill="none" stroke={warm} strokeWidth="4" strokeLinecap="round" />
          <text x="160" y="30" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">记录错误码 · 安全模式排查驱动</text>
          <text x="160" y="181" textAnchor="middle" fill="#64748b" fontSize="10">先备份重要数据，再进行系统修复</text>
        </>
      ) : null}

      {kind === 'peripheral' ? (
        <>
          <rect x="50" y="83" width="220" height="70" rx="10" fill="white" stroke={stroke} strokeWidth="3" />
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((column) => (
              <rect
                key={`${row}-${column}`}
                x={62 + column * 24}
                y={94 + row * 17}
                width="18"
                height="12"
                rx="3"
                fill={row === 1 && column === 4 ? '#fde68a' : '#eff8ff'}
                stroke={row === 1 && column === 4 ? warm : '#bfe1fe'}
                strokeWidth="1.5"
              />
            )),
          )}
          <path d="M250 58c-11 7-14 17-9 26" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <text x="160" y="43" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">交叉测试按键与外接设备</text>
          <text x="160" y="177" textAnchor="middle" fill="#64748b" fontSize="10">先替换测试，判断硬件还是驱动问题</text>
        </>
      ) : null}

      {kind === 'display' ? (
        <>
          <rect x="42" y="52" width="145" height="94" rx="10" fill="url(#screen)" stroke={stroke} strokeWidth="3" />
          <rect x="92" y="146" width="45" height="6" rx="3" fill="#bfe1fe" />
          <rect x="197" y="69" width="82" height="60" rx="8" fill="#0f172a" stroke={stroke} strokeWidth="3" />
          <path d="M206 78h64M206 88h50M206 98h58" stroke="#5eb2fa" strokeWidth="4" strokeLinecap="round" />
          <path d="M187 103h8" stroke={accent} strokeWidth="3" markerEnd="url(#arrow)" />
          <text x="160" y="38" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">外接显示器交叉验证画面输出</text>
          <text x="160" y="181" textAnchor="middle" fill="#64748b" fontSize="10">外接有画面时重点检查屏线与屏幕</text>
        </>
      ) : null}

      {kind === 'power' ? (
        <>
          <rect x="58" y="55" width="204" height="102" rx="13" fill="url(#screen)" stroke={stroke} strokeWidth="3" />
          <rect x="44" y="157" width="232" height="9" rx="4" fill="#bfe1fe" />
          <circle cx="160" cy="104" r="27" fill="white" stroke={accent} strokeWidth="3" />
          <path d="M160 91v14M149 98a17 17 0 1 0 22 0" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M258 84c19 18 19 45 0 63M274 72c29 27 29 66 0 93" fill="none" stroke={warm} strokeWidth="3" strokeLinecap="round" opacity=".55" />
          <text x="160" y="42" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="700">确认供电 · 长按电源键释放静电</text>
          <text x="160" y="181" textAnchor="middle" fill="#64748b" fontSize="10">拆机、进液或焦糊味时请立即停止操作</text>
        </>
      ) : null}
    </svg>
  );
}

export function OperationDiagram({ result }: { result: DiagnosisResult }) {
  const kind = getDiagramKind(result);
  const steps = result.suggestedActions.slice(0, 3);

  return (
    <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Icon name="monitor" className="size-3.5 text-campus-600" />
          简易操作示意
        </p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
          AI 自动生成
        </span>
      </div>

      <div className="mt-3 grid items-center gap-3 sm:grid-cols-[220px_1fr]">
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-campus-50/60 p-2">
          <DiagramArt kind={kind} />
        </div>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-[11px] leading-5 text-slate-600">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-campus-50 text-[9px] font-bold text-campus-700">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
