import { useRef, useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import type { GridConfig, GridState, CellType } from '../../../algorithms/types'

interface GridVisualizerProps {
  algorithmId: string
  config: GridConfig
  state: GridState | null
  isRunning: boolean
  editMode: 'wall' | 'start' | 'goal'
  onEditModeChange: (mode: 'wall' | 'start' | 'goal') => void
  onCellClick: (r: number, c: number) => void
  onClearWalls: () => void
}

const CELL_COLORS = {
  // 設定セル（編集モード）
  empty: { bg: 'transparent', stroke: '#3e3e42' },
  wall: { bg: '#374151', stroke: '#4b5563' },
  start: { bg: '#22c55e', stroke: '#16a34a' },
  goal: { bg: '#ef4444', stroke: '#dc2626' },
  // オーバーレイ（実行モード）
  visited: { bg: 'rgba(59,130,246,0.35)', stroke: '#3b82f6' },
  frontier: { bg: 'rgba(6,182,212,0.5)', stroke: '#06b6d4' },
  current: { bg: '#f59e0b', stroke: '#d97706' },
  path: { bg: '#22c55e', stroke: '#16a34a' },
}

export function GridVisualizer({ algorithmId, config, state, isRunning, editMode, onEditModeChange, onCellClick, onClearWalls }: GridVisualizerProps) {
  const { t } = useI18n()
  const alg = t.algorithm
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 400, height: 400 })
  const isDragging = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        // コントロールバーの高さを除く
        setDims({ width, height: height - 44 })
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const { rows, cols, cells, start, goal } = config
  const cellSize = Math.floor(Math.min(dims.width / cols, dims.height / rows))
  const gridW = cellSize * cols
  const gridH = cellSize * rows
  const offsetX = (dims.width - gridW) / 2
  const offsetY = Math.max(0, (dims.height - gridH) / 2)

  function getCellAt(svgX: number, svgY: number): [number, number] | null {
    const c = Math.floor((svgX - offsetX) / cellSize)
    const r = Math.floor((svgY - offsetY) / cellSize)
    if (r >= 0 && r < rows && c >= 0 && c < cols) return [r, c]
    return null
  }

  function cellBg(r: number, c: number): { bg: string; stroke: string } {
    const cellType: CellType = cells[r][c]
    const isStart = start[0] === r && start[1] === c
    const isGoal = goal[0] === r && goal[1] === c

    if (state && isRunning) {
      const overlay = state.overlay[r][c]
      if (isStart) return CELL_COLORS.start
      if (isGoal) return CELL_COLORS.goal
      if (cellType === 'wall') return CELL_COLORS.wall
      if (overlay === 'path') return CELL_COLORS.path
      if (overlay === 'current') return CELL_COLORS.current
      if (overlay === 'frontier') return CELL_COLORS.frontier
      if (overlay === 'visited') return CELL_COLORS.visited
      return CELL_COLORS.empty
    }

    if (isStart) return CELL_COLORS.start
    if (isGoal) return CELL_COLORS.goal
    return CELL_COLORS[cellType]
  }

  // A* のfスコアを表示
  const showFScore = algorithmId === 'astar' && state && 'gScore' in state && isRunning
  const astarState = showFScore ? (state as GridState & { gScore: number[][], hScore: number[][] }) : null

  const btnBase = 'rounded border px-2 py-1 text-xs transition-colors'
  const activeBtn = `${btnBase} border-blue-500 bg-blue-600/20 text-blue-400`
  const inactiveBtn = `${btnBase} border-dark-border bg-dark-sidebar text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:bg-light-sidebar light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text`

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      {/* 編集コントロール */}
      {!isRunning && (
        <div className="flex flex-wrap items-center gap-2 border-b border-dark-border px-3 py-2 dark:border-dark-border light:border-light-border">
          <button onClick={() => onEditModeChange('wall')} className={editMode === 'wall' ? activeBtn : inactiveBtn}>
            {alg.controls.wallMode}
          </button>
          <button onClick={() => onEditModeChange('start')} className={editMode === 'start' ? activeBtn : inactiveBtn}>
            {alg.controls.startMode}
          </button>
          <button onClick={() => onEditModeChange('goal')} className={editMode === 'goal' ? activeBtn : inactiveBtn}>
            {alg.controls.goalMode}
          </button>
          <button onClick={onClearWalls} className={inactiveBtn}>
            {alg.controls.clearWalls}
          </button>
          <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {alg.controls.clickToToggleWall}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <svg
          width={dims.width}
          height={isRunning ? dims.height + 44 : dims.height}
          style={{ cursor: isRunning ? 'default' : 'crosshair', display: 'block' }}
          onMouseDown={e => {
            if (isRunning) return
            isDragging.current = true
            const svg = e.currentTarget
            const rect = svg.getBoundingClientRect()
            const cell = getCellAt(e.clientX - rect.left, e.clientY - rect.top)
            if (cell) onCellClick(cell[0], cell[1])
          }}
          onMouseMove={e => {
            if (!isDragging.current || isRunning || editMode !== 'wall') return
            const svg = e.currentTarget
            const rect = svg.getBoundingClientRect()
            const cell = getCellAt(e.clientX - rect.left, e.clientY - rect.top)
            if (cell) onCellClick(cell[0], cell[1])
          }}
          onMouseUp={() => { isDragging.current = false }}
          onMouseLeave={() => { isDragging.current = false }}
        >
          <g transform={`translate(${offsetX}, ${offsetY})`}>
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const { bg, stroke } = cellBg(r, c)
                const isStart = start[0] === r && start[1] === c
                const isGoal = goal[0] === r && goal[1] === c

                return (
                  <g key={`${r}-${c}`}>
                    <rect
                      x={c * cellSize + 0.5}
                      y={r * cellSize + 0.5}
                      width={cellSize - 1}
                      height={cellSize - 1}
                      fill={bg}
                      stroke={stroke}
                      strokeWidth={0.5}
                      rx={1}
                    />
                    {isStart && (
                      <text x={c * cellSize + cellSize / 2} y={r * cellSize + cellSize / 2 + 4}
                        textAnchor="middle" fontSize={Math.min(12, cellSize * 0.5)} fill="white" fontWeight="bold">
                        S
                      </text>
                    )}
                    {isGoal && (
                      <text x={c * cellSize + cellSize / 2} y={r * cellSize + cellSize / 2 + 4}
                        textAnchor="middle" fontSize={Math.min(12, cellSize * 0.5)} fill="white" fontWeight="bold">
                        G
                      </text>
                    )}
                    {/* A* fスコア */}
                    {astarState && cellSize >= 24 && !isStart && !isGoal && cells[r][c] !== 'wall' && (
                      <text x={c * cellSize + cellSize / 2} y={r * cellSize + cellSize / 2 + 3}
                        textAnchor="middle" fontSize={Math.min(9, cellSize * 0.35)} fill="rgba(255,255,255,0.7)">
                        {astarState.gScore[r][c] < Infinity ? astarState.gScore[r][c] + astarState.hScore[r][c] : ''}
                      </text>
                    )}
                  </g>
                )
              })
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}
