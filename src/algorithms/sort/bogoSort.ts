import type { AlgorithmStep, SortState } from '../types'

// ボゴソート: 配列をランダムにシャッフルし、ソート済みかどうかを確認する。
// ソートが成功するまで無限に繰り返すため、理論上の平均計算量は O((n+1)!) 。
// 学習用途以外では絶対に使われない「最悪のソートアルゴリズム」の典型例。
export function* bogoSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
  const arr = [...initial]
  const n = arr.length

  const mkState = (overrides: Partial<SortState> = {}): SortState => ({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [],
    pivot: null,
    merging: [],
    activeRange: null,
    ...overrides,
  })

  // ソート済み判定: i 番目と i+1 番目が逆順でなければ OK
  function isSorted(): boolean {
    for (let i = 0; i < n - 1; i++) {
      if (arr[i] > arr[i + 1]) return false
    }
    return true
  }

  // フィッシャー–イェーツ法でインプレースシャッフル
  function shuffle() {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  let attempt = 0

  yield {
    state: mkState(),
    log: {
      ja: `ボゴソート開始。配列がソート済みになるまでランダムシャッフルを繰り返します。`,
      en: `Bogo Sort started. Will randomly shuffle until the array is sorted.`,
    },
  }

  while (!isSorted()) {
    // ソート済みかどうかを全ペアで確認する
    for (let i = 0; i < n - 1; i++) {
      yield {
        state: mkState({ comparing: [i, i + 1] }),
        log: {
          ja: `確認中: arr[${i}]=${arr[i]} vs arr[${i + 1}]=${arr[i + 1]}`,
          en: `Checking: arr[${i}]=${arr[i]} vs arr[${i + 1}]=${arr[i + 1]}`,
        },
      }
      if (arr[i] > arr[i + 1]) {
        yield {
          state: mkState({ comparing: [i, i + 1] }),
          log: {
            ja: `順序が乱れています（${arr[i]} > ${arr[i + 1]}）。シャッフルします。`,
            en: `Out of order (${arr[i]} > ${arr[i + 1]}). Shuffling...`,
          },
        }
        break
      }
    }

    shuffle()
    attempt++

    yield {
      state: mkState(),
      log: {
        ja: `シャッフル ${attempt} 回目完了。ソート済みか確認します。`,
        en: `Shuffle #${attempt} done. Checking if sorted...`,
      },
    }
  }

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: {
      ja: `ソート完了！${attempt} 回のシャッフルで成功しました。`,
      en: `Sorted! Took ${attempt} shuffle(s).`,
    },
  }
}
