import type { AlgorithmStep, KMeansState } from '../types'

// 線形合同法によるシード付き乱数生成器。
// 再現性のあるデモデータを生成するため Math.random() の代わりに使う。
function createSeededRng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff
    return (state >>> 0) / 0xffffffff
  }
}

function euclideanDistance(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}

// K-Means クラスタリング: 反復的にセントロイドを更新してデータを k クラスターに分類する。
// 収束保証はないが、実用的にはほぼ常に局所最適解に収束する。
export function* kmeans(k: number, numPoints: number, seed: number): Generator<AlgorithmStep<KMeansState>, void, never> {
  const rng = createSeededRng(seed)

  // 教育用デモとして「k 個のクラスター周辺に点を散布する」データを生成する。
  // 完全ランダムな配置だと収束が分かりにくいため、意図的にクラスター構造を持たせた。
  const trueClusterCenters = Array.from({ length: k }, (_, i) => ({
    x: 0.15 + (i % Math.ceil(Math.sqrt(k))) * (0.7 / Math.max(1, Math.ceil(Math.sqrt(k)) - 1)),
    y: 0.15 + Math.floor(i / Math.ceil(Math.sqrt(k))) * 0.7,
  }))

  const points: KMeansState['points'] = []
  for (let i = 0; i < numPoints; i++) {
    const center = trueClusterCenters[i % k]
    points.push({
      x: Math.max(0.05, Math.min(0.95, center.x + (rng() - 0.5) * 0.3)),
      y: Math.max(0.05, Math.min(0.95, center.y + (rng() - 0.5) * 0.3)),
      cluster: null,
    })
  }

  // 初期セントロイドは Forgy 法（既存の点をランダム選択）で決める。
  // k-means++ のような高度な初期化は教育目的のデモでは不要と判断した。
  const centroidSourceIndices = new Set<number>()
  while (centroidSourceIndices.size < k) {
    centroidSourceIndices.add(Math.floor(rng() * numPoints))
  }

  const centroids: KMeansState['centroids'] = [...centroidSourceIndices].map(idx => ({
    x: points[idx].x,
    y: points[idx].y,
  }))

  const mkState = (
    phase: KMeansState['phase'],
    updatedCentroid: number | null,
    iteration: number,
    converged: boolean,
  ): KMeansState => ({
    points: points.map(p => ({ ...p })),
    centroids: centroids.map(c => ({ ...c })),
    iteration,
    phase,
    updatedCentroid,
    converged,
  })

  yield {
    state: mkState('init', null, 0, false),
    log: {
      ja: `K-Means開始: k=${k}, ${numPoints}点, セントロイドをランダム初期化`,
      en: `K-Means start: k=${k}, ${numPoints} points, random centroid initialization`,
    },
  }

  // 収束しない場合の安全弁。実用的に 20 回で十分収束する。
  const MAX_ITERATIONS = 20

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    // 割り当てフェーズ: 各点を最近傍セントロイドに割り当てる
    let hasAssignmentChanged = false

    for (const point of points) {
      let nearestCluster = 0
      let minDistance = Infinity

      for (let c = 0; c < centroids.length; c++) {
        const dist = euclideanDistance(point.x, point.y, centroids[c].x, centroids[c].y)
        if (dist < minDistance) {
          minDistance = dist
          nearestCluster = c
        }
      }

      if (point.cluster !== nearestCluster) {
        point.cluster = nearestCluster
        hasAssignmentChanged = true
      }
    }

    yield {
      state: mkState('assign', null, iteration, false),
      log: {
        ja: `イテレーション${iteration}: 各点を最近傍セントロイドに割り当て`,
        en: `Iteration ${iteration}: Assigned each point to nearest centroid`,
      },
    }

    // 割り当てが変わらなければ収束
    if (!hasAssignmentChanged && iteration > 1) {
      yield {
        state: mkState('assign', null, iteration, true),
        log: {
          ja: '収束！割り当てが変化しませんでした',
          en: 'Converged! No assignment changes',
        },
      }
      return
    }

    // 更新フェーズ: 各セントロイドをそのクラスターの重心に移動する
    for (let c = 0; c < centroids.length; c++) {
      const clusterPoints = points.filter(p => p.cluster === c)
      if (clusterPoints.length === 0) continue

      const prevX = centroids[c].x
      const prevY = centroids[c].y

      centroids[c] = {
        x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length,
        y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length,
        prevX,
        prevY,
      }

      yield {
        state: mkState('update', c, iteration, false),
        log: {
          ja: `セントロイド${c + 1}を更新: (${prevX.toFixed(2)},${prevY.toFixed(2)}) → (${centroids[c].x.toFixed(2)},${centroids[c].y.toFixed(2)})`,
          en: `Centroid ${c + 1} updated: (${prevX.toFixed(2)},${prevY.toFixed(2)}) → (${centroids[c].x.toFixed(2)},${centroids[c].y.toFixed(2)})`,
        },
      }
    }
  }

  yield {
    state: mkState('update', null, MAX_ITERATIONS, true),
    log: {
      ja: `最大イテレーション数（${MAX_ITERATIONS}）に達しました`,
      en: `Reached maximum iterations (${MAX_ITERATIONS})`,
    },
  }
}
