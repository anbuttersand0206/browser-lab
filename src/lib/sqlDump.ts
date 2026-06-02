import type { PGlite } from '@electric-sql/pglite'

/**
 * PGLite インスタンスの現在の状態から SQL ダンプ文字列を生成する。
 *
 * 生成した SQL を別のコースや別セッションで実行することで、
 * テーブル構造とデータを再現できる。
 *
 * 学習用途の簡易実装のため以下は省略している:
 *   - FOREIGN KEY / CHECK / UNIQUE 制約（NOT NULL のみ再現）
 *   - インデックス
 *   - VIEW / TRIGGER / FUNCTION
 *   - 主キー以外のシーケンス設定
 *
 * SERIAL カラム（nextval デフォルト）は `SERIAL PRIMARY KEY` として再現する。
 */
export async function generateSqlDump(db: PGlite): Promise<string> {
  const tablesResult = await db.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  )

  if (tablesResult.rows.length === 0) return ''

  const lines: string[] = [
    '-- Browser Lab DB Snapshot',
    `-- Generated: ${new Date().toISOString()}`,
    '',
  ]

  for (const { table_name } of tablesResult.rows) {
    const columns = await db.query<{
      column_name: string
      data_type: string
      character_maximum_length: number | null
      is_nullable: string
      column_default: string | null
    }>(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table_name]
    )

    const colDefs = columns.rows.map((col) => {
      // nextval デフォルトは SERIAL（自動採番）カラムを示す。
      // シーケンス名は環境依存なので SERIAL PRIMARY KEY に正規化して移植可能な形で出力する。
      if (col.column_default?.includes('nextval')) {
        return `  ${col.column_name} SERIAL PRIMARY KEY`
      }

      // VARCHAR(N) のように文字数上限がある場合は型名に括弧を付ける
      const lengthSuffix =
        col.character_maximum_length !== null ? `(${col.character_maximum_length})` : ''
      const typeName = `${col.data_type.toUpperCase()}${lengthSuffix}`

      // ガイド 6.3: const を優先し再代入を避ける。
      // 各節を説明変数として切り出すことでカラム定義の構造が一目で分かる。
      const notNullClause = col.is_nullable === 'NO' ? ' NOT NULL' : ''
      const defaultClause = col.column_default !== null ? ` DEFAULT ${col.column_default}` : ''

      return `  ${col.column_name} ${typeName}${notNullClause}${defaultClause}`
    })

    lines.push(`CREATE TABLE IF NOT EXISTS ${table_name} (`)
    lines.push(colDefs.join(',\n'))
    lines.push(');')
    lines.push('')

    // 行データを INSERT 文として出力する
    const rowsResult = await db.query<Record<string, unknown>>(
      `SELECT * FROM ${table_name}`
    )
    for (const row of rowsResult.rows) {
      const colNames = Object.keys(row)
      const valueLiterals = Object.values(row).map(toSqlLiteral)
      lines.push(
        `INSERT INTO ${table_name} (${colNames.join(', ')}) VALUES (${valueLiterals.join(', ')});`
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * JavaScript の値を PostgreSQL のリテラル文字列に変換する。
 *
 * PGLite は TIMESTAMP 型の値を Date オブジェクトとして返すため、
 * そのまま String() すると "Mon Jun 02 2026 ..." のような非 SQL 形式になってしまう。
 * toISOString() は PostgreSQL が解釈できる ISO 8601 形式（UTC）を出力する。
 */
function toSqlLiteral(v: unknown): string {
  if (v === null) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  // Date の instanceof チェックは typeof より前に行う（typeof Date は 'object'）
  if (v instanceof Date) return `'${v.toISOString()}'`
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
  return String(v)
}
