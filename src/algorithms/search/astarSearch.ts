import type { AlgorithmStep, GridConfig, GridState, CellOverlay } from '../types'

function cellKey(r: number, c: number) { return `${r},${c}` }
function parseCellKey(k: string): [number, number] {
  const [r, c] = k.split(',').map(Number)
  return [r, c]
}

const ADJACENT_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]

// マンハッタン距離ヒューリスティック。
// 斜め移動がないグリッドでは admissible（実コストを過大評価しない）なため、
// A* が必ず最短経路を返す条件を満たす。
function manhattanDistance([r, c]: [number, number], [gr, gc]: [number, number]) {
  return Math.abs(r - gr) + Math.abs(c - gc)
}

function createEmptyOverlay(rows: number, cols: number): CellOverlay[][] {
  return Array.from({ length: rows }, () => Array(cols).fill('none') as CellOverlay[])
}

type AStarGridState = GridState & { gScore: number[][]; hScore: number[][] }

// A*: g（始点からのコスト）と h（ゴールまでの推定コスト）の和 f = g + h が
// 最小のセルを優先的に展開することで、BFS より効率よく最短経路を発見する。
export function* astarSearch(config: GridConfig): Generator<AlgorithmStep<AStarGridState>, void, never> {
  const { rows, cols, cells, start, goal } = config
  const overlay = createEmptyOverlay(rows, cols)

  const UNREACHABLE = Infinity
  // gScore[r][c]: 始点から (r,c) までの確定コスト（未訪問は Infinity）
  const gScore: number[][] = Array.from({ length: rows }, () => Array(cols).fill(UNREACHABLE))
  // hScore[r][c]: (r,c) からゴールまでのヒューリスティック推定値（事前計算）
  const hScore: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  const parentCell = new Map<string, string>()
  const closedSet = new Set<string>()

  // h スコアは変化しないため事前計算してキャッシュする
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      hScore[r][c] = manhattanDistance([r, c], goal)
    }
  }

  gScore[start[0]][start[1]] = 0

  // openSet は「探索候補のキー集合」。
  // 優先度付きキューが理想だが実装コストが高いため Set でシンプルに保ち、
  // 毎ステップ最小 f スコアを線形探索する（セル数が小さい教育用グリッドでは十分速い）
  const openSet = new Set<string>([cellKey(...start)])
  overlay[start[0]][start[1]] = 'frontier'

  const mkState = (
    current: [number, number] | null,
    path: [number, number][],
    done: boolean,
    found: boolean,
  ): AStarGridState => ({
    config,
    overlay: overlay.map(row => [...row]),
    current,
    path: [...path],
    done,
    found,
    gScore: gScore.map(row => [...row]),
    hScore: hScore.map(row => [...row]),
  })

  yield {
    state: mkState(null, [], false, false),
    log: {
      ja: `A*開始: ヒューリスティック（マンハッタン距離）を使用`,
      en: `A* start: Using Manhattan distance heuristic`,
    },
  }

  while (openSet.size > 0) {
    // openSet の中で f スコア（g + h）が最小のセルを選択する
    let currentKey = ''
    let minFScore = UNREACHABLE
    for (const k of openSet) {
      const [r, c] = parseCellKey(k)
      const fScore = gScore[r][c] + hScore[r][c]
      if (fScore < minFScore) {
        minFScore = fScore
        currentKey = k
      }
    }

    const [r, c] = parseCellKey(currentKey)
    openSet.delete(currentKey)
    closedSet.add(currentKey)
    overlay[r][c] = 'current'

    yield {
      state: mkState([r, c], [], false, false),
      log: {
        ja: `(${r},${c})を展開: g=${gScore[r][c]}, h=${hScore[r][c]}, f=${gScore[r][c] + hScore[r][c]}`,
        en: `Expanding (${r},${c}): g=${gScore[r][c]}, h=${hScore[r][c]}, f=${gScore[r][c] + hScore[r][c]}`,
      },
    }

    if (r === goal[0] && c === goal[1]) {
      const path: [number, number][] = []
      let cur: string | undefined = currentKey
      while (cur) {
        path.unshift(parseCellKey(cur))
        cur = parentCell.get(cur)
      }

      for (const [pr, pc] of path) {
        overlay[pr][pc] = 'path'
      }

      yield {
        state: mkState([r, c], path, true, true),
        log: {
          ja: `ゴール到達！最短経路長: ${path.length - 1}ステップ`,
          en: `Goal reached! Shortest path length: ${path.length - 1} steps`,
        },
      }
      return
    }

    overlay[r][c] = 'visited'

    for (const [dr, dc] of ADJACENT_DIRS) {
      const nr = r + dr
      const nc = c + dc
      const neighborKey = cellKey(nr, nc)

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (cells[nr][nc] === 'wall') continue
      if (closedSet.has(neighborKey)) continue

      const tentativeGScore = gScore[r][c] + 1

      // より短い経路が見つかった場合のみ更新する（同等以上なら無視）
      if (tentativeGScore < gScore[nr][nc]) {
        parentCell.set(neighborKey, currentKey)
        gScore[nr][nc] = tentativeGScore

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey)
          overlay[nr][nc] = 'frontier'
          yield {
            state: mkState(null, [], false, false),
            log: {
              ja: `(${nr},${nc})を探索リストに追加: f=${tentativeGScore + hScore[nr][nc]}`,
              en: `Added (${nr},${nc}) to open set: f=${tentativeGScore + hScore[nr][nc]}`,
            },
          }
        }
      }
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
