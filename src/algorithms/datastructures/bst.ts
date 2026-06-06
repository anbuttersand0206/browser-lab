// 二分探索木（BST）の挿入・検索を段階的に可視化するジェネレーター。
// ノードを一つずつ挿入しながら比較経路を表示し、
// その後に成功/失敗の検索デモを実行してO(log n)走査を体感できる。

import type { StepGenerator, BSTState, BSTNodeData } from '../types'

// デモで挿入する値のシーケンス（バランスのよいBSTができる順序）
const INSERT_VALUES = [5, 3, 8, 1, 4, 7, 9, 2, 6]
const SEARCH_FOUND    = 4   // 必ず存在する値
const SEARCH_NOT_FOUND = 10 // 存在しない値

let nodeCounter = 0

function makeId(): string {
  return `bst-${++nodeCounter}`
}

function cloneNodes(nodes: Record<string, BSTNodeData>): Record<string, BSTNodeData> {
  return Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, { ...v }]))
}

// 深さの計算（レイアウト用）: ルートから再帰的に各ノードの depth を確定する
function assignDepths(
  nodes: Record<string, BSTNodeData>,
  id: string | null,
  depth: number,
): void {
  if (!id || !nodes[id]) return
  nodes[id].depth = depth
  assignDepths(nodes, nodes[id].leftId, depth + 1)
  assignDepths(nodes, nodes[id].rightId, depth + 1)
}

function snapshot(
  nodes: Record<string, BSTNodeData>,
  rootId: string | null,
  comparingId: string | null,
  visitedIds: string[],
  newNodeId: string | null,
  foundId: string | null,
  operation: 'insert' | 'search',
  targetValue: number,
  done: boolean,
  log: { ja: string; en: string },
): { state: BSTState; log: { ja: string; en: string } } {
  // スナップショット前に深さを再計算（挿入のたびにルートから解決）
  const cloned = cloneNodes(nodes)
  assignDepths(cloned, rootId, 0)
  return {
    state: {
      nodes: cloned,
      rootId,
      comparingId,
      visitedIds: [...visitedIds],
      newNodeId,
      foundId,
      operation,
      targetValue,
      done,
    },
    log,
  }
}

export function* bst(): StepGenerator<BSTState> {
  nodeCounter = 0
  const nodes: Record<string, BSTNodeData> = {}
  let rootId: string | null = null

  // 挿入フェーズ
  for (const value of INSERT_VALUES) {
    const visited: string[] = []

    if (rootId === null) {
      // ツリーが空: 最初のノードがルートになる
      const id = makeId()
      nodes[id] = { id, value, leftId: null, rightId: null, depth: 0 }
      rootId = id
      yield snapshot(nodes, rootId, null, [], id, null, 'insert', value, false, {
        ja: `${value} を挿入: ツリーが空なのでルートになります`,
        en: `Insert ${value}: tree empty, becomes root`,
      })
      continue
    }

    let currentId = rootId
    while (true) {
      const current = nodes[currentId]
      visited.push(currentId)

      yield snapshot(nodes, rootId, currentId, visited, null, null, 'insert', value, false, {
        ja: `${value} と ${current.value} を比較: ${value} ${value < current.value ? '<' : '>='} ${current.value}`,
        en: `Compare ${value} with ${current.value}: go ${value < current.value ? 'left' : 'right'}`,
      })

      if (value < current.value) {
        if (current.leftId === null) {
          const id = makeId()
          nodes[id] = { id, value, leftId: null, rightId: null, depth: 0 }
          nodes[currentId] = { ...current, leftId: id }
          yield snapshot(nodes, rootId, null, visited, id, null, 'insert', value, false, {
            ja: `${value} < ${current.value} → ${current.value} の左の子として挿入`,
            en: `${value} < ${current.value} → inserted as left child of ${current.value}`,
          })
          break
        }
        currentId = current.leftId
      } else {
        if (current.rightId === null) {
          const id = makeId()
          nodes[id] = { id, value, leftId: null, rightId: null, depth: 0 }
          nodes[currentId] = { ...current, rightId: id }
          yield snapshot(nodes, rootId, null, visited, id, null, 'insert', value, false, {
            ja: `${value} >= ${current.value} → ${current.value} の右の子として挿入`,
            en: `${value} >= ${current.value} → inserted as right child of ${current.value}`,
          })
          break
        }
        currentId = current.rightId
      }
    }
  }

  // 検索フェーズ（成功）
  {
    const visited: string[] = []
    let currentId: string | null = rootId
    while (currentId !== null) {
      const current = nodes[currentId]
      visited.push(currentId)
      yield snapshot(nodes, rootId, currentId, visited, null, null, 'search', SEARCH_FOUND, false, {
        ja: `${SEARCH_FOUND} を検索: ${current.value} と比較中`,
        en: `Search ${SEARCH_FOUND}: comparing with ${current.value}`,
      })
      if (current.value === SEARCH_FOUND) {
        yield snapshot(nodes, rootId, null, visited, null, currentId, 'search', SEARCH_FOUND, false, {
          ja: `値 ${SEARCH_FOUND} が見つかりました！`,
          en: `Found value ${SEARCH_FOUND}!`,
        })
        break
      }
      currentId = SEARCH_FOUND < current.value ? current.leftId : current.rightId
    }
  }

  // 検索フェーズ（失敗）
  {
    const visited: string[] = []
    let currentId: string | null = rootId
    while (currentId !== null) {
      const current = nodes[currentId]
      visited.push(currentId)
      yield snapshot(nodes, rootId, currentId, visited, null, null, 'search', SEARCH_NOT_FOUND, false, {
        ja: `${SEARCH_NOT_FOUND} を検索: ${current.value} と比較中`,
        en: `Search ${SEARCH_NOT_FOUND}: comparing with ${current.value}`,
      })
      currentId = SEARCH_NOT_FOUND < current.value ? current.leftId : current.rightId
    }
    yield snapshot(nodes, rootId, null, visited, null, null, 'search', SEARCH_NOT_FOUND, false, {
      ja: `値 ${SEARCH_NOT_FOUND} は見つかりません（null に到達）`,
      en: `Value ${SEARCH_NOT_FOUND} not found (reached null)`,
    })
  }

  yield snapshot(nodes, rootId, null, [], null, null, 'insert', 0, true, {
    ja: 'デモ完了。BST の挿入・検索での O(log n) 経路を確認しました',
    en: 'Demo complete. You saw O(log n) traversal for insert and search in a BST',
  })
}
