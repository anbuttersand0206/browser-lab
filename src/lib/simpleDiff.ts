// 行単位の差分算出（Myers diff の簡略実装）
// 外部ライブラリ不使用。学習用途（短いファイル）に特化した実装。

export type DiffLineKind = 'equal' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffLineKind
  text: string
  // equal / removed は元コードの行番号、added は解答の行番号（1始まり）
  lineNo: number
}

// LCS の O(n*m) アルゴリズムを使うため、あまりに長いファイルは比較しない。
// 学習用シナリオのコードは通常 200 行以内なので実用上十分な上限値。
const MAX_DIFFABLE_LINES = 300

// LCS テーブルを動的計画法で構築する。
// dp[i][j] = a[0..i-1] と b[0..j-1] の LCS の長さ
function buildLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  return dp
}

// LCS テーブルをバックトラックして差分行のリストを生成する。
// a = 現在のコード行、b = 解答行
function backtrack(dp: number[][], a: string[], b: string[]): DiffLine[] {
  const result: DiffLine[] = []
  let i = a.length
  let j = b.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ kind: 'equal', text: a[i - 1], lineNo: i })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // b にあって a にない行 = 解答にあって現在コードにない行
      result.unshift({ kind: 'added', text: b[j - 1], lineNo: j })
      j--
    } else {
      // a にあって b にない行 = 現在コードにあって解答にない行
      result.unshift({ kind: 'removed', text: a[i - 1], lineNo: i })
      i--
    }
  }

  return result
}

// 現在のコード（original）と解答（modified）の行単位差分を計算する。
// ファイルが長すぎる場合は null を返し、呼び出し元でエラーメッセージを表示する。
export function computeLineDiff(original: string, modified: string): DiffLine[] | null {
  const aLines = original.split('\n')
  const bLines = modified.split('\n')

  // パフォーマンス上限チェック（LCS は O(n*m) のため大きなファイルには不向き）
  if (aLines.length > MAX_DIFFABLE_LINES || bLines.length > MAX_DIFFABLE_LINES) {
    return null
  }

  const dp = buildLcsTable(aLines, bLines)
  return backtrack(dp, aLines, bLines)
}

// 差分統計（変更行の概要）を計算するヘルパー
export function summarizeDiff(lines: DiffLine[]): { added: number; removed: number; equal: number } {
  return lines.reduce(
    (acc, line) => {
      acc[line.kind]++
      return acc
    },
    { added: 0, removed: 0, equal: 0 }
  )
}
