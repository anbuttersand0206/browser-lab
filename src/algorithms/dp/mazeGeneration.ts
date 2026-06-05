import type { AlgorithmStep, MazeState, MazeCellStatus } from '../types'

// 迷路生成（再帰バックトラッキング / 深さ優先探索）:
// 全セルを壁で初期化し、DFS で壁を「掘り進む」ことで完全迷路を生成する。
// 生成された迷路はすべてのセル間に一意のパスを持つ（完全木構造）。
export function* mazeGeneration(rows: number, cols: number): Generator<AlgorithmStep<MazeState>, void, never> {
  // 奇数サイズにすることで「通路マス」と「壁マス」を交互に配置できる
  const R = rows % 2 === 0 ? rows + 1 : rows
  const C = cols % 2 === 0 ? cols + 1 : cols

  // 全セルを壁で初期化する
  const grid: MazeCellStatus[][] = Array.from({ length: R }, () =>
    Array(C).fill('wall') as MazeCellStatus[]
  )

  function mkState(current: [number, number] | null, stackDepth: number, done = false): MazeState {
    return {
      grid: grid.map(row => [...row]),
      rows: R, cols: C,
      currentCell: current,
      stackDepth,
      done,
    }
  }

  yield {
    state: mkState(null, 0),
    log: {
      ja: `迷路生成開始（${R}×${C}）。全セルを壁で初期化しました。`,
      en: `Maze generation started (${R}×${C}). All cells initialized as walls.`,
    },
  }

  // 通路セルは奇数インデックス (r=1,3,5..., c=1,3,5...) に対応する
  const startR = 1, startC = 1
  grid[startR][startC] = 'path'

  const stack: [number, number][] = [[startR, startC]]
  // 訪問済み通路セルを追跡する（偶数グリッド上では奇数座標のみが候補）
  const visited = new Set<string>([`${startR},${startC}`])

  yield {
    state: mkState([startR, startC], 1),
    log: {
      ja: `始点 (${startR}, ${startC}) から開始。`,
      en: `Starting from (${startR}, ${startC}).`,
    },
  }

  // 4 方向の「2マス先」の通路セルを隣人として定義する
  const DIRECTIONS: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]]

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]

    // 未訪問の隣人セルをリストアップ
    const neighbors: [number, number][] = []
    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr, nc = c + dc
      if (nr > 0 && nr < R - 1 && nc > 0 && nc < C - 1 && !visited.has(`${nr},${nc}`)) {
        neighbors.push([nr, nc])
      }
    }

    if (neighbors.length === 0) {
      // 行き止まり: バックトラック
      grid[r][c] = grid[r][c] === 'current' ? 'visited' : grid[r][c]
      stack.pop()

      yield {
        state: mkState(stack.length > 0 ? stack[stack.length - 1] : null, stack.length),
        log: {
          ja: `(${r},${c}) は行き止まり。バックトラック（スタック深さ: ${stack.length}）`,
          en: `(${r},${c}) is a dead end. Backtracking (stack depth: ${stack.length})`,
        },
      }
    } else {
      // ランダムに 1 つ選んで壁を壊す
      const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)]
      const wallR = (r + nr) / 2
      const wallC = (c + nc) / 2

      grid[r][c] = 'visited'
      grid[wallR][wallC] = 'path'  // 2セル間の壁を通路にする
      grid[nr][nc] = 'current'

      visited.add(`${nr},${nc}`)
      stack.push([nr, nc])

      yield {
        state: mkState([nr, nc], stack.length),
        log: {
          ja: `(${r},${c}) → (${nr},${nc}) へ掘り進む。壁 (${wallR},${wallC}) を削除。`,
          en: `Digging from (${r},${c}) → (${nr},${nc}). Removed wall at (${wallR},${wallC}).`,
        },
      }
    }
  }

  // 最終状態: すべて 'path' か 'wall' に整理
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (grid[r][c] === 'current' || grid[r][c] === 'visited') {
        grid[r][c] = 'path'
      }
    }
  }

  yield {
    state: mkState(null, 0, true),
    log: {
      ja: `迷路生成完了！すべてのセル間に一意のパスが存在する完全迷路が完成しました。`,
      en: `Maze generation complete! A perfect maze with unique paths between all cells.`,
    },
  }
}
