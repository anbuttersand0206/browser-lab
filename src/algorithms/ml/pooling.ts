import type { AlgorithmStep, PoolingState } from '../types'

const SAMPLE_INPUT: number[][] = [
  [1, 3, 2, 4, 5, 6],
  [7, 8, 1, 2, 3, 4],
  [2, 1, 9, 5, 6, 7],
  [4, 6, 3, 8, 1, 2],
  [5, 7, 4, 3, 9, 8],
  [8, 2, 6, 7, 4, 5],
]

export function* pooling(poolType: 'max' | 'avg', poolSize: number): Generator<AlgorithmStep<PoolingState>, void, never> {
  const input = SAMPLE_INPUT
  const rows = input.length
  const cols = input[0].length
  const stride = poolSize
  const outRows = Math.floor((rows - poolSize) / stride) + 1
  const outCols = Math.floor((cols - poolSize) / stride) + 1
  const output: (number | null)[][] = Array.from({ length: outRows }, () => Array(outCols).fill(null))

  yield {
    state: {
      input,
      output: output.map(r => [...r]),
      poolType,
      poolSize,
      currentRow: null,
      currentCol: null,
      highlight: [],
      outputValue: null,
    },
    log: {
      ja: `${poolType === 'max' ? 'Max' : 'Average'}プーリングを開始（${poolSize}×${poolSize}ウィンドウ）`,
      en: `Starting ${poolType === 'max' ? 'Max' : 'Average'} Pooling (${poolSize}×${poolSize} window)`,
    },
  }

  for (let r = 0; r < outRows; r++) {
    for (let c = 0; c < outCols; c++) {
      const highlight: [number, number][] = []
      const vals: number[] = []

      for (let pr = 0; pr < poolSize; pr++) {
        for (let pc = 0; pc < poolSize; pc++) {
          const ir = r * stride + pr
          const ic = c * stride + pc
          highlight.push([ir, ic])
          vals.push(input[ir][ic])
        }
      }

      yield {
        state: {
          input,
          output: output.map(row => [...row]),
          poolType,
          poolSize,
          currentRow: r,
          currentCol: c,
          highlight,
          outputValue: null,
        },
        log: {
          ja: `位置(${r},${c})のウィンドウ: [${vals.join(', ')}]`,
          en: `Window at (${r},${c}): [${vals.join(', ')}]`,
        },
      }

      const result =
        poolType === 'max'
          ? Math.max(...vals)
          : Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10

      output[r][c] = result

      yield {
        state: {
          input,
          output: output.map(row => [...row]),
          poolType,
          poolSize,
          currentRow: r,
          currentCol: c,
          highlight,
          outputValue: result,
        },
        log: {
          ja: `${poolType === 'max' ? '最大値' : '平均値'} = ${result}`,
          en: `${poolType === 'max' ? 'Max' : 'Average'} = ${result}`,
        },
      }
    }
  }

  yield {
    state: {
      input,
      output: output.map(r => [...r]),
      poolType,
      poolSize,
      currentRow: null,
      currentCol: null,
      highlight: [],
      outputValue: null,
    },
    log: {
      ja: 'プーリング完了！',
      en: 'Pooling complete!',
    },
  }
}
