// 連結リストの挿入・検索・削除を段階的に可視化するジェネレーター。
// 固定シナリオを実行することで、各操作の O(n) 走査の様子をステップ単位で表現する。

import type { StepGenerator, LinkedListState, LLNode, LLOperation, LLPhase } from '../types'

// デモで実行する操作シナリオ（固定順序）
const SCENARIO: Array<{ op: LLOperation; value: number }> = [
  { op: 'insert_front', value: 5 },
  { op: 'insert_front', value: 3 },
  { op: 'insert_front', value: 8 },
  { op: 'insert_back',  value: 1 },
  { op: 'insert_back',  value: 6 },
  { op: 'search',       value: 8 },
  { op: 'search',       value: 6 },
  { op: 'delete',       value: 3 },
  { op: 'search',       value: 99 },
]

let nodeCounter = 0

function makeNode(value: number): LLNode {
  return { id: `ll-${++nodeCounter}`, value }
}

function cloneNodes(nodes: LLNode[]): LLNode[] {
  return nodes.map((n) => ({ ...n }))
}

function step(
  nodes: LLNode[],
  currentIndex: number | null,
  targetValue: number,
  operation: LLOperation,
  foundIndex: number | null,
  phase: LLPhase,
  done: boolean,
  log: { ja: string; en: string },
): { state: LinkedListState; log: { ja: string; en: string } } {
  return {
    state: { nodes: cloneNodes(nodes), currentIndex, targetValue, operation, foundIndex, phase, done },
    log,
  }
}

export function* linkedList(): StepGenerator<LinkedListState> {
  nodeCounter = 0
  let nodes: LLNode[] = []

  for (const { op, value } of SCENARIO) {
    if (op === 'insert_front') {
      nodes = [makeNode(value), ...nodes]
      yield step(nodes, 0, value, 'insert_front', null, 'insert', false, {
        ja: `先頭に ${value} を挿入 → [${nodes.map((n) => n.value).join(' → ')}]`,
        en: `Inserted ${value} at front → [${nodes.map((n) => n.value).join(' → ')}]`,
      })
    } else if (op === 'insert_back') {
      // 末尾挿入: O(n)走査の様子を各ノードでステップ出力する
      for (let i = 0; i < nodes.length; i++) {
        yield step(nodes, i, value, 'insert_back', null, 'traverse', false, {
          ja: `末尾を探して走査中 [${i}]: ${nodes[i].value}`,
          en: `Traversing to tail [${i}]: ${nodes[i].value}`,
        })
      }
      nodes = [...nodes, makeNode(value)]
      yield step(nodes, nodes.length - 1, value, 'insert_back', nodes.length - 1, 'insert', false, {
        ja: `末尾に ${value} を挿入 → [${nodes.map((n) => n.value).join(' → ')}]`,
        en: `Inserted ${value} at back → [${nodes.map((n) => n.value).join(' → ')}]`,
      })
    } else if (op === 'search') {
      let found = false
      for (let i = 0; i < nodes.length; i++) {
        const matched = nodes[i].value === value
        yield step(nodes, i, value, 'search', null, 'traverse', false, {
          ja: `[${i}] ${nodes[i].value} を確認: ${matched ? '一致 ✓' : '不一致'}`,
          en: `[${i}] Check ${nodes[i].value}: ${matched ? 'match ✓' : 'no match'}`,
        })
        if (matched) {
          yield step(nodes, i, value, 'search', i, 'found', false, {
            ja: `値 ${value} を index=${i} で発見`,
            en: `Found value ${value} at index=${i}`,
          })
          found = true
          break
        }
      }
      if (!found) {
        yield step(nodes, null, value, 'search', null, 'not_found', false, {
          ja: `値 ${value} はリストに存在しません`,
          en: `Value ${value} not found in the list`,
        })
      }
    } else if (op === 'delete') {
      let deleted = false
      for (let i = 0; i < nodes.length; i++) {
        const matched = nodes[i].value === value
        yield step(nodes, i, value, 'delete', null, 'traverse', false, {
          ja: `削除対象を探して走査中 [${i}]: ${nodes[i].value}${matched ? ' ← 一致' : ''}`,
          en: `Searching for delete [${i}]: ${nodes[i].value}${matched ? ' ← match' : ''}`,
        })
        if (matched) {
          yield step(nodes, i, value, 'delete', i, 'found', false, {
            ja: `値 ${value} を index=${i} で発見。前後のポインタを繋ぎ直します`,
            en: `Found ${value} at index=${i}. Relinking pointers...`,
          })
          nodes = nodes.filter((_, idx) => idx !== i)
          yield step(nodes, null, value, 'delete', null, 'done', false, {
            ja: `削除完了 → [${nodes.length > 0 ? nodes.map((n) => n.value).join(' → ') : '空'}]`,
            en: `Deleted. List → [${nodes.length > 0 ? nodes.map((n) => n.value).join(' → ') : 'empty'}]`,
          })
          deleted = true
          break
        }
      }
      if (!deleted) {
        yield step(nodes, null, value, 'delete', null, 'not_found', false, {
          ja: `値 ${value} はリストに存在しないため削除できません`,
          en: `Value ${value} not found; nothing to delete`,
        })
      }
    }
  }

  yield step(nodes, null, 0, 'search', null, 'done', true, {
    ja: 'デモ完了。連結リストの先頭挿入・末尾挿入・検索・削除を確認しました',
    en: 'Demo complete. Covered insert-front, insert-back, search, and delete on a linked list',
  })
}
