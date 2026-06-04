import type { AlgorithmStep, SortState } from '../types'

// マージソート: 分割統治法で O(n log n) を実現する安定ソート。
// 再帰的な分割と統合の様子を可視化するため、ネストしたジェネレーター関数で実装する。
// yield* で内部ジェネレーターのステップを外部に透過的に流すことで、
// 再帰の深さに関わらずフラットなステップ列として受け取れる。
export function* mergeSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  // 再帰的な分割・統合をジェネレーターとして実装する。
  // クロージャで arr を共有することで、マージ結果が即座にビジュアライザーに反映される。
  function* mergeSortHelper(lo: number, hi: number): Generator<AlgorithmStep<SortState>, void, never> {
    if (lo >= hi) return

    const mid = Math.floor((lo + hi) / 2)

    yield {
      state: mkState({ activeRange: [lo, hi] }),
      log: {
        ja: `[${lo}..${hi}] を [${lo}..${mid}] と [${mid + 1}..${hi}] に分割`,
        en: `Dividing [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}]`,
      },
    }

    yield* mergeSortHelper(lo, mid)
    yield* mergeSortHelper(mid + 1, hi)

    yield {
      state: mkState({ activeRange: [lo, hi] }),
      log: {
        ja: `[${lo}..${mid}] と [${mid + 1}..${hi}] をマージします`,
        en: `Merging [${lo}..${mid}] and [${mid + 1}..${hi}]`,
      },
    }

    // マージの補助配列。arr を in-place で変更するため一時コピーが必要。
    const leftPart = arr.slice(lo, mid + 1)
    const rightPart = arr.slice(mid + 1, hi + 1)
    let li = 0, ri = 0, writePos = lo

    while (li < leftPart.length && ri < rightPart.length) {
      yield {
        state: mkState({ comparing: [lo + li, mid + 1 + ri], activeRange: [lo, hi] }),
        log: {
          ja: `${leftPart[li]} と ${rightPart[ri]} を比較中...`,
          en: `Comparing ${leftPart[li]} and ${rightPart[ri]}...`,
        },
      }

      if (leftPart[li] <= rightPart[ri]) {
        arr[writePos++] = leftPart[li++]
      } else {
        arr[writePos++] = rightPart[ri++]
      }

      yield {
        state: mkState({ merging: [writePos - 1], activeRange: [lo, hi] }),
        log: {
          ja: `値${arr[writePos - 1]}をインデックス${writePos - 1}に配置`,
          en: `Placing value ${arr[writePos - 1]} at index ${writePos - 1}`,
        },
      }
    }

    // 残った片側をそのまま書き込む
    while (li < leftPart.length) {
      arr[writePos++] = leftPart[li++]
      yield {
        state: mkState({ merging: [writePos - 1], activeRange: [lo, hi] }),
        log: {
          ja: `残りの左配列要素${arr[writePos - 1]}を配置`,
          en: `Placing remaining left element ${arr[writePos - 1]}`,
        },
      }
    }

    while (ri < rightPart.length) {
      arr[writePos++] = rightPart[ri++]
      yield {
        state: mkState({ merging: [writePos - 1], activeRange: [lo, hi] }),
        log: {
          ja: `残りの右配列要素${arr[writePos - 1]}を配置`,
          en: `Placing remaining right element ${arr[writePos - 1]}`,
        },
      }
    }

    yield {
      state: mkState({ activeRange: [lo, hi] }),
      log: {
        ja: `[${lo}..${hi}] のマージ完了`,
        en: `Merge complete for [${lo}..${hi}]`,
      },
    }
  }

  yield* mergeSortHelper(0, n - 1)

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
