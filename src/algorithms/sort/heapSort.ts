import type { AlgorithmStep, SortState } from '../types'

// ヒープソート: 最大ヒープを構築してから最大値を末尾へ繰り返し取り出す。
// 最悪でも O(n log n) を保証しつつ、追加メモリが O(1) で済む点が強み。
// 2 フェーズ構成（ヒープ構築 → ソート）の切り替えをビジュアライザーで観察できる。
export function* heapSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  // ヒープ性質を維持するための下向き修正（sift-down）。
  // 親が左右の子より大きくなるまでスワップを繰り返す。
  function* heapify(heapSize: number, rootIdx: number): Generator<AlgorithmStep<SortState>, void, never> {
    let largestIdx = rootIdx
    const leftChildIdx = 2 * rootIdx + 1
    const rightChildIdx = 2 * rootIdx + 2

    if (leftChildIdx < heapSize) {
      yield {
        state: mkState({ comparing: [largestIdx, leftChildIdx] }),
        log: {
          ja: `親${arr[largestIdx]}と左子${arr[leftChildIdx]}を比較中...`,
          en: `Comparing parent ${arr[largestIdx]} with left child ${arr[leftChildIdx]}...`,
        },
      }
      if (arr[leftChildIdx] > arr[largestIdx]) largestIdx = leftChildIdx
    }

    if (rightChildIdx < heapSize) {
      yield {
        state: mkState({ comparing: [largestIdx, rightChildIdx] }),
        log: {
          ja: `現在の最大${arr[largestIdx]}と右子${arr[rightChildIdx]}を比較中...`,
          en: `Comparing current max ${arr[largestIdx]} with right child ${arr[rightChildIdx]}...`,
        },
      }
      if (arr[rightChildIdx] > arr[largestIdx]) largestIdx = rightChildIdx
    }

    if (largestIdx !== rootIdx) {
      ;[arr[rootIdx], arr[largestIdx]] = [arr[largestIdx], arr[rootIdx]]
      yield {
        state: mkState({ swapping: [rootIdx, largestIdx] }),
        log: {
          ja: `インデックス${rootIdx}（${arr[largestIdx]}）と${largestIdx}（${arr[rootIdx]}）をスワップ`,
          en: `Swap index ${rootIdx} (${arr[largestIdx]}) and ${largestIdx} (${arr[rootIdx]})`,
        },
      }
      // スワップ後、子ノード側のヒープ性質が崩れた可能性があるため再帰的に修正する
      yield* heapify(heapSize, largestIdx)
    }
  }

  // フェーズ 1: 最大ヒープを構築する
  yield {
    state: mkState(),
    log: { ja: '最大ヒープを構築中...', en: 'Building max heap...' },
  }

  // 葉ノードは heapify 不要なため、最後の内部ノード (floor(n/2) - 1) から逆順で処理する
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i)
  }

  yield {
    state: mkState({ activeRange: [0, n - 1] }),
    log: { ja: '最大ヒープ構築完了。ソートフェーズ開始', en: 'Max heap built. Starting sort phase' },
  }

  // フェーズ 2: 最大値（ルート）を末尾と交換して確定させ、ヒープサイズを縮小する
  for (let i = n - 1; i > 0; i--) {
    ;[arr[0], arr[i]] = [arr[i], arr[0]]
    sortedIndices.push(i)

    yield {
      state: mkState({ swapping: [0, i] }),
      log: {
        ja: `最大値${arr[i]}をインデックス${i}（最終位置）に移動`,
        en: `Moving max ${arr[i]} to index ${i} (final position)`,
      },
    }

    yield* heapify(i, 0)
  }

  sortedIndices.push(0)
  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
