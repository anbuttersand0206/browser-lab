import type { AlgorithmStep, PerceptronState, TrainSample } from '../types'

const TRAINING_DATA: Record<string, TrainSample[]> = {
  and: [
    { inputs: [0, 0], target: 0 },
    { inputs: [0, 1], target: 0 },
    { inputs: [1, 0], target: 0 },
    { inputs: [1, 1], target: 1 },
  ],
  or: [
    { inputs: [0, 0], target: 0 },
    { inputs: [0, 1], target: 1 },
    { inputs: [1, 0], target: 1 },
    { inputs: [1, 1], target: 1 },
  ],
  nand: [
    { inputs: [0, 0], target: 1 },
    { inputs: [0, 1], target: 1 },
    { inputs: [1, 0], target: 1 },
    { inputs: [1, 1], target: 0 },
  ],
}

// ヘビサイドのステップ関数（閾値活性化関数）。
// パーセプトロンの出力を 0/1 に二値化する。
// 関数名を step にしなかったのは、ジェネレーターの .next() と混同を避けるため。
function heavisideActivate(x: number): 0 | 1 {
  return x >= 0 ? 1 : 0
}

// パーセプトロン: 入力に重みをかけて合計し、閾値関数で 0/1 を出力する最小の神経回路。
// 誤差がある場合に重みとバイアスを δ 学習則で更新し、線形分離可能なゲートを学習する。
export function* perceptron(
  dataType: 'and' | 'or' | 'nand',
  learningRate: number,
): Generator<AlgorithmStep<PerceptronState>, void, never> {
  const trainingData = TRAINING_DATA[dataType]
  const inputCount = trainingData[0].inputs.length

  // 重みをすべて 0 で初期化する。ランダム初期化も可能だが、
  // 再現性のある可視化のために 0 固定とした。
  let weights = Array<number>(inputCount).fill(0)
  let bias = 0
  let epoch = 0

  const mkState = (overrides: Partial<PerceptronState> = {}): PerceptronState => ({
    weights: [...weights],
    bias,
    learningRate,
    sampleIndex: 0,
    trainingData,
    inputs: [],
    target: 0,
    weightedSum: null,
    output: null,
    error: null,
    weightDeltas: null,
    epoch,
    done: false,
    ...overrides,
  })

  const gateLabel = { and: 'AND', or: 'OR', nand: 'NAND' }
  yield {
    state: mkState(),
    log: {
      ja: `${gateLabel[dataType]}ゲートを学習するパーセプトロンを開始`,
      en: `Starting perceptron to learn ${gateLabel[dataType]} gate`,
    },
  }

  // XOR のような線形分離不可能な問題は単層パーセプトロンでは学習できない。
  // AND / OR / NAND は線形分離可能なので 50 エポック以内に必ず収束する。
  const MAX_EPOCHS = 50

  while (epoch < MAX_EPOCHS) {
    epoch++
    let isAllCorrect = true

    for (let sampleIdx = 0; sampleIdx < trainingData.length; sampleIdx++) {
      const { inputs, target } = trainingData[sampleIdx]

      const weightedSum = inputs.reduce((sum, x, i) => sum + x * weights[i], 0) + bias
      const output = heavisideActivate(weightedSum)
      const predictionError = target - output

      yield {
        state: mkState({
          sampleIndex: sampleIdx,
          inputs,
          target,
          weightedSum,
          output,
          error: predictionError,
          weightDeltas: null,
        }),
        log: {
          ja: `エポック${epoch} サンプル${sampleIdx + 1}: 入力[${inputs.join(',')}], 重み付き和=${weightedSum.toFixed(2)}, 出力=${output}, 目標=${target}, 誤差=${predictionError}`,
          en: `Epoch ${epoch} Sample ${sampleIdx + 1}: inputs=[${inputs.join(',')}], weighted sum=${weightedSum.toFixed(2)}, output=${output}, target=${target}, error=${predictionError}`,
        },
      }

      if (predictionError !== 0) {
        isAllCorrect = false

        // δ 学習則: Δw_i = lr × error × x_i
        const weightDeltas = inputs.map(x => learningRate * predictionError * x)
        weights = weights.map((w, i) => w + weightDeltas[i])
        bias += learningRate * predictionError

        yield {
          state: mkState({
            sampleIndex: sampleIdx,
            inputs,
            target,
            weightedSum,
            output,
            error: predictionError,
            weightDeltas,
          }),
          log: {
            ja: `重みを更新: Δw=[${weightDeltas.map(d => d.toFixed(2)).join(',')}], 新しい重み=[${weights.map(w => w.toFixed(2)).join(',')}]`,
            en: `Updating weights: Δw=[${weightDeltas.map(d => d.toFixed(2)).join(',')}], new weights=[${weights.map(w => w.toFixed(2)).join(',')}]`,
          },
        }
      }
    }

    if (isAllCorrect) {
      yield {
        state: mkState({ done: true }),
        log: {
          ja: `エポック${epoch}で収束！${gateLabel[dataType]}ゲートの学習完了`,
          en: `Converged at epoch ${epoch}! ${gateLabel[dataType]} gate learned successfully`,
        },
      }
      return
    }
  }

  yield {
    state: mkState({ done: true }),
    log: {
      ja: `最大エポック数（${MAX_EPOCHS}）に達しました`,
      en: `Reached maximum epochs (${MAX_EPOCHS})`,
    },
  }
}
