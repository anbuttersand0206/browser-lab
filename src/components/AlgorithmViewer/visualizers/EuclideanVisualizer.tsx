import { useContainerSize } from '../../../hooks/useContainerSize'
import type { EuclidState } from '../../../algorithms/types'

interface EuclideanVisualizerProps {
  state: EuclidState | null
}

export function EuclideanVisualizer({ state }: EuclideanVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim">—</span>
      </div>
    )
  }

  const { initialA, initialB, rects, gcd, a, b } = state

  const paddingPx = 40
  // SVG 上で initialA × initialB の矩形を表示するためのスケール。
  // 短辺・長辺どちらにも余白が残るよう、両方向のスケールの小さい方を採用する。
  const scaleX = (width - paddingPx * 2) / initialA
  const scaleY = (height - paddingPx * 2) / initialB
  const scale = Math.min(scaleX, scaleY, 8)

  const canvasWidth = initialA * scale
  const canvasHeight = initialB * scale
  const originX = (width - canvasWidth) / 2
  const originY = (height - canvasHeight) / 2

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {/* 全体の外枠（初期矩形） */}
        <rect
          x={originX}
          y={originY}
          width={canvasWidth}
          height={canvasHeight}
          fill="transparent"
          stroke="#3e3e42"
          strokeWidth={1.5}
        />

        {/* 各ステップで分割された矩形 */}
        {rects.map((rect, idx) => {
          const rectX = originX + rect.x * scale
          const rectY = originY + rect.y * scale
          const rectW = rect.w * scale
          const rectH = rect.h * scale

          return (
            <g key={idx}>
              <rect
                x={rectX}
                y={rectY}
                width={rectW}
                height={rectH}
                fill={rect.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={1}
                opacity={0.7}
                rx={2}
              />
              {/* 正方形には辺の長さを表示（十分な大きさの場合のみ） */}
              {rect.isSquare && rectW > 20 && rectH > 20 && (
                <text
                  x={rectX + rectW / 2}
                  y={rectY + rectH / 2 + 4}
                  textAnchor="middle"
                  fontSize={Math.min(12, rectW * 0.3, rectH * 0.3)}
                  fill="rgba(255,255,255,0.9)"
                  fontWeight="600"
                >
                  {rect.w}
                </text>
              )}
            </g>
          )
        })}

        {/* 寸法ラベル */}
        <text x={originX + canvasWidth / 2} y={originY - 8}
          textAnchor="middle" fontSize={12} fill="#858585">
          {initialA}
        </text>
        <text
          x={originX - 10}
          y={originY + canvasHeight / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#858585"
          transform={`rotate(-90, ${originX - 10}, ${originY + canvasHeight / 2})`}
        >
          {initialB}
        </text>

        {/* GCD の確定 / 計算中の状態表示 */}
        {gcd !== null ? (
          <text x={width / 2} y={height - 10}
            textAnchor="middle" fontSize={15} fontWeight="700" fill="#22c55e">
            GCD({initialA}, {initialB}) = {gcd}
          </text>
        ) : (
          <text x={width / 2} y={height - 10}
            textAnchor="middle" fontSize={12} fill="#858585">
            GCD({a}, {b}) = ?
          </text>
        )}
      </svg>
    </div>
  )
}
