import type { AlgorithmStep, ScatterState, ScatterPoint } from '../types'

// SVM（サポートベクターマシン）: マージン最大化超平面でデータを分類する。
// ここでは確率的勾配降下法（SGD）によるヒンジ損失最小化で線形 SVM を学習する。
// 決定境界 w・x + b = 0 を学習し、サポートベクター（境界に最も近い点）を特定する。
function generateLinearData(seed: number): ScatterPoint[] {
  // 線形分離可能な2クラスデータを生成する（疑似乱数）
  let s = seed
  function rand(): number {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }

  const points: ScatterPoint[] = []
  for (let i = 0; i < 20; i++) {
    const label = i < 10 ? 0 : 1
    const cx = label === 0 ? 0.3 : 0.7
    const cy = label === 0 ? 0.3 : 0.7
    points.push({
      x: cx + (rand() - 0.5) * 0.3,
      y: cy + (rand() - 0.5) * 0.3,
      label,
    })
  }
  return points
}

function generateCirclesData(seed: number): ScatterPoint[] {
  let s = seed
  function rand(): number {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }

  const points: ScatterPoint[] = []
  for (let i = 0; i < 24; i++) {
    const angle = rand() * Math.PI * 2
    const r = i < 12 ? 0.15 + rand() * 0.1 : 0.3 + rand() * 0.1
    points.push({
      x: 0.5 + r * Math.cos(angle),
      y: 0.5 + r * Math.sin(angle),
      label: i < 12 ? 0 : 1,
    })
  }
  return points
}

export function* svm(dataType: 'linearlySeparable' | 'circles'): Generator<AlgorithmStep<ScatterState>, void, never> {
  const points = dataType === 'linearlySeparable'
    ? generateLinearData(42)
    : generateCirclesData(42)

  // 線形 SVM は線形分離可能なデータにのみ有効。circles はノイズ付きで示す。
  // SVM パラメーター: w = [w1, w2], b (バイアス)
  let w: [number, number] = [0, 0]
  let b = 0
  const C = 1.0      // 正則化パラメーター（余裕のトレードオフ）
  const lr = 0.01    // 学習率
  const EPOCHS = 30

  function predict(x: number, y: number): number {
    return w[0] * x + w[1] * y + b
  }

  function mkState(currentIdx: number | null, iter: number, svmPhase: string, done = false): ScatterState {
    // サポートベクター: 決定境界からの距離がマージン以内の点
    const margin = w[0] !== 0 || w[1] !== 0
      ? 1 / Math.sqrt(w[0] ** 2 + w[1] ** 2)
      : 0

    const pts: ScatterPoint[] = points.map(p => ({
      ...p,
      isSupportVector: Math.abs(predict(p.x, p.y)) <= margin + 0.15,
    }))

    return {
      points: pts,
      weights: [w[0], w[1]],
      bias: b,
      margin,
      currentPointIndex: currentIdx ?? undefined,
      iteration: iter,
      svmPhase,
      done,
    }
  }

  yield {
    state: mkState(null, 0, 'init'),
    log: {
      ja: `SVM 学習開始。${points.length} 個の点、C=${C}、学習率=${lr}。`,
      en: `SVM training started. ${points.length} points, C=${C}, lr=${lr}.`,
    },
  }

  // SGD でヒンジ損失を最小化する
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    let totalLoss = 0

    for (let pi = 0; pi < points.length; pi++) {
      const p = points[pi]
      // ラベルを +1 / -1 に変換（SVM の慣習）
      const yi = p.label === 1 ? 1 : -1
      const score = predict(p.x, p.y)
      const hingeLoss = Math.max(0, 1 - yi * score)
      totalLoss += hingeLoss

      if (epoch % 5 === 0 && pi === 0) {
        yield {
          state: mkState(pi, epoch, 'training'),
          log: {
            ja: `エポック ${epoch + 1}: 点 ${pi} 処理中。スコア=${score.toFixed(3)}, ヒンジ損失=${hingeLoss.toFixed(3)}`,
            en: `Epoch ${epoch + 1}: point ${pi}. score=${score.toFixed(3)}, hinge=${hingeLoss.toFixed(3)}`,
          },
        }
      }

      if (hingeLoss > 0) {
        // ヒンジ損失が正のとき重みを更新する（誤分類または余裕不足）
        w[0] = w[0] - lr * (w[0] - C * yi * p.x)
        w[1] = w[1] - lr * (w[1] - C * yi * p.y)
        b = b + lr * C * yi
      } else {
        // 正しく分類されている場合は正則化のみ
        w[0] = w[0] * (1 - lr)
        w[1] = w[1] * (1 - lr)
      }
    }

    if (epoch % 10 === 9) {
      yield {
        state: mkState(null, epoch + 1, 'training'),
        log: {
          ja: `エポック ${epoch + 1} 完了。総損失=${totalLoss.toFixed(3)}、w=[${w[0].toFixed(3)}, ${w[1].toFixed(3)}], b=${b.toFixed(3)}`,
          en: `Epoch ${epoch + 1} done. Loss=${totalLoss.toFixed(3)}, w=[${w[0].toFixed(3)}, ${w[1].toFixed(3)}], b=${b.toFixed(3)}`,
        },
      }
    }
  }

  yield {
    state: mkState(null, EPOCHS, 'done', true),
    log: {
      ja: `学習完了！決定境界: ${w[0].toFixed(3)}x + ${w[1].toFixed(3)}y + ${b.toFixed(3)} = 0`,
      en: `Training done! Decision boundary: ${w[0].toFixed(3)}x + ${w[1].toFixed(3)}y + ${b.toFixed(3)} = 0`,
    },
  }
}
