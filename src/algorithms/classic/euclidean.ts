import type { AlgorithmStep, EuclidState, EuclidRect } from '../types'

const COLORS = ['#4f8ef7', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b']

export function* euclidean(initialA: number, initialB: number): Generator<AlgorithmStep<EuclidState>, void, never> {
  const rects: EuclidRect[] = []
  let a = initialA
  let b = initialB
  let colorIdx = 0

  // 矩形をSVG空間にマッピングするためのスケール（仮: 後でビュワー側でスケール計算）
  // ここでは「単位長さ」ベースで座標を持ち、レンダラー側でスケール適用
  let x = 0
  let y = 0
  let horizontal = true  // 分割方向を交互に変える

  const mkState = (): EuclidState => ({
    initialA,
    initialB,
    a,
    b,
    rects: rects.map(r => ({ ...r })),
    gcd: null,
    done: false,
  })

  yield {
    state: mkState(),
    log: {
      ja: `GCD(${initialA}, ${initialB}) をユークリッド互除法で計算します`,
      en: `Computing GCD(${initialA}, ${initialB}) using Euclidean algorithm`,
    },
  }

  while (b !== 0) {
    const quotient = Math.floor(a / b)
    const remainder = a % b

    yield {
      state: mkState(),
      log: {
        ja: `${a} ÷ ${b} = ${quotient} 余り ${remainder}`,
        en: `${a} ÷ ${b} = ${quotient} remainder ${remainder}`,
      },
    }

    // 正方形を quotient 個並べる
    for (let q = 0; q < quotient; q++) {
      rects.push({
        x: horizontal ? x + q * b : x,
        y: horizontal ? y : y + q * b,
        w: b,
        h: b,
        isSquare: true,
        color: COLORS[colorIdx % COLORS.length],
      })

      yield {
        state: mkState(),
        log: {
          ja: `${b}×${b} の正方形を配置（${q + 1}/${quotient}個目）`,
          en: `Placing ${b}×${b} square (${q + 1}/${quotient})`,
        },
      }
    }

    if (remainder > 0) {
      // 余りの矩形
      rects.push({
        x: horizontal ? x + quotient * b : x,
        y: horizontal ? y : y + quotient * b,
        w: horizontal ? remainder : b,
        h: horizontal ? b : remainder,
        isSquare: false,
        color: COLORS[(colorIdx + 1) % COLORS.length],
      })
    }

    // 次のステップで処理する矩形の左上角を更新
    if (horizontal) {
      x += quotient * b
    } else {
      y += quotient * b
    }
    horizontal = !horizontal
    colorIdx++

    yield {
      state: { ...mkState() },
      log: {
        ja: `GCD(${a}, ${b}) → GCD(${b}, ${remainder})`,
        en: `GCD(${a}, ${b}) → GCD(${b}, ${remainder})`,
      },
    }

    a = b
    b = remainder
  }

  yield {
    state: {
      initialA,
      initialB,
      a,
      b,
      rects: rects.map(r => ({ ...r })),
      gcd: a,
      done: true,
    },
    log: {
      ja: `GCD(${initialA}, ${initialB}) = ${a}（余りが0になりました）`,
      en: `GCD(${initialA}, ${initialB}) = ${a} (remainder reached 0)`,
    },
  }
}
