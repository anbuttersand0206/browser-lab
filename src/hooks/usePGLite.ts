import { useEffect, useRef, useState } from 'react'
import { PGlite } from '@electric-sql/pglite'
import { generateSqlDump } from '../lib/sqlDump'

export interface QueryResult {
  sql: string
  executedAt: string
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID: number }[]
  rowCount: number
  /** ミリ秒単位の実行時間 */
  durationMs: number
  error?: string
}

/**
 * PGLite（ブラウザ内 PostgreSQL）を管理するフック。
 *
 * @param isEnabled - true になったときに初めて PGLite を初期化する。
 *   false の間は WASM バイナリ（~13 MB）をダウンロードせず、
 *   メモリもほぼ消費しない。
 *   ユーザーがメモリ消費に同意してから true にすることで、
 *   ページロード直後の重いリソース取得を防ぐ。
 */
export function usePGLite(isEnabled: boolean) {
  const dbRef = useRef<PGlite | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])

  useEffect(() => {
    // isEnabled が false の間はリソースをロードしない。
    // ユーザーの同意を得てから true になる想定。
    if (!isEnabled) return

    let isCancelled = false
    ;(async () => {
      try {
        const db = new PGlite()
        await db.waitReady
        // アンマウント後に state 更新しないよう先にチェックする
        if (isCancelled) return
        dbRef.current = db
        setReady(true)
      } catch (e) {
        if (!isCancelled) setError(String(e))
      }
    })()
    return () => {
      isCancelled = true
    }
  }, [isEnabled])

  const exec = async (sql: string): Promise<QueryResult> => {
    const db = dbRef.current
    // ガード節: 同意前や初期化失敗時は db が null のままになる
    if (!db) throw new Error('PGLite が初期化されていません')

    const startTimeMs = performance.now()
    const executedAt = new Date().toISOString()

    try {
      const result = await db.query(sql)
      const durationMs = performance.now() - startTimeMs
      await refreshTables()
      return {
        sql,
        executedAt,
        // PGlite の rows 型は opaque なため、ここで Record 型にキャストして内部型と合わせる
        rows: result.rows as Record<string, unknown>[],
        fields: result.fields,
        rowCount: result.rows.length,
        durationMs,
      }
    } catch (e) {
      const durationMs = performance.now() - startTimeMs
      return {
        sql,
        executedAt,
        rows: [],
        fields: [],
        rowCount: 0,
        durationMs,
        error: String(e),
      }
    }
  }

  const refreshTables = async () => {
    const db = dbRef.current
    if (!db) return
    try {
      const result = await db.query<{
        table_name: string
        column_name: string
        data_type: string
        is_nullable: string
        column_default: string | null
      }>(
        `SELECT t.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
         FROM information_schema.tables t
         JOIN information_schema.columns c ON t.table_name = c.table_name
         WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
         ORDER BY t.table_name, c.ordinal_position`
      )
      const tableMap = new Map<string, ColumnInfo[]>()
      for (const row of result.rows) {
        if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, [])
        // has() で存在確認済みのため non-null アサーションは安全
        tableMap.get(row.table_name)!.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
        })
      }
      setTables(
        Array.from(tableMap.entries()).map(([name, columns]) => ({ name, columns }))
      )
    } catch {
      // refreshTables はクエリ結果の表示に影響しないバックグラウンド同期のため、
      // エラーは無視してサイドバーの更新を単純にスキップする
    }
  }

  /**
   * 現在の PGLite の状態を SQL ダンプ文字列として返す。
   * JSON エクスポート時に databaseSnapshot フィールドへ格納し、
   * 別セッションやプログラミングコースへのDB状態の受け渡しに使う。
   */
  const exportSnapshot = async (): Promise<string> => {
    const db = dbRef.current
    if (!db) return ''
    return generateSqlDump(db)
  }

  return { ready, error, exec, tables, refreshTables, exportSnapshot }
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  default: string | null
}

export interface TableInfo {
  name: string
  columns: ColumnInfo[]
}
