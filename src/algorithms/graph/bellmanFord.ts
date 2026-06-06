import type { AlgorithmStep, GraphState, GraphNodeState, GraphEdgeState } from '../types'
import { GRAPH_NODES, GRAPH_EDGES, NUM_NODES } from './graphData'

// ベルマン・フォード法: 全辺を V-1 回繰り返し緩和して最短距離を求める。
// ダイクストラと異なり負の重みを持つ辺も扱える（負のサイクルは検出可能）。
// 計算量は O(VE) でダイクストラより遅いが、汎用性が高い。
export function* bellmanFord(): Generator<AlgorithmStep<GraphState>, void, never> {
  const SOURCE = 0
  const TARGET = NUM_NODES - 1

  const dist = Array(NUM_NODES).fill(Number.POSITIVE_INFINITY)
  const parent = Array<number | null>(NUM_NODES).fill(null)
  const visited = Array(NUM_NODES).fill(false)
  dist[SOURCE] = 0

  // 双方向辺リスト（from→to と to→from の両方向）
  const allEdges: Array<{ from: number; to: number; weight: number }> = []
  for (const e of GRAPH_EDGES) {
    allEdges.push({ from: e.from, to: e.to, weight: e.weight })
    allEdges.push({ from: e.to, to: e.from, weight: e.weight })
  }

  function mkStateWithEdge(
    highlightEdgeIdx: number | null,
    edgeStatus: GraphEdgeState['status'],
    phase: string,
    done = false,
  ): GraphState {
    const nodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
      id: n.id,
      dist: dist[n.id],
      visited: visited[n.id],
      inMST: false,
      parent: parent[n.id],
    }))

    const edgeStates: GraphEdgeState[] = GRAPH_EDGES.map((e, i) => {
      const isHighlight = highlightEdgeIdx !== null && i === Math.floor(highlightEdgeIdx / 2)
      return {
        from: e.from,
        to: e.to,
        weight: e.weight,
        status: isHighlight ? edgeStatus : 'none',
      }
    })

    return { nodeStates, edgeStates, currentNodeId: null, phase, done }
  }

  yield {
    state: mkStateWithEdge(null, 'none', 'init'),
    log: {
      ja: `ベルマン・フォード法開始。始点 S(0) = 0、他は ∞。全辺を V-1=${NUM_NODES - 1} 回緩和します。`,
      en: `Bellman-Ford started. S(0) = 0, others = ∞. Will relax all edges V-1=${NUM_NODES - 1} times.`,
    },
  }

  // V-1 回のメインループ
  for (let iter = 0; iter < NUM_NODES - 1; iter++) {
    let updated = false

    yield {
      state: mkStateWithEdge(null, 'none', `iter${iter}`),
      log: {
        ja: `--- イテレーション ${iter + 1}/${NUM_NODES - 1} ---`,
        en: `--- Iteration ${iter + 1}/${NUM_NODES - 1} ---`,
      },
    }

    for (let ei = 0; ei < allEdges.length; ei++) {
      const { from: u, to: v, weight: w } = allEdges[ei]
      if (dist[u] === Number.POSITIVE_INFINITY) continue

      const uLabel = GRAPH_NODES[u].label
      const vLabel = GRAPH_NODES[v].label
      const origEdgeIdx = Math.floor(ei / 2)

      yield {
        state: mkStateWithEdge(origEdgeIdx * 2, 'considering', `iter${iter}`),
        log: {
          ja: `辺 ${uLabel}→${vLabel} (重み ${w}): ${dist[u]} + ${w} = ${dist[u] + w} vs ${dist[v] === Infinity ? '∞' : dist[v]}`,
          en: `Edge ${uLabel}→${vLabel} (w=${w}): ${dist[u]} + ${w} = ${dist[u] + w} vs ${dist[v] === Infinity ? '∞' : dist[v]}`,
        },
      }

      const newDist = dist[u] + w
      if (newDist < dist[v]) {
        dist[v] = newDist
        parent[v] = u
        updated = true

        yield {
          state: mkStateWithEdge(origEdgeIdx * 2, 'relaxed', `iter${iter}`),
          log: {
            ja: `改善: dist[${vLabel}] = ${newDist}`,
            en: `Improved: dist[${vLabel}] = ${newDist}`,
          },
        }
      }
    }

    // 1 回も更新がなければ収束済み（残りのループは不要）
    if (!updated) {
      yield {
        state: mkStateWithEdge(null, 'none', 'converged'),
        log: {
          ja: `イテレーション ${iter + 1} で更新なし → 収束！残り ${NUM_NODES - 2 - iter} 回をスキップします。`,
          en: `No updates in iteration ${iter + 1} → Converged! Skipping remaining ${NUM_NODES - 2 - iter} iterations.`,
        },
      }
      break
    }
  }

  for (let v = 0; v < NUM_NODES; v++) {
    if (dist[v] !== Infinity) visited[v] = true
  }

  // 最短経路エッジをハイライト
  const pathEdges = new Set<string>()
  let cur = TARGET
  while (parent[cur] !== null) {
    const p = parent[cur]!
    pathEdges.add(`${Math.min(p, cur)}-${Math.max(p, cur)}`)
    cur = p
  }

  const finalNodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
    id: n.id, dist: dist[n.id], visited: visited[n.id], inMST: false, parent: parent[n.id],
  }))
  const finalEdgeStates: GraphEdgeState[] = GRAPH_EDGES.map(e => ({
    from: e.from, to: e.to, weight: e.weight,
    status: pathEdges.has(`${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`) ? 'inMST' : 'none',
  }))

  yield {
    state: { nodeStates: finalNodeStates, edgeStates: finalEdgeStates, currentNodeId: null, phase: 'done', done: true },
    log: {
      ja: `完了。S → T の最短距離 = ${dist[TARGET] === Infinity ? '到達不可' : dist[TARGET]}`,
      en: `Done. Shortest S → T = ${dist[TARGET] === Infinity ? 'unreachable' : dist[TARGET]}`,
    },
  }
}
