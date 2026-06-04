import type { PoolingState } from '../../../algorithms/types'

interface PoolingVisualizerProps {
  state: PoolingState | null
}

function MatrixGrid({
  data, highlight, label, cellSize = 40, highlightColor = '#f59e0b',
}: {
  data: (number | null)[][]
  highlight?: [number, number][]
  label: string
  cellSize?: number
  highlightColor?: string
}) {
  const hl = new Set(highlight?.map(([r, c]) => `${r},${c}`) ?? [])
  const maxVal = data.flat().reduce<number>((m, v) => v !== null ? Math.max(m, v) : m, 1)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">{label}</div>
      <div className="overflow-hidden rounded border border-dark-border dark:border-dark-border light:border-light-border">
        {data.map((row, r) => (
          <div key={r} className="flex">
            {row.map((val, c) => {
              const isHl = hl.has(`${r},${c}`)
              const intensity = val !== null ? val / (maxVal || 1) : 0
              const bg = isHl
                ? highlightColor
                : val !== null
                ? `rgba(59,130,246,${0.1 + intensity * 0.5})`
                : 'transparent'

              return (
                <div
                  key={c}
                  style={{ width: cellSize, height: cellSize, background: bg }}
                  className="flex items-center justify-center border-b border-r border-dark-border text-xs font-mono dark:border-dark-border light:border-light-border"
                >
                  <span className={isHl ? 'font-bold text-dark-bg' : 'text-dark-text dark:text-dark-text light:text-light-text'}>
                    {val !== null ? val : '·'}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PoolingVisualizer({ state }: PoolingVisualizerProps) {
  if (!state) return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-dark-textDim">—</span>
    </div>
  )

  const { input, output, highlight, outputValue, currentRow, currentCol, poolType, poolSize } = state

  const displayOutput = output.map((row, r) =>
    row.map((val, c) => {
      if (val !== null) return val
      if (r === currentRow && c === currentCol && outputValue !== null) return outputValue
      return null
    })
  )

  const outputHl: [number, number][] = currentRow !== null && currentCol !== null ? [[currentRow, currentCol]] : []

  return (
    <div className="flex h-full items-center justify-center gap-8">
      <MatrixGrid data={input} highlight={highlight} label={`Input (${input.length}×${input[0].length})`} cellSize={40} />

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded border border-dark-border bg-dark-sidebar px-3 py-2 dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
          <div className="text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
            {poolType === 'max' ? 'Max' : 'Avg'} Pooling
          </div>
          <div className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {poolSize}×{poolSize} window
          </div>
        </div>
        {outputValue !== null && (
          <div className="text-xs">
            <span className="text-dark-textDim">{poolType === 'max' ? 'max' : 'avg'} = </span>
            <span className="font-bold text-yellow-400">{outputValue}</span>
          </div>
        )}
        <div className="text-xl text-dark-textDim">→</div>
      </div>

      <MatrixGrid
        data={displayOutput}
        highlight={outputHl}
        label={`Output (${output.length}×${output[0].length})`}
        cellSize={48}
        highlightColor="#f59e0b"
      />
    </div>
  )
}
