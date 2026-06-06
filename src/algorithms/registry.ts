// アルゴリズムのメタデータと、アルゴリズム ID からジェネレーターを生成するファクトリを集約する。
// アルゴリズムの追加は ALGORITHMS 配列と createGenerator の switch に 1 行ずつ追加するだけで完結する。

import type {
  AlgorithmConfig, AlgorithmStep, GridConfig, SortConfig, ArraySearchConfig,
  HanoiConfig, FibConfig, EuclidConfig, MonteCarloConfig,
  ConvConfig, PoolingConfig, KMeansConfig, PerceptronConfig,
  GraphAlgoConfig, StringSearchConfig, KnapsackConfig, LevenshteinConfig,
  MazeConfig, ScatterConfig, DecisionTreeConfig,
  LinkedListConfig, BSTConfig, HashTableConfig,
} from './types'
import { bubbleSort } from './sort/bubbleSort'
import { selectionSort } from './sort/selectionSort'
import { insertionSort } from './sort/insertionSort'
import { mergeSort } from './sort/mergeSort'
import { quickSort } from './sort/quickSort'
import { heapSort } from './sort/heapSort'
import { bogoSort } from './sort/bogoSort'
import { shellSort } from './sort/shellSort'
import { radixSort } from './sort/radixSort'
import { cocktailSort } from './sort/cocktailSort'
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
import { dijkstra } from './graph/dijkstra'
import { bellmanFord } from './graph/bellmanFord'
import { kruskal } from './graph/kruskal'
import { prim } from './graph/prim'
import { rsa } from './crypto/rsa'
import { diffieHellman } from './crypto/diffieHellman'
import { kmp } from './string/kmp'
import { boyerMoore } from './string/boyerMoore'
import { knapsack } from './dp/knapsack'
import { levenshtein } from './dp/levenshtein'
import { mazeGeneration } from './dp/mazeGeneration'
import { svm } from './ml/svm'
import { pca } from './ml/pca'
import { decisionTree } from './ml/decisionTree'
import { linkedList } from './datastructures/linkedList'
import { bst } from './datastructures/bst'
import { hashTable } from './datastructures/hashTable'

export type AlgorithmId =
  | 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap'
  | 'bogo' | 'shell' | 'radix' | 'cocktail'
  | 'linear' | 'binary' | 'bfs' | 'dfs' | 'astar'
  | 'hanoi' | 'fibonacci' | 'euclidean' | 'montecarlo'
  | 'convolution' | 'pooling' | 'kmeans' | 'perceptron'
  | 'dijkstra' | 'bellmanFord' | 'kruskal' | 'prim'
  | 'rsa' | 'diffieHellman'
  | 'kmp' | 'boyerMoore'
  | 'knapsack' | 'levenshtein' | 'mazeGeneration'
  | 'svm' | 'pca' | 'decisionTree'
  | 'linkedList' | 'bst' | 'hashTable'

export type AlgorithmCategory = 'sort' | 'search' | 'classic' | 'ml' | 'datastructures'

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
  | 'graphShortest'
  | 'graphMST'
  | 'crypto'
  | 'stringSearch'
  | 'dpTable'
  | 'maze'
  | 'scatter'
  | 'decisionTree'
  | 'linkedList'
  | 'bst'
  | 'hashTable'

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
  { id: 'bubble',       category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n)',       average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'selection',    category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n²)',      average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'insertion',    category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n)',       average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'merge',        category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' } },
  { id: 'quick',        category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)',       space: 'O(log n)' } },
  { id: 'heap',         category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' } },
  { id: 'bogo',         category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n)',       average: 'O((n+1)!)',   worst: '∞',           space: 'O(1)' } },
  { id: 'shell',        category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n log n)', average: 'O(n^(4/3))', worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'radix',        category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(dn)',      average: 'O(dn)',       worst: 'O(dn)',       space: 'O(n+k)' } },
  { id: 'cocktail',     category: 'sort',    visualizerType: 'sort',          complexities: { best: 'O(n)',       average: 'O(n²)',       worst: 'O(n²)',       space: 'O(1)' } },
  { id: 'linear',       category: 'search',  visualizerType: 'linearSearch',  complexities: { best: 'O(1)',       average: 'O(n)',       worst: 'O(n)',       space: 'O(1)' } },
  { id: 'binary',       category: 'search',  visualizerType: 'binarySearch',  complexities: { best: 'O(1)',       average: 'O(log n)',   worst: 'O(log n)',   space: 'O(1)' } },
  { id: 'bfs',          category: 'search',  visualizerType: 'grid',          complexities: { best: 'O(1)',       average: 'O(V+E)',     worst: 'O(V+E)',     space: 'O(V)' } },
  { id: 'dfs',          category: 'search',  visualizerType: 'grid',          complexities: { best: 'O(1)',       average: 'O(V+E)',     worst: 'O(V+E)',     space: 'O(V)' } },
  { id: 'astar',        category: 'search',  visualizerType: 'grid',          complexities: { best: 'O(1)',       average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)' } },
  { id: 'dijkstra',     category: 'search',  visualizerType: 'graphShortest', complexities: { best: 'O(V²)',      average: 'O(E log V)', worst: 'O(V²)',      space: 'O(V)' } },
  { id: 'bellmanFord',  category: 'search',  visualizerType: 'graphShortest', complexities: { best: 'O(E)',       average: 'O(VE)',      worst: 'O(VE)',      space: 'O(V)' } },
  { id: 'kruskal',      category: 'search',  visualizerType: 'graphMST',      complexities: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)', space: 'O(V)' } },
  { id: 'prim',         category: 'search',  visualizerType: 'graphMST',      complexities: { best: 'O(E log V)', average: 'O(E log V)', worst: 'O(V²)',      space: 'O(V)' } },
  { id: 'kmp',          category: 'search',  visualizerType: 'stringSearch',  complexities: { best: 'O(n)',       average: 'O(n+m)',     worst: 'O(n+m)',     space: 'O(m)' } },
  { id: 'boyerMoore',   category: 'search',  visualizerType: 'stringSearch',  complexities: { best: 'O(n/m)',     average: 'O(n)',       worst: 'O(nm)',      space: 'O(m+Σ)' } },
  { id: 'hanoi',        category: 'classic', visualizerType: 'hanoi',         complexities: { best: 'O(2ⁿ)',     average: 'O(2ⁿ)',     worst: 'O(2ⁿ)',     space: 'O(n)' } },
  { id: 'fibonacci',    category: 'classic', visualizerType: 'fibonacci',     complexities: { best: 'O(n)',       average: 'O(n)',       worst: 'O(2ⁿ)※',    space: 'O(n)' } },
  { id: 'euclidean',    category: 'classic', visualizerType: 'euclidean',     complexities: { best: 'O(1)',       average: 'O(log n)',   worst: 'O(log n)',   space: 'O(1)' } },
  { id: 'montecarlo',   category: 'classic', visualizerType: 'montecarlo',    complexities: { best: '—',          average: 'O(n)',       worst: 'O(n)',       space: 'O(n)' } },
  { id: 'rsa',          category: 'classic', visualizerType: 'crypto',        complexities: { best: 'O(log²n)',   average: 'O(log²n)',  worst: 'O(log²n)',  space: 'O(1)' } },
  { id: 'diffieHellman',category: 'classic', visualizerType: 'crypto',        complexities: { best: 'O(log n)',   average: 'O(log n)',  worst: 'O(log n)',  space: 'O(1)' } },
  { id: 'knapsack',     category: 'classic', visualizerType: 'dpTable',       complexities: { best: 'O(nW)',      average: 'O(nW)',     worst: 'O(nW)',     space: 'O(nW)' } },
  { id: 'levenshtein',  category: 'classic', visualizerType: 'dpTable',       complexities: { best: 'O(nm)',      average: 'O(nm)',     worst: 'O(nm)',     space: 'O(nm)' } },
  { id: 'mazeGeneration',category: 'classic',visualizerType: 'maze',          complexities: { best: 'O(rc)',      average: 'O(rc)',     worst: 'O(rc)',     space: 'O(rc)' } },
  { id: 'convolution',  category: 'ml',      visualizerType: 'convolution',   complexities: { best: 'O(n²k²)',   average: 'O(n²k²)',   worst: 'O(n²k²)',   space: 'O(n²)' } },
  { id: 'pooling',      category: 'ml',      visualizerType: 'pooling',       complexities: { best: 'O(n²)',      average: 'O(n²)',     worst: 'O(n²)',     space: 'O(n²)' } },
  { id: 'kmeans',       category: 'ml',      visualizerType: 'kmeans',        complexities: { best: 'O(nki)',     average: 'O(nki)',    worst: 'O(nki)',    space: 'O(n+k)' } },
  { id: 'perceptron',   category: 'ml',      visualizerType: 'perceptron',    complexities: { best: 'O(n)',       average: 'O(n·e)',    worst: 'O(n·e)',    space: 'O(w)' } },
  { id: 'svm',          category: 'ml',             visualizerType: 'scatter',       complexities: { best: 'O(n)',   average: 'O(n²)',      worst: 'O(n³)',      space: 'O(n)' } },
  { id: 'pca',          category: 'ml',             visualizerType: 'scatter',       complexities: { best: 'O(nd²)', average: 'O(nd²)',     worst: 'O(nd²)',     space: 'O(d²)' } },
  { id: 'decisionTree', category: 'ml',             visualizerType: 'decisionTree',  complexities: { best: 'O(n log n)', average: 'O(n² log n)', worst: 'O(n²)', space: 'O(n)' } },
  { id: 'linkedList',   category: 'datastructures', visualizerType: 'linkedList',    complexities: { best: 'O(1)',   average: 'O(n)',       worst: 'O(n)',       space: 'O(n)' } },
  { id: 'bst',          category: 'datastructures', visualizerType: 'bst',           complexities: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)',       space: 'O(n)' } },
  { id: 'hashTable',    category: 'datastructures', visualizerType: 'hashTable',     complexities: { best: 'O(1)',   average: 'O(1)',       worst: 'O(n)',       space: 'O(n)' } },
]

export const ALGORITHM_BY_ID = Object.fromEntries(
  ALGORITHMS.map(a => [a.id, a])
) as Record<AlgorithmId, AlgorithmMeta>

export const CATEGORIES: AlgorithmCategory[] = ['sort', 'search', 'classic', 'ml', 'datastructures']

export const BY_CATEGORY: Record<AlgorithmCategory, AlgorithmMeta[]> = {
  sort:           ALGORITHMS.filter(a => a.category === 'sort'),
  search:         ALGORITHMS.filter(a => a.category === 'search'),
  classic:        ALGORITHMS.filter(a => a.category === 'classic'),
  ml:             ALGORITHMS.filter(a => a.category === 'ml'),
  datastructures: ALGORITHMS.filter(a => a.category === 'datastructures'),
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
    case 'shell':
    case 'cocktail':
      return { array: generateShuffledArray(16) } satisfies SortConfig

    // ボゴソートはランダム性が高くステップ数が膨大になるため配列サイズを抑える
    case 'bogo':
      return { array: generateShuffledArray(6) } satisfies SortConfig

    // ラディックスソートは数値の桁数を視覚化するため 1〜99 の範囲にする
    case 'radix':
      return { array: generateShuffledArray(12).map(v => v * 7) } satisfies SortConfig

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

    case 'dijkstra':
    case 'bellmanFord':
    case 'kruskal':
    case 'prim':
      return { _brand: 'graphAlgo' } satisfies GraphAlgoConfig

    case 'rsa':
    case 'diffieHellman':
      return { _brand: 'graphAlgo' } satisfies GraphAlgoConfig

    case 'kmp':
      return { text: 'ABABCABABABD', pattern: 'ABABD' } satisfies StringSearchConfig

    case 'boyerMoore':
      return { text: 'ABAAABCD', pattern: 'ABC' } satisfies StringSearchConfig

    case 'knapsack':
      return { preset: 'classic' } satisfies KnapsackConfig

    case 'levenshtein':
      return { str1: 'kitten', str2: 'sitting' } satisfies LevenshteinConfig

    case 'mazeGeneration':
      return { rows: 15, cols: 21 } satisfies MazeConfig

    case 'svm':
    case 'pca':
      return { dataType: 'linearlySeparable' } satisfies ScatterConfig

    case 'decisionTree':
      return { dataType: 'simple', maxDepth: 3 } satisfies DecisionTreeConfig

    case 'linkedList': return { _brand: 'linkedList' } satisfies LinkedListConfig
    case 'bst':        return { _brand: 'bst'        } satisfies BSTConfig
    case 'hashTable':  return { _brand: 'hashTable'  } satisfies HashTableConfig
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
    case 'bogo':      return bogoSort((config as SortConfig).array)
    case 'shell':     return shellSort((config as SortConfig).array)
    case 'radix':     return radixSort((config as SortConfig).array)
    case 'cocktail':  return cocktailSort((config as SortConfig).array)
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

    case 'dijkstra':    return dijkstra()
    case 'bellmanFord': return bellmanFord()
    case 'kruskal':     return kruskal()
    case 'prim':        return prim()

    case 'rsa':           return rsa()
    case 'diffieHellman': return diffieHellman()

    case 'kmp': {
      const c = config as StringSearchConfig
      return kmp(c.text, c.pattern)
    }
    case 'boyerMoore': {
      const c = config as StringSearchConfig
      return boyerMoore(c.text, c.pattern)
    }

    case 'knapsack':       return knapsack((config as KnapsackConfig).preset)
    case 'levenshtein': {
      const c = config as LevenshteinConfig
      return levenshtein(c.str1, c.str2)
    }
    case 'mazeGeneration': {
      const c = config as MazeConfig
      return mazeGeneration(c.rows, c.cols)
    }

    case 'svm': return svm((config as ScatterConfig).dataType)
    case 'pca': return pca((config as ScatterConfig).dataType)
    case 'decisionTree': {
      const c = config as DecisionTreeConfig
      return decisionTree(c.dataType, c.maxDepth)
    }

    case 'linkedList': return linkedList()
    case 'bst':        return bst()
    case 'hashTable':  return hashTable()
  }
}

// ジェネレーターの展開上限。
// モンテカルロ法や無限ループ系アルゴリズムがメモリを使い切るのを防ぐ安全弁。
export const MAX_STEPS = 2000
