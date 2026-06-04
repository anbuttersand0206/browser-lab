import type { AlgorithmStep, GridConfig, GridState, CellOverlay } from '../types'

function cellKey(r: number, c: number) { return `${r},${c}` }
function parseCellKey(k: string): [number, number] {
  const [r, c] = k.split(',').map(Number)
  return [r, c]
}

const ADJACENT_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

function createEmptyOverlay(rows: number, cols: number): CellOverlay[][] {
  return Array.from({ length: rows }, () => Array(cols).fill('none') as CellOverlay[])
}

// DFS: スタックを使って一方向へ深く掘り進み、行き詰まったらバックトラックする。
// BFS と異なり最短経路を保証しないが、探索空間が広い場合にメモリ効率が良い。
export function* dfsSearch(config: GridConfig): Generator<AlgorithmStep<GridState>, void, never> {
  const { rows, cols, cells, start, goal } = config
  const overlay = createEmptyOverlay(rows, cols)
  const visitedCells = new Set<string>()
  const parentCell = new Map<string, string>()

  const mkState = (
    current: [number, number] | null,
    path: [number, number][],
    done: boolean,
    found: boolean,
  ): GridState => ({
    config,
    overlay: overlay.map(row => [...row]),
    current,
    path: [...path],
    done,
    found,
  })

  yield {
    state: mkState(null, [], false, false),
    log: {
      ja: `DFS開始: スタート(${start[0]},${start[1]})から深さ優先探索`,
      en: `DFS start: Depth-first search from (${start[0]},${start[1]})`,
    },
  }

  // 再帰 DFS をジェネレーターとして実装する。
  // 戻り値 boolean はゴールを発見したかを表し、yield* の呼び出し元が受け取る。
  // フラグ変数の代わりに戻り値で結果を伝搬させることで、状態追跡コストを下げている。
  function* dfsFromCell(r: number, c: number): Generator<AlgorithmStep<GridState>, boolean, never> {
    if (visitedCells.has(cellKey(r, c))) return false
    if (cells[r][c] === 'wall') return false

    visitedCells.add(cellKey(r, c))
    overlay[r][c] = 'current'

    yield {
      state: mkState([r, c], [], false, false),
      log: {
        ja: `(${r},${c})を訪問中... スタックの深さ: ${visitedCells.size}`,
        en: `Visiting (${r},${c})... Stack depth: ${visitedCells.size}`,
      },
    }

    if (r === goal[0] && c === goal[1]) return true

    overlay[r][c] = 'visited'

    for (const [dr, dc] of ADJACENT_DIRS) {
      const nr = r + dr
      const nc = c + dc
      const neighborKey = cellKey(nr, nc)

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (visitedCells.has(neighborKey) || cells[nr][nc] === 'wall') continue

      parentCell.set(neighborKey, cellKey(r, c))
      overlay[nr][nc] = 'frontier'

      const isGoalFound = yield* dfsFromCell(nr, nc)
      if (isGoalFound) return true
    }

    yield {
      state: mkState(null, [], false, false),
      log: {
        ja: `(${r},${c})のバックトラック`,
        en: `Backtracking from (${r},${c})`,
      },
    }

    return false
  }

  const isGoalFound = yield* dfsFromCell(start[0], start[1])

  if (isGoalFound) {
    const goalKey = cellKey(goal[0], goal[1])
    const path: [number, number][] = []
    let cur: string | undefined = goalKey
    while (cur) {
      path.unshift(parseCellKey(cur))
      cur = parentCell.get(cur)
    }

    // スタートは parentCell に登録されないため、先頭に手動追加する
    if (!path.some(([pr, pc]) => pr === start[0] && pc === start[1])) {
      path.unshift(start)
    }

    for (const [pr, pc] of path) {
      overlay[pr][pc] = 'path'
    }

    yield {
      state: mkState(goal, path, true, true),
      log: {
        ja: `ゴール到達！経路長: ${path.length - 1}ステップ（最短保証なし）`,
        en: `Goal reached! Path length: ${path.length - 1} steps (not necessarily shortest)`,
      },
    }
  } else {
    yield {
      state: mkState(null, [], true, false),
      log: {
        ja: 'ゴールへの経路が見つかりませんでした',
        en: 'No path found to the goal',
      },
    }
  }
}
