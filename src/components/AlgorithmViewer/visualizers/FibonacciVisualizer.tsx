import { useContainerSize } from '../../../hooks/useContainerSize'
import type { FibState } from '../../../algorithms/types'

interface FibonacciVisualizerProps {
  state: FibState | null
}

export function FibonacciVisualizer({ state }: FibonacciVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim">—</span>
      </div>
    )
  }

  const { values, current, using, done } = state
  const n = values.length - 1

  const cellWidth = Math.min(56, (width - 60) / values.length)
  const cellHeight = 52
  const tableStartX = (width - cellWidth * values.length) / 2
  const tableY = height * 0.4

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {/* 漸化式のラベル */}
        <text x={width / 2} y={tableY - 36} textAnchor="middle" fontSize={13} fill="#858585">
          F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)
        </text>

        {/* メモテーブル */}
        {values.map((val, idx) => {
          const cellX = tableStartX + idx * cellWidth
          const isCurrent = idx === current
          const isUsed = using !== null && (idx === using[0] || idx === using[1])
          const hasValue = val !== null

          // 状態に応じたセルの背景色・テキスト色を決定する
          let cellBg = 'transparent'
          let cellStroke = '#3e3e42'
          let textFill = '#858585'

          if (isCurrent) {
            cellBg = '#f59e0b'
            cellStroke = '#d97706'
            textFill = '#ffffff'
          } else if (isUsed) {
            cellBg = 'rgba(168,85,247,0.3)'
            cellStroke = '#a855f7'
            textFill = '#c084fc'
          } else if (hasValue) {
            cellBg = 'rgba(34,197,94,0.15)'
            cellStroke = '#22c55e'
            textFill = '#86efac'
          }

          return (
            <g key={idx}>
              <text x={cellX + cellWidth / 2} y={tableY - 8}
                textAnchor="middle" fontSize={10} fill="#6b7280">
                F({idx})
              </text>
              <rect x={cellX + 1} y={tableY} width={cellWidth - 2} height={cellHeight}
                fill={cellBg} stroke={cellStroke} strokeWidth={1.5} rx={4} />
              <text x={cellX + cellWidth / 2} y={tableY + cellHeight / 2 + 5}
                textAnchor="middle" fontSize={Math.min(16, cellWidth * 0.5)} fontWeight="600"
                fill={textFill}>
                {val !== null ? val : '?'}
              </text>
            </g>
          )
        })}

        {/* using[0] と using[1] が current の計算に使われていることを矢印で示す */}
        {using && (
          <>
            <defs>
              <marker id="fibArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#a855f7" />
              </marker>
            </defs>
            {using.map((srcIdx, arrowIdx) => {
              const srcX = tableStartX + srcIdx * cellWidth + cellWidth / 2
              const tgtX = tableStartX + current * cellWidth + cellWidth / 2
              // 2 本の矢印が重ならないよう高さをずらす
              const midY = tableY - 32 - arrowIdx * 12
              return (
                <path key={arrowIdx}
                  d={`M${srcX},${tableY} Q${srcX},${midY} ${(srcX + tgtX) / 2},${midY} Q${tgtX},${midY} ${tgtX},${tableY}`}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="4,2"
                  markerEnd="url(#fibArrow)"
                />
              )
            })}
          </>
        )}

        {/* 計算完了時に結果を大きく表示する */}
        {done && (
          <text x={width / 2} y={tableY + cellHeight + 40}
            textAnchor="middle" fontSize={16} fontWeight="700" fill="#22c55e">
            F({n}) = {values[n]}
          </text>
        )}
      </svg>
    </div>
  )
}
