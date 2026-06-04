import type { AlgorithmStep, ConvState } from '../types'

// 6×6 のサンプル入力画像（エッジが入るようなパターン）
const SAMPLE_INPUT: number[][] = [
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 8, 8, 8, 0],
  [0, 0, 8, 8, 8, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
]

const KERNELS: Record<string, number[][]> = {
  edge: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
  blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => +(v / 9).toFixed(2))),
  sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
}

export function* convolution(kernelType: 'edge' | 'blur' | 'sharpen'): Generator<AlgorithmStep<ConvState>, void, never> {
  const input = SAMPLE_INPUT
  const kernel = KERNELS[kernelType]
  const kSize = kernel.length
  const rows = input.length
  const cols = input[0].length
  const outRows = rows - kSize + 1
  const outCols = cols - kSize + 1
  const output: (number | null)[][] = Array.from({ length: outRows }, () => Array(outCols).fill(null))

  const kernelNames = { edge: 'エッジ検出', blur: 'ブラー（平滑化）', sharpen: 'シャープ化' }
  const kernelNamesEn = { edge: 'Edge Detection', blur: 'Blur (Smoothing)', sharpen: 'Sharpening' }

  yield {
    state: {
      input,
      kernel,
      output: output.map(r => [...r]),
      currentRow: null,
      currentCol: null,
      inputHighlight: [],
      outputValue: null,
    },
    log: {
      ja: `${kernelNames[kernelType]}カーネルで畳み込みを開始します（${kSize}×${kSize}カーネル）`,
      en: `Starting convolution with ${kernelNamesEn[kernelType]} kernel (${kSize}×${kSize})`,
    },
  }

  for (let r = 0; r < outRows; r++) {
    for (let c = 0; c < outCols; c++) {
      const inputHighlight: [number, number][] = []
      let sum = 0

      for (let kr = 0; kr < kSize; kr++) {
        for (let kc = 0; kc < kSize; kc++) {
          const ir = r + kr, ic = c + kc
          inputHighlight.push([ir, ic])
          sum += input[ir][ic] * kernel[kr][kc]
        }
      }

      const clipped = Math.max(0, Math.min(255, Math.round(sum)))

      yield {
        state: {
          input,
          kernel,
          output: output.map(row => [...row]),
          currentRow: r,
          currentCol: c,
          inputHighlight,
          outputValue: clipped,
        },
        log: {
          ja: `出力(${r},${c})を計算: カーネルと入力の要素積の和 = ${clipped}`,
          en: `Computing output(${r},${c}): sum of element-wise products = ${clipped}`,
        },
      }

      output[r][c] = clipped

      yield {
        state: {
          input,
          kernel,
          output: output.map(row => [...row]),
          currentRow: r,
          currentCol: c,
          inputHighlight: [],
          outputValue: null,
        },
        log: {
          ja: `出力(${r},${c}) = ${clipped} を確定`,
          en: `Output(${r},${c}) = ${clipped} confirmed`,
        },
      }
    }
  }

  yield {
    state: {
      input,
      kernel,
      output: output.map(r => [...r]),
      currentRow: null,
      currentCol: null,
      inputHighlight: [],
      outputValue: null,
    },
    log: {
      ja: '畳み込み完了！特徴マップが生成されました',
      en: 'Convolution complete! Feature map generated',
    },
  }
}
