import { useContainerSize } from '../../../hooks/useContainerSize'
import type { DecisionTreeState, DTNode } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

interface DecisionTreeVisualizerProps {
  state: DecisionTreeState | null
}

const CLASS_COLORS = ['#4a9eff', '#ef4444']
const NODE_W = 80
const NODE_H = 44
const LEVEL_GAP = 70

// ノードを BFS 順に配置して座標を返す
function layoutNodes(nodes: DTNode[], rootId: number | null, svgWidth: number): Map<number, { x: number; y: number }> {
  const pos = new Map<number, { x: number; y: number }>()
  if (rootId === null || nodes.length === 0) return pos

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // 各深さのノードをリストアップしてから均等配置する
  const byDepth: number[][] = []

  function collect(id: number) {
    const n = nodeMap.get(id)
    if (!n) return
    if (!byDepth[n.depth]) byDepth[n.depth] = []
    byDepth[n.depth].push(id)
    if (n.leftChildId !== undefined) collect(n.leftChildId)
    if (n.rightChildId !== undefined) collect(n.rightChildId)
  }
  collect(rootId)

  for (const [depth, ids] of byDepth.entries()) {
    const totalWidth = ids.length * (NODE_W + 20)
    const startX = (svgWidth - totalWidth) / 2 + NODE_W / 2
    ids.forEach((id, i) => {
      pos.set(id, {
        x: startX + i * (NODE_W + 20),
        y: 30 + depth * LEVEL_GAP,
      })
    })
  }

  return pos
}

function NodeBox({ node, x, y }: { node: DTNode; x: number; y: number }) {
  const color = node.isLeaf
    ? (CLASS_COLORS[node.classLabel ?? 0] + 'cc')
    : (node.active ? '#f59e0b' : '#4a5568')

  const label = node.isLeaf
    ? `Class ${node.classLabel}`
    : `${node.featureIndex === 0 ? 'x' : 'y'} ≤ ${(node.threshold ?? 0).toFixed(2)}`

  const subLabel = `n=${node.sampleCount} G=${node.impurity.toFixed(2)}`

  return (
    <g transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}>
      <rect
        width={NODE_W} height={NODE_H}
        fill={node.active ? '#f59e0b22' : (node.isLeaf ? color + '22' : '#1e293b')}
        stroke={color}
        strokeWidth={node.active ? 2 : 1}
        rx={4}
      />
      <text x={NODE_W / 2} y={16} textAnchor="middle" fontSize={10} fontWeight="bold" fill={node.isLeaf ? CLASS_COLORS[node.classLabel ?? 0] : (node.active ? '#f59e0b' : '#94a3b8')}>
        {label}
      </text>
      <text x={NODE_W / 2} y={30} textAnchor="middle" fontSize={9} fill="#64748b">
        {subLabel}
      </text>
    </g>
  )
}

export function DecisionTreeVisualizer({ state }: DecisionTreeVisualizerProps) {
  const { ref: containerRef, width, height } = useContainerSize()
  useI18n()

  if (!state || state.nodes.length === 0) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { nodes } = state
  const rootId = nodes[0]?.id ?? null
  const pos = layoutNodes(nodes, rootId, width)

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto">
      <svg width={Math.max(width, 600)} height={Math.max(height, 500)}>
        {/* エッジを先に描く */}
        {nodes.map(node => {
          const p = pos.get(node.id)
          if (!p) return null
          return (
            <g key={`edges-${node.id}`}>
              {node.leftChildId !== undefined && pos.get(node.leftChildId) && (() => {
                const cp = pos.get(node.leftChildId)!
                return (
                  <g>
                    <line x1={p.x} y1={p.y + NODE_H / 2} x2={cp.x} y2={cp.y - NODE_H / 2}
                      stroke="#475569" strokeWidth={1.5} />
                    <text x={(p.x + cp.x) / 2 - 6} y={(p.y + cp.y) / 2} fontSize={9} fill="#22c55e">≤</text>
                  </g>
                )
              })()}
              {node.rightChildId !== undefined && pos.get(node.rightChildId) && (() => {
                const cp = pos.get(node.rightChildId)!
                return (
                  <g>
                    <line x1={p.x} y1={p.y + NODE_H / 2} x2={cp.x} y2={cp.y - NODE_H / 2}
                      stroke="#475569" strokeWidth={1.5} />
                    <text x={(p.x + cp.x) / 2 + 3} y={(p.y + cp.y) / 2} fontSize={9} fill="#ef4444">{'>'}</text>
                  </g>
                )
              })()}
            </g>
          )
        })}

        {/* ノード */}
        {nodes.map(node => {
          const p = pos.get(node.id)
          if (!p) return null
          return (
            <NodeBox key={node.id} node={node} x={p.x} y={p.y} />
          )
        })}
      </svg>
    </div>
  )
}
