// 全グラフアルゴリズム（ダイクストラ・ベルマンフォード・クラスカル・プリム）で共有する
// 固定グラフのトポロジー定義。ノード 0 が始点、ノード 6 が終点。

export interface RawNode {
  id: number
  // SVG 座標系（0〜1 の正規化値）。可視化側でスケール変換する。
  x: number
  y: number
  label: string
}

export interface RawEdge {
  from: number
  to: number
  weight: number
}

export const GRAPH_NODES: RawNode[] = [
  { id: 0, x: 0.50, y: 0.08, label: 'S' },
  { id: 1, x: 0.20, y: 0.38, label: '1' },
  { id: 2, x: 0.80, y: 0.38, label: '2' },
  { id: 3, x: 0.33, y: 0.65, label: '3' },
  { id: 4, x: 0.67, y: 0.65, label: '4' },
  { id: 5, x: 0.18, y: 0.88, label: '5' },
  { id: 6, x: 0.82, y: 0.88, label: 'T' },
]

// 無向グラフとして定義する（各アルゴリズム側で有向 or 無向を解釈する）
export const GRAPH_EDGES: RawEdge[] = [
  { from: 0, to: 1, weight: 4 },
  { from: 0, to: 2, weight: 8 },
  { from: 1, to: 2, weight: 3 },
  { from: 1, to: 3, weight: 2 },
  { from: 1, to: 5, weight: 7 },
  { from: 2, to: 4, weight: 5 },
  { from: 2, to: 6, weight: 9 },
  { from: 3, to: 4, weight: 6 },
  { from: 3, to: 5, weight: 2 },
  { from: 4, to: 6, weight: 3 },
  { from: 5, to: 6, weight: 8 },
]

export const NUM_NODES = GRAPH_NODES.length
