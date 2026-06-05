import type { AlgorithmStep, ScatterState, ScatterPoint } from '../types'

// PCA（主成分分析）: 分散が最大になる方向（主成分）を求めることで
// データの次元を削減する教師なし学習アルゴリズム。
// ここでは 2D データの主成分（2 方向）を固有値分解で求める過程を可視化する。
export function* pca(dataType: 'linearlySeparable' | 'circles'): Generator<AlgorithmStep<ScatterState>, void, never> {
  // 楕円形に分布するデータを生成する（主成分が明確に出る形状）
  function generateData(seed: number): ScatterPoint[] {
    let s = seed
    function rand(): number {
      s = (s * 1664525 + 1013904223) & 0xffffffff
      return (s >>> 0) / 0xffffffff
    }

    const points: ScatterPoint[] = []
    for (let i = 0; i < 30; i++) {
      // 正規分布の近似（Box-Muller 変換）
      const u1 = rand(), u2 = rand()
      const z1 = Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2)
      const z2 = Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.sin(2 * Math.PI * u2)

      // 主成分が明確になるよう、x 方向に大きな分散、y 方向に小さな分散を持たせる
      const rawX = z1 * 0.25 + z2 * 0.08
      const rawY = z1 * 0.05 + z2 * 0.12

      // 45 度回転して主成分の方向を斜めにする（視覚的に分かりやすくするため）
      const angle = Math.PI / 4
      points.push({
        x: 0.5 + rawX * Math.cos(angle) - rawY * Math.sin(angle),
        y: 0.5 + rawX * Math.sin(angle) + rawY * Math.cos(angle),
        label: i < 15 ? 0 : 1,
      })
    }
    return points
  }

  const points = generateData(dataType === 'linearlySeparable' ? 42 : 99)
  const n = points.length

  function mkState(
    mean: [number, number] | undefined,
    pc1: [number, number] | undefined,
    pc2: [number, number] | undefined,
    explained1: number | undefined,
    explained2: number | undefined,
    pcaPhase: string,
    done = false,
  ): ScatterState {
    return {
      points: [...points],
      mean, pc1, pc2,
      explained1, explained2,
      pcaPhase,
      done,
    }
  }

  yield {
    state: mkState(undefined, undefined, undefined, undefined, undefined, 'init'),
    log: {
      ja: `PCA（主成分分析）開始。${n} 個のデータ点から主成分を求めます。`,
      en: `PCA started. Finding principal components of ${n} data points.`,
    },
  }

  // 1. 平均を計算する
  const meanX = points.reduce((s, p) => s + p.x, 0) / n
  const meanY = points.reduce((s, p) => s + p.y, 0) / n

  yield {
    state: mkState([meanX, meanY], undefined, undefined, undefined, undefined, 'mean'),
    log: {
      ja: `ステップ 1: 平均を計算。μ = (${meanX.toFixed(3)}, ${meanY.toFixed(3)})`,
      en: `Step 1: Compute mean μ = (${meanX.toFixed(3)}, ${meanY.toFixed(3)})`,
    },
  }

  // 2. 中心化（平均を引く）と共分散行列の計算
  const cXX = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0) / (n - 1)
  const cYY = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0) / (n - 1)
  const cXY = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0) / (n - 1)

  yield {
    state: mkState([meanX, meanY], undefined, undefined, undefined, undefined, 'covariance'),
    log: {
      ja: `ステップ 2: 共分散行列 [[${cXX.toFixed(3)}, ${cXY.toFixed(3)}], [${cXY.toFixed(3)}, ${cYY.toFixed(3)}]]`,
      en: `Step 2: Covariance matrix [[${cXX.toFixed(3)}, ${cXY.toFixed(3)}], [${cXY.toFixed(3)}, ${cYY.toFixed(3)}]]`,
    },
  }

  // 3. 固有値・固有ベクトルを解析的に計算する（2×2 行列の閉形式）
  const trace = cXX + cYY
  const det = cXX * cYY - cXY * cXY
  const disc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det))
  const lambda1 = trace / 2 + disc  // 第 1 固有値（大）
  const lambda2 = trace / 2 - disc  // 第 2 固有値（小）
  const totalVar = lambda1 + lambda2

  // 固有ベクトルの方向を計算する
  let v1x: number, v1y: number, v2x: number, v2y: number
  if (Math.abs(cXY) > 1e-10) {
    const len1 = Math.sqrt((lambda1 - cYY) ** 2 + cXY ** 2)
    v1x = (lambda1 - cYY) / len1
    v1y = cXY / len1
    v2x = -v1y
    v2y = v1x
  } else {
    // 対角行列の場合は標準基底が固有ベクトル
    v1x = cXX >= cYY ? 1 : 0; v1y = cXX >= cYY ? 0 : 1
    v2x = 1 - v1x; v2y = 1 - v1y
  }

  const explained1 = lambda1 / totalVar
  const explained2 = lambda2 / totalVar

  // 可視化用にスケールをかける（表示範囲に合わせる）
  const scale = 0.2
  const pc1: [number, number] = [v1x * scale * (lambda1 / lambda1), v1y * scale]
  const pc2: [number, number] = [v2x * scale * (lambda2 / lambda1), v2y * scale * (lambda2 / lambda1)]

  yield {
    state: mkState([meanX, meanY], pc1, pc2, explained1, explained2, 'eigenvectors'),
    log: {
      ja: `ステップ 3: 固有値 λ1=${lambda1.toFixed(3)}, λ2=${lambda2.toFixed(3)}。PC1 寄与率: ${(explained1 * 100).toFixed(1)}%`,
      en: `Step 3: Eigenvalues λ1=${lambda1.toFixed(3)}, λ2=${lambda2.toFixed(3)}. PC1 explains ${(explained1 * 100).toFixed(1)}%`,
    },
  }

  yield {
    state: mkState([meanX, meanY], pc1, pc2, explained1, explained2, 'done', true),
    log: {
      ja: `完了！PC1（${(explained1 * 100).toFixed(1)}%）が最大分散方向。矢印がデータの広がり方向を示します。`,
      en: `Done! PC1 (${(explained1 * 100).toFixed(1)}%) is the max variance direction. Arrows show spread directions.`,
    },
  }
}
