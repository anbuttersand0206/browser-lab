import { useContainerSize } from '../../../hooks/useContainerSize'
import type { ScatterState } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

interface ScatterVisualizerProps {
  state: ScatterState | null
  // 'svm' = 決定境界・マージン表示, 'pca' = 主成分矢印表示
  mode: 'svm' | 'pca'
}

const CLASS_COLORS = ['#4a9eff', '#ef4444']
const SV_STROKE = '#f59e0b'

export function ScatterVisualizer({ state, mode }: ScatterVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()
  const { locale } = useI18n()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const pad = 30
  const plotW = width - pad * 2
  const plotH = height - pad * 2 - 20

  // データ座標 [0,1] → SVG 座標
  function toSvg(x: number, y: number): { x: number; y: number } {
    return { x: pad + x * plotW, y: pad + (1 - y) * plotH }
  }

  const { points, weights, bias, margin, mean, pc1, pc2, explained1, explained2, currentPointIndex } = state

  // SVM の決定境界 w0*x + w1*y + b = 0 を 2 点で描く
  function decisionBoundaryLine(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (!weights || bias === undefined) return null
    const [w0, w1] = weights

    if (Math.abs(w1) < 1e-10) {
      if (Math.abs(w0) < 1e-10) return null
      const x = -bias / w0
      const p1 = toSvg(x, 0)
      const p2 = toSvg(x, 1)
      return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }

    const y0 = (-w0 * 0 - bias) / w1
    const y1 = (-w0 * 1 - bias) / w1
    const p1 = toSvg(0, y0)
    const p2 = toSvg(1, y1)
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
  }

  const boundary = mode === 'svm' ? decisionBoundaryLine() : null

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {/* 軸 */}
        <rect x={pad} y={pad} width={plotW} height={plotH}
          fill="none" stroke="#333" strokeWidth={1} />

        {/* SVM: マージン帯 */}
        {mode === 'svm' && weights && bias !== undefined && margin !== undefined && margin > 0 && (() => {
          const [w0, w1] = weights
          const norm = Math.sqrt(w0 ** 2 + w1 ** 2)
          if (norm < 1e-10) return null
          return (
            <g opacity={0.15}>
              {[1, -1].map(sign => {
                const bShifted = bias + sign / norm
                if (Math.abs(w1) < 1e-10) {
                  const x = (-bShifted) / w0
                  const p1 = toSvg(x, 0); const p2 = toSvg(x, 1)
                  return <line key={sign} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" />
                }
                const y0 = (-w0 * 0 - bShifted) / w1
                const y1 = (-w0 * 1 - bShifted) / w1
                const p1 = toSvg(0, y0); const p2 = toSvg(1, y1)
                return <line key={sign} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4,3" />
              })}
            </g>
          )
        })()}

        {/* SVM: 決定境界線 */}
        {mode === 'svm' && boundary && (
          <line
            x1={boundary.x1} y1={boundary.y1}
            x2={boundary.x2} y2={boundary.y2}
            stroke="#a855f7" strokeWidth={2}
          />
        )}

        {/* PCA: 主成分矢印 */}
        {mode === 'pca' && mean && pc1 && (
          <g>
            {[
              { pc: pc1, color: '#f59e0b', label: `PC1 (${((explained1 ?? 0) * 100).toFixed(0)}%)` },
              ...(pc2 ? [{ pc: pc2, color: '#22c55e', label: `PC2 (${((explained2 ?? 0) * 100).toFixed(0)}%)` }] : []),
            ].map(({ pc, color, label }) => {
              const origin = toSvg(mean[0], mean[1])
              const tip = toSvg(mean[0] + pc[0], mean[1] + pc[1])
              const dx = tip.x - origin.x
              const dy = tip.y - origin.y
              const len = Math.sqrt(dx * dx + dy * dy)
              return (
                <g key={label}>
                  <defs>
                    <marker id={`arrow-${label}`} markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill={color} />
                    </marker>
                  </defs>
                  <line
                    x1={origin.x} y1={origin.y}
                    x2={tip.x} y2={tip.y}
                    stroke={color} strokeWidth={3}
                    markerEnd={`url(#arrow-${label})`}
                  />
                  <text
                    x={tip.x + (dx / len) * 12}
                    y={tip.y + (dy / len) * 12}
                    fontSize={10} fill={color} textAnchor="middle"
                  >
                    {label}
                  </text>
                </g>
              )
            })}
            {/* 平均点 */}
            <circle cx={toSvg(mean[0], mean[1]).x} cy={toSvg(mean[0], mean[1]).y} r={5}
              fill="#fff" stroke="#999" strokeWidth={1.5} />
          </g>
        )}

        {/* データポイント */}
        {points.map((p, i) => {
          const { x, y } = toSvg(p.x, p.y)
          const color = CLASS_COLORS[p.label] ?? '#999'
          const isCurrent = i === currentPointIndex
          const isSV = mode === 'svm' && p.isSupportVector

          return (
            <circle
              key={i}
              cx={x} cy={y} r={isCurrent ? 7 : 5}
              fill={color}
              fillOpacity={isCurrent ? 1 : 0.75}
              stroke={isSV ? SV_STROKE : 'rgba(0,0,0,0.3)'}
              strokeWidth={isSV ? 2 : 1}
            />
          )
        })}

        {/* 凡例 */}
        <g transform={`translate(${pad}, ${height - 15})`}>
          <circle cx={5} cy={5} r={5} fill={CLASS_COLORS[0]} />
          <text x={13} y={9} fontSize={9} fill="#858585">Class 0</text>
          <circle cx={65} cy={5} r={5} fill={CLASS_COLORS[1]} />
          <text x={73} y={9} fontSize={9} fill="#858585">Class 1</text>
          {mode === 'svm' && (
            <>
              <line x1={120} y1={5} x2={134} y2={5} stroke="#a855f7" strokeWidth={2} />
              <text x={138} y={9} fontSize={9} fill="#858585">{locale === 'ja' ? '決定境界' : 'Boundary'}</text>
              <circle cx={215} cy={5} r={4} fill="none" stroke={SV_STROKE} strokeWidth={2} />
              <text x={223} y={9} fontSize={9} fill="#858585">SV</text>
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
