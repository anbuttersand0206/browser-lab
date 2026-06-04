import type { AlgorithmStep, SortState } from '../types'

// 選択ソート: 未ソート部分から最小値を探して先頭に置くことを繰り返す。
// スワップ回数が常に O(n) なのが特徴で、書き込みコストが高いメモリに適する。
export function* selectionSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i

    // SortState.pivot フィールドは本来クイックソート用だが、
    // 選択ソートでは「現在の最小候補インデックス」として流用している。
    // どちらも「注目している単一要素」を紫色で表示するという UI 上の意味は同じ。
    yield {
      state: mkState({ pivot: i }),
      log: {
        ja: `位置${i}から最小値を探索開始（現在の最小候補: ${arr[i]}）`,
        en: `Searching for minimum from position ${i} (current min candidate: ${arr[i]})`,
      },
    }

    for (let j = i + 1; j < n; j++) {
      yield {
        state: mkState({ comparing: [minIdx, j], pivot: minIdx }),
        log: {
          ja: `インデックス${j}（値:${arr[j]}）と最小候補${arr[minIdx]}を比較中...`,
          en: `Comparing index ${j} (value: ${arr[j]}) with current min ${arr[minIdx]}...`,
        },
      }

      if (arr[j] < arr[minIdx]) {
        minIdx = j
        yield {
          state: mkState({ pivot: minIdx }),
          log: {
            ja: `新しい最小値を発見: ${arr[minIdx]}（インデックス${minIdx}）`,
            en: `New minimum found: ${arr[minIdx]} at index ${minIdx}`,
          },
        }
      }
    }

    if (minIdx !== i) {
      ;[arr[i], arr[minIdx]] = [arr[minIdx], arr[i]]
      yield {
        state: mkState({ swapping: [i, minIdx] }),
        log: {
          ja: `インデックス${i}とインデックス${minIdx}をスワップ`,
          en: `Swapping index ${i} and index ${minIdx}`,
        },
      }
    } else {
      yield {
        state: mkState(),
        log: {
          ja: `インデックス${i}はすでに正しい位置にあります`,
          en: `Index ${i} is already in the correct position`,
        },
      }
    }

    sortedIndices.push(i)
  }

  sortedIndices.push(n - 1)
  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
