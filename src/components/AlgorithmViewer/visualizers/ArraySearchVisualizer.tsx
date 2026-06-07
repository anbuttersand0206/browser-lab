import { useContainerSize } from '../../../hooks/useContainerSize'
import type { LinearSearchState, BinarySearchState } from '../../../algorithms/types'

type SearchState = LinearSearchState | BinarySearchState

interface ArraySearchVisualizerProps {
  state: SearchState | null
  type: 'linearSearch' | 'binarySearch'
}

export function ArraySearchVisualizer({ state, type }: ArraySearchVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim">—</span>
      </div>
    )
  }

  const { array, target } = state
  const cellWidth = Math.min(56, (width - 60) / array.length)
  const cellHeight = 52
  // セルを水平・垂直中央に配置する
  const startX = (width - cellWidth * array.length) / 2
  const startY = (height - cellHeight - 50) / 2

  function resolveCellBg(idx: number): string {
    if (type === 'linearSearch') {
      const s = state as LinearSearchState
      if (s.found === idx) return '#22c55e'
      if (s.current === idx) return '#f59e0b'
      if (s.current > idx) return '#374151'
      return 'transparent'
    }

    // 二分探索
    const s = state as BinarySearchState
    if (s.found === idx) return '#22c55e'
    if (s.mid === idx) return '#a855f7'
    if (idx >= s.left && idx <= s.right) return 'rgba(59,130,246,0.2)'
    return 'transparent'
  }

  function resolveTextColor(idx: number): string {
    if (type === 'linearSearch') {
      const s = state as LinearSearchState
      if (s.found === idx || s.current === idx) return '#ffffff'
      if (s.current > idx) return '#4b5563'
      return '#cccccc'
    }

    const s = state as BinarySearchState
    if (s.found === idx || s.mid === idx) return '#ffffff'
    return '#cccccc'
  }

  function resolveStrokeColor(idx: number): string {
    if (type === 'binarySearch') {
      const s = state as BinarySearchState
      if (s.left === idx || s.right === idx) return '#3b82f6'
      if (s.mid === idx) return '#a855f7'
    }
    return '#3e3e42'
  }

  const bsState = type === 'binarySearch' ? (state as BinarySearchState) : null

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {/* 二分探索: 現在の探索範囲をハイライトする背景 */}
        {bsState && bsState.left <= bsState.right && (
          <rect
            x={startX + bsState.left * cellWidth}
            y={startY - 8}
            width={(bsState.right - bsState.left + 1) * cellWidth}
            height={cellHeight + 16}
            fill="rgba(59,130,246,0.08)"
            rx={6}
          />
        )}

        {/* 探索対象の値 */}
        <text x={width / 2} y={startY - 24} textAnchor="middle" fontSize={13} fill="#858585">
          target: <tspan fill="#4a9eff" fontWeight="600">{target}</tspan>
        </text>

        {/* 配列セル */}
        {array.map((val, idx) => {
          const cellX = startX + idx * cellWidth
          return (
            <g key={idx}>
              <rect
                x={cellX + 1}
                y={startY}
                width={cellWidth - 2}
                height={cellHeight}
                strokeWidth={1.5}
                rx={4}
                style={{
                  fill: resolveCellBg(idx),
                  stroke: resolveStrokeColor(idx),
                  transition: 'fill var(--algo-transition, 200ms) ease',
                }}
              />
              <text
                x={cellX + cellWidth / 2}
                y={startY + cellHeight / 2 + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight="600"
                fill={resolveTextColor(idx)}
              >
                {val}
              </text>
              {/* インデックス番号 */}
              <text x={cellX + cellWidth / 2} y={startY + cellHeight + 14}
                textAnchor="middle" fontSize={9} fill="#858585">
                {idx}
              </text>
            </g>
          )
        })}

        {/* 線形探索: 現在スキャン中のセルへの矢印 */}
        {type === 'linearSearch' && (() => {
          const s = state as LinearSearchState
          if (s.current < 0 || s.current >= array.length) return null
          return (
            <>
              <defs>
                <marker id="scanArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
                </marker>
              </defs>
              <line
                x1={startX + s.current * cellWidth + cellWidth / 2}
                y1={startY - 12}
                x2={startX + s.current * cellWidth + cellWidth / 2}
                y2={startY - 3}
                stroke="#f59e0b"
                strokeWidth={2}
                markerEnd="url(#scanArrow)"
              />
            </>
          )
        })()}

        {/* 二分探索: L / M / R ラベル */}
        {bsState && (
          <>
            {bsState.left >= 0 && bsState.left < array.length && (
              <text x={startX + bsState.left * cellWidth + cellWidth / 2} y={startY - 14}
                textAnchor="middle" fontSize={10} fill="#3b82f6">L</text>
            )}
            {bsState.mid !== null && bsState.mid >= 0 && bsState.mid < array.length && (
              <text x={startX + bsState.mid * cellWidth + cellWidth / 2} y={startY - 14}
                textAnchor="middle" fontSize={10} fill="#a855f7">M</text>
            )}
            {bsState.right >= 0 && bsState.right < array.length && (
              <text x={startX + bsState.right * cellWidth + cellWidth / 2} y={startY - 14}
                textAnchor="middle" fontSize={10} fill="#3b82f6">R</text>
            )}
          </>
        )}
      </svg>
    </div>
  )
}
