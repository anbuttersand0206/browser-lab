import { useContainerSize } from '../../../hooks/useContainerSize'
import type { PerceptronState } from '../../../algorithms/types'

interface PerceptronVisualizerProps {
  state: PerceptronState | null
}

export function PerceptronVisualizer({ state }: PerceptronVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim">—</span>
      </div>
    )
  }

  const { weights, bias, inputs, output, error, weightDeltas, trainingData, sampleIndex } = state

  const inputNodeX = width * 0.2
  const outputNodeX = width * 0.78
  const centerY = height / 2
  const nodeRadius = 22

  // 入力ノードを等間隔に縦並びにする
  const nodeSpacingY = Math.min(70, height / (weights.length + 1))
  const inputNodeYs = weights.map((_, i) =>
    centerY - ((weights.length - 1) * nodeSpacingY) / 2 + i * nodeSpacingY
  )

  const maxAbsWeight = Math.max(...weights.map(Math.abs), 1)

  // 重みの大きさをエッジの色と太さで表現する
  function resolveEdgeColor(weight: number): string {
    const intensity = 0.3 + (Math.abs(weight) / maxAbsWeight) * 0.7
    if (weight > 0) return `rgba(59,130,246,${intensity})`
    if (weight < 0) return `rgba(239,68,68,${intensity})`
    return 'rgba(100,100,100,0.3)'
  }

  function resolveEdgeWidth(weight: number): number {
    return 1 + (Math.abs(weight) / maxAbsWeight) * 4
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {/* 重み付きエッジ（入力ノード → 出力ノード） */}
        {weights.map((weight, idx) => {
          const isActive = inputs[idx] !== undefined
          const delta = weightDeltas?.[idx]

          return (
            <g key={idx}>
              <line
                x1={inputNodeX + nodeRadius}
                y1={inputNodeYs[idx]}
                x2={outputNodeX - nodeRadius}
                y2={centerY}
                stroke={isActive ? resolveEdgeColor(weight) : '#3e3e42'}
                strokeWidth={isActive ? resolveEdgeWidth(weight) : 1}
              />
              {/* 重みラベル（更新がある場合は差分も表示） */}
              <text
                x={(inputNodeX + nodeRadius + outputNodeX - nodeRadius) / 2}
                y={(inputNodeYs[idx] + centerY) / 2 - 4}
                textAnchor="middle"
                fontSize={10}
                fill={delta !== undefined ? '#f59e0b' : '#6b7280'}
              >
                w={weight.toFixed(2)}
                {delta !== undefined && delta !== 0 ? ` (Δ${delta.toFixed(2)})` : ''}
              </text>
            </g>
          )
        })}

        {/* 入力ノード */}
        {weights.map((_, idx) => {
          const inputVal = inputs[idx]
          return (
            <g key={idx}>
              <circle
                cx={inputNodeX}
                cy={inputNodeYs[idx]}
                r={nodeRadius}
                fill={inputVal !== undefined ? 'rgba(59,130,246,0.3)' : '#252526'}
                stroke="#3b82f6"
                strokeWidth={1.5}
              />
              <text x={inputNodeX} y={inputNodeYs[idx] + 5}
                textAnchor="middle" fontSize={14} fontWeight="600" fill="#cccccc">
                {inputVal !== undefined ? inputVal : `x${idx + 1}`}
              </text>
              <text x={inputNodeX} y={inputNodeYs[idx] - nodeRadius - 4}
                textAnchor="middle" fontSize={9} fill="#858585">
                x{idx + 1}
              </text>
            </g>
          )
        })}

        {/* バイアスノード */}
        <circle cx={outputNodeX - 50} cy={height * 0.85} r={18}
          fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth={1.5} />
        <text x={outputNodeX - 50} y={height * 0.85 + 5}
          textAnchor="middle" fontSize={10} fill="#c084fc">
          b={bias.toFixed(2)}
        </text>

        {/* 加算ノード（Σ: 重み付き和を計算する） */}
        <circle cx={outputNodeX - nodeRadius * 1.8} cy={centerY} r={nodeRadius * 0.7}
          fill="#252526" stroke="#6b7280" strokeWidth={1.5} />
        <text x={outputNodeX - nodeRadius * 1.8} y={centerY + 5}
          textAnchor="middle" fontSize={16} fill="#858585">Σ</text>

        {/* Σ → 活性化関数 → 出力 の接続線 */}
        <line
          x1={outputNodeX - nodeRadius * 0.8}
          y1={centerY}
          x2={outputNodeX - nodeRadius}
          y2={centerY}
          stroke="#6b7280"
          strokeWidth={1.5}
        />

        {/* 出力ノード */}
        <circle
          cx={outputNodeX}
          cy={centerY}
          r={nodeRadius}
          fill={
            output !== null
              ? output === 1
                ? 'rgba(34,197,94,0.3)'
                : 'rgba(239,68,68,0.2)'
              : '#252526'
          }
          stroke={output !== null ? (output === 1 ? '#22c55e' : '#ef4444') : '#6b7280'}
          strokeWidth={2}
        />
        <text
          x={outputNodeX}
          y={centerY + 5}
          textAnchor="middle"
          fontSize={16}
          fontWeight="700"
          fill={output !== null ? (output === 1 ? '#22c55e' : '#ef4444') : '#858585'}
        >
          {output !== null ? output : '?'}
        </text>
        <text x={outputNodeX} y={centerY - nodeRadius - 4}
          textAnchor="middle" fontSize={9} fill="#858585">output</text>

        {/* 誤差とターゲット値の表示 */}
        {error !== null && (
          <g>
            <text x={outputNodeX + nodeRadius + 20} y={centerY - 10}
              fontSize={11} fill={error === 0 ? '#22c55e' : '#ef4444'}>
              target: {state.target}
            </text>
            <text x={outputNodeX + nodeRadius + 20} y={centerY + 8}
              fontSize={11} fill={error === 0 ? '#22c55e' : '#f59e0b'}>
              error: {error}
            </text>
          </g>
        )}

        {/* フッター情報 */}
        <text x={10} y={height - 10} fontSize={10} fill="#858585">
          epoch: {state.epoch} | sample: {sampleIndex + 1}/{trainingData.length}
          {state.done && ' | ✓ converged'}
        </text>
      </svg>
    </div>
  )
}
