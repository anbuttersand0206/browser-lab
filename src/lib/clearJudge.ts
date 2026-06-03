// シナリオ自動採点ユーティリティ
// 各シナリオが定義する clearCriteria に対して実行結果を照合し、
// クリア可否を真偽値で返す。UI には依存しない純粋関数のみを提供する。

import type { QueryResult } from '../hooks/usePGLite'

// ----------------------------------------------------------------
// DB コース用判定条件
// ----------------------------------------------------------------

export interface DbClearCriteria {
  // 最後の結果セットに含まれるべき列名（AND条件）
  requiredColumns?: string[]
  // 最後の結果セットの最低行数
  minRowCount?: number
  // 全結果セットを通じて任意のセルに含まれるべき文字列（AND条件・大文字小文字不問）
  // EXPLAIN の出力テキストなど、最後の結果以外に含まれる値の照合にも使う
  requiredCellValues?: string[]
}

// ----------------------------------------------------------------
// プログラミングコース用判定条件
// ----------------------------------------------------------------

export interface ProgClearCriteria {
  // コンソール出力（全行結合）に含まれるべき文字列（AND条件・大文字小文字不問）
  requiredStrings: string[]
}

// ----------------------------------------------------------------
// DB コース判定関数
// ----------------------------------------------------------------

// 実行結果がクリア条件を満たすか判定する。
// 最後の結果セットを主たる評価対象とするのは、ユーザーが最後に実行した
// SELECT の結果がシナリオの達成状態を最もよく反映しているため。
// セル値チェックは全結果セットを対象にして、EXPLAIN 等の中間出力にも対応する。
export function judgeDbOutput(
  results: QueryResult[],
  criteria: DbClearCriteria
): boolean {
  // エラーのある結果がひとつでもあればクリアとしない。
  // エラー時のロールバックで期待するデータが存在しない可能性があるため。
  if (results.some((r) => r.error)) return false

  const lastResult = results[results.length - 1]
  // ガード節: 結果が空なら不合格
  if (!lastResult) return false

  // 列名チェック（最後の結果セットのフィールド名で照合）
  if (criteria.requiredColumns) {
    const fieldNames = lastResult.fields.map((f) => f.name.toLowerCase())
    const allColumnsPresent = criteria.requiredColumns.every((col) =>
      fieldNames.includes(col.toLowerCase())
    )
    if (!allColumnsPresent) return false
  }

  // 行数チェック（最後の結果セットの行数で評価）
  if (
    criteria.minRowCount !== undefined &&
    lastResult.rowCount < criteria.minRowCount
  ) {
    return false
  }

  // セル値チェック（全結果セットを横断して照合）
  if (criteria.requiredCellValues && criteria.requiredCellValues.length > 0) {
    const allCellValues = results
      .flatMap((r) => r.rows)
      .flatMap((row) => Object.values(row))
      .map((v) => String(v ?? '').toLowerCase())

    const allValuesPresent = criteria.requiredCellValues.every((required) =>
      allCellValues.some((cell) => cell.includes(required.toLowerCase()))
    )
    if (!allValuesPresent) return false
  }

  return true
}

// ----------------------------------------------------------------
// プログラミングコース判定関数
// ----------------------------------------------------------------

// コンソール出力がクリア条件を満たすか判定する。
// 出力を全行結合した文字列に対して部分一致で照合する（大文字小文字不問）。
// 厳密な完全一致を避けるのは、実行環境の違いで空白や改行が変わりうるため。
export function judgeProgOutput(
  output: string[],
  criteria: ProgClearCriteria
): boolean {
  // 空の条件リストはクリアとしない（条件未設定のシナリオをスキップするため）
  if (criteria.requiredStrings.length === 0) return false

  const fullOutput = output.join('\n').toLowerCase()
  return criteria.requiredStrings.every((required) =>
    fullOutput.includes(required.toLowerCase())
  )
}
