import type { AlgorithmStep, DecisionTreeState, DTNode, DTDataPoint } from '../types'

// 決定木学習（CART: 分類と回帰の木）:
// ジニ不純度を最小化する分割特徴量と閾値を貪欲に選び、再帰的に木を構築する。
// 「この特徴量がこの閾値以下か？」という二値決定を繰り返すことでクラスを予測する。
function generateData(dataType: 'simple' | 'complex'): DTDataPoint[] {
  if (dataType === 'simple') {
    // x < 0.5 なら class 0、x >= 0.5 なら class 1（単純な1特徴分割）
    return [
      { x: 0.1, y: 0.3, label: 0 }, { x: 0.2, y: 0.7, label: 0 },
      { x: 0.3, y: 0.2, label: 0 }, { x: 0.4, y: 0.6, label: 0 },
      { x: 0.15, y: 0.5, label: 0 }, { x: 0.35, y: 0.8, label: 0 },
      { x: 0.6, y: 0.3, label: 1 }, { x: 0.7, y: 0.7, label: 1 },
      { x: 0.8, y: 0.2, label: 1 }, { x: 0.9, y: 0.6, label: 1 },
      { x: 0.65, y: 0.5, label: 1 }, { x: 0.75, y: 0.8, label: 1 },
    ]
  }
  // 複雑: XOR 的な分布（線形分離不可能）
  return [
    { x: 0.1, y: 0.1, label: 0 }, { x: 0.2, y: 0.2, label: 0 },
    { x: 0.8, y: 0.8, label: 0 }, { x: 0.9, y: 0.9, label: 0 },
    { x: 0.15, y: 0.15, label: 0 }, { x: 0.85, y: 0.85, label: 0 },
    { x: 0.8, y: 0.2, label: 1 }, { x: 0.9, y: 0.1, label: 1 },
    { x: 0.1, y: 0.8, label: 1 }, { x: 0.2, y: 0.9, label: 1 },
    { x: 0.75, y: 0.15, label: 1 }, { x: 0.15, y: 0.75, label: 1 },
  ]
}

function gini(labels: number[]): number {
  if (labels.length === 0) return 0
  const count = labels.filter(l => l === 1).length
  const p1 = count / labels.length
  const p0 = 1 - p1
  // ジニ不純度: 1 - Σpi² 。純粋なノードでは 0、均等分割で 0.5 になる
  return 1 - (p0 * p0 + p1 * p1)
}

export function* decisionTree(dataType: 'simple' | 'complex', maxDepth: number): Generator<AlgorithmStep<DecisionTreeState>, void, never> {
  const data = generateData(dataType)
  let nodeIdCounter = 0
  const nodes: DTNode[] = []

  function mkState(currentId: number | null, phase: string, done = false): DecisionTreeState {
    return {
      nodes: nodes.map(n => ({ ...n })),
      data: [...data],
      currentNodeId: currentId,
      phase,
      done,
    }
  }

  yield {
    state: mkState(null, 'init'),
    log: {
      ja: `決定木学習開始。データ ${data.length} 件、最大深さ ${maxDepth}。ジニ不純度で分割。`,
      en: `Decision tree started. ${data.length} samples, max depth ${maxDepth}. Splitting by Gini impurity.`,
    },
  }

  // 再帰的な木構築（ジェネレーターはフラットに yield するため、
  // 再帰の代わりにキュー（BFS）で処理する）
  interface BuildTask {
    nodeId: number
    indices: number[]
    depth: number
  }

  // ルートノードを作成する
  const rootIndices = data.map((_, i) => i)
  const rootLabels = rootIndices.map(i => data[i].label)
  const rootImpurity = gini(rootLabels)
  const rootId = nodeIdCounter++
  const rootNode: DTNode = {
    id: rootId, isLeaf: false, impurity: rootImpurity,
    sampleCount: rootIndices.length, depth: 0, active: true,
  }
  nodes.push(rootNode)

  yield {
    state: mkState(rootId, 'building'),
    log: {
      ja: `ルートノード作成。サンプル数=${rootIndices.length}、ジニ不純度=${rootImpurity.toFixed(3)}`,
      en: `Root node created. samples=${rootIndices.length}, Gini=${rootImpurity.toFixed(3)}`,
    },
  }

  const queue: BuildTask[] = [{ nodeId: rootId, indices: rootIndices, depth: 0 }]

  while (queue.length > 0) {
    const { nodeId, indices, depth } = queue.shift()!
    const currentNode = nodes.find(n => n.id === nodeId)!
    currentNode.active = true

    const labels = indices.map(i => data[i].label)
    const allSameClass = labels.every(l => l === labels[0])

    // 葉にする条件: 最大深さ到達 / 全要素が同クラス / サンプル数少なすぎ
    if (depth >= maxDepth || allSameClass || indices.length <= 2) {
      const count1 = labels.filter(l => l === 1).length
      currentNode.isLeaf = true
      currentNode.classLabel = count1 > labels.length - count1 ? 1 : 0
      currentNode.active = false

      yield {
        state: mkState(nodeId, 'leaf'),
        log: {
          ja: `ノード ${nodeId} を葉に設定。クラス ${currentNode.classLabel}（サンプル ${indices.length} 件）`,
          en: `Node ${nodeId} → leaf, class=${currentNode.classLabel} (${indices.length} samples)`,
        },
      }
      continue
    }

    // 最良分割を探す（ジニ不純度を最小化する特徴量と閾値）
    let bestGain = -1
    let bestFeature = 0
    let bestThreshold = 0.5

    // 特徴量 0=x, 1=y で分割を試みる
    for (const feature of [0, 1]) {
      const values = indices.map(i => feature === 0 ? data[i].x : data[i].y)
      const uniqueVals = [...new Set(values)].sort((a, b) => a - b)

      for (let vi = 0; vi < uniqueVals.length - 1; vi++) {
        const threshold = (uniqueVals[vi] + uniqueVals[vi + 1]) / 2
        const leftIdx = indices.filter(i => (feature === 0 ? data[i].x : data[i].y) <= threshold)
        const rightIdx = indices.filter(i => (feature === 0 ? data[i].x : data[i].y) > threshold)

        if (leftIdx.length === 0 || rightIdx.length === 0) continue

        const leftG = gini(leftIdx.map(i => data[i].label))
        const rightG = gini(rightIdx.map(i => data[i].label))
        const weightedG = (leftIdx.length * leftG + rightIdx.length * rightG) / indices.length
        const gain = gini(labels) - weightedG

        if (gain > bestGain) {
          bestGain = gain; bestFeature = feature; bestThreshold = threshold
        }
      }
    }

    currentNode.featureIndex = bestFeature
    currentNode.threshold = bestThreshold

    const leftIndices = indices.filter(i => (bestFeature === 0 ? data[i].x : data[i].y) <= bestThreshold)
    const rightIndices = indices.filter(i => (bestFeature === 0 ? data[i].x : data[i].y) > bestThreshold)
    const featureName = bestFeature === 0 ? 'x' : 'y'

    yield {
      state: mkState(nodeId, 'splitting'),
      log: {
        ja: `ノード ${nodeId}: ${featureName} ≤ ${bestThreshold.toFixed(3)} で分割（ゲイン=${bestGain.toFixed(3)}）`,
        en: `Node ${nodeId}: split on ${featureName} ≤ ${bestThreshold.toFixed(3)} (gain=${bestGain.toFixed(3)})`,
      },
    }

    // 左子ノードを作成する（条件: feature ≤ threshold）
    const leftId = nodeIdCounter++
    const leftNode: DTNode = {
      id: leftId, isLeaf: false,
      impurity: gini(leftIndices.map(i => data[i].label)),
      sampleCount: leftIndices.length, depth: depth + 1, active: false,
    }
    currentNode.leftChildId = leftId
    nodes.push(leftNode)
    queue.push({ nodeId: leftId, indices: leftIndices, depth: depth + 1 })

    // 右子ノードを作成する（条件: feature > threshold）
    const rightId = nodeIdCounter++
    const rightNode: DTNode = {
      id: rightId, isLeaf: false,
      impurity: gini(rightIndices.map(i => data[i].label)),
      sampleCount: rightIndices.length, depth: depth + 1, active: false,
    }
    currentNode.rightChildId = rightId
    nodes.push(rightNode)
    queue.push({ nodeId: rightId, indices: rightIndices, depth: depth + 1 })

    currentNode.active = false
  }

  yield {
    state: mkState(null, 'done', true),
    log: {
      ja: `学習完了！決定木のノード数: ${nodes.length}（葉: ${nodes.filter(n => n.isLeaf).length}）`,
      en: `Training done! Nodes: ${nodes.length} (leaves: ${nodes.filter(n => n.isLeaf).length})`,
    },
  }
}
