import type { AlgorithmStep, BinarySearchState } from '../types'

export function* binarySearch(
  array: number[],
  target: number,
): Generator<AlgorithmStep<BinarySearchState>, void, never> {
  const arr = [...array].sort((a, b) => a - b)
  let left = 0
  let right = arr.length - 1

  yield {
    state: { array: arr, target, left, right, mid: null, found: null, done: false },
    log: {
      ja: `ソート済み配列で値${target}を二分探索します`,
      en: `Binary searching for value ${target} in sorted array`,
    },
  }

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)

    yield {
      state: { array: arr, target, left, right, mid, found: null, done: false },
      log: {
        ja: `範囲[${left}..${right}]の中央インデックス${mid}（値:${arr[mid]}）を検査`,
        en: `Checking middle index ${mid} (value: ${arr[mid]}) of range [${left}..${right}]`,
      },
    }

    if (arr[mid] === target) {
      yield {
        state: { array: arr, target, left, right, mid, found: mid, done: true },
        log: {
          ja: `発見！インデックス${mid}に値${target}が存在します`,
          en: `Found! Value ${target} is at index ${mid}`,
        },
      }
      return
    }

    if (arr[mid] < target) {
      yield {
        state: { array: arr, target, left, right, mid, found: null, done: false },
        log: {
          ja: `${arr[mid]} < ${target}: 右半分を探索`,
          en: `${arr[mid]} < ${target}: search right half`,
        },
      }
      left = mid + 1
    } else {
      yield {
        state: { array: arr, target, left, right, mid, found: null, done: false },
        log: {
          ja: `${arr[mid]} > ${target}: 左半分を探索`,
          en: `${arr[mid]} > ${target}: search left half`,
        },
      }
      right = mid - 1
    }
  }

  yield {
    state: { array: arr, target, left, right, mid: null, found: null, done: true },
    log: {
      ja: `値${target}は配列内に存在しません`,
      en: `Value ${target} not found in the array`,
    },
  }
}
