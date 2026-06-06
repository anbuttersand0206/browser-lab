import type { AlgorithmStep, SortState } from '../types'

// ラディックスソート（LSD: 下位桁優先）:
// 数値を下位桁から上位桁へ順にカウンティングソートすることで全体をソートする。
// 比較を使わないため O(d·n) で動く（d = 最大桁数）。
// 大量の整数ソートで比較ベースのアルゴリズムの O(n log n) 下限を超えられる唯一の方法。
export function* radixSort(initial: number[]): Generator<AlgorithmStep<SortState>, void, never> {
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

  const maxVal = Math.max(...arr)
  // 最大値の桁数が処理パス数になる
  const maxDigits = Math.floor(Math.log10(maxVal)) + 1

  yield {
    state: mkState(),
    log: {
      ja: `ラディックスソート開始。最大値 ${maxVal} → ${maxDigits} 桁分の処理が必要です`,
      en: `Radix Sort started. Max value ${maxVal} → needs ${maxDigits} digit pass(es)`,
    },
  }

  // exp: 現在処理中の桁の重み（1=1の位, 10=10の位, ...）
  let exp = 1

  for (let digit = 0; digit < maxDigits; digit++) {
    yield {
      state: mkState(),
      log: {
        ja: `--- パス ${digit + 1}/${maxDigits}: ${exp === 1 ? '1の位' : exp + 'の位'} で分類 ---`,
        en: `--- Pass ${digit + 1}/${maxDigits}: sorting by digit position ${exp} ---`,
      },
    }

    // 0〜9 のバケツを用意する（カウンティングソートの count 配列）
    const count = new Array(10).fill(0)

    // 各要素の該当桁の値を数える
    for (let i = 0; i < n; i++) {
      const digitVal = Math.floor(arr[i] / exp) % 10
      count[digitVal]++

      yield {
        state: mkState({ comparing: [i], activeRange: [0, n - 1] }),
        log: {
          ja: `arr[${i}]=${arr[i]} の ${exp}の位 → ${digitVal}（バケツ ${digitVal} に追加）`,
          en: `arr[${i}]=${arr[i]}: digit = ${digitVal} (add to bucket ${digitVal})`,
        },
      }
    }

    // 累積和で各桁が出力配列のどの位置に入るかを計算する
    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1]
    }

    // 後ろから走査して安定ソートを維持する
    const output = new Array(n)
    for (let i = n - 1; i >= 0; i--) {
      const digitVal = Math.floor(arr[i] / exp) % 10
      output[--count[digitVal]] = arr[i]
    }

    // 出力配列を元の配列にコピーし、各要素を配置する過程を可視化する
    for (let i = 0; i < n; i++) {
      arr[i] = output[i]
      yield {
        state: mkState({ merging: [i] }),
        log: {
          ja: `位置 ${i} に ${arr[i]} を配置`,
          en: `Place ${arr[i]} at position ${i}`,
        },
      }
    }

    yield {
      state: mkState(),
      log: {
        ja: `${exp}の位 ソート完了: [${arr.join(', ')}]`,
        en: `Digit ${exp} pass done: [${arr.join(', ')}]`,
      },
    }

    exp *= 10
  }

  yield {
    state: mkState({ sorted: Array.from({ length: n }, (_, i) => i) }),
    log: { ja: 'ソート完了！', en: 'Sorting complete!' },
  }
}
