import type { DPTableState } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

interface DPTableVisualizerProps {
  state: DPTableState | null
}

export function DPTableVisualizer({ state }: DPTableVisualizerProps) {
  const { locale } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { table, rowLabels, colLabels, currentRow, currentCol, sourceCells, selectedItems, editOps, done } = state

  function cellStyle(r: number, c: number): string {
    const isCurrent = r === currentRow && c === currentCol
    const isSource = sourceCells.some(([sr, sc]) => sr === r && sc === c)
    const isNull = table[r]?.[c] === null

    if (isCurrent) return 'bg-yellow-500/30 text-yellow-300 border-yellow-500'
    if (isSource) return 'bg-teal-500/20 text-teal-300 border-teal-500/50'
    if (isNull) return 'bg-transparent text-dark-textDim/30 border-dark-border/20 dark:text-dark-textDim/30 dark:border-dark-border/20 light:text-light-textDim/30 light:border-light-border/20'
    return 'bg-dark-bg/40 text-dark-text border-dark-border/30 dark:bg-dark-bg/40 dark:text-dark-text dark:border-dark-border/30 light:bg-light-bg/40 light:text-light-text light:border-light-border/30'
  }

  const maxRows = Math.min(table.length, 12)
  const maxCols = Math.min(colLabels.length, 14)

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      {/* DP テーブル */}
      <div className="overflow-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              {/* 左上の空セル */}
              <th className="h-6 min-w-[60px] max-w-[90px] truncate p-0.5 text-[10px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim" />
              {colLabels.slice(0, maxCols).map((label, j) => (
                <th
                  key={j}
                  className="h-6 w-8 p-0.5 text-center text-[10px] font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.slice(0, maxRows).map((row, r) => (
              <tr key={r}>
                <td className="min-w-[60px] max-w-[90px] truncate p-0.5 pr-1 text-right text-[10px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  {rowLabels[r]}
                </td>
                {row.slice(0, maxCols).map((val, c) => (
                  <td
                    key={c}
                    className={`h-7 w-8 border text-center font-mono text-xs ${cellStyle(r, c)}`}
                  >
                    {val === null ? '·' : val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ナップサック: 選択されたアイテム */}
      {done && selectedItems !== undefined && selectedItems.length > 0 && (
        <div className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2">
          <div className="text-xs font-medium text-green-400">
            {locale === 'ja' ? '選択アイテム' : 'Selected Items'}
          </div>
          <div className="mt-1 flex gap-1">
            {selectedItems.map((idx, i) => (
              <span key={i} className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-300">
                {rowLabels[idx + 1]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* レーベンシュタイン: 編集操作列 */}
      {done && editOps !== undefined && (
        <div className="rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2">
          <div className="text-xs font-medium text-purple-400">
            {locale === 'ja' ? '編集操作列' : 'Edit Operations'}
          </div>
          <div className="mt-1 flex flex-wrap gap-0.5">
            {editOps.split('').map((op, i) => {
              const colors: Record<string, string> = {
                M: 'bg-green-500/20 text-green-300',
                S: 'bg-yellow-500/20 text-yellow-300',
                D: 'bg-red-500/20 text-red-300',
                I: 'bg-blue-500/20 text-blue-300',
              }
              return (
                <span key={i} className={`rounded px-1.5 py-0.5 font-mono text-xs ${colors[op] ?? ''}`}>
                  {op}
                </span>
              )
            })}
          </div>
          <div className="mt-1 text-[10px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            M={locale === 'ja' ? '一致' : 'Match'} S={locale === 'ja' ? '置換' : 'Sub'} D={locale === 'ja' ? '削除' : 'Del'} I={locale === 'ja' ? '挿入' : 'Ins'}
          </div>
        </div>
      )}
    </div>
  )
}
