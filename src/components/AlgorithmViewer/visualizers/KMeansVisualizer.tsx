import { useRef, useEffect } from 'react'
import { useContainerSize } from '../../../hooks/useContainerSize'
import type { KMeansState } from '../../../algorithms/types'

interface KMeansVisualizerProps {
  state: KMeansState | null
}

// k 個のクラスターを識別するための色セット
const CLUSTER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6']

export function KMeansVisualizer({ state }: KMeansVisualizerProps) {
  // コンテナサイズを追跡し、Canvas のピクセル解像度を動的に決定する。
  // 他の SVG ビジュアライザーと違い Canvas は明示的なピクセルサイズが必要なため、
  // props 経由ではなくフック内で測定する。
  const { ref: containerRef, width: containerWidth, height: containerHeight } = useContainerSize(400, 400)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // デバイスピクセル比に合わせて Canvas の内部解像度を上げる（Retina 対応）
    const dpr = window.devicePixelRatio || 1
    const canvasSize = Math.min(containerWidth, containerHeight - 40)
    if (canvasSize <= 0) return

    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    canvas.style.width = `${canvasSize}px`
    canvas.style.height = `${canvasSize}px`
    ctx.scale(dpr, dpr)

    const pad = 24
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    // [0,1] 正規化座標を Canvas のピクセル座標に変換する
    const toCanvasX = (x: number) => pad + x * (canvasSize - pad * 2)
    const toCanvasY = (y: number) => pad + y * (canvasSize - pad * 2)

    // ポイントを描画
    for (const pt of state.points) {
      const color = pt.cluster !== null
        ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]
        : '#6b7280'

      ctx.fillStyle = color
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(toCanvasX(pt.x), toCanvasY(pt.y), 5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1

    // セントロイドが移動した場合、前の位置から現在位置への矢印を描く
    for (let ci = 0; ci < state.centroids.length; ci++) {
      const cent = state.centroids[ci]
      if (cent.prevX === undefined || cent.prevY === undefined) continue

      const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length]
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 2])
      ctx.beginPath()
      ctx.moveTo(toCanvasX(cent.prevX), toCanvasY(cent.prevY))
      ctx.lineTo(toCanvasX(cent.x), toCanvasY(cent.y))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    // セントロイドを × マークで描画（更新中のものは大きく強調表示）
    for (let ci = 0; ci < state.centroids.length; ci++) {
      const cent = state.centroids[ci]
      const cx = toCanvasX(cent.x)
      const cy = toCanvasY(cent.y)
      const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length]
      const isUpdated = state.updatedCentroid === ci
      const armLen = isUpdated ? 12 : 9

      ctx.strokeStyle = color
      ctx.lineWidth = isUpdated ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(cx - armLen, cy - armLen)
      ctx.lineTo(cx + armLen, cy + armLen)
      ctx.moveTo(cx + armLen, cy - armLen)
      ctx.lineTo(cx - armLen, cy + armLen)
      ctx.stroke()

      // 白い輪郭を付けて背景との視認性を高める
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, armLen + 4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [state, containerWidth, containerHeight])

  if (!state) {
    return (
      <div ref={containerRef} className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim">—</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col items-center justify-center gap-2">
      <canvas
        ref={canvasRef}
        className="rounded border border-dark-border dark:border-dark-border light:border-light-border"
      />
      <div className="flex gap-4 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        <span>iteration: <span className="text-dark-text dark:text-dark-text light:text-light-text">{state.iteration}</span></span>
        <span>phase: <span className="text-blue-400">{state.phase}</span></span>
        {state.converged && <span className="font-medium text-green-400">✓ converged</span>}
      </div>
    </div>
  )
}
