// ネットワークトポロジーをSVGで描画するコンポーネント。
// ノード（ホスト/スイッチ/ルーター等）とリンク（回線）を描画し、
// リンク上を移動するパケットをアニメーションで表示する。

import { useRef, useState, useCallback, useEffect } from 'react'
import type { NetworkState, NetworkNode, PacketOnLink } from '../../../network/simulator/types'
import { useI18n } from '../../../i18n'

const PACKET_ANIM_MS = 350  // パケットがリンク上を移動するアニメーション時間

// OSIシナリオのフェーズ識別セット
const OSI_PHASES = new Set([
  'init', 'layer7', 'layer6', 'layer5', 'layer4', 'layer3', 'layer2', 'layer1',
  'traveling', 'decap_start', 'decap_l2', 'decap_l3', 'decap_l4', 'decap_done',
])

// OSIシナリオの src/dst ノードを両パネルの中間ゾーンに均等配置する
// パネル幅は svgWidth * 0.22（上限140px）で計算する
function computeOsiNodeX(nodeId: string, svgWidth: number): number | null {
  if (nodeId !== 'src' && nodeId !== 'dst') return null
  const panelW = Math.min(140, svgWidth * 0.22)
  const leftEdge  = panelW + 16
  const rightEdge = svgWidth - panelW - 16
  const centerX   = (leftEdge + rightEdge) / 2
  const halfSpan  = (rightEdge - leftEdge) * 0.35
  return nodeId === 'src' ? centerX - halfSpan : centerX + halfSpan
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// パケット種別→色のマッピング
const PACKET_COLORS: Record<string, string> = {
  arp_request:     '#fbbf24',  // 黄
  arp_reply:       '#34d399',  // 緑
  icmp_request:    '#60a5fa',  // 青
  icmp_reply:      '#34d399',
  icmp_time_exceeded: '#f87171',
  tcp_syn:         '#a78bfa',  // 紫
  tcp_syn_ack:     '#c084fc',
  tcp_ack:         '#818cf8',
  tcp_data:        '#67e8f9',  // シアン
  tcp_fin:         '#fb923c',  // オレンジ
  tcp_fin_ack:     '#f97316',
  tcp_rst:         '#ef4444',
  dns_query:       '#86efac',
  dns_response:    '#4ade80',
  dhcp_discover:   '#fde68a',
  dhcp_offer:      '#fcd34d',
  dhcp_request:    '#fbbf24',
  dhcp_ack:        '#f59e0b',
  ospf_hello:      '#7dd3fc',
  ospf_lsa:        '#38bdf8',
  ospf_lsack:      '#0ea5e9',
  stp_bpdu:        '#a5b4fc',
  http_request:    '#f472b6',  // ピンク
  http_response:   '#ec4899',
  smtp:            '#fb923c',
  ftp_control:     '#fdba74',
  ftp_data:        '#fbbf24',
  bgp_open:        '#6ee7b7',
  bgp_update:      '#34d399',
  bgp_keepalive:   '#10b981',
  rip_request:     '#a3e635',
  rip_response:    '#84cc16',
  hsrp_hello:      '#fde68a',
  tls_client_hello:'#c084fc',
  tls_server_hello:'#a855f7',
  tls_finished:    '#7c3aed',
  tls_data:        '#818cf8',
  igmp_report:     '#6ee7b7',
  igmp_query:      '#34d399',
  pim_hello:       '#10b981',
  generic:         '#94a3b8',
}

const NODE_TYPE_COLOR: Record<string, string> = {
  host:     '#3b82f6',
  switch:   '#8b5cf6',
  router:   '#f59e0b',
  dns:      '#10b981',
  dhcp:     '#06b6d4',
  internet: '#6b7280',
  firewall: '#ef4444',
}

const NODE_TYPE_ICON: Record<string, string> = {
  host:     '🖥',
  switch:   '🔀',
  router:   '⚡',
  dns:      '📋',
  dhcp:     '🎯',
  internet: '🌐',
  firewall: '🔥',
}

interface Props {
  state: NetworkState | null
  onSelectPacket?: (packetId: string | null) => void
  selectedPacketId?: string | null
}

export function TopologyMap({ state, onSelectPacket, selectedPacketId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 })

  // ユーザーがノードをドラッグして配置変更できるよう、ローカルに座標を持つ
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)

  const dragStartRef = useRef<{ mx: number; my: number } | null>(null)

  // ---- パケットアニメーション ----
  // 各パケットIDに対する現在のアニメーション中の座標
  const [animPos, setAnimPos] = useState<Record<string, { cx: number; cy: number }>>({})
  // useEffect内でstaleな値を参照しないようrefでも持つ
  const animPosRef = useRef<Record<string, { cx: number; cy: number }>>({})
  const rafRef = useRef<number>(0)

  // animPos stateをrefに同期する
  useEffect(() => { animPosRef.current = animPos }, [animPos])

  // ResizeObserverでSVGサイズを追跡する
  useEffect(() => {
    const el = svgRef.current?.parentElement
    if (!el) return
    const obs = new ResizeObserver(([e]) => {
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // シナリオが変わったときにドラッグ位置をリセット
  useEffect(() => {
    setNodePositions({})
  }, [state?.topology.nodes.map(n => n.id).join(',')])

  const getNodePos = useCallback((node: NetworkNode) => {
    if (nodePositions[node.id]) return nodePositions[node.id]
    const osiX = computeOsiNodeX(node.id, dimensions.width)
    if (osiX !== null) return { x: osiX, y: node.position.y }
    return node.position
  }, [nodePositions, dimensions.width])

  // パケットが変化するたびにリンク上を走るアニメーションを開始する。
  // CSS transition は SVG transform 属性には効かないため rAF で直接更新する。
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)

    if (!state || state.packets.length === 0) {
      setAnimPos({})
      return
    }

    const currentNodes = state.topology.nodes

    // ノード位置を解決するローカルヘルパー（OSI動的位置 or ドラッグ位置 or 固定位置）
    function posOf(n: NetworkNode): { x: number; y: number } {
      if (nodePositions[n.id]) return nodePositions[n.id]
      const osiX = computeOsiNodeX(n.id, dimensions.width)
      if (osiX !== null) return { x: osiX, y: n.position.y }
      return n.position
    }

    // 今ステップで各パケットが最終的に止まるべき座標
    const toPos: Record<string, { cx: number; cy: number }> = {}
    for (const p of state.packets) {
      const fromNode = currentNodes.find(n => n.id === p.fromNodeId)
      const toNode   = currentNodes.find(n => n.id === p.toNodeId)
      if (!fromNode || !toNode) continue
      const fp = posOf(fromNode)
      const tp = posOf(toNode)
      toPos[p.id] = {
        cx: fp.x + (tp.x - fp.x) * p.progress,
        cy: fp.y + (tp.y - fp.y) * p.progress,
      }
    }

    // アニメーション開始位置: 同じIDなら現在地から継続、新規なら fromNode から出発
    const fromPos: Record<string, { cx: number; cy: number }> = {}
    for (const p of state.packets) {
      const existing = animPosRef.current[p.id]
      if (existing) {
        fromPos[p.id] = existing
      } else {
        const fromNode = currentNodes.find(n => n.id === p.fromNodeId)
        if (!fromNode) continue
        const fp = posOf(fromNode)
        fromPos[p.id] = { cx: fp.x, cy: fp.y }
      }
    }

    const startTime = performance.now()

    function tick() {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / PACKET_ANIM_MS, 1)
      const ease = easeInOut(t)

      const next: Record<string, { cx: number; cy: number }> = {}
      for (const id of Object.keys(toPos)) {
        const from = fromPos[id]
        const to   = toPos[id]
        if (!from || !to) { if (to) next[id] = to; continue }
        next[id] = {
          cx: from.cx + (to.cx - from.cx) * ease,
          cy: from.cy + (to.cy - from.cy) * ease,
        }
      }
      setAnimPos(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.packets, nodePositions, dimensions.width])

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    const node = state?.topology.nodes.find(n => n.id === nodeId)
    if (!node) return
    const pos = getNodePos(node)
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    setDragging({ id: nodeId, ox: e.clientX - svgRect.left - pos.x, oy: e.clientY - svgRect.top - pos.y })
    dragStartRef.current = { mx: e.clientX, my: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    const x = e.clientX - svgRect.left - dragging.ox
    const y = e.clientY - svgRect.top - dragging.oy
    setNodePositions(prev => ({ ...prev, [dragging.id]: { x, y } }))
  }

  const handlePointerUp = () => {
    setDragging(null)
    dragStartRef.current = null
  }

  if (!state) return (
    <div className="flex h-full items-center justify-center text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
      <span className="text-sm">シミュレーターを選択してください</span>
    </div>
  )

  const { topology, packets } = state
  const { nodes, links } = topology

  // リンクの端点座標を計算する
  function linkEndpoints(linkObj: typeof links[0]) {
    const from = nodes.find(n => n.id === linkObj.from)!
    const to   = nodes.find(n => n.id === linkObj.to)!
    const fp = getNodePos(from)
    const tp = getNodePos(to)
    return { x1: fp.x, y1: fp.y, x2: tp.x, y2: tp.y }
  }

  // パケットのSVG座標を計算する
  function packetPos(p: PacketOnLink): { cx: number; cy: number } {
    const from = nodes.find(n => n.id === p.fromNodeId)
    const to   = nodes.find(n => n.id === p.toNodeId)
    if (!from || !to) return { cx: 0, cy: 0 }
    const fp = getNodePos(from)
    const tp = getNodePos(to)
    return {
      cx: fp.x + (tp.x - fp.x) * p.progress,
      cy: fp.y + (tp.y - fp.y) * p.progress,
    }
  }

  return (
    <svg
      ref={svgRef}
      width={dimensions.width}
      height={dimensions.height}
      className="h-full w-full touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* リンク */}
      {links.map(lnk => {
        const { x1, y1, x2, y2 } = linkEndpoints(lnk)
        return (
          <line
            key={lnk.id}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={lnk.status === 'up' ? '#4b5563' : '#ef4444'}
            strokeWidth={2}
            strokeDasharray={lnk.status === 'down' ? '6 3' : undefined}
          />
        )
      })}

      {/* パケット（リンク上を移動する円）*/}
      {packets.map(p => {
        // rAFで更新されたアニメーション座標を使う。初回フレームはfromNodeの位置にフォールバック。
        const pos = animPos[p.id] ?? packetPos(p)
        const { cx, cy } = pos
        const color = PACKET_COLORS[p.packet.type] ?? '#e5e7eb'
        const isSelected = p.packet.id === selectedPacketId
        return (
          <g
            key={p.id}
            transform={`translate(${cx}, ${cy})`}
            onClick={() => onSelectPacket?.(isSelected ? null : p.packet.id)}
            className="cursor-pointer"
          >
            <circle
              cx={0} cy={0} r={isSelected ? 9 : 7}
              fill={color}
              stroke={isSelected ? '#fff' : 'transparent'}
              strokeWidth={2}
            />
            {/* ブロードキャストはリングを追加して区別する */}
            {p.broadcast && (
              <circle cx={0} cy={0} r={12} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
            )}
          </g>
        )
      })}

      {/* ノード */}
      {nodes.map(node => {
        const pos = getNodePos(node)
        const color = NODE_TYPE_COLOR[node.type] ?? '#6b7280'
        const icon = NODE_TYPE_ICON[node.type] ?? '●'
        const labelLines = node.label.split('\n')
        return (
          <g
            key={node.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            onPointerDown={e => handlePointerDown(e, node.id)}
            className="cursor-grab active:cursor-grabbing"
          >
            {/* 外枠の円 */}
            <circle cx={0} cy={0} r={28} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
            {/* アイコンテキスト（絵文字は環境依存なのでシンプルな代替も用意） */}
            <text x={0} y={6} textAnchor="middle" fontSize={20} fill={color} style={{ userSelect: 'none' }}>
              {icon}
            </text>
            {/* ノード種別ラベル */}
            {labelLines.map((line, i) => (
              <text
                key={i}
                x={0}
                y={38 + i * 14}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                className="text-dark-text dark:text-dark-text light:text-light-text"
                style={{ userSelect: 'none' }}
              >
                {line}
              </text>
            ))}
            {/* IPアドレス（あれば） */}
            {node.ip && !node.label.includes(node.ip) && (
              <text
                x={0}
                y={38 + labelLines.length * 14}
                textAnchor="middle"
                fontSize={9}
                className="fill-current text-dark-textDim dark:text-dark-textDim light:text-light-textDim"
                style={{ userSelect: 'none' }}
              >
                {node.ip}
              </text>
            )}
          </g>
        )
      })}

      {/* OSI層表示（OSIモデルシナリオ時のみ） */}
      {OSI_PHASES.has(state.phase) && (
        <OSILayerOverlay
          activeLayer={state.activeOsiLayer}
          capsuleLayers={state.capsuleLayers}
          svgWidth={dimensions.width}
          svgHeight={dimensions.height}
          phase={state.phase}
        />
      )}
    </svg>
  )
}

// ---- OSIモデルのオーバーレイ表示 ----

const OSI_LAYERS = [
  { num: 7, ja: '7. アプリケーション', en: 'Application', color: '#7c3aed' },
  { num: 6, ja: '6. プレゼンテーション', en: 'Presentation', color: '#8b5cf6' },
  { num: 5, ja: '5. セッション', en: 'Session', color: '#a78bfa' },
  { num: 4, ja: '4. トランスポート', en: 'Transport', color: '#3b82f6' },
  { num: 3, ja: '3. ネットワーク', en: 'Network', color: '#0891b2' },
  { num: 2, ja: '2. データリンク', en: 'Data Link', color: '#0d9488' },
  { num: 1, ja: '1. 物理', en: 'Physical', color: '#059669' },
]

const HEADER_COLORS: Record<string, string> = {
  'HTTP Data':         '#7c3aed',
  'TCP Header':        '#3b82f6',
  'IP Header':         '#0891b2',
  'Ethernet Header':   '#0d9488',
  'Ethernet Trailer':  '#047857',
}

// カプセル化フェーズ（送信側が主役）
const ENCAP_PHASES = new Set(['init', 'layer7', 'layer6', 'layer5', 'layer4', 'layer3', 'layer2', 'layer1'])
// デカプセル化フェーズ（受信側が主役）
const DECAP_PHASES = new Set(['decap_start', 'decap_l2', 'decap_l3', 'decap_l4', 'decap_done'])

function OSILayerOverlay({
  activeLayer, capsuleLayers, svgWidth, svgHeight, phase,
}: {
  activeLayer: number | null
  capsuleLayers: string[]
  svgWidth: number
  svgHeight: number
  phase: string
}) {
  const { locale } = useI18n()

  const panelW   = Math.min(140, svgWidth * 0.22)
  const leftX    = 6
  const rightX   = svgWidth - panelW - 6
  // OSIレイヤーパネルが占める高さ（下部にカプセルスタック用スペースを確保）
  const osiH     = Math.min(svgHeight * 0.58, svgHeight - 120)
  const layerH   = osiH / 7
  const labelY   = osiH + 14
  const stackY   = osiH + 24

  const isEncap  = ENCAP_PHASES.has(phase)
  const isDecap  = DECAP_PHASES.has(phase)
  const isTrav   = phase === 'traveling'

  // どちらのパネルも常に表示し、アクティブ側を強調する
  function renderPanel(side: 'left' | 'right') {
    const x       = side === 'left' ? leftX : rightX
    const active  = side === 'left' ? isEncap : isDecap
    const faded   = isTrav || (side === 'left' ? isDecap : isEncap)

    return (
      <g key={side}>
        {OSI_LAYERS.map((layer, i) => {
          const y = i * layerH
          const isActiveLayer = active && layer.num === activeLayer
          return (
            <g key={layer.num}>
              <rect
                x={x} y={y}
                width={panelW} height={layerH - 2}
                rx={3}
                fill={layer.color}
                fillOpacity={isActiveLayer ? 0.5 : active ? 0.15 : 0.05}
                stroke={layer.color}
                strokeWidth={isActiveLayer ? 2 : 0.5}
                strokeOpacity={faded ? 0.25 : 0.7}
              />
              <text
                x={x + panelW / 2} y={y + layerH / 2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={Math.max(8, Math.min(10, layerH * 0.38))}
                fill={isActiveLayer ? '#fff' : faded ? '#374151' : '#9ca3af'}
                fontWeight={isActiveLayer ? 'bold' : 'normal'}
                style={{ userSelect: 'none' }}
              >
                {locale === 'ja' ? layer.ja : `${layer.num}. ${layer.en}`}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  return (
    <g>
      {/* 送信側パネル（左）*/}
      {renderPanel('left')}

      {/* 送信側ラベル＋カプセルスタック */}
      <text
        x={leftX + panelW / 2} y={labelY}
        textAnchor="middle" fontSize={9}
        fill={isEncap ? '#93c5fd' : '#374151'}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {locale === 'ja' ? (isEncap ? '送信側 ▼ カプセル化' : '送信側') : (isEncap ? 'Sender ▼ Encap' : 'Sender')}
      </text>
      {(isEncap || isTrav) && capsuleLayers.length > 0 && (
        <CapsuleStack layers={capsuleLayers} x={leftX} y={stackY} width={panelW} />
      )}

      {/* 受信側パネル（右）*/}
      {renderPanel('right')}

      {/* 受信側ラベル＋カプセルスタック */}
      <text
        x={rightX + panelW / 2} y={labelY}
        textAnchor="middle" fontSize={9}
        fill={isDecap ? '#86efac' : '#374151'}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {locale === 'ja' ? (isDecap ? '受信側 ▲ デカプセル化' : '受信側') : (isDecap ? 'Receiver ▲ Decap' : 'Receiver')}
      </text>
      {isDecap && capsuleLayers.length > 0 && (
        <CapsuleStack layers={capsuleLayers} x={rightX} y={stackY} width={panelW} />
      )}

      {/* 伝送中: ノード間を繋ぐ矢印 */}
      {isTrav && (
        <>
          <defs>
            <marker id="travelArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24" />
            </marker>
          </defs>
          <text
            x={svgWidth / 2} y={labelY - 4}
            textAnchor="middle" fontSize={9} fill="#fbbf24"
            style={{ userSelect: 'none' }}
          >
            {locale === 'ja' ? '物理媒体で伝送中...' : 'Transmitting...'}
          </text>
        </>
      )}
    </g>
  )
}

function CapsuleStack({ layers, x, y, width }: { layers: string[]; x: number; y: number; width: number }) {
  const itemH = 22
  return (
    <g>
      {layers.map((name, i) => {
        const fillColor = HEADER_COLORS[name] ?? '#4b5563'
        return (
          <g key={i} transform={`translate(${x}, ${y + i * itemH})`}>
            <rect width={width} height={itemH - 2} rx={3} fill={fillColor} fillOpacity={0.28} stroke={fillColor} strokeWidth={1} />
            <text x={5} y={itemH - 7} fontSize={9} fill="#e5e7eb" style={{ userSelect: 'none' }}>
              {name}
            </text>
          </g>
        )
      })}
    </g>
  )
}
