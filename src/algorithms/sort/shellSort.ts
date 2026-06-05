import type { AlgorithmStep, SortState } from '../types'

// シェルソート: 挿入ソートを「大きなギャップ」から始めて段階的にギャップを縮小する。
// ギャップが大きいうちに遠く離れた要素を早期に整列させることで、
// 挿入ソート単体の O(n²) より平均的に速く動く（Knuth 列では O(n^(4/3)) 程度）。
export function* shellSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  // Knuth 列: 1, 4, 13, 40, 121... h = 3h+1 でギャップを生成する。
  // 1 から始まる Knuth 列を使う理由: n/3 未満で最大のものを初期ギャップに選ぶと
  // 実験的に良い性能が得られることが知られているため。
  const gaps: number[] = [1]
  while (gaps[gaps.length - 1] * 3 + 1 < n) {
    gaps.push(gaps[gaps.length - 1] * 3 + 1)
  }

  yield {
    state: mkState(),
    log: {
      ja: `シェルソート開始。Knuth 列のギャップ: [${gaps.slice().reverse().join(', ')}]`,
      en: `Shell Sort started. Knuth gap sequence: [${gaps.slice().reverse().join(', ')}]`,
    },
  }

  // ギャップを大きい方から小さい方（1）へ順に処理する
  for (let gapIdx = gaps.length - 1; gapIdx >= 0; gapIdx--) {
    const gap = gaps[gapIdx]

    yield {
      state: mkState(),
      log: {
        ja: `ギャップ ${gap} で挿入ソートを実行します`,
        en: `Running insertion sort with gap ${gap}`,
      },
    }

    // gap 離れた要素同士で挿入ソートを行う
    for (let i = gap; i < n; i++) {
      const temp = arr[i]
      let j = i

      yield {
        state: mkState({ pivot: i, activeRange: [Math.max(0, i - gap * 3), i] }),
        log: {
          ja: `arr[${i}]=${temp} を gap=${gap} の挿入ソートで適切な位置に挿入します`,
          en: `Inserting arr[${i}]=${temp} at gap=${gap}`,
        },
      }

      while (j >= gap && arr[j - gap] > temp) {
        yield {
          state: mkState({ comparing: [j - gap, j], activeRange: [Math.max(0, i - gap * 3), i] }),
          log: {
            ja: `arr[${j - gap}]=${arr[j - gap]} > ${temp}、右にシフトします`,
            en: `arr[${j - gap}]=${arr[j - gap]} > ${temp}, shifting right`,
          },
        }

        arr[j] = arr[j - gap]
        yield {
          state: mkState({ swapping: [j - gap, j], activeRange: [Math.max(0, i - gap * 3), i] }),
          log: {
            ja: `arr[${j}] ← arr[${j - gap}]（シフト完了）`,
            en: `arr[${j}] ← arr[${j - gap}] (shifted)`,
          },
        }

        j -= gap
      }

      arr[j] = temp
    }
  }

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
