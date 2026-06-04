// アルゴリズム可視化コースで使う共通型定義。
// 各アルゴリズムのジェネレーター関数は AlgorithmStep<具体的な状態型> を yield し、
// 対応するビジュアライザーコンポーネントがその state を受け取って SVG/Canvas を描画する。

export type LocalizedString = { ja: string; en: string }

export interface AlgorithmStep<S = unknown> {
  state: S
  log: LocalizedString
}

// ジェネレーター関数の戻り値型エイリアス。
// never を第 3 型引数にすることで、外部から next(value) を呼ぶ必要がないことを型で保証する。
export type StepGenerator<S = unknown> = Generator<AlgorithmStep<S>, void, never>

// ---- ソート ----

export interface SortState {
  array: number[]
  // 同時に比較中の要素インデックス（最大 2 個）
  comparing: number[]
  // 交換中の要素インデックス（最大 2 個）
  swapping: number[]
  // 最終位置が確定した要素インデックス
  sorted: number[]
  // クイックソートのピボット、選択ソートの「現在の最小候補」など
  // アルゴリズムによって意味は異なるが、紫色で強調表示される単一要素を指す
  pivot: number | null
  // マージソートで統合中の要素インデックス
  merging: number[]
  // マージ・クイックソートで「現在の処理範囲」を示す [lo, hi]
  activeRange: [number, number] | null
}

// ---- 配列探索（線形・二分） ----

export interface LinearSearchState {
  array: number[]
  target: number
  current: number
  found: number | null
  done: boolean
}

export interface BinarySearchState {
  array: number[]
  target: number
  left: number
  right: number
  mid: number | null
  found: number | null
  done: boolean
}

// ---- グリッド探索（BFS・DFS・A*） ----

// グリッドの各セルが持つ「設定上の種別」
export type CellType = 'empty' | 'wall' | 'start' | 'goal'

// アルゴリズム実行中に各セルに重ねて表示する「状態」
export type CellOverlay = 'none' | 'visited' | 'frontier' | 'current' | 'path'

// ユーザーが編集できるグリッド設定。アルゴリズム実行前に確定する。
export interface GridConfig {
  rows: number
  cols: number
  cells: CellType[][]
  start: [number, number]
  goal: [number, number]
}

export interface GridState {
  config: GridConfig
  // セルの overlay は config と分離することで、同じ GridVisualizer が
  // 「編集中（overlay なし）」と「実行中（overlay あり）」の両モードで使える
  overlay: CellOverlay[][]
  current: [number, number] | null
  path: [number, number][]
  done: boolean
  found: boolean
  // A* のみ追加フィールドとして持つ（undefined のときは表示しない）
  gScore?: number[][]
  hScore?: number[][]
}

// ---- ハノイの塔 ----

export interface HanoiState {
  // 各ポールが保持する円盤サイズの配列（インデックス 0 が底、末尾が頂上）
  poles: number[][]
  // 移動アニメーション中の情報。null なら静止状態
  moving: { from: number; to: number; disk: number } | null
  totalDisks: number
}

// ---- フィボナッチ ----

export interface FibState {
  // values[i] が null のときはまだ計算されていない
  values: (number | null)[]
  // 現在計算中のインデックス
  current: number
  // F(current) = F(using[0]) + F(using[1]) として使われているインデックスのペア
  using: [number, number] | null
  done: boolean
  useMemo: boolean
}

// ---- ユークリッド互除法 ----

export interface EuclidRect {
  x: number
  y: number
  w: number
  h: number
  isSquare: boolean
  color: string
}

export interface EuclidState {
  initialA: number
  initialB: number
  // 現在の除算対象
  a: number
  b: number
  rects: EuclidRect[]
  // null なら未確定
  gcd: number | null
  done: boolean
}

// ---- モンテカルロ法 ----

export interface MonteCarloPoint {
  // 単位円に内接する正方形上の座標（-1.0〜1.0）
  x: number
  y: number
  // 原点からの距離 ≤ 1.0 なら true（円内判定）
  inside: boolean
}

export interface MonteCarloState {
  points: MonteCarloPoint[]
  piEstimate: number
  total: number
  inside: number
}

// ---- 畳み込み ----

export interface ConvState {
  input: number[][]
  kernel: number[][]
  // null は未計算のセル
  output: (number | null)[][]
  // カーネルを現在重ねている位置（出力座標）
  currentRow: number | null
  currentCol: number | null
  // 入力画像上でカーネルと重なっているセル座標の一覧
  inputHighlight: [number, number][]
  // 現在計算中の出力値（確定前の中間値）
  outputValue: number | null
}

// ---- プーリング ----

export interface PoolingState {
  input: number[][]
  output: (number | null)[][]
  poolType: 'max' | 'avg'
  poolSize: number
  currentRow: number | null
  currentCol: number | null
  highlight: [number, number][]
  outputValue: number | null
}

// ---- K-Means ----

export interface KMeansPoint {
  x: number
  y: number
  // null は初期化前（イテレーション 0 の割り当て前）
  cluster: number | null
}

export interface KMeansCentroid {
  x: number
  y: number
  // 移動アニメーション用の前ステップ座標
  prevX?: number
  prevY?: number
}

export interface KMeansState {
  points: KMeansPoint[]
  centroids: KMeansCentroid[]
  iteration: number
  phase: 'init' | 'assign' | 'update'
  // 現在更新中のセントロイドインデックス（更新フェーズで強調表示するため）
  updatedCentroid: number | null
  converged: boolean
}

// ---- パーセプトロン ----

export interface TrainSample {
  inputs: number[]
  target: number
}

export interface PerceptronState {
  weights: number[]
  bias: number
  learningRate: number
  sampleIndex: number
  trainingData: TrainSample[]
  // 現在処理中のサンプルデータ
  inputs: number[]
  target: number
  weightedSum: number | null
  output: number | null
  error: number | null
  // null なら重み更新なし（出力が正解の場合）
  weightDeltas: number[] | null
  epoch: number
  done: boolean
}

// ---- アルゴリズム別の入力設定型 ----

export interface SortConfig {
  array: number[]
}

export interface ArraySearchConfig {
  array: number[]
  target: number
}

export interface HanoiConfig {
  numDisks: number
}

export interface FibConfig {
  n: number
  useMemo: boolean
}

export interface EuclidConfig {
  a: number
  b: number
}

export interface MonteCarloConfig {
  numPoints: number
}

export interface ConvConfig {
  kernelType: 'edge' | 'blur' | 'sharpen'
}

export interface PoolingConfig {
  poolType: 'max' | 'avg'
  poolSize: number
}

export interface KMeansConfig {
  k: number
  numPoints: number
  seed: number
}

export interface PerceptronConfig {
  dataType: 'and' | 'or' | 'nand'
  learningRate: number
}

export type AlgorithmConfig =
  | SortConfig
  | ArraySearchConfig
  | GridConfig
  | HanoiConfig
  | FibConfig
  | EuclidConfig
  | MonteCarloConfig
  | ConvConfig
  | PoolingConfig
  | KMeansConfig
  | PerceptronConfig
