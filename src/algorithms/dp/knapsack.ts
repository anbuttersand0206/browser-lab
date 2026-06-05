import type { AlgorithmStep, DPTableState } from '../types'

interface Item { name: string; weight: number; value: number }

// ナップサック問題（0-1 ナップサック）: 重さ制限内で価値の合計を最大化するアイテムを選ぶ。
// DP テーブル dp[i][w] = 「アイテム i 番目まで使って重さ w 以下に収める最大価値」として定義し、
// dp[i][w] = max(dp[i-1][w], dp[i-1][w-wi] + vi) の漸化式で埋める。
export function* knapsack(preset: 'classic' | 'large'): Generator<AlgorithmStep<DPTableState>, void, never> {
  const ITEMS: Item[] = preset === 'classic'
    ? [
        { name: 'A', weight: 2, value: 6 },
        { name: 'B', weight: 2, value: 10 },
        { name: 'C', weight: 3, value: 12 },
        { name: 'D', weight: 5, value: 13 },
      ]
    : [
        { name: 'A', weight: 1, value: 1 },
        { name: 'B', weight: 2, value: 6 },
        { name: 'C', weight: 3, value: 10 },
        { name: 'D', weight: 4, value: 16 },
        { name: 'E', weight: 5, value: 20 },
      ]

  const CAPACITY = preset === 'classic' ? 5 : 7
  const n = ITEMS.length

  // テーブルの行ラベル（先頭はベースケース「アイテムなし」行）
  const rowLabels = ['—', ...ITEMS.map(it => `${it.name}(w=${it.weight},v=${it.value})`)]
  const colLabels = Array.from({ length: CAPACITY + 1 }, (_, w) => String(w))

  // dp[i][w]: i=0 はアイテムなし（ベースケース）
  const dp: (number | null)[][] = Array.from({ length: n + 1 }, () =>
    Array(CAPACITY + 1).fill(null)
  )
  // ベースケース: アイテム 0 個なら全重みで価値 0
  for (let w = 0; w <= CAPACITY; w++) dp[0][w] = 0

  function mkState(
    currRow: number | null,
    currCol: number | null,
    sourceCells: [number, number][],
    selectedItems?: number[],
  ): DPTableState {
    return {
      table: dp.map(row => [...row]),
      rowLabels, colLabels,
      currentRow: currRow,
      currentCol: currCol,
      sourceCells,
      done: currRow === null && currCol === null && selectedItems !== undefined,
      selectedItems,
    }
  }

  yield {
    state: mkState(0, null, []),
    log: {
      ja: `ナップサック問題開始。容量 W=${CAPACITY}、アイテム数 n=${n}。dp[0][w]=0 を初期化。`,
      en: `0-1 Knapsack started. Capacity W=${CAPACITY}, items n=${n}. Init dp[0][w]=0.`,
    },
  }

  // テーブルを行（アイテム）→ 列（重み）の順に埋める
  for (let i = 1; i <= n; i++) {
    const item = ITEMS[i - 1]

    yield {
      state: mkState(i, null, []),
      log: {
        ja: `アイテム ${item.name}（重さ ${item.weight}, 価値 ${item.value}）を検討`,
        en: `Considering item ${item.name} (weight=${item.weight}, value=${item.value})`,
      },
    }

    for (let w = 0; w <= CAPACITY; w++) {
      // アイテムを入れない場合: dp[i-1][w]
      const withoutItem = dp[i - 1][w]!

      if (item.weight > w) {
        // 重すぎて入れられない
        dp[i][w] = withoutItem

        yield {
          state: mkState(i, w, [[i - 1, w]]),
          log: {
            ja: `dp[${i}][${w}]: アイテム ${item.name}(重${item.weight}) は重さ ${w} に入らない → ${withoutItem}`,
            en: `dp[${i}][${w}]: item ${item.name}(w=${item.weight}) too heavy for capacity ${w} → ${withoutItem}`,
          },
        }
      } else {
        // アイテムを入れる場合: dp[i-1][w - weight] + value
        const withItem = dp[i - 1][w - item.weight]! + item.value
        dp[i][w] = Math.max(withoutItem, withItem)

        yield {
          state: mkState(i, w, [[i - 1, w], [i - 1, w - item.weight]]),
          log: {
            ja: `dp[${i}][${w}]: max(入れない=${withoutItem}, 入れる=${withItem}) = ${dp[i][w]}`,
            en: `dp[${i}][${w}]: max(skip=${withoutItem}, take=${withItem}) = ${dp[i][w]}`,
          },
        }
      }
    }
  }

  // 逆追跡して選択アイテムを求める
  const selectedItems: number[] = []
  let remW = CAPACITY
  for (let i = n; i >= 1; i--) {
    if (dp[i][remW] !== dp[i - 1][remW]) {
      selectedItems.push(i - 1)  // 0-indexed
      remW -= ITEMS[i - 1].weight
    }
  }
  selectedItems.reverse()

  const totalValue = dp[n][CAPACITY]!
  const selectedNames = selectedItems.map(idx => ITEMS[idx].name).join(', ')

  yield {
    state: mkState(null, null, [], selectedItems),
    log: {
      ja: `完了！最大価値 = ${totalValue}。選択アイテム: [${selectedNames}]`,
      en: `Done! Max value = ${totalValue}. Selected items: [${selectedNames}]`,
    },
  }
}
