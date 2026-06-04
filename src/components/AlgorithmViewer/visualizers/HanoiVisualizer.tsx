import { useContainerSize } from '../../../hooks/useContainerSize'
import type { HanoiState } from '../../../algorithms/types'

interface HanoiVisualizerProps {
  state: HanoiState | null
}

// 円盤の色。インデックス % DISK_COLORS.length でサイズを色に対応させる。
const DISK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#a855f7']
const POLE_LABELS = ['A', 'B', 'C']

export function HanoiVisualizer({ state }: HanoiVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim">—</span>
      </div>
    )
  }

  const { poles, moving, totalDisks } = state

  const poleWidth = 6
  const baseHeight = 12
  const maxDiskWidth = Math.min(width * 0.28, 160)
  const minDiskWidth = maxDiskWidth * 0.25
  const diskHeight = Math.min(24, (height - baseHeight - 60) / (totalDisks + 1))
  const poleSpacing = width / 3
  const poleHeight = diskHeight * (totalDisks + 1) + 10
  const baseY = height - baseHeight - 30

  // disk が 1〜totalDisks の値を持ち、大きいほど幅が広い
  function resolveDiskWidth(diskSize: number): number {
    return minDiskWidth + (diskSize - 1) * (maxDiskWidth - minDiskWidth) / Math.max(1, totalDisks - 1)
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {poles.map((poleDisks, poleIdx) => {
          const poleCenterX = poleSpacing * (poleIdx + 0.5)
          const isInvolved = moving?.from === poleIdx || moving?.to === poleIdx

          return (
            <g key={poleIdx}>
              {/* ポール（柱） */}
              <rect
                x={poleCenterX - poleWidth / 2}
                y={baseY - poleHeight}
                width={poleWidth}
                height={poleHeight}
                fill="#6b7280"
                rx={3}
              />
              {/* ベース台 */}
              <rect
                x={poleCenterX - maxDiskWidth * 0.6}
                y={baseY}
                width={maxDiskWidth * 1.2}
                height={baseHeight}
                fill="#4b5563"
                rx={3}
              />
              {/* ポールラベル */}
              <text
                x={poleCenterX}
                y={height - 8}
                textAnchor="middle"
                fontSize={14}
                fontWeight="bold"
                fill={isInvolved ? '#f59e0b' : '#858585'}
              >
                {POLE_LABELS[poleIdx]}
              </text>

              {/* 円盤（下から積み上げ順にレンダリング） */}
              {poleDisks.map((diskSize, diskIdx) => {
                const diskWidth = resolveDiskWidth(diskSize)
                const diskX = poleCenterX - diskWidth / 2
                const diskY = baseY - diskHeight * (diskIdx + 1)
                const color = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length]
                const isMovingDisk = moving?.disk === diskSize

                return (
                  <g key={diskSize}>
                    <rect
                      x={diskX}
                      y={diskY}
                      width={diskWidth}
                      height={diskHeight - 2}
                      fill={color}
                      stroke={isMovingDisk ? '#ffffff' : 'rgba(0,0,0,0.3)'}
                      strokeWidth={isMovingDisk ? 2 : 1}
                      rx={4}
                      opacity={isMovingDisk ? 0.8 : 1}
                    />
                    {diskWidth > 30 && (
                      <text
                        x={poleCenterX}
                        y={diskY + diskHeight / 2 + 1}
                        textAnchor="middle"
                        fontSize={Math.min(11, diskHeight - 6)}
                        fill="rgba(255,255,255,0.9)"
                        fontWeight="600"
                      >
                        {diskSize}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* 移動中の矢印 */}
        {moving && (
          <>
            <defs>
              <marker id="moveArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
              </marker>
            </defs>
            <line
              x1={poleSpacing * (moving.from + 0.5)}
              y1={baseY - poleHeight - 5}
              x2={poleSpacing * (moving.to + 0.5)}
              y2={baseY - poleHeight - 5}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4,3"
              markerEnd="url(#moveArrow)"
            />
            <text
              x={(poleSpacing * (moving.from + 0.5) + poleSpacing * (moving.to + 0.5)) / 2}
              y={baseY - poleHeight - 12}
              textAnchor="middle"
              fontSize={11}
              fill="#f59e0b"
            >
              disk {moving.disk}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
