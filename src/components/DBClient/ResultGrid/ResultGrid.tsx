import { useState, useEffect } from 'react'
import { Copy, Check, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { QueryResult } from '../../../hooks/usePGLite'
import { ExplainView, isExplainResult } from '../ExplainView/ExplainView'

interface ResultGridProps {
  results: QueryResult[]
}

// コピー操作の UI フィードバック状態
type CopyState = 'idle' | 'copied'

// ソートの方向。union 型で表現し boolean フラグの乱立を防ぐ。
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: string
  direction: SortDirection
}

// 1ページに表示する最大行数。
// 大量の行をすべてレンダリングすると DOM が重くなるため上限を設ける。
const PAGE_SIZE = 100

// クエリ結果を TSV（タブ区切り）文字列に変換する。
// スプレッドシートへの貼り付け時に列を正しく分割するために TSV 形式を採用している。
function buildTsv(result: QueryResult): string {
  const headerRow = result.fields.map(f => f.name).join('\t')
  const dataRows = result.rows.map(row =>
    result.fields.map(f => {
      const cellValue = row[f.name]
      return cellValue === null ? 'NULL' : String(cellValue)
    }).join('\t')
  )
  return [headerRow, ...dataRows].join('\n')
}

// カンマや引用符・改行を含むフィールドを RFC 4180 に従ってエスケープする。
function escapeCsvField(value: string): string {
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')
  if (!needsQuotes) return value
  return `"${value.replace(/"/g, '""')}"`
}

function buildCsv(result: QueryResult): string {
  const headerRow = result.fields.map(f => escapeCsvField(f.name)).join(',')
  const dataRows = result.rows.map(row =>
    result.fields.map(f => {
      const cellValue = row[f.name]
      return cellValue === null ? '' : escapeCsvField(String(cellValue))
    }).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

function buildJson(result: QueryResult): string {
  const objects = result.rows.map(row =>
    Object.fromEntries(result.fields.map(f => [f.name, row[f.name]]))
  )
  return JSON.stringify(objects, null, 2)
}

// Blob を生成してブラウザにダウンロードさせる。
// <a> タグを一時的に作って click() する方法は、ファイル保存ダイアログを経由せずに
// 直接ダウンロードできる唯一のフロントエンド完結手段。
function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// セルの値を比較してソート順を返す。
// null は最小値として扱い、数値は数値比較、それ以外は日本語対応の文字列比較にする。
function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  if (a === null && b === null) return 0
  if (a === null) return direction === 'asc' ? -1 : 1
  if (b === null) return direction === 'asc' ? 1 : -1

  const aNum = Number(a)
  const bNum = Number(b)
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return direction === 'asc' ? aNum - bNum : bNum - aNum
  }

  const aStr = String(a)
  const bStr = String(b)
  const cmp = aStr.localeCompare(bStr, 'ja', { numeric: true })
  return direction === 'asc' ? cmp : -cmp
}

export function ResultGrid({ results }: ResultGridProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // クエリ結果が変わったときにソートとページをリセットする。
  // 新しいクエリを実行したら前の列ソートが引き継がれないようにするため。
  useEffect(() => {
    setSortConfig(null)
    setCurrentPage(1)
  }, [results])

  if (results.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        SQLを実行すると結果がここに表示されます (Ctrl+Enter でも実行できます)
      </div>
    )
  }

  const latest = results[results.length - 1]

  const handleCopyResult = async () => {
    const textToCopy = latest.error ? latest.error : buildTsv(latest)
    await navigator.clipboard.writeText(textToCopy)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 1500)
  }

  const handleDownloadCsv = () => {
    downloadText(buildCsv(latest), 'result.csv', 'text/csv;charset=utf-8;')
  }

  const handleDownloadJson = () => {
    downloadText(buildJson(latest), 'result.json', 'application/json')
  }

  // 列ヘッダークリックでソートを切り替える。
  // 同じ列を 3 回クリックすると asc → desc → ソートなし のサイクルになる。
  const handleColumnHeaderClick = (fieldName: string) => {
    setCurrentPage(1)  // ソート変更時はページ先頭に戻す
    setSortConfig((prev) => {
      if (prev?.field !== fieldName) return { field: fieldName, direction: 'asc' }
      if (prev.direction === 'asc') return { field: fieldName, direction: 'desc' }
      return null
    })
  }

  const isCopied = copyState === 'copied'
  const hasData = !latest.error && latest.fields.length > 0 && !isExplainResult(latest)

  // ソートを適用した行の配列
  const sortedRows = sortConfig
    ? [...latest.rows].sort((a, b) =>
        compareValues(a[sortConfig.field], b[sortConfig.field], sortConfig.direction)
      )
    : latest.rows

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE)
  const pagedRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const showPagination = hasData && totalPages > 1

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダーバー */}
      <div className="flex flex-shrink-0 items-center gap-4 border-b border-dark-border bg-dark-tab px-3 py-1.5 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
        {latest.error ? (
          <span className="text-xs font-medium text-red-400">❌ エラー</span>
        ) : (
          <>
            <span className="text-xs text-green-400">✓ {latest.rowCount}行</span>
            <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {latest.durationMs.toFixed(1)}ms
            </span>
          </>
        )}
        <div className="flex-1 truncate">
          <span className="font-mono text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {latest.sql.slice(0, 100)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {hasData && (
            <>
              <button
                onClick={handleDownloadCsv}
                title="CSV としてダウンロード"
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
              >
                <Download size={12} />
                CSV
              </button>
              <button
                onClick={handleDownloadJson}
                title="JSON としてダウンロード"
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
              >
                <Download size={12} />
                JSON
              </button>
            </>
          )}
          <button
            onClick={handleCopyResult}
            title={isCopied ? 'コピーしました' : '結果をクリップボードにコピー（TSV形式）'}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
          >
            {isCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span className={isCopied ? 'text-green-400' : ''}>{isCopied ? 'コピー済み' : 'コピー'}</span>
          </button>
        </div>
      </div>

      {latest.error && (
        <div className="mx-3 mt-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs font-mono text-red-400">
          {latest.error.replace('Error: ', '')}
        </div>
      )}

      {isExplainResult(latest) && (
        <div className="flex-1 overflow-hidden">
          <ExplainView result={latest} />
        </div>
      )}

      {hasData && (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-dark-sidebar dark:bg-dark-sidebar light:bg-light-sidebar">
              <tr>
                <th className="w-10 border-b border-dark-border px-2 py-1.5 text-center font-normal text-dark-textDim dark:border-dark-border dark:text-dark-textDim light:border-light-border light:text-light-textDim">
                  #
                </th>
                {latest.fields.map((field) => {
                  const isSorted = sortConfig?.field === field.name
                  return (
                    <th
                      key={field.name}
                      onClick={() => handleColumnHeaderClick(field.name)}
                      title={`${field.name} — クリックでソート`}
                      className="cursor-pointer select-none border-b border-r border-dark-border px-3 py-1.5 text-left font-medium text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
                    >
                      <span className="flex items-center gap-1">
                        {field.name}
                        {isSorted && (
                          <span className="text-blue-400">
                            {sortConfig.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, rowIndex) => {
                const absoluteIndex = (currentPage - 1) * PAGE_SIZE + rowIndex + 1
                return (
                  <tr
                    key={rowIndex}
                    className="transition-colors hover:bg-dark-hover dark:hover:bg-dark-hover light:hover:bg-light-hover"
                  >
                    <td className="border-b border-dark-border px-2 py-1 text-center text-dark-textDim dark:border-dark-border dark:text-dark-textDim light:border-light-border light:text-light-textDim">
                      {absoluteIndex}
                    </td>
                    {latest.fields.map((field) => {
                      const cellValue = row[field.name]
                      return (
                        <td
                          key={field.name}
                          className="border-b border-r border-dark-border px-3 py-1 font-mono text-dark-text dark:border-dark-border dark:text-dark-text light:border-light-border light:text-light-text"
                        >
                          {cellValue === null ? (
                            <span className="italic text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                              NULL
                            </span>
                          ) : (
                            String(cellValue)
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ページネーションバー（PAGE_SIZE 行を超えるときのみ表示） */}
      {showPagination && (
        <div className="flex flex-shrink-0 items-center justify-between border-t border-dark-border bg-dark-tab px-3 py-1 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
          <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedRows.length)} / {sortedRows.length} 行
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              aria-label="前のページ"
              className="flex items-center rounded px-1.5 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text disabled:opacity-30 dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              aria-label="次のページ"
              className="flex items-center rounded px-1.5 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text disabled:opacity-30 dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {!latest.error && latest.fields.length === 0 && (
        <div className="p-4 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          クエリが正常に完了しました（結果セットなし）
        </div>
      )}
    </div>
  )
}
