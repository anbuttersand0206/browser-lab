import type { AlgorithmStep, GraphState, GraphNodeState, GraphEdgeState } from '../types'
import { GRAPH_NODES, GRAPH_EDGES, NUM_NODES } from './graphData'

// ダイクストラ法: 非負の重み付きグラフで始点から全ノードへの最短距離を求める。
// 優先度キュー（最小ヒープ）を使い、未確定ノードのうち最も距離の小さいものを順に確定する。
// 負の重みがないことが前提（負があるとベルマンフォード法を使う）。
export function* dijkstra(): Generator<AlgorithmStep<GraphState>, void, never> {
  const SOURCE = 0
  const TARGET = NUM_NODES - 1

  // 各ノードの暫定距離を Infinity で初期化する。
  // Number.POSITIVE_INFINITY は比較演算が正しく動くため、マジックナンバーより適切。
  const dist = Array(NUM_NODES).fill(Number.POSITIVE_INFINITY)
  const parent = Array<number | null>(NUM_NODES).fill(null)
  const visited = Array(NUM_NODES).fill(false)
  dist[SOURCE] = 0

  // 隣接リストを構築する（無向グラフなので両方向に追加）
  const adj: Array<Array<{ to: number; w: number }>> = Array.from({ length: NUM_NODES }, () => [])
  for (const e of GRAPH_EDGES) {
    adj[e.from].push({ to: e.to, w: e.weight })
    adj[e.to].push({ to: e.from, w: e.weight })
  }

  function mkState(currentNode: number | null, phase: string, done = false): GraphState {
    const nodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
      id: n.id,
      dist: dist[n.id],
      visited: visited[n.id],
      inMST: false,
      parent: parent[n.id],
    }))

    const edgeStates: GraphEdgeState[] = GRAPH_EDGES.map(e => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      status: 'none' as const,
    }))

    return { nodeStates, edgeStates, currentNodeId: currentNode, phase, done }
  }

  function mkStateWithEdge(
    currentNode: number | null,
    highlightFrom: number,
    highlightTo: number,
    edgeStatus: GraphEdgeState['status'],
    phase: string,
  ): GraphState {
    const nodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
      id: n.id,
      dist: dist[n.id],
      visited: visited[n.id],
      inMST: false,
      parent: parent[n.id],
    }))

    const edgeStates: GraphEdgeState[] = GRAPH_EDGES.map(e => {
      const matches =
        (e.from === highlightFrom && e.to === highlightTo) ||
        (e.from === highlightTo && e.to === highlightFrom)
      return {
        from: e.from,
        to: e.to,
        weight: e.weight,
        status: matches ? edgeStatus : 'none',
      }
    })

    return { nodeStates, edgeStates, currentNodeId: currentNode, phase, done: false }
  }

  yield {
    state: mkState(SOURCE, 'init'),
    log: {
      ja: `ダイクストラ法開始。始点ノード S(0) の距離を 0 に設定。他は ∞。`,
      en: `Dijkstra started. Source S(0) = 0. All others = ∞.`,
    },
  }

  for (let step = 0; step < NUM_NODES; step++) {
    // 未確定ノードの中で距離が最小のものを選ぶ（最小ヒープの簡易実装）
    let u = -1
    let minDist = Number.POSITIVE_INFINITY
    for (let v = 0; v < NUM_NODES; v++) {
      if (!visited[v] && dist[v] < minDist) {
        minDist = dist[v]
        u = v
      }
    }

    if (u === -1) break  // 到達可能なノードがなくなった

    visited[u] = true
    const uLabel = GRAPH_NODES[u].label

    yield {
      state: mkState(u, 'visiting'),
      log: {
        ja: `ノード ${uLabel}(${u}) を確定（距離 = ${dist[u]}）`,
        en: `Confirming node ${uLabel}(${u}) with distance = ${dist[u]}`,
      },
    }

    if (u === TARGET) {
      break  // ターゲットに到達したら早期終了
    }

    // 隣接ノードの距離を緩和する
    for (const { to, w } of adj[u]) {
      if (visited[to]) continue

      const newDist = dist[u] + w
      const toLabel = GRAPH_NODES[to].label

      yield {
        state: mkStateWithEdge(u, u, to, 'considering', 'relaxing'),
        log: {
          ja: `辺 ${uLabel}→${toLabel} を確認: ${dist[u]} + ${w} = ${newDist} vs 現在 ${dist[to] === Infinity ? '∞' : dist[to]}`,
          en: `Edge ${uLabel}→${toLabel}: ${dist[u]} + ${w} = ${newDist} vs current ${dist[to] === Infinity ? '∞' : dist[to]}`,
        },
      }

      if (newDist < dist[to]) {
        dist[to] = newDist
        parent[to] = u

        yield {
          state: mkStateWithEdge(u, u, to, 'relaxed', 'relaxing'),
          log: {
            ja: `距離更新: dist[${toLabel}] = ${newDist}（改善）`,
            en: `Distance updated: dist[${toLabel}] = ${newDist} (improved)`,
          },
        }
      }
    }
  }

  // 最短経路を辿って経路エッジをハイライトする
  const pathEdges = new Set<string>()
  let cur = TARGET
  while (parent[cur] !== null) {
    const p = parent[cur]!
    pathEdges.add(`${Math.min(p, cur)}-${Math.max(p, cur)}`)
    cur = p
  }

  const finalNodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
    id: n.id,
    dist: dist[n.id],
    visited: visited[n.id],
    inMST: false,
    parent: parent[n.id],
  }))

  const finalEdgeStates: GraphEdgeState[] = GRAPH_EDGES.map(e => ({
    from: e.from,
    to: e.to,
    weight: e.weight,
    status: pathEdges.has(`${Math.min(e.from, e.to)}-${Math.max(e.from, e.to)}`) ? 'inMST' : 'none',
  }))

  const targetDist = dist[TARGET]

  yield {
    state: { nodeStates: finalNodeStates, edgeStates: finalEdgeStates, currentNodeId: null, phase: 'done', done: true },
    log: {
      ja: `完了。S → T の最短距離 = ${targetDist === Infinity ? '到達不可' : targetDist}`,
      en: `Done. Shortest S → T distance = ${targetDist === Infinity ? 'unreachable' : targetDist}`,
    },
  }
}
