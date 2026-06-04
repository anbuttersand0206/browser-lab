import type { AlgorithmStep, LinearSearchState } from '../types'

export function* linearSearch(
  array: number[],
  target: number,
): Generator<AlgorithmStep<LinearSearchState>, void, never> {
  const arr = [...array]

  yield {
    state: { array: arr, target, current: -1, found: null, done: false },
    log: {
      ja: `配列内で値${target}を線形探索します`,
      en: `Starting linear search for value ${target}`,
    },
  }

  for (let i = 0; i < arr.length; i++) {
    yield {
      state: { array: arr, target, current: i, found: null, done: false },
      log: {
        ja: `インデックス${i}（値:${arr[i]}）を検査中...`,
        en: `Checking index ${i} (value: ${arr[i]})...`,
      },
    }

    if (arr[i] === target) {
      yield {
        state: { array: arr, target, current: i, found: i, done: true },
        log: {
          ja: `発見！インデックス${i}に値${target}が存在します`,
          en: `Found! Value ${target} is at index ${i}`,
        },
      }
      return
    }

    yield {
      state: { array: arr, target, current: i, found: null, done: false },
      log: {
        ja: `${arr[i]} ≠ ${target}: 次へ`,
        en: `${arr[i]} ≠ ${target}: move to next`,
      },
    }
  }

  yield {
    state: { array: arr, target, current: -1, found: null, done: true },
    log: {
      ja: `値${target}は配列内に存在しません`,
      en: `Value ${target} not found in the array`,
    },
  }
}
