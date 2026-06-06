import type { AlgorithmStep, GraphState, GraphNodeState, GraphEdgeState } from '../types'
import { GRAPH_NODES, GRAPH_EDGES, NUM_NODES } from './graphData'

// クラスカル法（最小全域木）: 辺を重みの昇順にソートし、サイクルを形成しない辺を
// 貪欲に選び続けることで最小全域木（MST）を構築する。
// Union-Find データ構造でサイクル判定を O(α(V)) で行う。
export function* kruskal(): Generator<AlgorithmStep<GraphState>, void, never> {

  // Union-Find（素集合データ構造）
  const parent = Array.from({ length: NUM_NODES }, (_, i) => i)
  const rank = Array(NUM_NODES).fill(0)

  function find(x: number): number {
    // 経路圧縮: 根を直接指すことで次回の find が O(1) に近くなる
    if (parent[x] !== x) parent[x] = find(parent[x])
    return parent[x]
  }

  function union(x: number, y: number): boolean {
    const rx = find(x), ry = find(y)
    if (rx === ry) return false  // すでに同じ連結成分 = サイクルになる
    // ランクが高い方を根にすることで木の深さを抑える（Union by rank）
    if (rank[rx] < rank[ry]) parent[rx] = ry
    else if (rank[rx] > rank[ry]) parent[ry] = rx
    else { parent[ry] = rx; rank[rx]++ }
    return true
  }

  // 辺を重み昇順にソート（貪欲法の基礎）
  const sortedEdges = [...GRAPH_EDGES].sort((a, b) => a.weight - b.weight)
  const mstEdgeSet = new Set<number>()  // MST に採用した元の辺のインデックス
  const rejectedEdgeSet = new Set<number>()
  let mstWeight = 0

  function mkState(
    currentEdgeFrom: number | null,
    currentEdgeTo: number | null,
    edgeStatus: GraphEdgeState['status'],
    phase: string,
    done = false,
  ): GraphState {
    const nodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
      id: n.id, dist: 0, visited: false,
      inMST: mstEdgeSet.size > 0 && [...mstEdgeSet].some(idx =>
        GRAPH_EDGES[idx].from === n.id || GRAPH_EDGES[idx].to === n.id
      ),
      parent: null,
    }))

    const edgeStates: GraphEdgeState[] = GRAPH_EDGES.map((e, i) => {
      if (mstEdgeSet.has(i)) return { ...e, status: 'inMST' as const }
      if (rejectedEdgeSet.has(i)) return { ...e, status: 'rejected' as const }
      if (
        currentEdgeFrom !== null &&
        ((e.from === currentEdgeFrom && e.to === currentEdgeTo) ||
         (e.from === currentEdgeTo && e.to === currentEdgeFrom))
      ) return { ...e, status: edgeStatus }
      return { ...e, status: 'none' as const }
    })

    return { nodeStates, edgeStates, currentNodeId: null, phase, done }
  }

  yield {
    state: mkState(null, null, 'none', 'init'),
    log: {
      ja: `クラスカル法開始。辺を重み昇順でソート: ${sortedEdges.map(e => `${GRAPH_NODES[e.from].label}-${GRAPH_NODES[e.to].label}(${e.weight})`).join(', ')}`,
      en: `Kruskal started. Edges sorted by weight: ${sortedEdges.map(e => `${GRAPH_NODES[e.from].label}-${GRAPH_NODES[e.to].label}(${e.weight})`).join(', ')}`,
    },
  }

  for (const edge of sortedEdges) {
    const fromLabel = GRAPH_NODES[edge.from].label
    const toLabel = GRAPH_NODES[edge.to].label
    const origIdx = GRAPH_EDGES.indexOf(edge)

    yield {
      state: mkState(edge.from, edge.to, 'considering', 'evaluating'),
      log: {
        ja: `辺 ${fromLabel}-${toLabel}(重み ${edge.weight}) を検討中`,
        en: `Considering edge ${fromLabel}-${toLabel} (weight ${edge.weight})`,
      },
    }

    const connected = find(edge.from) === find(edge.to)

    if (connected) {
      // 同じ連結成分 → 採用するとサイクルが生まれるので棄却
      rejectedEdgeSet.add(origIdx)
      yield {
        state: mkState(edge.from, edge.to, 'rejected', 'evaluating'),
        log: {
          ja: `棄却: ${fromLabel} と ${toLabel} は同じ連結成分（採用するとサイクル発生）`,
          en: `Rejected: ${fromLabel} and ${toLabel} are already connected (would create a cycle)`,
        },
      }
    } else {
      union(edge.from, edge.to)
      mstEdgeSet.add(origIdx)
      mstWeight += edge.weight

      yield {
        state: mkState(edge.from, edge.to, 'inMST', 'building'),
        log: {
          ja: `採用: ${fromLabel}-${toLabel}(重み ${edge.weight})。MST 総重み = ${mstWeight}`,
          en: `Added: ${fromLabel}-${toLabel} (weight ${edge.weight}). MST total = ${mstWeight}`,
        },
      }

      // 全ノードを繋ぐ辺が集まったら終了（MST の辺数 = V-1）
      if (mstEdgeSet.size === NUM_NODES - 1) break
    }
  }

  yield {
    state: mkState(null, null, 'none', 'done', true),
    log: {
      ja: `完了！最小全域木の総コスト = ${mstWeight}（辺 ${mstEdgeSet.size} 本）`,
      en: `Done! MST total cost = ${mstWeight} (${mstEdgeSet.size} edges)`,
    },
  }
}
