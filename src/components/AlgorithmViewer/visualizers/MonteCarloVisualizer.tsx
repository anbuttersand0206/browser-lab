import { useRef, useEffect, useState } from 'react'
import type { MonteCarloState } from '../../../algorithms/types'

interface MonteCarloVisualizerProps {
  state: MonteCarloState | null
}

export function MonteCarloVisualizer({ state }: MonteCarloVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState(300)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const s = Math.min(width, height) - 60
      if (s > 50) setSize(s)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    // 背景
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, size, size)

    // 円（半径 = size/2）
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // ポイントを描画
    const r = size / 2
    for (const pt of state.points) {
      // pt.x, pt.y は [-1, 1] の範囲
      const px = (pt.x + 1) * r
      const py = (pt.y + 1) * r

      ctx.fillStyle = pt.inside ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.7)'
      ctx.beginPath()
      ctx.arc(px, py, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [state, size])

  const piEstimate = state?.piEstimate ?? 0
  const total = state?.total ?? 0
  const inside = state?.inside ?? 0
  const error = Math.abs(piEstimate - Math.PI)

  return (
    <div ref={containerRef} className="flex h-full flex-col items-center justify-center gap-4">
      <canvas ref={canvasRef} className="rounded border border-dark-border dark:border-dark-border light:border-light-border" />

      {/* π 推定値の表示 */}
      <div className="flex items-center gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-400">
            π ≈ {piEstimate.toFixed(5)}
          </div>
          <div className="mt-1 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            誤差 / Error: {error.toFixed(5)}
          </div>
        </div>
        <div className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          <div>total: <span className="text-dark-text dark:text-dark-text light:text-light-text">{total}</span></div>
          <div className="text-blue-400">inside: {inside}</div>
          <div className="text-red-400">outside: {total - inside}</div>
          <div className="mt-1 opacity-70">4 × {inside} / {total} = {piEstimate.toFixed(4)}</div>
        </div>
      </div>
    </div>
  )
}
