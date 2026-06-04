import type { AlgorithmStep, GridConfig, GridState, CellOverlay } from '../types'

// グリッド座標を文字列キーに変換する。Map/Set のキーに座標タプルは使えないため。
function cellKey(r: number, c: number) { return `${r},${c}` }
function parseCellKey(k: string): [number, number] {
  const [r, c] = k.split(',').map(Number)
  return [r, c]
}

// 4 方向（上下左右）への移動量。斜め移動は壁抜けリスクがあるため含めない。
const ADJACENT_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

function createEmptyOverlay(rows: number, cols: number): CellOverlay[][] {
  return Array.from({ length: rows }, () => Array(cols).fill('none') as CellOverlay[])
}

// BFS: キューを使って始点から近い順に探索する。
// 最初にゴールに到達したときのパスが必ず最短となる（全辺のコストが 1 のため）。
export function* bfsSearch(config: GridConfig): Generator<AlgorithmStep<GridState>, void, never> {
  const { rows, cols, cells, start, goal } = config
  const overlay = createEmptyOverlay(rows, cols)

  const mkState = (
    current: [number, number] | null,
    path: [number, number][],
    done: boolean,
    found: boolean,
  ): GridState => ({
    config,
    // overlay を毎回コピーするのは、ビジュアライザーが各ステップのスナップショットを
    // 独立して参照できるようにするため（参照共有だと全ステップが同じ overlay を指す）
    overlay: overlay.map(row => [...row]),
    current,
    path: [...path],
    done,
    found,
  })

  const visitedCells = new Set<string>()
  const parentCell = new Map<string, string>()
  const queue: [number, number][] = [start]
  visitedCells.add(cellKey(...start))
  overlay[start[0]][start[1]] = 'frontier'

  yield {
    state: mkState(null, [], false, false),
    log: {
      ja: `BFS開始: スタート(${start[0]},${start[1]})からキューに追加`,
      en: `BFS start: Adding (${start[0]},${start[1]}) to queue`,
    },
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const currentKey = cellKey(r, c)

    if (overlay[r][c] !== 'none') overlay[r][c] = 'current'

    yield {
      state: mkState([r, c], [], false, false),
      log: {
        ja: `(${r},${c})を探索中... キュー残り${queue.length}件`,
        en: `Exploring (${r},${c})... ${queue.length} cells in queue`,
      },
    }

    if (r === goal[0] && c === goal[1]) {
      // ゴールに到達したので parentCell を逆ってパスを再構築する
      const path: [number, number][] = []
      let cur: string | undefined = currentKey
      while (cur) {
        path.unshift(parseCellKey(cur))
        cur = parentCell.get(cur)
      }

      for (const [pr, pc] of path) {
        if (overlay[pr][pc] !== 'none') overlay[pr][pc] = 'path'
      }

      yield {
        state: mkState([r, c], path, true, true),
        log: {
          ja: `ゴール到達！最短経路の長さ: ${path.length - 1}ステップ`,
          en: `Goal reached! Shortest path length: ${path.length - 1} steps`,
        },
      }
      return
    }

    if (overlay[r][c] === 'current') overlay[r][c] = 'visited'

    for (const [dr, dc] of ADJACENT_DIRS) {
      const nr = r + dr
      const nc = c + dc
      const neighborKey = cellKey(nr, nc)

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (cells[nr][nc] === 'wall') continue
      if (visitedCells.has(neighborKey)) continue

      visitedCells.add(neighborKey)
      parentCell.set(neighborKey, currentKey)
      queue.push([nr, nc])
      overlay[nr][nc] = 'frontier'
    }

    yield {
      state: mkState(null, [], false, false),
      log: {
        ja: `(${r},${c})の隣接セルを探索。訪問済み: ${visitedCells.size}件`,
        en: `Explored neighbors of (${r},${c}). Visited: ${visitedCells.size} cells`,
      },
    }
  }

  yield {
    state: mkState(null, [], true, false),
    log: {
      ja: 'ゴールへの経路が見つかりませんでした',
      en: 'No path found to the goal',
    },
  }
}
