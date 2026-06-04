import type { AlgorithmStep, MonteCarloState } from '../types'

// 線形合同法によるシード付き乱数生成器。
// Math.random() を使わない理由: 同じ点群を再現可能にするため。
// シードを固定することで、「リセット後に同じアニメーションが流れる」体験を保証できる。
function createSeededRng(seed: number) {
  let state = seed
  return function nextRandom() {
    state = (state * 1664525 + 1013904223) & 0xffffffff
    return (state >>> 0) / 0xffffffff
  }
}

// モンテカルロ法: 単位正方形内にランダムな点を打ち、円内に入る割合からπを推定する。
// 円内判定: x² + y² ≤ 1（半径 1 の円）
// 推定式: π ≈ 4 × (円内の点数) / (全点数)
export function* monteCarlo(numPoints: number): Generator<AlgorithmStep<MonteCarloState>, void, never> {
  const rng = createSeededRng(42)
  const points: MonteCarloState['points'] = []
  let insideCount = 0

  yield {
    state: { points: [], piEstimate: 0, total: 0, inside: 0 },
    log: {
      ja: `モンテカルロ法でπを推定します（${numPoints}点）`,
      en: `Estimating π using Monte Carlo method (${numPoints} points)`,
    },
  }

  for (let i = 0; i < numPoints; i++) {
    // 点を [-1, 1] × [-1, 1] の正方形内に一様分布させる
    const x = rng() * 2 - 1
    const y = rng() * 2 - 1
    const isInsideCircle = x * x + y * y <= 1
    if (isInsideCircle) insideCount++

    points.push({ x, y, inside: isInsideCircle })

    const totalSoFar = i + 1
    const piEstimate = (4 * insideCount) / totalSoFar

    // 全点数分の yield はステップ数が多すぎてログが読めなくなるため間引く。
    // 最初の 20 点は 1 点ずつ、以降は 50 点ごと、最後の点は必ず表示する。
    const shouldYieldThisStep = totalSoFar <= 20 || totalSoFar % 50 === 0 || totalSoFar === numPoints
    if (!shouldYieldThisStep) continue

    yield {
      state: { points: [...points], piEstimate, total: totalSoFar, inside: insideCount },
      log: {
        ja: `${totalSoFar}点プロット: 円内${insideCount}点, π≈${piEstimate.toFixed(4)}`,
        en: `${totalSoFar} points: ${insideCount} inside circle, π≈${piEstimate.toFixed(4)}`,
      },
    }
  }

  const finalPiEstimate = (4 * insideCount) / numPoints
  yield {
    state: { points: [...points], piEstimate: finalPiEstimate, total: numPoints, inside: insideCount },
    log: {
      ja: `完了！推定値 π≈${finalPiEstimate.toFixed(6)}（誤差: ${Math.abs(finalPiEstimate - Math.PI).toFixed(6)}）`,
      en: `Done! Estimated π≈${finalPiEstimate.toFixed(6)} (error: ${Math.abs(finalPiEstimate - Math.PI).toFixed(6)})`,
    },
  }
}
