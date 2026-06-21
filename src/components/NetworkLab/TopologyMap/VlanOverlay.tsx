// VLANトポロジーオーバーレイ。
// vlanState が存在するとき、trunkLinkIds に該当するリンク上に
// 虹色のダッシュを重ねて trunk と通常リンクを視覚的に区別する。

import type { VlanState, NetworkLink, NetworkNode } from '../../../network/simulator/types'

const RAINBOW = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']
// dasharray: 6px dash + 30px gap = 36px周期。色ごとに6pxずつずらして虹を作る
const DASH = '6 30'

interface Props {
  vlanState: VlanState
  links: NetworkLink[]
  nodes: NetworkNode[]
  getNodePos: (node: NetworkNode) => { x: number; y: number }
}

export function VlanLinkOverlay({ vlanState, links, nodes, getNodePos }: Props) {
  return (
    <>
      {vlanState.trunkLinkIds.map(linkId => {
        const link = links.find(l => l.id === linkId)
        if (!link) return null
        const fromNode = nodes.find(n => n.id === link.from)
        const toNode   = nodes.find(n => n.id === link.to)
        if (!fromNode || !toNode) return null
        const fp = getNodePos(fromNode)
        const tp = getNodePos(toNode)
        return (
          <g key={linkId}>
            {RAINBOW.map((color, i) => (
              <line
                key={i}
                x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={DASH}
                strokeDashoffset={-(i * 6)}
                opacity={0.55}
              />
            ))}
          </g>
        )
      })}
    </>
  )
}
