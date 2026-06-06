// ハッシュテーブル（チェーン法）の挿入・検索を可視化するジェネレーター。
// ハッシュ関数 h(k) = k % TABLE_SIZE で衝突が起きる様子を示し、
// チェーン内の線形探索がどのように行われるかをステップで追う。

import type { StepGenerator, HashTableState } from '../types'

// 素数のテーブルサイズを使うとハッシュ値が均等に分散する
const TABLE_SIZE = 7

// 挿入する値（意図的に衝突を起こすよう選択）
const INSERT_VALUES = [15, 11, 27, 8, 22, 35, 4, 18]
// 15%7=1, 11%7=4, 27%7=6, 8%7=1, 22%7=1, 35%7=0, 4%7=4, 18%7=4 → バケット1,4に衝突あり

const SEARCH_FOUND     = 22  // バケット1 の 2番目のチェーン要素
const SEARCH_NOT_FOUND = 99  // バケット1 に存在しない

function hashFn(value: number): number {
  return value % TABLE_SIZE
}

function cloneBuckets(buckets: number[][]): number[][] {
  return buckets.map((b) => [...b])
}

function snapshot(
  buckets: number[][],
  currentValue: number | null,
  hashIndex: number | null,
  chainIndex: number | null,
  operation: 'insert' | 'search',
  found: boolean | null,
  phase: HashTableState['phase'],
  done: boolean,
  log: { ja: string; en: string },
): { state: HashTableState; log: { ja: string; en: string } } {
  return {
    state: {
      buckets: cloneBuckets(buckets),
      tableSize: TABLE_SIZE,
      currentValue,
      hashIndex,
      chainIndex,
      operation,
      found,
      phase,
      done,
    },
    log,
  }
}

export function* hashTable(): StepGenerator<HashTableState> {
  const buckets: number[][] = Array.from({ length: TABLE_SIZE }, () => [])

  // 挿入フェーズ
  for (const value of INSERT_VALUES) {
    const h = hashFn(value)

    yield snapshot(buckets, value, null, null, 'insert', null, 'hashing', false, {
      ja: `${value} を挿入: ハッシュ計算 ${value} % ${TABLE_SIZE} = ?`,
      en: `Insert ${value}: compute hash ${value} % ${TABLE_SIZE} = ?`,
    })

    yield snapshot(buckets, value, h, null, 'insert', null, 'hashing', false, {
      ja: `ハッシュ値 = ${h} → バケット[${h}] を選択`,
      en: `Hash = ${h} → select bucket[${h}]`,
    })

    // 既存チェーンを走査して重複確認
    for (let i = 0; i < buckets[h].length; i++) {
      yield snapshot(buckets, value, h, i, 'insert', null, 'traversing', false, {
        ja: `バケット[${h}][${i}] = ${buckets[h][i]} を確認 (重複チェック)`,
        en: `Check bucket[${h}][${i}] = ${buckets[h][i]} (duplicate check)`,
      })
    }

    buckets[h].push(value)
    yield snapshot(buckets, value, h, buckets[h].length - 1, 'insert', null, 'done', false, {
      ja: `${value} をバケット[${h}] に追加 (チェーン長: ${buckets[h].length})`,
      en: `Added ${value} to bucket[${h}] (chain length: ${buckets[h].length})`,
    })
  }

  // 検索フェーズ（成功）
  {
    const h = hashFn(SEARCH_FOUND)
    yield snapshot(buckets, SEARCH_FOUND, null, null, 'search', null, 'hashing', false, {
      ja: `${SEARCH_FOUND} を検索: ハッシュ計算 ${SEARCH_FOUND} % ${TABLE_SIZE} = ?`,
      en: `Search ${SEARCH_FOUND}: compute hash ${SEARCH_FOUND} % ${TABLE_SIZE} = ?`,
    })
    yield snapshot(buckets, SEARCH_FOUND, h, null, 'search', null, 'hashing', false, {
      ja: `ハッシュ値 = ${h} → バケット[${h}] のチェーンを探索`,
      en: `Hash = ${h} → search chain in bucket[${h}]`,
    })
    for (let i = 0; i < buckets[h].length; i++) {
      const matched = buckets[h][i] === SEARCH_FOUND
      yield snapshot(buckets, SEARCH_FOUND, h, i, 'search', matched ? true : null, 'traversing', false, {
        ja: `バケット[${h}][${i}] = ${buckets[h][i]} と比較: ${matched ? '一致 ✓' : '不一致'}`,
        en: `Compare bucket[${h}][${i}] = ${buckets[h][i]}: ${matched ? 'match ✓' : 'no match'}`,
      })
      if (matched) {
        yield snapshot(buckets, SEARCH_FOUND, h, i, 'search', true, 'done', false, {
          ja: `値 ${SEARCH_FOUND} がバケット[${h}][${i}] で見つかりました！`,
          en: `Found ${SEARCH_FOUND} at bucket[${h}][${i}]!`,
        })
        break
      }
    }
  }

  // 検索フェーズ（失敗）
  {
    const h = hashFn(SEARCH_NOT_FOUND)
    yield snapshot(buckets, SEARCH_NOT_FOUND, null, null, 'search', null, 'hashing', false, {
      ja: `${SEARCH_NOT_FOUND} を検索: ハッシュ計算 ${SEARCH_NOT_FOUND} % ${TABLE_SIZE} = ?`,
      en: `Search ${SEARCH_NOT_FOUND}: compute hash ${SEARCH_NOT_FOUND} % ${TABLE_SIZE} = ?`,
    })
    yield snapshot(buckets, SEARCH_NOT_FOUND, h, null, 'search', null, 'hashing', false, {
      ja: `ハッシュ値 = ${h} → バケット[${h}] のチェーンを探索`,
      en: `Hash = ${h} → search chain in bucket[${h}]`,
    })
    for (let i = 0; i < buckets[h].length; i++) {
      yield snapshot(buckets, SEARCH_NOT_FOUND, h, i, 'search', null, 'traversing', false, {
        ja: `バケット[${h}][${i}] = ${buckets[h][i]} と比較: 不一致`,
        en: `Compare bucket[${h}][${i}] = ${buckets[h][i]}: no match`,
      })
    }
    yield snapshot(buckets, SEARCH_NOT_FOUND, h, null, 'search', false, 'done', false, {
      ja: `値 ${SEARCH_NOT_FOUND} はバケット[${h}] に存在しません`,
      en: `Value ${SEARCH_NOT_FOUND} not found in bucket[${h}]`,
    })
  }

  yield snapshot(buckets, null, null, null, 'insert', null, 'idle', true, {
    ja: 'デモ完了。ハッシュ計算・衝突チェーン・挿入・検索を確認しました',
    en: 'Demo complete. You saw hashing, collision chaining, insert, and search',
  })
}
