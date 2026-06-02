/**
 * JSON インポートのランタイム検証モジュール。
 *
 * JSON.parse の戻り値は unknown であり、`as` キャストはコンパイル時の型チェックを
 * 回避するだけでランタイム保護がない。ユーザーが意図的・意図せず不正な JSON を
 * 読み込んだ場合に備え、この型ガード群でデータ形状・値の範囲を検証する。
 *
 * また、攻撃者が細工した JSON で以下を試みることを防ぐ:
 *   - ファイルパスに `../` を含めて WebContainer のファイルシステムを汚染する
 *   - 巨大なペイロードでメモリを枯渇させる（DoS）
 */

// --- サイズ上限 ---

/** 読み込めるファイル全体のバイト上限。巨大な JSON による DoS を防ぐ。 */
export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/** 1 ファイルのコード内容の文字数上限 */
const MAX_FILE_CONTENT_LENGTH = 500_000

/** SQL エディタ内容の文字数上限 */
const MAX_SQL_CONTENT_LENGTH = 100_000

/**
 * DB スナップショット（SQL ダンプ）の文字数上限。
 * テーブルデータを含むため通常の SQL 入力より大きな値を許容する。
 */
const MAX_SNAPSHOT_LENGTH = 5_000_000 // 5 MB 相当

/** インポートできるファイルエントリ数の上限 */
const MAX_FILE_COUNT = 20

/** ファイルパスの最大文字数 */
const MAX_FILEPATH_LENGTH = 128

// --- ファイルパス安全性 ---

/**
 * WebContainer にマウントするファイルパスが安全かどうかを検証する。
 *
 * 許可する文字: 英数字・ハイフン・アンダースコア・ドット・スラッシュ。
 * 禁止する理由:
 *   - `..` : パストラバーサルで意図しないディレクトリを上書きする攻撃を防ぐ
 *   - 先頭 `/` : 絶対パスによるルートファイルシステムへのアクセスを防ぐ
 *   - 制御文字・空白 : シェルやパーサーでの予期しない解釈を防ぐ
 */
export function isSafeFilePath(path: string): boolean {
  if (!path || path.length > MAX_FILEPATH_LENGTH) return false
  // 先頭と末尾が英数字またはアンダースコア、中間にスラッシュ可
  if (!/^[a-zA-Z0-9_][a-zA-Z0-9_./-]*$/.test(path)) return false
  // パストラバーサル禁止
  if (path.includes('..')) return false
  // 絶対パス禁止
  if (path.startsWith('/')) return false
  return true
}

// --- 型判定ユーティリティ ---

/**
 * JSON.parse が返したオブジェクトが「プレーンオブジェクト」かどうかを確認する。
 * Array・null・プリミティブを除外し、プロトタイプが Object.prototype のものだけを許可する。
 * プロトタイプチェーンを確認することでクラスインスタンスの偽装も検出できる。
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  )
}

// --- エクスポート型定義 ---

export interface ProgrammingExport {
  course: 'programming'
  exportedAt: string
  scenario: string
  files: Record<string, string>
  /** DB スナップショット（SQL ダンプ）。コース間でDBを共有するために使う。省略可能。 */
  databaseSnapshot?: string
}

export interface DatabaseExport {
  course: 'database'
  exportedAt: string
  scenario: string
  currentEditorContent: string
  /** DB スナップショット（SQL ダンプ）。コース間でDBを共有するために使う。省略可能。 */
  databaseSnapshot?: string
}

// --- バリデーション結果型（Result パターン） ---

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string }

// --- プログラミングコース インポート検証 ---

/**
 * プログラミングコース用 JSON のスキーマを検証する。
 *
 * 特にファイルパスの安全性チェックが重要。悪意ある JSON が
 * `"../node_modules/react/index.js"` のようなパスを含む場合、
 * WebContainer のファイルシステム上の既存ファイルを上書きできてしまう。
 */
export function validateProgrammingExport(
  raw: unknown
): ValidationResult<ProgrammingExport> {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: 'JSON のルートがオブジェクトではありません' }
  }
  if (raw['course'] !== 'programming') {
    return { ok: false, reason: 'このファイルはプログラミングコース用ではありません' }
  }

  const filesRaw = raw['files']
  if (filesRaw !== undefined) {
    if (!isPlainObject(filesRaw)) {
      return { ok: false, reason: 'files フィールドがオブジェクトではありません' }
    }

    const entries = Object.entries(filesRaw)

    if (entries.length > MAX_FILE_COUNT) {
      return { ok: false, reason: `ファイル数が上限 (${MAX_FILE_COUNT}) を超えています` }
    }

    for (const [filePath, content] of entries) {
      // ファイルパスのパストラバーサルチェック
      if (!isSafeFilePath(filePath)) {
        return { ok: false, reason: `安全でないファイルパスが含まれています: "${filePath}"` }
      }
      if (typeof content !== 'string') {
        return { ok: false, reason: `"${filePath}" の内容が文字列ではありません` }
      }
      if (content.length > MAX_FILE_CONTENT_LENGTH) {
        return {
          ok: false,
          reason: `"${filePath}" の内容が上限 (${MAX_FILE_CONTENT_LENGTH.toLocaleString()} 文字) を超えています`,
        }
      }
    }
  }

  const snapshot = raw['databaseSnapshot']
  if (snapshot !== undefined) {
    if (typeof snapshot !== 'string') {
      return { ok: false, reason: 'databaseSnapshot が文字列ではありません' }
    }
    if (snapshot.length > MAX_SNAPSHOT_LENGTH) {
      return { ok: false, reason: 'databaseSnapshot のサイズが上限を超えています' }
    }
  }

  return {
    ok: true,
    data: {
      course: 'programming',
      exportedAt: typeof raw['exportedAt'] === 'string' ? raw['exportedAt'] : '',
      scenario: typeof raw['scenario'] === 'string' ? raw['scenario'] : '',
      files: isPlainObject(filesRaw) ? (filesRaw as Record<string, string>) : {},
      databaseSnapshot: typeof snapshot === 'string' ? snapshot : undefined,
    },
  }
}

// --- DB コース インポート検証 ---

export function validateDatabaseExport(
  raw: unknown
): ValidationResult<DatabaseExport> {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: 'JSON のルートがオブジェクトではありません' }
  }
  if (raw['course'] !== 'database') {
    return { ok: false, reason: 'このファイルは DB 学習コース用ではありません' }
  }

  const content = raw['currentEditorContent']
  if (content !== undefined) {
    if (typeof content !== 'string') {
      return { ok: false, reason: 'currentEditorContent が文字列ではありません' }
    }
    if (content.length > MAX_SQL_CONTENT_LENGTH) {
      return {
        ok: false,
        reason: `SQL の内容が上限 (${MAX_SQL_CONTENT_LENGTH.toLocaleString()} 文字) を超えています`,
      }
    }
  }

  const snapshot = raw['databaseSnapshot']
  if (snapshot !== undefined) {
    if (typeof snapshot !== 'string') {
      return { ok: false, reason: 'databaseSnapshot が文字列ではありません' }
    }
    if (snapshot.length > MAX_SNAPSHOT_LENGTH) {
      return { ok: false, reason: 'databaseSnapshot のサイズが上限を超えています' }
    }
  }

  return {
    ok: true,
    data: {
      course: 'database',
      exportedAt: typeof raw['exportedAt'] === 'string' ? raw['exportedAt'] : '',
      scenario: typeof raw['scenario'] === 'string' ? raw['scenario'] : '',
      currentEditorContent: typeof content === 'string' ? content : '',
      databaseSnapshot: typeof snapshot === 'string' ? snapshot : undefined,
    },
  }
}

/**
 * コースの種類を問わず JSON から databaseSnapshot を取り出す。
 * プログラミングコースが DB コース JSON をインポートする場合など
 * クロスコース共有で使う。
 *
 * サイズ上限を超える場合は null を返して安全側に倒す。
 */
export function extractDatabaseSnapshot(raw: unknown): string | null {
  if (!isPlainObject(raw)) return null
  const snapshot = raw['databaseSnapshot']
  if (typeof snapshot !== 'string') return null
  if (snapshot.length > MAX_SNAPSHOT_LENGTH) return null
  return snapshot || null
}
