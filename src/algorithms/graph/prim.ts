import type { AlgorithmStep, GraphState, GraphNodeState, GraphEdgeState } from '../types'
import { GRAPH_NODES, GRAPH_EDGES, NUM_NODES } from './graphData'

// プリム法（最小全域木）: 始点から始め、MST に属するノードに接続する辺の中で
// 最小重みのものを貪欲に選んで MST を拡張し続ける。
// クラスカル法との違い: 辺ではなくノードを軸に成長させる点。
export function* prim(): Generator<AlgorithmStep<GraphState>, void, never> {
  const SOURCE = 0

  const inMSTSet = new Set<number>()  // MST に取り込まれたノード
  const mstEdgeSet = new Set<number>()  // 採用した辺の元インデックス
  const candidateEdgeSet = new Set<number>()  // 候補辺のインデックス
  let mstWeight = 0

  // 隣接リスト（元の辺インデックス付き）
  const adj: Array<Array<{ to: number; w: number; edgeIdx: number }>> = Array.from(
    { length: NUM_NODES }, () => []
  )
  for (let i = 0; i < GRAPH_EDGES.length; i++) {
    const e = GRAPH_EDGES[i]
    adj[e.from].push({ to: e.to, w: e.weight, edgeIdx: i })
    adj[e.to].push({ to: e.from, w: e.weight, edgeIdx: i })
  }

  function mkState(currentNode: number | null, phase: string, done = false): GraphState {
    const nodeStates: GraphNodeState[] = GRAPH_NODES.map(n => ({
      id: n.id, dist: 0, visited: false,
      inMST: inMSTSet.has(n.id),
      parent: null,
    }))

    const edgeStates: GraphEdgeState[] = GRAPH_EDGES.map((e, i) => {
      if (mstEdgeSet.has(i)) return { ...e, status: 'inMST' as const }
      if (candidateEdgeSet.has(i)) return { ...e, status: 'considering' as const }
      return { ...e, status: 'none' as const }
    })

    return { nodeStates, edgeStates, currentNodeId: currentNode, phase, done }
  }

  inMSTSet.add(SOURCE)

  // 始点に隣接する辺を候補に追加
  for (const { edgeIdx } of adj[SOURCE]) {
    const e = GRAPH_EDGES[edgeIdx]
    if (!inMSTSet.has(e.from === SOURCE ? e.to : e.from)) {
      candidateEdgeSet.add(edgeIdx)
    }
  }

  yield {
    state: mkState(SOURCE, 'init'),
    log: {
      ja: `プリム法開始。始点 S(0) を MST に追加。隣接辺を候補として追加。`,
      en: `Prim started. Added S(0) to MST. Adjacent edges added as candidates.`,
    },
  }

  while (mstEdgeSet.size < NUM_NODES - 1) {
    // 候補辺の中で最小重みかつ MST 外のノードに繋がるものを選ぶ
    let bestEdgeIdx = -1
    let bestWeight = Number.POSITIVE_INFINITY

    for (const idx of candidateEdgeSet) {
      const e = GRAPH_EDGES[idx]
      const mstSide = inMSTSet.has(e.from)
      const otherNode = mstSide ? e.to : e.from
      if (!inMSTSet.has(otherNode) && e.weight < bestWeight) {
        bestWeight = e.weight
        bestEdgeIdx = idx
      }
    }

    if (bestEdgeIdx === -1) break  // 到達不可なノードが残っている場合

    const best = GRAPH_EDGES[bestEdgeIdx]
    const mstSide = inMSTSet.has(best.from)
    const newNode = mstSide ? best.to : best.from
    const fromLabel = GRAPH_NODES[best.from].label
    const toLabel = GRAPH_NODES[best.to].label
    const newNodeLabel = GRAPH_NODES[newNode].label

    yield {
      state: mkState(null, 'selecting'),
      log: {
        ja: `最小候補辺: ${fromLabel}-${toLabel}(重み ${best.weight}) → ノード ${newNodeLabel} を MST に追加`,
        en: `Min candidate: ${fromLabel}-${toLabel} (w=${best.weight}) → Adding ${newNodeLabel} to MST`,
      },
    }

    inMSTSet.add(newNode)
    mstEdgeSet.add(bestEdgeIdx)
    candidateEdgeSet.delete(bestEdgeIdx)
    mstWeight += best.weight

    // 新たに追加したノードの隣接辺を候補に加える
    for (const { to, edgeIdx } of adj[newNode]) {
      if (!inMSTSet.has(to)) {
        candidateEdgeSet.add(edgeIdx)
      }
    }

    yield {
      state: mkState(newNode, 'growing'),
      log: {
        ja: `ノード ${newNodeLabel} 追加完了。MST 総重み = ${mstWeight}`,
        en: `Added ${newNodeLabel}. MST total = ${mstWeight}`,
      },
    }
  }

  candidateEdgeSet.clear()

  yield {
    state: mkState(null, 'done', true),
    log: {
      ja: `完了！最小全域木の総コスト = ${mstWeight}（辺 ${mstEdgeSet.size} 本）`,
      en: `Done! MST total cost = ${mstWeight} (${mstEdgeSet.size} edges)`,
    },
  }
}
