// アルゴリズムのメタデータと、アルゴリズム ID からジェネレーターを生成するファクトリを集約する。
// アルゴリズムの追加は ALGORITHMS 配列と createGenerator の switch に 1 行ずつ追加するだけで完結する。

import type {
  AlgorithmConfig, AlgorithmStep, GridConfig, SortConfig, ArraySearchConfig,
  HanoiConfig, FibConfig, EuclidConfig, MonteCarloConfig,
  ConvConfig, PoolingConfig, KMeansConfig, PerceptronConfig,
} from './types'
import { bubbleSort } from './sort/bubbleSort'
import { selectionSort } from './sort/selectionSort'
import { insertionSort } from './sort/insertionSort'
import { mergeSort } from './sort/mergeSort'
import { quickSort } from './sort/quickSort'
import { heapSort } from './sort/heapSort'
import { linearSearch } from './search/linearSearch'
import { binarySearch } from './search/binarySearch'
import { bfsSearch } from './search/bfsSearch'
import { dfsSearch } from './search/dfsSearch'
import { astarSearch } from './search/astarSearch'
import { hanoi } from './classic/hanoi'
import { fibonacci } from './classic/fibonacci'
import { euclidean } from './classic/euclidean'
import { monteCarlo } from './classic/montecarlo'
import { convolution } from './ml/convolution'
import { pooling } from './ml/pooling'
import { kmeans } from './ml/kmeans'
import { perceptron } from './ml/perceptron'

export type AlgorithmId =
  | 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap'
  | 'linear' | 'binary' | 'bfs' | 'dfs' | 'astar'
  | 'hanoi' | 'fibonacci' | 'euclidean' | 'montecarlo'
  | 'convolution' | 'pooling' | 'kmeans' | 'perceptron'

export type AlgorithmCategory = 'sort' | 'search' | 'classic' | 'ml'

// ビジュアライザーコンポーネントとアルゴリズムを対応させるための識別子。
// 同じ visualizerType を持つアルゴリズムは同じコンポーネントで描画される（例: BFS・DFS・A* は全て 'grid'）。
export type VisualizerType =
  | 'sort'
  | 'linearSearch'
  | 'binarySearch'
  | 'grid'
  | 'hanoi'
  | 'fibonacci'
  | 'euclidean'
  | 'montecarlo'
  | 'convolution'
  | 'pooling'
  | 'kmeans'
  | 'perceptron'

export interface AlgorithmMeta {
  id: AlgorithmId
  category: AlgorithmCategory
  visualizerType: VisualizerType
  complexities: {
    best: string
    average: string
    worst: string
    space: string
  }
}

export const ALGORITHMS: AlgorithmMeta[] = [
  { id: 'bubble',     category: 'sort',    visualizerType: 'sort',         complexities: { best: 'O(n)',       average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'selection',  category: 'sort',    visualizerType: 'sort',         complexities: { best: 'O(n²)',      average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'insertion',  category: 'sort',    visualizerType: 'sort',         complexities: { best: 'O(n)',       average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'merge',      category: 'sort',    visualizerType: 'sort',         complexities: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' } },
  { id: 'quick',      category: 'sort',    visualizerType: 'sort',         complexities: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)',       space: 'O(log n)' } },
  { id: 'heap',       category: 'sort',    visualizerType: 'sort',         complexities: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' } },
  { id: 'linear',     category: 'search',  visualizerType: 'linearSearch', complexities: { best: 'O(1)',       average: 'O(n)',       worst: 'O(n)',       space: 'O(1)' } },
  { id: 'binary',     category: 'search',  visualizerType: 'binarySearch', complexities: { best: 'O(1)',       average: 'O(log n)',   worst: 'O(log n)',   space: 'O(1)' } },
  { id: 'bfs',        category: 'search',  visualizerType: 'grid',         complexities: { best: 'O(1)',       average: 'O(V+E)',     worst: 'O(V+E)',     space: 'O(V)' } },
  { id: 'dfs',        category: 'search',  visualizerType: 'grid',         complexities: { best: 'O(1)',       average: 'O(V+E)',     worst: 'O(V+E)',     space: 'O(V)' } },
  { id: 'astar',      category: 'search',  visualizerType: 'grid',         complexities: { best: 'O(1)',       average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)' } },
  { id: 'hanoi',      category: 'classic', visualizerType: 'hanoi',        complexities: { best: 'O(2ⁿ)',     average: 'O(2ⁿ)',     worst: 'O(2ⁿ)',     space: 'O(n)' } },
  { id: 'fibonacci',  category: 'classic', visualizerType: 'fibonacci',    complexities: { best: 'O(n)',       average: 'O(n)',       worst: 'O(2ⁿ)※',    space: 'O(n)' } },
  { id: 'euclidean',  category: 'classic', visualizerType: 'euclidean',    complexities: { best: 'O(1)',       average: 'O(log n)',   worst: 'O(log n)',   space: 'O(1)' } },
  { id: 'montecarlo', category: 'classic', visualizerType: 'montecarlo',   complexities: { best: '—',          average: 'O(n)',       worst: 'O(n)',       space: 'O(n)' } },
  { id: 'convolution',category: 'ml',      visualizerType: 'convolution',   complexities: { best: 'O(n²k²)',   average: 'O(n²k²)',   worst: 'O(n²k²)',   space: 'O(n²)' } },
  { id: 'pooling',    category: 'ml',      visualizerType: 'pooling',       complexities: { best: 'O(n²)',      average: 'O(n²)',     worst: 'O(n²)',     space: 'O(n²)' } },
  { id: 'kmeans',     category: 'ml',      visualizerType: 'kmeans',        complexities: { best: 'O(nki)',     average: 'O(nki)',    worst: 'O(nki)',    space: 'O(n+k)' } },
  { id: 'perceptron', category: 'ml',      visualizerType: 'perceptron',    complexities: { best: 'O(n)',       average: 'O(n·e)',    worst: 'O(n·e)',    space: 'O(w)' } },
]

export const ALGORITHM_BY_ID = Object.fromEntries(
  ALGORITHMS.map(a => [a.id, a])
) as Record<AlgorithmId, AlgorithmMeta>

export const CATEGORIES: AlgorithmCategory[] = ['sort', 'search', 'classic', 'ml']

export const BY_CATEGORY: Record<AlgorithmCategory, AlgorithmMeta[]> = {
  sort:    ALGORITHMS.filter(a => a.category === 'sort'),
  search:  ALGORITHMS.filter(a => a.category === 'search'),
  classic: ALGORITHMS.filter(a => a.category === 'classic'),
  ml:      ALGORITHMS.filter(a => a.category === 'ml'),
}

// ソートアルゴリズムのデフォルト入力として使うランダム配列を生成する（フィッシャー–イェーツ法）
function generateShuffledArray(size: number): number[] {
  const arr = Array.from({ length: size }, (_, i) => i + 1)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDefaultGrid(): GridConfig {
  const rows = 15
  const cols = 15
  const cells = Array.from({ length: rows }, () =>
    Array<GridConfig['cells'][0][0]>(cols).fill('empty')
  )
  return { rows, cols, cells, start: [1, 1], goal: [13, 13] }
}

// 各アルゴリズムの初期入力設定を返す。
// アルゴリズム切り替え時に毎回新しい設定を生成することで、
// 前のアルゴリズムの入力状態が引き継がれるのを防ぐ。
export function defaultConfig(id: AlgorithmId): AlgorithmConfig {
  switch (id) {
    case 'bubble':
    case 'selection':
    case 'insertion':
    case 'merge':
    case 'quick':
    case 'heap':
      return { array: generateShuffledArray(16) } satisfies SortConfig

    case 'linear':
      return {
        array: generateShuffledArray(20),
        target: 7,
      } satisfies ArraySearchConfig

    case 'binary':
      // 二分探索はソート済み配列が前提のため、単調増加列を使う
      return {
        array: Array.from({ length: 20 }, (_, i) => (i + 1) * 3),
        target: 30,
      } satisfies ArraySearchConfig

    case 'bfs':
    case 'dfs':
    case 'astar':
      return buildDefaultGrid()

    case 'hanoi':      return { numDisks: 4 } satisfies HanoiConfig
    case 'fibonacci':  return { n: 8, useMemo: true } satisfies FibConfig
    case 'euclidean':  return { a: 48, b: 18 } satisfies EuclidConfig
    case 'montecarlo': return { numPoints: 500 } satisfies MonteCarloConfig
    case 'convolution':return { kernelType: 'edge' } satisfies ConvConfig
    case 'pooling':    return { poolType: 'max', poolSize: 2 } satisfies PoolingConfig
    case 'kmeans':     return { k: 3, numPoints: 30, seed: 42 } satisfies KMeansConfig
    case 'perceptron': return { dataType: 'and', learningRate: 0.1 } satisfies PerceptronConfig
  }
}

// アルゴリズム ID と設定からジェネレーターを生成するファクトリ。
//
// 戻り値を Generator<AlgorithmStep<unknown>> にできるが、
// AlgorithmPage の VisualizerSwitch が visualizerType に応じてキャストするため、
// ここでは境界として any を許容し、型アサーション箇所を 1 か所に集約している。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGenerator(id: AlgorithmId, config: AlgorithmConfig): Generator<AlgorithmStep<any>, void, never> {
  switch (id) {
    case 'bubble':    return bubbleSort((config as SortConfig).array)
    case 'selection': return selectionSort((config as SortConfig).array)
    case 'insertion': return insertionSort((config as SortConfig).array)
    case 'merge':     return mergeSort((config as SortConfig).array)
    case 'quick':     return quickSort((config as SortConfig).array)
    case 'heap':      return heapSort((config as SortConfig).array)
    case 'linear': {
      const c = config as ArraySearchConfig
      return linearSearch(c.array, c.target)
    }
    case 'binary': {
      const c = config as ArraySearchConfig
      return binarySearch(c.array, c.target)
    }
    case 'bfs':   return bfsSearch(config as GridConfig)
    case 'dfs':   return dfsSearch(config as GridConfig)
    case 'astar': return astarSearch(config as GridConfig)
    case 'hanoi': return hanoi((config as HanoiConfig).numDisks)
    case 'fibonacci': {
      const c = config as FibConfig
      return fibonacci(c.n, c.useMemo)
    }
    case 'euclidean': {
      const c = config as EuclidConfig
      return euclidean(c.a, c.b)
    }
    case 'montecarlo':  return monteCarlo((config as MonteCarloConfig).numPoints)
    case 'convolution': return convolution((config as ConvConfig).kernelType)
    case 'pooling': {
      const c = config as PoolingConfig
      return pooling(c.poolType, c.poolSize)
    }
    case 'kmeans': {
      const c = config as KMeansConfig
      return kmeans(c.k, c.numPoints, c.seed)
    }
    case 'perceptron': {
      const c = config as PerceptronConfig
      return perceptron(c.dataType, c.learningRate)
    }
  }
}

// ジェネレーターの展開上限。
// モンテカルロ法や無限ループ系アルゴリズムがメモリを使い切るのを防ぐ安全弁。
export const MAX_STEPS = 2000
