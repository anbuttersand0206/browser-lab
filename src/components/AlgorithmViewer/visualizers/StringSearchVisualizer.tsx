import type { StringSearchState, CharStatus } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

interface StringSearchVisualizerProps {
  state: StringSearchState | null
}

function charBgColor(status: CharStatus): string {
  switch (status) {
    case 'comparing': return 'bg-yellow-500/30 text-yellow-300 border-yellow-500'
    case 'match':     return 'bg-teal-500/30 text-teal-300 border-teal-500'
    case 'mismatch':  return 'bg-red-500/30 text-red-400 border-red-500'
    case 'found':     return 'bg-green-500/30 text-green-400 border-green-500'
    default:          return 'bg-transparent text-dark-textDim border-dark-border/30 dark:text-dark-textDim dark:border-dark-border/30 light:text-light-textDim light:border-light-border/30'
  }
}

export function StringSearchVisualizer({ state }: StringSearchVisualizerProps) {
  const { locale } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { text, pattern, textStatus, patternStatus, foundAt, textPos, failureTable, skipAmount } = state

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* テキスト表示 */}
      <div>
        <div className="mb-1 text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {locale === 'ja' ? 'テキスト' : 'Text'}
        </div>
        <div className="flex flex-wrap gap-0.5">
          {text.split('').map((ch, i) => (
            <div
              key={i}
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border font-mono text-sm ${charBgColor(textStatus[i])}`}
            >
              {ch}
            </div>
          ))}
        </div>
        {/* インデックス表示 */}
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {text.split('').map((_, i) => (
            <div key={i} className="flex h-4 w-7 flex-shrink-0 items-center justify-center font-mono text-[9px] text-dark-textDim/50 dark:text-dark-textDim/50 light:text-light-textDim/50">
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* パターン表示（テキスト上のウィンドウ位置にオフセット） */}
      <div>
        <div className="mb-1 text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {locale === 'ja' ? `パターン（位置 ${textPos}）` : `Pattern (at pos ${textPos})`}
        </div>
        <div className="flex flex-wrap gap-0.5" style={{ paddingLeft: `${textPos * 28}px` }}>
          {pattern.split('').map((ch, i) => (
            <div
              key={i}
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border font-mono text-sm ${charBgColor(patternStatus[i])}`}
            >
              {ch}
            </div>
          ))}
        </div>
      </div>

      {/* スキップ量の表示（Boyer-Moore） */}
      {skipAmount > 0 && (
        <div className="rounded bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-400">
          {locale === 'ja' ? `スキップ量: ${skipAmount} 文字` : `Skip: ${skipAmount} chars`}
        </div>
      )}

      {/* KMP 失敗関数テーブル */}
      {failureTable && failureTable.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {locale === 'ja' ? '失敗関数テーブル' : 'Failure Function'}
          </div>
          <div className="flex gap-0.5">
            {pattern.split('').map((ch, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex h-6 w-7 items-center justify-center rounded border border-dark-border/30 font-mono text-xs text-dark-textDim dark:border-dark-border/30 dark:text-dark-textDim light:border-light-border/30 light:text-light-textDim">
                  {ch}
                </div>
                <div className="flex h-5 w-7 items-center justify-center font-mono text-xs text-purple-400">
                  {failureTable[i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 発見された一致箇所 */}
      <div>
        <div className="mb-1 text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {locale === 'ja' ? `一致箇所: ${foundAt.length} 件` : `Matches: ${foundAt.length}`}
        </div>
        {foundAt.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {foundAt.map((pos, i) => (
              <span key={i} className="rounded bg-green-500/20 px-2 py-0.5 font-mono text-xs text-green-400">
                pos {pos}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
