import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import type { QueryResult } from '../../../hooks/usePGLite'

interface QueryHistoryProps {
  queries: QueryResult[]
  // クリックした SQL をエディタに貼り付けるためのコールバック
  onSelect: (sql: string) => void
}

// 履歴の最大表示件数。古いものは切り捨てて最新のものを見やすくする。
const MAX_DISPLAY_COUNT = 20

// SQL を1行に収めるための整形。改行・連続空白を単一スペースに畳む。
function formatSqlOneLine(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

export function QueryHistory({ queries, onSelect }: QueryHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 新しい順に並べ、表示上限で切り捨てる
  const recentQueries = [...queries].reverse().slice(0, MAX_DISPLAY_COUNT)

  return (
    <div className="border-t border-dark-border dark:border-dark-border light:border-light-border">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
      >
        {isExpanded
          ? <ChevronDown size={12} className="flex-shrink-0" />
          : <ChevronRight size={12} className="flex-shrink-0" />
        }
        <Clock size={11} className="flex-shrink-0" />
        実行履歴
        {queries.length > 0 && (
          <span className="ml-auto font-normal">{queries.length}</span>
        )}
      </button>

      {isExpanded && (
        <div className="max-h-48 overflow-auto">
          {recentQueries.length === 0 ? (
            <div className="px-3 py-2 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              履歴なし
            </div>
          ) : (
            recentQueries.map((query, i) => (
              <button
                key={i}
                onClick={() => onSelect(query.sql)}
                title={query.sql}
                className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition-colors hover:bg-dark-hover dark:hover:bg-dark-hover light:hover:bg-light-hover"
              >
                <span className={`truncate font-mono text-xs ${query.error ? 'text-red-400' : 'text-dark-text dark:text-dark-text light:text-light-text'}`}>
                  {formatSqlOneLine(query.sql).slice(0, 60)}
                </span>
                <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  {query.error
                    ? 'エラー'
                    : `${query.rowCount}行 · ${query.durationMs.toFixed(1)}ms`
                  }
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
