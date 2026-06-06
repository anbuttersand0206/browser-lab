// 連結リストをSVGでノード＋矢印の横並び形式で可視化するコンポーネント。
// 走査・挿入・削除の各フェーズで色が変化し、ポインタの流れを直感的に把握できる。

import type { LinkedListState } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

// ノードの表示サイズ定数（px）
const NODE_W = 54
const NODE_H = 38
const ARROW_W = 26
const HEAD_X  = 10
const NODE_START_X = 68  // HEAD ラベルの右端から始まる
const Y_CENTER = 55
const SVG_H = 110

interface NodeColors { fill: string; stroke: string; text: string }

function resolveNodeColor(
  index: number,
  state: LinkedListState,
): NodeColors {
  const { currentIndex, foundIndex, phase } = state
  if (foundIndex !== null && index === foundIndex) {
    // 発見されたノード: 緑
    return { fill: '#15803d', stroke: '#22c55e', text: '#ffffff' }
  }
  if (currentIndex !== null && index === currentIndex) {
    if (phase === 'insert') {
      // 挿入位置: シアン
      return { fill: '#0e7490', stroke: '#22d3ee', text: '#ffffff' }
    }
    // 走査中: 黄
    return { fill: '#854d0e', stroke: '#facc15', text: '#fef08a' }
  }
  return { fill: '#1e293b', stroke: '#334155', text: '#94a3b8' }
}

function opLabel(op: LinkedListState['operation'], locale: 'ja' | 'en'): string {
  const map: Record<LinkedListState['operation'], { ja: string; en: string }> = {
    insert_front: { ja: '先頭挿入', en: 'Insert front' },
    insert_back:  { ja: '末尾挿入', en: 'Insert back' },
    search:       { ja: '検索',     en: 'Search' },
    delete:       { ja: '削除',     en: 'Delete' },
  }
  return map[op][locale]
}

export function LinkedListVisualizer({ state }: { state: LinkedListState | null }) {
  const { locale } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {locale === 'ja' ? '再生を開始してください' : 'Press play to start'}
      </div>
    )
  }

  const { nodes, currentIndex, foundIndex, phase, operation, targetValue } = state
  const svgWidth = NODE_START_X + nodes.length * (NODE_W + ARROW_W) + 50

  const phaseIsNotFound = phase === 'not_found'
  const phaseIsFound    = foundIndex !== null

  return (
    <div className="flex h-full flex-col gap-1 overflow-auto p-3">
      {/* 操作情報バナー */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded bg-dark-sidebar px-2 py-0.5 text-dark-textDim dark:bg-dark-sidebar dark:text-dark-textDim light:bg-light-sidebar light:text-light-textDim">
          {opLabel(operation, locale)}
        </span>
        <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {locale === 'ja' ? '対象値' : 'Target'}:{' '}
          <span className="font-mono font-bold text-yellow-400">{targetValue}</span>
        </span>
        {phaseIsNotFound && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">
            {locale === 'ja' ? '見つかりません' : 'Not found'}
          </span>
        )}
        {phaseIsFound && (
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-green-400">
            {locale === 'ja' ? '発見 index=' + foundIndex : 'Found at index=' + foundIndex}
          </span>
        )}
      </div>

      {/* SVGリスト本体 */}
      <div className="min-w-0 overflow-x-auto">
        <svg width={Math.max(svgWidth, 260)} height={SVG_H}>
          <defs>
            <marker id="ll-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#475569" />
            </marker>
            <marker id="ll-arrow-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#60a5fa" />
            </marker>
          </defs>

          {/* HEAD ラベル */}
          <text x={HEAD_X} y={Y_CENTER + 5} fontSize={11} fontWeight="bold" fill="#60a5fa">
            HEAD
          </text>

          {/* HEAD → 先頭ノードへの矢印 */}
          {nodes.length > 0 && (
            <line
              x1={HEAD_X + 34}
              y1={Y_CENTER}
              x2={NODE_START_X - 4}
              y2={Y_CENTER}
              stroke="#60a5fa"
              strokeWidth={2}
              markerEnd="url(#ll-arrow-head)"
            />
          )}

          {/* HEAD → NULL（空リスト時） */}
          {nodes.length === 0 && (
            <>
              <line
                x1={HEAD_X + 34}
                y1={Y_CENTER}
                x2={HEAD_X + 70}
                y2={Y_CENTER}
                stroke="#475569"
                strokeWidth={2}
                markerEnd="url(#ll-arrow)"
              />
              <text x={HEAD_X + 76} y={Y_CENTER + 4} fontSize={11} fill="#475569">
                NULL
              </text>
            </>
          )}

          {/* ノード群 */}
          {nodes.map((node, i) => {
            const x = NODE_START_X + i * (NODE_W + ARROW_W)
            const colors = resolveNodeColor(i, { ...state, currentIndex, foundIndex })
            const isLast = i === nodes.length - 1

            return (
              <g key={node.id}>
                {/* ノード矩形 */}
                <rect
                  x={x}
                  y={Y_CENTER - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={5}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={2}
                />
                {/* 値テキスト（左寄り） */}
                <text
                  x={x + 14}
                  y={Y_CENTER + 5}
                  fontSize={14}
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {node.value}
                </text>
                {/* ポインタフィールド（右端の縦線で区切り） */}
                <line
                  x1={x + NODE_W - 14}
                  y1={Y_CENTER - NODE_H / 2 + 5}
                  x2={x + NODE_W - 14}
                  y2={Y_CENTER + NODE_H / 2 - 5}
                  stroke={colors.stroke}
                  strokeWidth={1}
                  opacity={0.6}
                />

                {/* next 矢印 or NULL */}
                {isLast ? (
                  <text
                    x={x + NODE_W + 6}
                    y={Y_CENTER + 4}
                    fontSize={10}
                    fill="#475569"
                  >
                    NULL
                  </text>
                ) : (
                  <line
                    x1={x + NODE_W}
                    y1={Y_CENTER}
                    x2={x + NODE_W + ARROW_W - 4}
                    y2={Y_CENTER}
                    stroke="#475569"
                    strokeWidth={2}
                    markerEnd="url(#ll-arrow)"
                  />
                )}

                {/* インデックスラベル */}
                <text
                  x={x + NODE_W / 2}
                  y={Y_CENTER + NODE_H / 2 + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#475569"
                >
                  [{i}]
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* ノード数ラベル */}
      <div className="flex-shrink-0 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {locale === 'ja' ? `ノード数: ${nodes.length}` : `Nodes: ${nodes.length}`}
      </div>
    </div>
  )
}
