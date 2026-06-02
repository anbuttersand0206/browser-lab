import { useState } from 'react'
import { ChevronDown, ChevronRight, Table2 } from 'lucide-react'
import type { TableInfo } from '../../../hooks/usePGLite'

interface TableTreeProps {
  tables: TableInfo[]
  onTableClick?: (tableName: string) => void
}

export function TableTree({ tables, onTableClick }: TableTreeProps) {
  const [expandedTableNames, setExpandedTableNames] = useState<Set<string>>(new Set())

  const toggleTable = (name: string) => {
    setExpandedTableNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <div className="select-none">
      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        テーブル
      </div>
      {tables.length === 0 ? (
        <div className="px-3 py-2 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          テーブルなし
        </div>
      ) : (
        tables.map((table) => {
          const isExpanded = expandedTableNames.has(table.name)
          return (
            <div key={table.name}>
              <div
                className="flex cursor-pointer items-center gap-1.5 px-3 py-1 text-xs transition-colors hover:bg-dark-hover dark:hover:bg-dark-hover light:hover:bg-light-hover"
                onClick={() => {
                  toggleTable(table.name)
                  onTableClick?.(table.name)
                }}
              >
                {isExpanded
                  ? <ChevronDown size={12} className="text-dark-textDim flex-shrink-0" />
                  : <ChevronRight size={12} className="text-dark-textDim flex-shrink-0" />
                }
                <Table2 size={12} className="flex-shrink-0 text-yellow-400" />
                <span className="font-mono font-medium text-dark-text dark:text-dark-text light:text-light-text">
                  {table.name}
                </span>
                <span className="ml-auto text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  {table.columns.length}
                </span>
              </div>
              {isExpanded && (
                <div className="ml-6 border-l border-dark-border pl-2 dark:border-dark-border light:border-light-border">
                  {table.columns.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center gap-1.5 py-0.5 text-xs"
                    >
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span className="font-mono text-dark-text dark:text-dark-text light:text-light-text">
                        {col.name}
                      </span>
                      <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                        {col.type}
                      </span>
                      {!col.nullable && (
                        <span className="text-xs text-red-400" title="NOT NULL">!</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
