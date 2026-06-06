import type { AlgorithmStep, DPTableState } from '../types'

// レーベンシュタイン距離（編集距離）: 文字列 s を文字列 t に変換するのに必要な
// 挿入・削除・置換の最小操作回数を求める動的計画法。
// スペルチェッカー・DNA配列比較・git diff の基礎アルゴリズム。
export function* levenshtein(str1: string, str2: string): Generator<AlgorithmStep<DPTableState>, void, never> {
  const s = str1
  const t = str2
  const m = s.length
  const n = t.length

  // dp[i][j] = s[0..i-1] を t[0..j-1] に変換する最小編集距離
  // 行ラベル: '' + s の各文字, 列ラベル: '' + t の各文字
  const rowLabels = ['', ...s.split('')]
  const colLabels = ['', ...t.split('')]

  const dp: (number | null)[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(null)
  )

  // ベースケース: 空文字への変換は文字数分の削除/挿入
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  function mkState(
    currRow: number | null,
    currCol: number | null,
    sourceCells: [number, number][],
    editOps?: string,
  ): DPTableState {
    return {
      table: dp.map(row => [...row]),
      rowLabels, colLabels,
      currentRow: currRow,
      currentCol: currCol,
      sourceCells,
      done: editOps !== undefined,
      editOps,
    }
  }

  yield {
    state: mkState(0, null, []),
    log: {
      ja: `レーベンシュタイン距離開始。s="${s}"→t="${t}"。ベースケース初期化完了。`,
      en: `Levenshtein distance: "${s}" → "${t}". Base cases initialized.`,
    },
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sourceCells: [number, number][] = [[i - 1, j], [i, j - 1], [i - 1, j - 1]]

      if (s[i - 1] === t[j - 1]) {
        // 文字が一致: 操作なしで dp[i-1][j-1] と同じ
        dp[i][j] = dp[i - 1][j - 1]!

        yield {
          state: mkState(i, j, [[i - 1, j - 1]]),
          log: {
            ja: `s[${i - 1}]='${s[i - 1]}' = t[${j - 1}]='${t[j - 1]}' 一致 → dp[${i}][${j}] = ${dp[i][j]}（操作なし）`,
            en: `s[${i - 1}]='${s[i - 1]}' = t[${j - 1}]='${t[j - 1]}' match → dp[${i}][${j}] = ${dp[i][j]} (no op)`,
          },
        }
      } else {
        // 削除: dp[i-1][j] + 1, 挿入: dp[i][j-1] + 1, 置換: dp[i-1][j-1] + 1
        const del = dp[i - 1][j]! + 1
        const ins = dp[i][j - 1]! + 1
        const sub = dp[i - 1][j - 1]! + 1
        dp[i][j] = Math.min(del, ins, sub)

        const opName = dp[i][j] === sub ? '置換' : dp[i][j] === del ? '削除' : '挿入'
        const opNameEn = dp[i][j] === sub ? 'substitute' : dp[i][j] === del ? 'delete' : 'insert'

        yield {
          state: mkState(i, j, sourceCells),
          log: {
            ja: `s[${i - 1}]='${s[i - 1]}' ≠ t[${j - 1}]='${t[j - 1]}' → min(del=${del}, ins=${ins}, sub=${sub}) = ${dp[i][j]}（${opName}）`,
            en: `'${s[i - 1]}' ≠ '${t[j - 1]}' → min(del=${del}, ins=${ins}, sub=${sub}) = ${dp[i][j]} (${opNameEn})`,
          },
        }
      }
    }
  }

  // 逆追跡して編集操作列を復元する
  let ei = m, ej = n
  let editOps = ''
  while (ei > 0 || ej > 0) {
    if (ei > 0 && ej > 0 && s[ei - 1] === t[ej - 1]) {
      editOps = 'M' + editOps; ei--; ej--
    } else if (ei > 0 && ej > 0 && dp[ei][ej] === dp[ei - 1][ej - 1]! + 1) {
      editOps = 'S' + editOps; ei--; ej--
    } else if (ei > 0 && dp[ei][ej] === dp[ei - 1][ej]! + 1) {
      editOps = 'D' + editOps; ei--
    } else {
      editOps = 'I' + editOps; ej--
    }
  }

  yield {
    state: mkState(null, null, [], editOps),
    log: {
      ja: `完了！編集距離 = ${dp[m][n]}。操作列: ${editOps}（M=一致, S=置換, D=削除, I=挿入）`,
      en: `Done! Edit distance = ${dp[m][n]}. Ops: ${editOps} (M=match, S=sub, D=del, I=ins)`,
    },
  }
}
