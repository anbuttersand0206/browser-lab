import type { AlgorithmStep, SortState } from '../types'

// 挿入ソート: 手元のカードを整理するように、未ソート先頭を適切な位置へ挿入する。
// 整列済み部分に対しては O(n) で動くため、ほぼ整列済みの入力に強い。
export function* insertionSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  yield {
    state: mkState({ sorted: [0] }),
    log: { ja: 'インデックス0は整列済みとみなします', en: 'Index 0 is considered sorted' },
  }

  for (let i = 1; i < n; i++) {
    // 挿入対象の値を確保する。
    // arr[i] は後続の右シフトで上書きされるため、先にコピーが必要。
    const keyVal = arr[i]
    let j = i - 1

    yield {
      state: mkState({ pivot: i }),
      log: {
        ja: `値${keyVal}（インデックス${i}）を適切な位置に挿入します`,
        en: `Inserting value ${keyVal} (index ${i}) into the sorted portion`,
      },
    }

    while (j >= 0 && arr[j] > keyVal) {
      yield {
        state: mkState({ comparing: [j, j + 1], pivot: i }),
        log: {
          ja: `${arr[j]} > ${keyVal}: 右にシフト`,
          en: `${arr[j]} > ${keyVal}: shift right`,
        },
      }

      arr[j + 1] = arr[j]
      j--

      yield {
        state: mkState({ swapping: [j + 1, j + 2] }),
        log: {
          ja: `インデックス${j + 1}の要素を右にシフトしました`,
          en: `Shifted element at index ${j + 1} to the right`,
        },
      }
    }

    arr[j + 1] = keyVal

    yield {
      state: mkState(),
      log: {
        ja: `値${keyVal}をインデックス${j + 1}に挿入しました`,
        en: `Inserted value ${keyVal} at index ${j + 1}`,
      },
    }
  }

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
