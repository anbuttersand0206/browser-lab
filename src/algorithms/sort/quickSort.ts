import type { AlgorithmStep, SortState } from '../types'

// クイックソート: ピボット要素を基準に配列を分割し、再帰的にソートする。
// 平均 O(n log n) で実用最速クラスだが、常に最小/最大がピボットになると O(n²) に退化する。
export function* quickSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  // partition はピボットを最終位置に置き、そのインデックスを戻り値として返す。
  // TypeScript の yield* では Generator<Y, R, N> の戻り値 R を受け取れるため、
  // const pivotPos = yield* partition(...) のように使える。
  function* partition(lo: number, hi: number): Generator<AlgorithmStep<SortState>, number, never> {
    const pivotVal = arr[hi]
    // i は「ピボットより小さい要素の末尾インデックス」を追跡する
    let i = lo - 1

    yield {
      state: mkState({ pivot: hi, activeRange: [lo, hi] }),
      log: {
        ja: `ピボット選択: インデックス${hi}（値:${pivotVal}）`,
        en: `Pivot selected: index ${hi} (value: ${pivotVal})`,
      },
    }

    for (let j = lo; j < hi; j++) {
      yield {
        state: mkState({ comparing: [j, hi], pivot: hi, activeRange: [lo, hi] }),
        log: {
          ja: `${arr[j]} とピボット${pivotVal}を比較中...`,
          en: `Comparing ${arr[j]} with pivot ${pivotVal}...`,
        },
      }

      if (arr[j] <= pivotVal) {
        i++
        if (i !== j) {
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
          yield {
            state: mkState({ swapping: [i, j], pivot: hi, activeRange: [lo, hi] }),
            log: {
              ja: `${arr[j]} ≤ ${pivotVal}: インデックス${i}と${j}をスワップ`,
              en: `${arr[j]} ≤ ${pivotVal}: swap index ${i} and ${j}`,
            },
          }
        } else {
          yield {
            state: mkState({ pivot: hi, activeRange: [lo, hi] }),
            log: {
              ja: `${arr[j]} ≤ ${pivotVal}: 左半分に確定`,
              en: `${arr[j]} ≤ ${pivotVal}: belongs in left partition`,
            },
          }
        }
      }
    }

    // ピボットを仕切り位置（i+1）に移動して確定させる
    ;[arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]]
    yield {
      state: mkState({ swapping: [i + 1, hi] }),
      log: {
        ja: `ピボット${pivotVal}をインデックス${i + 1}の最終位置に配置`,
        en: `Placing pivot ${pivotVal} at its final position: index ${i + 1}`,
      },
    }

    sortedIndices.push(i + 1)
    return i + 1
  }

  function* quickSortHelper(lo: number, hi: number): Generator<AlgorithmStep<SortState>, void, never> {
    if (lo >= hi) {
      // 要素が 1 つの区間は自明に整列済み
      if (lo === hi) sortedIndices.push(lo)
      return
    }

    const pivotPos = yield* partition(lo, hi)
    yield* quickSortHelper(lo, pivotPos - 1)
    yield* quickSortHelper(pivotPos + 1, hi)
  }

  yield* quickSortHelper(0, n - 1)

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
