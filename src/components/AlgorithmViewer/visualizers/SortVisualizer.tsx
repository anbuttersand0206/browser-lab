import { useContainerSize } from '../../../hooks/useContainerSize'
import type { SortState } from '../../../algorithms/types'

interface SortVisualizerProps {
  state: SortState | null
}

// 各状態に対応するバーの色。優先順位: swapping > comparing > pivot > merging > sorted > normal
const BAR_COLORS = {
  normal:        '#4a9eff',
  comparing:     '#f59e0b',
  swapping:      '#ef4444',
  sorted:        '#22c55e',
  pivot:         '#a855f7',
  merging:       '#14b8a6',
  activeRangeBg: 'rgba(249,115,22,0.08)',
}

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: BAR_COLORS.normal,    label: 'normal' },
  { color: BAR_COLORS.comparing, label: 'compare' },
  { color: BAR_COLORS.swapping,  label: 'swap' },
  { color: BAR_COLORS.sorted,    label: 'sorted' },
  { color: BAR_COLORS.pivot,     label: 'pivot' },
  { color: BAR_COLORS.merging,   label: 'merge' },
]

// ラベルを表示する最小バー幅（これより狭いと重なって読めない）
const MIN_BAR_WIDTH_FOR_LABEL = 12

export function SortVisualizer({ state }: SortVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { array, comparing, swapping, sorted, pivot, merging, activeRange } = state
  const elementCount = array.length
  const maxValue = Math.max(...array, 1)

  // 左右の余白は大きめに取り、棒グラフが端に詰まって見えるのを防ぐ
  const paddingX = 40
  // 上部は値ラベル用に、下部は凡例用にスペースを確保する
  const paddingYTop = 28
  const paddingYBottom = 22
  const legendHeight = 16

  const barAreaWidth = width - paddingX * 2
  const barAreaHeight = height - paddingYTop - paddingYBottom - legendHeight

  // バー間のギャップは幅の 1.5% を基準とし、最小 2px を保証する
  const gapBetweenBars = Math.max(2, barAreaWidth * 0.015)
  const barWidth = Math.max(4, (barAreaWidth - gapBetweenBars * (elementCount - 1)) / elementCount)

  function resolveBarColor(idx: number): string {
    if (swapping.includes(idx))  return BAR_COLORS.swapping
    if (comparing.includes(idx)) return BAR_COLORS.comparing
    if (idx === pivot)           return BAR_COLORS.pivot
    if (merging.includes(idx))   return BAR_COLORS.merging
    if (sorted.includes(idx))    return BAR_COLORS.sorted
    return BAR_COLORS.normal
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height} className="h-full w-full">

        {/* アクティブ範囲の背景（マージ・クイックソートの処理スコープを示す） */}
        {activeRange && (
          <rect
            x={paddingX + activeRange[0] * (barWidth + gapBetweenBars)}
            y={paddingYTop - 6}
            width={(activeRange[1] - activeRange[0] + 1) * (barWidth + gapBetweenBars) - gapBetweenBars}
            height={barAreaHeight + 8}
            fill={BAR_COLORS.activeRangeBg}
            rx={4}
          />
        )}

        {array.map((val, idx) => {
          const barHeight = Math.max(2, (val / maxValue) * barAreaHeight)
          const barX = paddingX + idx * (barWidth + gapBetweenBars)
          const barY = paddingYTop + barAreaHeight - barHeight
          const color = resolveBarColor(idx)

          // ラベルのフォントサイズはバー幅に比例させる。
          // バーが広いほど数字も大きく、バーが狭い場合は非表示にして視認性を確保する。
          const labelFontSize = Math.max(9, Math.min(14, barWidth * 0.55))
          const showLabel = barWidth >= MIN_BAR_WIDTH_FOR_LABEL

          // バーが十分に高い場合はバー内部に値を表示し、低い場合は上に表示する
          const labelInsideBar = barHeight >= labelFontSize * 2
          const labelY = labelInsideBar
            ? barY + barHeight / 2 + labelFontSize * 0.4
            : barY - 3
          const labelFill = labelInsideBar ? 'rgba(255,255,255,0.9)' : color

          return (
            <g key={idx}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={Math.min(6, barWidth * 0.2)}
              />
              {showLabel && (
                <text
                  x={barX + barWidth / 2}
                  y={labelY}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fill={labelFill}
                >
                  {val}
                </text>
              )}
            </g>
          )
        })}

        {/* 凡例 */}
        <g transform={`translate(${paddingX}, ${height - legendHeight})`}>
          {LEGEND_ITEMS.map(({ color, label }, i) => (
            <g key={label} transform={`translate(${i * 70}, 0)`}>
              <rect width={10} height={10} fill={color} rx={1} />
              <text x={13} y={9} fontSize={9} fill="#858585">{label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
