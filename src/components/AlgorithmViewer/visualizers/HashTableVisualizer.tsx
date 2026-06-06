// ハッシュテーブル（チェーン法）をSVGで可視化するコンポーネント。
// 縦にバケット一覧を並べ、各バケットの衝突チェーンを横方向に展開する。
// ハッシュ計算→バケット選択→チェーン走査の流れを色で追跡できる。

import type { HashTableState } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

// バケット行の高さ
const BUCKET_H = 44
// アイテム（チェーン要素）のサイズ
const ITEM_W   = 46
const ITEM_H   = 32
// バケットインデックスラベル幅
const LABEL_W  = 72
const MARGIN_L = 12
const MARGIN_T = 12

interface ItemColors { fill: string; stroke: string; text: string }

function resolveItemColors(
  bucketIdx: number,
  itemIdx: number,
  state: HashTableState,
): ItemColors {
  const { hashIndex, chainIndex, found, phase } = state

  if (bucketIdx !== hashIndex) {
    return { fill: '#1e293b', stroke: '#334155', text: '#94a3b8' }
  }

  // 対象バケットの場合
  if (found === true && itemIdx === chainIndex) {
    // 発見されたアイテム
    return { fill: '#15803d', stroke: '#22c55e', text: '#ffffff' }
  }
  if (phase === 'traversing' && itemIdx === chainIndex) {
    // 現在比較中
    return { fill: '#854d0e', stroke: '#facc15', text: '#fef08a' }
  }
  if (chainIndex !== null && itemIdx < chainIndex) {
    // 走査済み（比較済みで不一致）
    return { fill: '#1e293b', stroke: '#3b82f6', text: '#93c5fd' }
  }
  if (phase !== 'idle' && phase !== 'hashing') {
    // アクティブバケットの未走査要素
    return { fill: '#1e2a3a', stroke: '#475569', text: '#94a3b8' }
  }
  return { fill: '#1e293b', stroke: '#334155', text: '#94a3b8' }
}

function bucketLabelColors(
  bucketIdx: number,
  state: HashTableState,
): { fill: string; stroke: string; text: string } {
  if (bucketIdx === state.hashIndex && state.phase !== 'idle') {
    return { fill: '#1e3a5f', stroke: '#3b82f6', text: '#60a5fa' }
  }
  return { fill: '#0f172a', stroke: '#1e293b', text: '#64748b' }
}

export function HashTableVisualizer({ state }: { state: HashTableState | null }) {
  const { locale } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {locale === 'ja' ? '再生を開始してください' : 'Press play to start'}
      </div>
    )
  }

  const { buckets, tableSize, currentValue, hashIndex, phase, found, operation } = state
  const maxChain = Math.max(...buckets.map((b) => b.length), 1)
  const svgW = MARGIN_L * 2 + LABEL_W + maxChain * ITEM_W + 40
  const svgH = MARGIN_T * 2 + tableSize * BUCKET_H

  const opLabel =
    operation === 'insert'
      ? locale === 'ja' ? '挿入' : 'Insert'
      : locale === 'ja' ? '検索' : 'Search'

  const phaseLabel = {
    idle:       '',
    hashing:    locale === 'ja' ? 'ハッシュ計算中' : 'Hashing',
    traversing: locale === 'ja' ? 'チェーン走査中' : 'Traversing chain',
    done:       locale === 'ja' ? '完了' : 'Done',
  }[phase]

  return (
    <div className="flex h-full flex-col gap-1 overflow-auto p-3">
      {/* 操作情報バナー */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded bg-dark-sidebar px-2 py-0.5 text-dark-textDim dark:bg-dark-sidebar dark:text-dark-textDim light:bg-light-sidebar light:text-light-textDim">
          {opLabel}
        </span>
        {currentValue !== null && (
          <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {locale === 'ja' ? '値' : 'Value'}:{' '}
            <span className="font-mono font-bold text-yellow-400">{currentValue}</span>
          </span>
        )}
        {hashIndex !== null && phase !== 'idle' && (
          <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {locale === 'ja'
              ? `→ バケット[${hashIndex}]`
              : `→ bucket[${hashIndex}]`}
          </span>
        )}
        {phaseLabel && (
          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-400">{phaseLabel}</span>
        )}
        {found === true && (
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-green-400">
            {locale === 'ja' ? '発見' : 'Found'}
          </span>
        )}
        {found === false && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">
            {locale === 'ja' ? '見つかりません' : 'Not found'}
          </span>
        )}
      </div>

      {/* SVGテーブル本体 */}
      <div className="min-h-0 flex-1 overflow-auto">
        <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
          {/* ハッシュ関数ラベル */}
          <text x={MARGIN_L} y={MARGIN_T - 2} fontSize={10} fill="#475569">
            h(k) = k % {tableSize}
          </text>

          {buckets.map((chain, bi) => {
            const y = MARGIN_T + bi * BUCKET_H
            const bColors = bucketLabelColors(bi, state)

            return (
              <g key={bi}>
                {/* バケットインデックスセル */}
                <rect
                  x={MARGIN_L}
                  y={y + (BUCKET_H - ITEM_H) / 2}
                  width={LABEL_W}
                  height={ITEM_H}
                  rx={4}
                  fill={bColors.fill}
                  stroke={bColors.stroke}
                  strokeWidth={1.5}
                />
                <text
                  x={MARGIN_L + LABEL_W / 2}
                  y={y + BUCKET_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={bColors.text}
                  fontWeight="bold"
                >
                  [{bi}]
                </text>

                {/* チェーン矢印（バケットラベルから最初のアイテムへ） */}
                {chain.length > 0 && (
                  <line
                    x1={MARGIN_L + LABEL_W}
                    y1={y + BUCKET_H / 2}
                    x2={MARGIN_L + LABEL_W + 8}
                    y2={y + BUCKET_H / 2}
                    stroke={bi === hashIndex && phase !== 'idle' ? '#3b82f6' : '#334155'}
                    strokeWidth={1.5}
                  />
                )}

                {/* チェーン内のアイテム */}
                {chain.map((val, ii) => {
                  const ix = MARGIN_L + LABEL_W + 10 + ii * ITEM_W
                  const iy = y + (BUCKET_H - ITEM_H) / 2
                  const iColors = resolveItemColors(bi, ii, state)
                  return (
                    <g key={ii}>
                      <rect
                        x={ix}
                        y={iy}
                        width={ITEM_W - 6}
                        height={ITEM_H}
                        rx={4}
                        fill={iColors.fill}
                        stroke={iColors.stroke}
                        strokeWidth={1.5}
                      />
                      <text
                        x={ix + (ITEM_W - 6) / 2}
                        y={iy + ITEM_H / 2 + 4}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="bold"
                        fill={iColors.text}
                      >
                        {val}
                      </text>
                      {/* チェーン内矢印 */}
                      {ii < chain.length - 1 && (
                        <line
                          x1={ix + ITEM_W - 6}
                          y1={iy + ITEM_H / 2}
                          x2={ix + ITEM_W - 2}
                          y2={iy + ITEM_H / 2}
                          stroke="#334155"
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  )
                })}

                {/* 空バケットに NULL 表示 */}
                {chain.length === 0 && (
                  <text
                    x={MARGIN_L + LABEL_W + 14}
                    y={y + BUCKET_H / 2 + 4}
                    fontSize={10}
                    fill="#334155"
                  >
                    —
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 凡例 */}
      <div className="flex flex-shrink-0 flex-wrap gap-3 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded border-2 border-yellow-400 bg-[#854d0e]" />
          {locale === 'ja' ? '比較中' : 'Comparing'}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded border-2 border-blue-400 bg-[#1e293b]" />
          {locale === 'ja' ? '走査済み' : 'Checked'}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded border-2 border-green-400 bg-[#15803d]" />
          {locale === 'ja' ? '発見' : 'Found'}
        </span>
      </div>
    </div>
  )
}
