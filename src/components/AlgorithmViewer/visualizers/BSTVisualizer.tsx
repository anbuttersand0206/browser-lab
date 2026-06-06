// 二分探索木をSVGのツリー形式で可視化するコンポーネント。
// 中順巡回（in-order）によるx位置と深さによるy位置でノードを配置し、
// 走査経路・比較・挿入・発見を色で区別する。

import type { BSTState, BSTNodeData } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

const NODE_R   = 20  // ノード円の半径
const H_SPACE  = 50  // 水平方向のノード間隔
const V_SPACE  = 60  // 深さ方向の間隔
const MARGIN   = 30  // SVG周囲の余白

// 中順巡回でノードの水平インデックスを計算する
function computeInOrder(
  nodes: Record<string, BSTNodeData>,
  rootId: string | null,
): Record<string, number> {
  const order: Record<string, number> = {}
  let counter = 0
  function inorder(id: string | null) {
    if (!id || !nodes[id]) return
    inorder(nodes[id].leftId)
    order[id] = counter++
    inorder(nodes[id].rightId)
  }
  inorder(rootId)
  return order
}

// ノードの画面座標を返す
function nodePos(
  inOrder: Record<string, number>,
  node: BSTNodeData,
): { cx: number; cy: number } {
  return {
    cx: MARGIN + NODE_R + inOrder[node.id] * H_SPACE,
    cy: MARGIN + NODE_R + node.depth * V_SPACE,
  }
}

interface NodeColors { fill: string; stroke: string; strokeWidth: number; text: string }

function resolveNodeColors(id: string, state: BSTState): NodeColors {
  if (state.foundId === id) {
    return { fill: '#15803d', stroke: '#22c55e', strokeWidth: 3, text: '#ffffff' }
  }
  if (state.newNodeId === id) {
    return { fill: '#0e7490', stroke: '#22d3ee', strokeWidth: 3, text: '#ffffff' }
  }
  if (state.comparingId === id) {
    return { fill: '#854d0e', stroke: '#facc15', strokeWidth: 3, text: '#fef08a' }
  }
  if (state.visitedIds.includes(id)) {
    return { fill: '#1e3a5f', stroke: '#3b82f6', strokeWidth: 2, text: '#93c5fd' }
  }
  return { fill: '#1e293b', stroke: '#334155', strokeWidth: 1.5, text: '#94a3b8' }
}

export function BSTVisualizer({ state }: { state: BSTState | null }) {
  const { locale } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {locale === 'ja' ? '再生を開始してください' : 'Press play to start'}
      </div>
    )
  }

  const { nodes, rootId } = state
  const nodeList = Object.values(nodes)

  if (nodeList.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {locale === 'ja' ? 'ツリーを構築中...' : 'Building tree...'}
      </div>
    )
  }

  const inOrder = computeInOrder(nodes, rootId)
  const maxInOrder = Math.max(...Object.values(inOrder))
  const maxDepth = Math.max(...nodeList.map((n) => n.depth))
  const svgW = MARGIN * 2 + NODE_R * 2 + maxInOrder * H_SPACE
  const svgH = MARGIN * 2 + NODE_R * 2 + maxDepth * V_SPACE

  // エッジ（親→子の線）を収集する
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; isVisited: boolean }> = []
  for (const node of nodeList) {
    const pos = nodePos(inOrder, node)
    for (const childId of [node.leftId, node.rightId]) {
      if (!childId || !nodes[childId]) continue
      const childPos = nodePos(inOrder, nodes[childId])
      const isVisited =
        state.visitedIds.includes(node.id) && state.visitedIds.includes(childId)
      edges.push({ x1: pos.cx, y1: pos.cy, x2: childPos.cx, y2: childPos.cy, isVisited })
    }
  }

  const opLabelMap = {
    insert: { ja: '挿入', en: 'Insert' },
    search: { ja: '検索', en: 'Search' },
  }

  return (
    <div className="flex h-full flex-col gap-1 overflow-auto p-3">
      {/* 操作情報 */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded bg-dark-sidebar px-2 py-0.5 text-dark-textDim dark:bg-dark-sidebar dark:text-dark-textDim light:bg-light-sidebar light:text-light-textDim">
          {opLabelMap[state.operation][locale]}
        </span>
        <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {locale === 'ja' ? '対象値' : 'Target'}:{' '}
          <span className="font-mono font-bold text-yellow-400">{state.targetValue}</span>
        </span>
        {state.foundId && (
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-green-400">
            {locale === 'ja' ? '発見' : 'Found'}
          </span>
        )}
        {state.done && !state.foundId && state.operation === 'search' && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">
            {locale === 'ja' ? '見つかりません' : 'Not found'}
          </span>
        )}
      </div>

      {/* SVGツリー */}
      <div className="min-h-0 flex-1 overflow-auto">
        <svg
          width={svgW}
          height={svgH}
          style={{ minWidth: svgW, minHeight: svgH }}
        >
          {/* エッジ（ノードより先に描画して円の下に隠れるようにする） */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={e.isVisited ? '#3b82f6' : '#334155'}
              strokeWidth={e.isVisited ? 2 : 1.5}
            />
          ))}

          {/* ノード */}
          {nodeList.map((node) => {
            const { cx, cy } = nodePos(inOrder, node)
            const colors = resolveNodeColors(node.id, state)
            return (
              <g key={node.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_R}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={colors.strokeWidth}
                />
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {node.value}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 凡例 */}
      <div className="flex flex-shrink-0 flex-wrap gap-3 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-yellow-400 bg-[#854d0e]" />
          {locale === 'ja' ? '比較中' : 'Comparing'}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-400 bg-[#1e3a5f]" />
          {locale === 'ja' ? '走査済み' : 'Visited'}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-cyan-400 bg-[#0e7490]" />
          {locale === 'ja' ? '挿入' : 'Inserted'}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-green-400 bg-[#15803d]" />
          {locale === 'ja' ? '発見' : 'Found'}
        </span>
      </div>
    </div>
  )
}
