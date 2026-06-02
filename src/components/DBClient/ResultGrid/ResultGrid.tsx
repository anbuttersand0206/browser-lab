import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import type { QueryResult } from '../../../hooks/usePGLite'
import { ExplainView, isExplainResult } from '../ExplainView/ExplainView'

interface ResultGridProps {
  results: QueryResult[]
}

// コピー操作の UI フィードバック状態
type CopyState = 'idle' | 'copied'

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
// Excel・Google Sheets いずれも RFC 4180 に準拠した CSV を正しく解釈できる。
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
// 直接ダウンロードできる唯一の方法（フロントエンド完結）。
function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  // revokeObjectURL はイベントループの次のターンで呼ぶ。
  // click() の直後に解放すると一部ブラウザでダウンロードが始まらない場合がある。
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function ResultGrid({ results }: ResultGridProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')

  if (results.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        SQLを実行すると結果がここに表示されます (Ctrl+Enter でも実行できます)
      </div>
    )
  }

  const latest = results[results.length - 1]

  const handleCopyResult = async () => {
    // エラー時はエラーメッセージを、正常時は TSV をコピーする
    const textToCopy = latest.error ? latest.error : buildTsv(latest)
    await navigator.clipboard.writeText(textToCopy)
    setCopyState('copied')
    // 1.5 秒後に元のアイコンに戻す（ユーザーへのフィードバック表示期間）
    setTimeout(() => setCopyState('idle'), 1500)
  }

  const handleDownloadCsv = () => {
    downloadText(buildCsv(latest), 'result.csv', 'text/csv;charset=utf-8;')
  }

  const handleDownloadJson = () => {
    downloadText(buildJson(latest), 'result.json', 'application/json')
  }

  const isCopied = copyState === 'copied'
  // ダウンロードボタンはデータがある場合のみ表示する
  const hasData = !latest.error && latest.fields.length > 0 && !isExplainResult(latest)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-4 border-b border-dark-border bg-dark-tab px-3 py-1.5 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
        {latest.error ? (
          <span className="text-xs font-medium text-red-400">
            ❌ エラー
          </span>
        ) : (
          <>
            <span className="text-xs text-green-400">
              ✓ {latest.rowCount}行
            </span>
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
            {isCopied ? (
              <Check size={12} className="text-green-400" />
            ) : (
              <Copy size={12} />
            )}
            <span className={isCopied ? 'text-green-400' : ''}>
              {isCopied ? 'コピー済み' : 'コピー'}
            </span>
          </button>
        </div>
      </div>

      {latest.error && (
        <div className="mx-3 mt-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs font-mono text-red-400">
          {latest.error.replace('Error: ', '')}
        </div>
      )}

      {/* EXPLAIN / EXPLAIN ANALYZE の結果は専用ビューで色付き表示する */}
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
                {latest.fields.map((field) => (
                  <th
                    key={field.name}
                    className="border-b border-r border-dark-border px-3 py-1.5 text-left font-medium text-dark-textDim dark:border-dark-border dark:text-dark-textDim light:border-light-border light:text-light-textDim"
                  >
                    {field.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latest.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-colors hover:bg-dark-hover dark:hover:bg-dark-hover light:hover:bg-light-hover"
                >
                  <td className="border-b border-dark-border px-2 py-1 text-center text-dark-textDim dark:border-dark-border dark:text-dark-textDim light:border-light-border light:text-light-textDim">
                    {rowIndex + 1}
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
              ))}
            </tbody>
          </table>
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
