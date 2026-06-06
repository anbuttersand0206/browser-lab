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
  | GraphAlgoConfig
  | StringSearchConfig
  | KnapsackConfig
  | LevenshteinConfig
  | MazeConfig
  | ScatterConfig
  | DecisionTreeConfig
  | LinkedListConfig
  | BSTConfig
  | HashTableConfig

// ---- グラフ（ダイクストラ・ベルマンフォード・クラスカル・プリム） ----

export interface GraphNodeState {
  id: number
  dist: number        // 始点からの暫定距離（Infinity = 未確定）
  visited: boolean    // ダイクストラ: 確定済み / MST: MST に追加済み
  inMST: boolean      // クラスカル・プリム用フラグ
  parent: number | null
}

export type GraphEdgeStatus = 'none' | 'considering' | 'relaxed' | 'inMST' | 'rejected'

export interface GraphEdgeState {
  from: number
  to: number
  weight: number
  status: GraphEdgeStatus
}

export interface GraphState {
  nodeStates: GraphNodeState[]
  edgeStates: GraphEdgeState[]
  currentNodeId: number | null
  phase: string
  done: boolean
}

// ---- 暗号・セキュリティ（RSA・ディフィー・ヘルマン） ----

export interface CryptoStepEntry {
  label: LocalizedString
  value: string
  // 計算の現在のフォーカス行をハイライト表示するためのフラグ
  highlight: boolean
}

export interface CryptoState {
  steps: CryptoStepEntry[]
  currentIndex: number
  done: boolean
}

// ---- 文字列検索（KMP・ボイヤー・ムーア） ----

export type CharStatus = 'normal' | 'comparing' | 'match' | 'mismatch' | 'found'

export interface StringSearchState {
  text: string
  pattern: string
  // text の各文字の状態
  textStatus: CharStatus[]
  // pattern の各文字の状態
  patternStatus: CharStatus[]
  // 確定した一致箇所のテキスト内開始インデックス
  foundAt: number[]
  // 現在のテキスト上のウィンドウ開始位置
  textPos: number
  // パターン内の照合位置
  patternPos: number
  // KMP 専用: 失敗関数テーブル（各 prefix の最長 proper border 長）
  failureTable?: number[]
  // Boyer-Moore 専用: 悪い文字テーブル（文字 → パターン内最右出現位置）
  badCharTable?: Record<string, number>
  // Boyer-Moore 専用: 直前の不一致によるスキップ量
  skipAmount: number
  matchStatus: 'none' | 'match' | 'mismatch'
  done: boolean
}

// ---- 動的計画法テーブル（ナップサック・レーベンシュタイン） ----

export interface DPTableState {
  // null = まだ計算されていないセル
  table: (number | null)[][]
  rowLabels: string[]
  colLabels: string[]
  currentRow: number | null
  currentCol: number | null
  // 現在セルの計算に参照しているセル座標（矢印 / ハイライト表示用）
  sourceCells: [number, number][]
  done: boolean
  // ナップサック専用: 逆追跡で選択されたアイテムのインデックス
  selectedItems?: number[]
  // レーベンシュタイン専用: 編集操作の文字列表現 (M=一致, S=置換, D=削除, I=挿入)
  editOps?: string
}

// ---- 迷路生成（再帰バックトラッキング） ----

export type MazeCellStatus = 'wall' | 'path' | 'current' | 'visited'

export interface MazeState {
  grid: MazeCellStatus[][]
  rows: number
  cols: number
  currentCell: [number, number] | null
  stackDepth: number
  done: boolean
}

// ---- SVM・PCA（散布図ベースの可視化） ----

export interface ScatterPoint {
  x: number
  y: number
  label: number  // クラスラベル（0 or 1）
  isSupportVector?: boolean
}

export interface ScatterState {
  points: ScatterPoint[]
  // SVM 専用: 決定境界 w[0]*x + w[1]*y + bias = 0
  weights?: [number, number]
  bias?: number
  margin?: number
  currentPointIndex?: number
  iteration?: number
  svmPhase?: string
  // PCA 専用
  mean?: [number, number]
  pc1?: [number, number]   // 第1主成分の方向ベクトル（スケール済み）
  pc2?: [number, number]   // 第2主成分の方向ベクトル
  explained1?: number      // 第1主成分の寄与率
  explained2?: number
  pcaPhase?: string
  done: boolean
}

// ---- 決定木 ----

export interface DTNode {
  id: number
  featureIndex?: number    // 分割する特徴量のインデックス
  threshold?: number       // 分割閾値
  leftChildId?: number
  rightChildId?: number
  isLeaf: boolean
  classLabel?: number      // 葉ノードの予測クラス
  impurity: number         // ジニ不純度（0=純粋）
  sampleCount: number
  depth: number
  active: boolean          // 現在処理中のノードかどうか
}

export interface DTDataPoint {
  x: number
  y: number
  label: number
}

export interface DecisionTreeState {
  nodes: DTNode[]
  data: DTDataPoint[]
  currentNodeId: number | null
  phase: string
  done: boolean
}

// ---- 新規アルゴリズムの入力設定型 ----

// グラフはアルゴリズム内で固定グラフを使用するため設定不要
export interface GraphAlgoConfig {
  _brand: 'graphAlgo'
}

export interface StringSearchConfig {
  text: string
  pattern: string
}

export interface KnapsackConfig {
  preset: 'classic' | 'large'
}

export interface LevenshteinConfig {
  str1: string
  str2: string
}

export interface MazeConfig {
  rows: number
  cols: number
}

export interface ScatterConfig {
  dataType: 'linearlySeparable' | 'circles'
}

export interface DecisionTreeConfig {
  dataType: 'simple' | 'complex'
  maxDepth: number
}

// ---- 連結リスト ----

export interface LLNode {
  id: string
  value: number
}

// 連結リストで実行される操作の種別
export type LLOperation = 'insert_front' | 'insert_back' | 'search' | 'delete'

// アニメーションの現在フェーズ
export type LLPhase = 'traverse' | 'insert' | 'found' | 'not_found' | 'done'

export interface LinkedListState {
  nodes: LLNode[]
  // 現在ハイライト中のノードインデックス（null = 強調なし）
  currentIndex: number | null
  targetValue: number
  operation: LLOperation
  // 発見・確定したノードのインデックス（緑ハイライト用）
  foundIndex: number | null
  phase: LLPhase
  done: boolean
}

// 固定シナリオで動作するためパラメーター不要
export interface LinkedListConfig {
  _brand: 'linkedList'
}

// ---- 二分探索木 ----

export interface BSTNodeData {
  id: string
  value: number
  leftId: string | null
  rightId: string | null
  // ルートからの深さ（ビジュアライザーの縦方向レイアウト計算に使用）
  depth: number
}

export interface BSTState {
  nodes: Record<string, BSTNodeData>
  rootId: string | null
  // 現在比較中のノードID（黄色ハイライト）
  comparingId: string | null
  // 走査済みパスのノードIDリスト（薄い青でハイライト）
  visitedIds: string[]
  // 新規挿入されたノードID（シアンハイライト）
  newNodeId: string | null
  // 検索で発見したノードID（緑ハイライト）
  foundId: string | null
  operation: 'insert' | 'search'
  targetValue: number
  done: boolean
}

// 固定シナリオで動作するためパラメーター不要
export interface BSTConfig {
  _brand: 'bst'
}

// ---- ハッシュテーブル ----

export interface HashTableState {
  // buckets[i] = バケット i に格納された値の配列（チェーン法）
  buckets: number[][]
  tableSize: number
  // 現在処理中の値（null = 処理なし）
  currentValue: number | null
  // 計算済みのハッシュインデックス（null = まだ計算していない）
  hashIndex: number | null
  // チェーン内の走査インデックス（比較中のエントリ）
  chainIndex: number | null
  operation: 'insert' | 'search'
  found: boolean | null
  phase: 'idle' | 'hashing' | 'traversing' | 'done'
  done: boolean
}

// 固定シナリオで動作するためパラメーター不要
export interface HashTableConfig {
  _brand: 'hashTable'
}
