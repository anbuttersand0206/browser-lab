import type { QueryResult } from '../../../hooks/usePGLite'

interface ExplainViewProps {
  result: QueryResult
}

// EXPLAIN ANALYZE の出力かどうかを判定する。
// PGLite は EXPLAIN 結果を "QUERY PLAN" という単一カラムで返す。
export function isExplainResult(result: QueryResult): boolean {
  return (
    result.fields.length === 1 &&
    result.fields[0].name === 'QUERY PLAN' &&
    !result.error
  )
}

// ノードタイプに応じた強調色を返す。
// Seq Scan（全件スキャン）は遅い傾向にあるためオレンジ、
// Index Scan（インデックス利用）は速いため緑で示す。
function getScanNodeColor(line: string): string {
  if (/Index (Only )?Scan/i.test(line)) return 'text-green-400'
  if (/Seq Scan/i.test(line))           return 'text-amber-400'
  if (/Bitmap (Index|Heap) Scan/i.test(line)) return 'text-blue-400'
  if (/Hash (Join|Agg)?/i.test(line))   return 'text-cyan-400'
  if (/Nested Loop/i.test(line))        return 'text-purple-400'
  if (/Sort/i.test(line))               return 'text-violet-400'
  return ''
}

// 行が Planning Time / Execution Time のサマリー行かを判定する
function isSummaryLine(line: string): boolean {
  return /^(Planning|Execution) Time:/i.test(line.trim())
}

// "Planning Time: 0.123 ms" や "Execution Time: 1.456 ms" を抽出する
function extractSummaryLines(lines: string[]): { label: string; value: string }[] {
  return lines
    .filter((line) => isSummaryLine(line))
    .map((line) => {
      const [label, value] = line.trim().split(':')
      return { label: label.trim(), value: value?.trim() ?? '' }
    })
}

export function ExplainView({ result }: ExplainViewProps) {
  // 各行の "QUERY PLAN" フィールドの値を文字列として取り出す
  const planLines = result.rows.map(
    (row) => String(row['QUERY PLAN'] ?? '')
  )

  const summaryItems = extractSummaryLines(planLines)
  // サマリー行はメイン表示から除外し、上部に別枠で表示する
  const bodyLines = planLines.filter((line) => !isSummaryLine(line))

  return (
    <div className="flex h-full flex-col">
      {summaryItems.length > 0 && (
        <div className="flex flex-shrink-0 flex-wrap gap-4 border-b border-dark-border bg-dark-tab px-4 py-2 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
          {summaryItems.map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {label}:
              </span>
              <span className="font-mono text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-0.5 font-mono text-xs">
          {bodyLines.map((line, i) => {
            // 先頭の空白を保持しつつ、スキャン種別ごとに色を変える
            const trimmed = line.trimStart()
            const indent = line.length - trimmed.length
            const nodeColor = getScanNodeColor(trimmed)

            return (
              <div key={i} style={{ paddingLeft: `${indent * 0.5}ch` }}>
                <span className={nodeColor || 'text-dark-text dark:text-dark-text light:text-light-text'}>
                  {trimmed}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
