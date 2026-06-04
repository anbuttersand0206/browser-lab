import type { AlgorithmStep, SortState } from '../types'

// バブルソート: 隣接要素を繰り返し比較・交換してソートする。
// 1 パスで最大値が末尾へ「浮かぶ」ため、i パス後は末尾 i+1 要素が確定する。
export function* bubbleSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
  const arr = [...initial]
  const n = arr.length
  // sorted は確定済みインデックスを追跡する。
  // ビジュアライザーが緑色で塗るために必要で、アルゴリズム自体には不要な情報。
  const sortedIndices: number[] = []

  // スナップショットを生成するヘルパー。
  // 毎ステップで arr をコピーするのは、ビジュアライザーが前のステップと
  // 現在ステップを独立して参照できるようにするため（参照共有だと全ステップが同じ配列を指す）。
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

  for (let i = 0; i < n - 1; i++) {
    let swappedInThisPass = false

    for (let j = 0; j < n - 1 - i; j++) {
      // スワップ前に値を確保する。
      // arr[j] と arr[j+1] はスワップ後に入れ替わるため、ログ文字列生成には元の値が必要。
      const leftVal = arr[j]
      const rightVal = arr[j + 1]

      yield {
        state: mkState({ comparing: [j, j + 1] }),
        log: {
          ja: `インデックス${j}（値:${leftVal}）とインデックス${j + 1}（値:${rightVal}）を比較中...`,
          en: `Comparing index ${j} (value: ${leftVal}) and index ${j + 1} (value: ${rightVal})...`,
        },
      }

      if (leftVal > rightVal) {
        ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        swappedInThisPass = true

        yield {
          state: mkState({ swapping: [j, j + 1] }),
          log: {
            ja: `${leftVal} > ${rightVal} のためスワップしました`,
            en: `Swapped: ${leftVal} > ${rightVal}`,
          },
        }
      } else {
        yield {
          state: mkState({ comparing: [j, j + 1] }),
          log: {
            ja: `${leftVal} ≤ ${rightVal} のためスワップ不要`,
            en: `No swap needed: ${leftVal} ≤ ${rightVal}`,
          },
        }
      }
    }

    sortedIndices.unshift(n - 1 - i)

    // 1 パスでスワップが 1 回も起きなければ、残りの全要素も整列済み。
    // この早期終了により、ほぼ整列済みの入力では O(n) で完了する。
    if (!swappedInThisPass) {
      for (let k = 0; k < n - 1 - i; k++) sortedIndices.unshift(k)
      break
    }
  }

  if (!sortedIndices.includes(0)) sortedIndices.unshift(0)

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
