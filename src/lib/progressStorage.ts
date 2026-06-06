// IndexedDB を使った進捗データの永続化ユーティリティ。
// localStorage より大容量（理論上はディスク容量の 50% 以上）で、
// 長大なコードや SQL を書いてもクォータ超過で失われにくい。

const DB_NAME = 'browser-lab'
const STORE_NAME = 'progress'
const DB_VERSION = 1

// 接続をモジュールスコープでキャッシュし、同一タブ内で再利用する。
// 複数の保存呼び出しが同時に走っても open() は1回で済む。
let dbPromise: Promise<IDBDatabase> | null = null

function getProgressDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      // バージョン1では汎用キーバリューストア1つで十分。
      // 将来のバージョンアップ時は onupgradeneeded でマイグレーションを追加する。
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      // 失敗したらキャッシュを解放し、次回呼び出しで再試行できるようにする。
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

// 指定キーでデータを IndexedDB に保存する。
// プライベートブラウジングや Safari の制限で IDB が使えない場合は静かに失敗する
// （呼び出し側で localStorage にも書いているため、データは失われない）。
export async function saveToIndexedDb(key: string, value: unknown): Promise<void> {
  try {
    const db = await getProgressDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // IDB への書き込みに失敗しても、localStorage 側のデータが残るため無視する
  }
}

// 指定キーのデータを IndexedDB から読み込む。
// localStorage が空の場合（外部からクリアされた等）の復元用。
// 読み込みに失敗した場合は null を返す。
export async function loadFromIndexedDb<T>(key: string): Promise<T | null> {
  try {
    const db = await getProgressDb()
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve((req.result as T) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}
