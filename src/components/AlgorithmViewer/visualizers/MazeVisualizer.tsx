import { useContainerSize } from '../../../hooks/useContainerSize'
import type { MazeState, MazeCellStatus } from '../../../algorithms/types'

interface MazeVisualizerProps {
  state: MazeState | null
}

function cellFill(status: MazeCellStatus): string {
  switch (status) {
    case 'wall':    return '#1a1a2e'
    case 'path':    return '#4a9eff33'
    case 'current': return '#f59e0b'
    case 'visited': return '#22c55e33'
  }
}

function cellStroke(status: MazeCellStatus): string {
  switch (status) {
    case 'wall':    return '#0f0f1a'
    case 'path':    return '#4a9eff44'
    case 'current': return '#f59e0b'
    case 'visited': return '#22c55e44'
  }
}

export function MazeVisualizer({ state }: MazeVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { grid, rows, cols } = state
  const cellSize = Math.min(
    Math.floor((width - 4) / cols),
    Math.floor((height - 4) / rows),
    24,
  )

  const svgW = cols * cellSize
  const svgH = rows * cellSize
  const offsetX = (width - svgW) / 2
  const offsetY = (height - svgH) / 2

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      <svg width={width} height={height}>
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {grid.map((row, r) =>
            row.map((status, c) => (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill={cellFill(status)}
                stroke={cellStroke(status)}
                strokeWidth={0.5}
              />
            ))
          )}
        </g>

        {/* 凡例 */}
        <g transform={`translate(8, ${height - 18})`}>
          <rect x={0} y={0} width={10} height={10} fill="#1a1a2e" />
          <text x={13} y={9} fontSize={9} fill="#858585">壁 Wall</text>
          <rect x={65} y={0} width={10} height={10} fill="#4a9eff33" />
          <text x={78} y={9} fontSize={9} fill="#858585">通路 Path</text>
          <rect x={130} y={0} width={10} height={10} fill="#f59e0b" />
          <text x={143} y={9} fontSize={9} fill="#858585">現在地 Current</text>
        </g>
      </svg>
    </div>
  )
}
