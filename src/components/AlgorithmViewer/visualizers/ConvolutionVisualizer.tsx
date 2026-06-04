import type { ConvState } from '../../../algorithms/types'

interface ConvolutionVisualizerProps {
  state: ConvState | null
}

function MatrixGrid({
  data, highlight, label, cellSize = 40,
}: {
  data: (number | null)[][]
  highlight?: [number, number][]
  label: string
  cellSize?: number
}) {
  const hl = new Set(highlight?.map(([r, c]) => `${r},${c}`) ?? [])

  const maxVal = data.flat().reduce<number>((m, v) => v !== null ? Math.max(m, Math.abs(v)) : m, 1)

  function cellBg(val: number | null, isHl: boolean): string {
    if (isHl) return '#f59e0b'
    if (val === null) return 'transparent'
    const intensity = Math.min(1, Math.abs(val) / (maxVal || 1))
    if (val > 0) return `rgba(59,130,246,${0.15 + intensity * 0.6})`
    if (val < 0) return `rgba(239,68,68,${0.15 + intensity * 0.6})`
    return 'rgba(100,100,100,0.1)'
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">{label}</div>
      <div className="overflow-hidden rounded border border-dark-border dark:border-dark-border light:border-light-border">
        {data.map((row, r) => (
          <div key={r} className="flex">
            {row.map((val, c) => {
              const isHl = hl.has(`${r},${c}`)
              return (
                <div
                  key={c}
                  style={{ width: cellSize, height: cellSize, background: cellBg(val, isHl) }}
                  className="flex items-center justify-center border-b border-r border-dark-border text-xs font-mono dark:border-dark-border light:border-light-border"
                >
                  <span className={isHl ? 'font-bold text-dark-bg' : 'text-dark-text dark:text-dark-text light:text-light-text'}>
                    {val !== null ? (Math.abs(val) < 10 ? val.toFixed(val % 1 !== 0 ? 2 : 0) : Math.round(val)) : '·'}
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

export function ConvolutionVisualizer({ state }: ConvolutionVisualizerProps) {
  if (!state) return (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-dark-textDim">—</span>
    </div>
  )

  const { input, kernel, output, inputHighlight, outputValue, currentRow, currentCol } = state

  // 出力グリッドの表示（現在計算中の値を含む）
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
      <MatrixGrid data={input} highlight={inputHighlight} label="Input" cellSize={38} />

      <div className="flex flex-col items-center gap-2">
        <div className="text-2xl text-dark-textDim">★</div>
        <MatrixGrid data={kernel} label="Kernel" cellSize={38} />
        <div className="text-2xl text-dark-textDim">=</div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <MatrixGrid data={displayOutput} highlight={outputHl} label="Output" cellSize={38} />
        {outputValue !== null && (
          <div className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            = <span className="font-bold text-yellow-400">{outputValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}
