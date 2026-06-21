// TCPウィンドウ状態をSVGで可視化するコンポーネント。
// 輻輳制御フェーズ・cwnd・ssthresh・セグメント状態を一枚のチャートで表現する。

import type { TcpWindowState } from '../../../network/simulator/types'
import { useI18n } from '../../../i18n'

const SEG_COLOR: Record<TcpWindowState['segments'][0]['status'], string> = {
  sent:    '#60a5fa',  // 青: 送信済み未確認
  acked:   '#34d399',  // 緑: 確認済み
  lost:    '#ef4444',  // 赤: ロスト
  retrans: '#fbbf24',  // 黄: 再送中
}

const PHASE_STYLE = {
  slow_start:           { bg: 'bg-blue-500/20',  text: 'text-blue-400',  ja: 'スロースタート',    en: 'Slow Start' },
  congestion_avoidance: { bg: 'bg-green-500/20', text: 'text-green-400', ja: '輻輳回避',          en: 'Congestion Avoidance' },
  fast_recovery:        { bg: 'bg-red-500/20',   text: 'text-red-400',   ja: '高速回復 (FR)',      en: 'Fast Recovery' },
}

interface Props { state: TcpWindowState }

export function TcpWindowChart({ state }: Props) {
  const { locale } = useI18n()
  const { segments, windowSize, cwnd, ssthresh, congestionPhase, sentUnacked } = state
  if (!segments.length) return null

  const phase = PHASE_STYLE[congestionPhase]
  const SVG_W = 260, SVG_H = 56
  const PAD_L = 6, PAD_R = 6, PAD_T = 6, PAD_B = 18
  const innerW = SVG_W - PAD_L - PAD_R
  const innerH = SVG_H - PAD_T - PAD_B

  const seqNos  = segments.map(s => s.seq)
  const minSeq  = Math.min(...seqNos)
  const maxSeq  = Math.max(...seqNos) + 1
  const seqRange = maxSeq - minSeq || 1
  const segW    = innerW / seqRange

  const seqX = (seq: number) => PAD_L + (seq - minSeq) * segW
  // ラベルは最大6個に間引く
  const labelStep = Math.ceil(segments.length / 6)

  return (
    <div className="mt-1 space-y-1">
      {/* 輻輳フェーズバッジ + cwnd/ssthresh */}
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${phase.bg} ${phase.text}`}>
          {phase[locale]}
        </span>
        <span className="text-[10px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          cwnd={cwnd} ssthresh={ssthresh}
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="overflow-visible">
        {/* ウィンドウ範囲オーバーレイ */}
        <rect
          x={seqX(sentUnacked)} y={PAD_T}
          width={Math.max(0, segW * windowSize)}
          height={innerH}
          fill="#3b82f6" fillOpacity={0.12}
          stroke="#3b82f6" strokeWidth={0.5} strokeOpacity={0.4}
        />

        {/* セグメントブロック */}
        {segments.map(seg => (
          <rect
            key={seg.seq}
            x={seqX(seg.seq) + 1} y={PAD_T + 2}
            width={Math.max(1, segW - 2)} height={innerH - 4}
            rx={2}
            fill={SEG_COLOR[seg.status]}
            fillOpacity={0.85}
          />
        ))}

        {/* SeqNo軸ラベル */}
        {segments.filter((_, i) => i % labelStep === 0).map(seg => (
          <text
            key={seg.seq}
            x={seqX(seg.seq) + segW / 2} y={SVG_H - 3}
            textAnchor="middle" fontSize={7} fill="#6b7280"
          >
            {seg.seq}
          </text>
        ))}

        {/* Window右端ラベル */}
        <text
          x={seqX(sentUnacked + windowSize)} y={PAD_T - 1}
          textAnchor="end" fontSize={7} fill="#60a5fa" opacity={0.8}
        >
          win
        </text>
      </svg>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(SEG_COLOR) as [keyof typeof SEG_COLOR, string][]).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1 text-[9px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
            {status}
          </span>
        ))}
      </div>
    </div>
  )
}
