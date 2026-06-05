import { useContainerSize } from '../../../hooks/useContainerSize'
import type { GraphState } from '../../../algorithms/types'
import { GRAPH_NODES, GRAPH_EDGES } from '../../../algorithms/graph/graphData'

interface GraphVisualizerProps {
  state: GraphState | null
  // 'shortest' = ダイクストラ/ベルマンフォード（距離表示）
  // 'mst' = クラスカル/プリム（MST 構築）
  mode: 'shortest' | 'mst'
}

const COLORS = {
  nodeDefault:  '#4a9eff',
  nodeVisited:  '#22c55e',
  nodeCurrent:  '#f59e0b',
  nodeInMST:    '#22c55e',
  edgeDefault:  '#555',
  edgeConsidering: '#f59e0b',
  edgeRelaxed:  '#14b8a6',
  edgeInMST:    '#22c55e',
  edgeRejected: '#ef4444',
}

const NODE_RADIUS = 18

export function GraphVisualizer({ state, mode }: GraphVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { nodeStates, edgeStates, currentNodeId } = state

  // ノードの SVG 座標（コンテナサイズに合わせてスケール）
  const pad = 40
  function nodePos(id: number): { x: number; y: number } {
    const raw = GRAPH_NODES[id]
    return {
      x: pad + raw.x * (width - pad * 2),
      y: pad + raw.y * (height - pad * 2 - 20),
    }
  }

  function edgeColor(status: GraphState['edgeStates'][0]['status']): string {
    switch (status) {
      case 'considering': return COLORS.edgeConsidering
      case 'relaxed':     return COLORS.edgeRelaxed
      case 'inMST':       return COLORS.edgeInMST
      case 'rejected':    return COLORS.edgeRejected
      default:            return COLORS.edgeDefault
    }
  }

  function nodeColor(id: number): string {
    const ns = nodeStates[id]
    if (id === currentNodeId) return COLORS.nodeCurrent
    if (mode === 'mst' && ns.inMST) return COLORS.nodeInMST
    if (mode === 'shortest' && ns.visited) return COLORS.nodeVisited
    return COLORS.nodeDefault
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={width} height={height}>
        {/* エッジを先に描画してノードの下に来るようにする */}
        {GRAPH_EDGES.map((rawEdge, i) => {
          const es = edgeStates[i]
          const from = nodePos(rawEdge.from)
          const to = nodePos(rawEdge.to)
          const mx = (from.x + to.x) / 2
          const my = (from.y + to.y) / 2
          const color = edgeColor(es.status)
          const strokeWidth = es.status !== 'none' ? 3 : 1.5

          return (
            <g key={i}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={color}
                strokeWidth={strokeWidth}
                opacity={es.status === 'rejected' ? 0.3 : 0.8}
              />
              {/* エッジの重みラベル */}
              <text
                x={mx} y={my - 5}
                textAnchor="middle"
                fontSize={10}
                fill={color}
                fontWeight={es.status !== 'none' ? 'bold' : 'normal'}
              >
                {rawEdge.weight}
              </text>
            </g>
          )
        })}

        {/* ノード */}
        {GRAPH_NODES.map((rawNode) => {
          const pos = nodePos(rawNode.id)
          const ns = nodeStates[rawNode.id]
          const color = nodeColor(rawNode.id)

          const distLabel = mode === 'shortest' && ns.dist !== null
            ? (ns.dist === Infinity ? '∞' : String(ns.dist))
            : null

          return (
            <g key={rawNode.id}>
              <circle
                cx={pos.x} cy={pos.y} r={NODE_RADIUS}
                fill={color}
                stroke={rawNode.id === currentNodeId ? '#fff' : 'rgba(0,0,0,0.3)'}
                strokeWidth={rawNode.id === currentNodeId ? 2.5 : 1}
              />
              {/* ノードラベル */}
              <text
                x={pos.x} y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight="bold"
                fill="white"
              >
                {rawNode.label}
              </text>
              {/* 距離表示（ダイクストラ / ベルマンフォード） */}
              {distLabel !== null && (
                <text
                  x={pos.x} y={pos.y + NODE_RADIUS + 11}
                  textAnchor="middle"
                  fontSize={10}
                  fill={color}
                  fontWeight="bold"
                >
                  {distLabel}
                </text>
              )}
            </g>
          )
        })}

        {/* 凡例 */}
        <g transform={`translate(8, ${height - 18})`}>
          {mode === 'shortest' ? (
            <>
              <circle cx={5} cy={5} r={5} fill={COLORS.nodeDefault} />
              <text x={13} y={9} fontSize={9} fill="#858585">未確定</text>
              <circle cx={55} cy={5} r={5} fill={COLORS.nodeVisited} />
              <text x={63} y={9} fontSize={9} fill="#858585">確定</text>
              <circle cx={95} cy={5} r={5} fill={COLORS.nodeCurrent} />
              <text x={103} y={9} fontSize={9} fill="#858585">現在</text>
              <rect x={140} y={2} width={14} height={3} fill={COLORS.edgeInMST} />
              <text x={158} y={9} fontSize={9} fill="#858585">最短経路</text>
            </>
          ) : (
            <>
              <rect x={0} y={2} width={14} height={3} fill={COLORS.edgeConsidering} />
              <text x={18} y={9} fontSize={9} fill="#858585">検討中</text>
              <rect x={60} y={2} width={14} height={3} fill={COLORS.edgeInMST} />
              <text x={78} y={9} fontSize={9} fill="#858585">MST採用</text>
              <rect x={130} y={2} width={14} height={3} fill={COLORS.edgeRejected} opacity={0.5} />
              <text x={148} y={9} fontSize={9} fill="#858585">棄却</text>
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
