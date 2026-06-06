import type { AlgorithmStep, StringSearchState, CharStatus } from '../types'

// KMP（クヌース・モリス・プラット）法: パターンの構造（最長 proper border）を
// 事前計算した「失敗関数テーブル」として持ち、不一致時に無駄なバックトラックを省く。
// 最悪計算量 O(n+m)（n=テキスト長, m=パターン長）を保証する。
export function* kmp(textInput: string, patternInput: string): Generator<AlgorithmStep<StringSearchState>, void, never> {
  const text = textInput
  const pattern = patternInput
  const n = text.length
  const m = pattern.length

  function mkState(
    tStatus: CharStatus[],
    pStatus: CharStatus[],
    foundAt: number[],
    tPos: number,
    pPos: number,
    matchStatus: StringSearchState['matchStatus'],
    failureTable: number[],
    done = false,
  ): StringSearchState {
    return {
      text, pattern,
      textStatus: [...tStatus],
      patternStatus: [...pStatus],
      foundAt: [...foundAt],
      textPos: tPos,
      patternPos: pPos,
      failureTable: [...failureTable],
      skipAmount: 0,
      matchStatus,
      done,
    }
  }

  const textStatus: CharStatus[] = Array(n).fill('normal')
  const patternStatus: CharStatus[] = Array(m).fill('normal')
  const foundAt: number[] = []

  // 失敗関数テーブルの構築: failure[i] = pattern[0..i] の最長 proper border 長
  // これにより不一致時に「どこまで戻れるか」がわかる
  const failure = Array(m).fill(0)
  let k = 0
  for (let i = 1; i < m; i++) {
    while (k > 0 && pattern[k] !== pattern[i]) k = failure[k - 1]
    if (pattern[k] === pattern[i]) k++
    failure[i] = k
  }

  yield {
    state: mkState(textStatus, patternStatus, foundAt, 0, 0, 'none', failure),
    log: {
      ja: `KMP法開始。失敗関数テーブル: [${failure.join(', ')}]`,
      en: `KMP started. Failure function table: [${failure.join(', ')}]`,
    },
  }

  let j = 0  // テキスト上の現在位置

  while (j < n) {
    // 現在比較している文字をハイライト
    const tSt = [...textStatus]
    const pSt = [...patternStatus]

    tSt[j] = 'comparing'
    if (k < m) pSt[k] = 'comparing'

    yield {
      state: mkState(tSt, pSt, foundAt, j - k, k, 'none', failure),
      log: {
        ja: `text[${j}]='${text[j]}' と pattern[${k}]='${pattern[k]}' を比較`,
        en: `Comparing text[${j}]='${text[j]}' with pattern[${k}]='${pattern[k]}'`,
      },
    }

    if (text[j] === pattern[k]) {
      tSt[j] = 'match'
      pSt[k] = 'match'
      k++
      j++

      yield {
        state: mkState(tSt, pSt, foundAt, j - k, k, 'match', failure),
        log: {
          ja: `一致！k=${k}`,
          en: `Match! k=${k}`,
        },
      }

      if (k === m) {
        // パターン全体が一致した
        const startPos = j - m
        foundAt.push(startPos)
        for (let fi = startPos; fi < startPos + m; fi++) textStatus[fi] = 'found'

        yield {
          state: mkState(textStatus, Array(m).fill('normal'), foundAt, j - k + failure[k - 1], failure[k - 1], 'match', failure),
          log: {
            ja: `パターン発見！位置 ${startPos} に一致。KMP: k = failure[${k - 1}] = ${failure[k - 1]} にリセット`,
            en: `Pattern found at position ${startPos}! KMP reset: k = failure[${k - 1}] = ${failure[k - 1]}`,
          },
        }
        k = failure[k - 1]
      }
    } else {
      tSt[j] = 'mismatch'
      if (k < m) pSt[k] = 'mismatch'

      if (k === 0) {
        yield {
          state: mkState(tSt, pSt, foundAt, j, 0, 'mismatch', failure),
          log: {
            ja: `不一致（k=0）。テキストを 1 文字進める。`,
            en: `Mismatch (k=0). Advance text by 1.`,
          },
        }
        j++
      } else {
        const prevK = k
        k = failure[k - 1]
        yield {
          state: mkState(tSt, pSt, foundAt, j - k, k, 'mismatch', failure),
          log: {
            ja: `不一致！failure[${prevK - 1}]=${k} にリセット（${prevK - k} 文字スキップ節約）`,
            en: `Mismatch! Reset k = failure[${prevK - 1}] = ${k} (saved ${prevK - k} char compare)`,
          },
        }
      }
    }
  }

  yield {
    state: mkState(textStatus, Array(m).fill('normal'), foundAt, n, 0, 'none', failure, true),
    log: {
      ja: `完了。${foundAt.length} 件の一致が見つかりました（位置: ${foundAt.join(', ') || 'なし'}）`,
      en: `Done. Found ${foundAt.length} match(es) at position(s): ${foundAt.join(', ') || 'none'}`,
    },
  }
}
