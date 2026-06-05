import type { AlgorithmStep, SortState } from '../types'

// カクテルソート（双方向バブルソート）:
// バブルソートを左→右と右→左で交互に行うことで、
// 亀（小さな値が右端に）と兎（大きな値が左端に）問題を緩和する。
// 最悪計算量は O(n²) でバブルソートと同じだが、実用的にはやや速い場合が多い。
export function* cocktailSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
  const arr = [...initial]
  const n = arr.length
  const sortedIndices: number[] = []

  const mkState = (overrides: Partial<SortState> = {}): SortState => ({
    array: [...arr],
    comparing: [],
    swapping: [],
    sorted: [...sortedIndices],
    pivot: null,
    merging: [],
    activeRange: null,
    ...overrides,
  })

  let lo = 0
  let hi = n - 1

  yield {
    state: mkState({ activeRange: [lo, hi] }),
    log: {
      ja: 'カクテルソート開始。左→右、右→左と交互にバブルソートを行います。',
      en: 'Cocktail Sort started. Alternates bubble passes: left→right then right→left.',
    },
  }

  while (lo < hi) {
    let swappedForward = false

    // 左→右パス（大きな値を右端へ）
    for (let j = lo; j < hi; j++) {
      const leftVal = arr[j]
      const rightVal = arr[j + 1]

      yield {
        state: mkState({ comparing: [j, j + 1], activeRange: [lo, hi] }),
        log: {
          ja: `[→] arr[${j}]=${leftVal} と arr[${j + 1}]=${rightVal} を比較`,
          en: `[→] Comparing arr[${j}]=${leftVal} and arr[${j + 1}]=${rightVal}`,
        },
      }

      if (leftVal > rightVal) {
        ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        swappedForward = true

        yield {
          state: mkState({ swapping: [j, j + 1], activeRange: [lo, hi] }),
          log: {
            ja: `スワップ: ${leftVal} > ${rightVal}`,
            en: `Swap: ${leftVal} > ${rightVal}`,
          },
        }
      }
    }

    // 右端が確定したのでインデックスを縮める
    sortedIndices.push(hi)
    hi--

    if (!swappedForward) {
      // 一度もスワップが起きなければ全体がソート済み
      for (let k = lo; k <= hi; k++) sortedIndices.push(k)
      break
    }

    // 右→左パス（小さな値を左端へ）
    let swappedBackward = false
    for (let j = hi; j > lo; j--) {
      const leftVal = arr[j - 1]
      const rightVal = arr[j]

      yield {
        state: mkState({ comparing: [j - 1, j], activeRange: [lo, hi] }),
        log: {
          ja: `[←] arr[${j - 1}]=${leftVal} と arr[${j}]=${rightVal} を比較`,
          en: `[←] Comparing arr[${j - 1}]=${leftVal} and arr[${j}]=${rightVal}`,
        },
      }

      if (leftVal > rightVal) {
        ;[arr[j - 1], arr[j]] = [arr[j], arr[j - 1]]
        swappedBackward = true

        yield {
          state: mkState({ swapping: [j - 1, j], activeRange: [lo, hi] }),
          log: {
            ja: `スワップ: ${leftVal} > ${rightVal}`,
            en: `Swap: ${leftVal} > ${rightVal}`,
          },
        }
      }
    }

    sortedIndices.push(lo)
    lo++

    if (!swappedBackward) {
      for (let k = lo; k <= hi; k++) sortedIndices.push(k)
      break
    }
  }

  // lo === hi の中央要素はまだ sorted に入っていない可能性がある
  if (lo === hi && !sortedIndices.includes(lo)) sortedIndices.push(lo)

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
