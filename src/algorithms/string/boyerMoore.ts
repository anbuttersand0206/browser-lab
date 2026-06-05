import type { AlgorithmStep, StringSearchState, CharStatus } from '../types'

// ボイヤー・ムーア法: パターンを右端から照合し、不一致時に「悪い文字規則」と
// 「好い接尾辞規則」で大きくスキップする。
// 実用的には最も速いとされる文字列探索アルゴリズムの一つ（最良 O(n/m)）。
// ここでは実装を「悪い文字規則」のみとし、視覚的なスキップ量を可視化する。
export function* boyerMoore(textInput: string, patternInput: string): Generator<AlgorithmStep<StringSearchState>, void, never> {
  const text = textInput
  const pattern = patternInput
  const n = text.length
  const m = pattern.length

  // 悪い文字テーブル: 各文字について「パターン内での最右出現位置」を記録する。
  // 不一致文字がパターン内にない場合はパターン全体分スキップできる。
  const badChar: Record<string, number> = {}
  for (let i = 0; i < m; i++) {
    badChar[pattern[i]] = i
  }

  function mkState(
    tStatus: CharStatus[],
    pStatus: CharStatus[],
    foundAt: number[],
    tPos: number,
    pPos: number,
    matchStatus: StringSearchState['matchStatus'],
    skip: number,
    done = false,
  ): StringSearchState {
    return {
      text, pattern,
      textStatus: [...tStatus],
      patternStatus: [...pStatus],
      foundAt: [...foundAt],
      textPos: tPos,
      patternPos: pPos,
      badCharTable: badChar,
      skipAmount: skip,
      matchStatus,
      done,
    }
  }

  const textStatus: CharStatus[] = Array(n).fill('normal')
  const foundAt: number[] = []

  yield {
    state: mkState(textStatus, Array(m).fill('normal'), foundAt, 0, 0, 'none', 0),
    log: {
      ja: `ボイヤー・ムーア法開始。悪い文字テーブルを構築済み。`,
      en: `Boyer-Moore started. Bad character table built.`,
    },
  }

  let s = 0  // パターンのシフト量（テキスト上のウィンドウ位置）

  while (s <= n - m) {
    let j = m - 1  // 右端から照合する

    const pSt: CharStatus[] = Array(m).fill('normal')
    const tSt = [...textStatus]

    // 右端から左へ照合する
    yield {
      state: mkState(tSt, pSt, foundAt, s, j, 'none', 0),
      log: {
        ja: `ウィンドウ位置 s=${s}: パターンを右端（位置 ${j}）から照合`,
        en: `Window at s=${s}: matching from right end (pos ${j})`,
      },
    }

    while (j >= 0 && pattern[j] === text[s + j]) {
      pSt[j] = 'match'
      tSt[s + j] = 'match'

      yield {
        state: mkState(tSt, pSt, foundAt, s, j, 'match', 0),
        log: {
          ja: `一致: text[${s + j}]='${text[s + j]}' = pattern[${j}]='${pattern[j]}'`,
          en: `Match: text[${s + j}]='${text[s + j]}' = pattern[${j}]='${pattern[j]}'`,
        },
      }
      j--
    }

    if (j < 0) {
      // パターン全体が一致
      foundAt.push(s)
      for (let fi = s; fi < s + m; fi++) textStatus[fi] = 'found'

      const skipAmt = m - (badChar[text[s + m] ?? ''] ?? -1)
      yield {
        state: mkState(textStatus, Array(m).fill('normal'), foundAt, s, -1, 'match', skipAmt),
        log: {
          ja: `パターン発見！位置 ${s}。次ウィンドウへ ${skipAmt} スキップ。`,
          en: `Pattern found at position ${s}! Shifting by ${skipAmt}.`,
        },
      }
      s += skipAmt
    } else {
      // 不一致: 悪い文字規則でスキップ量を計算する
      pSt[j] = 'mismatch'
      tSt[s + j] = 'mismatch'
      const badCharPos = badChar[text[s + j]] ?? -1
      const skipAmt = Math.max(1, j - badCharPos)

      yield {
        state: mkState(tSt, pSt, foundAt, s, j, 'mismatch', skipAmt),
        log: {
          ja: `不一致: text[${s + j}]='${text[s + j]}' ≠ pattern[${j}]='${pattern[j]}'。悪い文字規則で ${skipAmt} スキップ。`,
          en: `Mismatch at text[${s + j}]='${text[s + j]}' ≠ pattern[${j}]='${pattern[j]}'. Bad char skip: ${skipAmt}.`,
        },
      }
      s += skipAmt
    }
  }

  yield {
    state: mkState(textStatus, Array(m).fill('normal'), foundAt, n, 0, 'none', 0, true),
    log: {
      ja: `完了。${foundAt.length} 件の一致が見つかりました（位置: ${foundAt.join(', ') || 'なし'}）`,
      en: `Done. Found ${foundAt.length} match(es) at: ${foundAt.join(', ') || 'none'}`,
    },
  }
}
