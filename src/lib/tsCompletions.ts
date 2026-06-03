import type { Completion } from '@codemirror/autocomplete'

// TypeScript のプリミティブ型・ユーティリティ型を補完候補として定義する。
// Language Service なしで使える静的リストだが、学習者が最も頻繁に使う型を網羅している。
const TS_PRIMITIVE_TYPES: Completion[] = [
  { label: 'string',    type: 'type', detail: 'プリミティブ型' },
  { label: 'number',    type: 'type', detail: 'プリミティブ型' },
  { label: 'boolean',   type: 'type', detail: 'プリミティブ型' },
  { label: 'null',      type: 'type', detail: 'null 型' },
  { label: 'undefined', type: 'type', detail: 'undefined 型' },
  { label: 'never',     type: 'type', detail: '到達不可能な型（関数が必ず throw する等）' },
  { label: 'unknown',   type: 'type', detail: 'any の型安全版（使う前に型を絞る必要がある）' },
  { label: 'any',       type: 'type', detail: '型チェックを無効化（なるべく避ける）' },
  { label: 'void',      type: 'type', detail: '返り値なし（関数の戻り値型）' },
  { label: 'object',    type: 'type', detail: '非プリミティブ型' },
  { label: 'bigint',    type: 'type', detail: '任意精度整数' },
  { label: 'symbol',    type: 'type', detail: 'ユニークな識別子' },
]

// TypeScript のユーティリティ型（標準ライブラリで提供される型変換）
const TS_UTILITY_TYPES: Completion[] = [
  { label: 'Partial',       type: 'type', detail: '<T> — 全プロパティを省略可能に' },
  { label: 'Required',      type: 'type', detail: '<T> — 全プロパティを必須に' },
  { label: 'Readonly',      type: 'type', detail: '<T> — 全プロパティを読み取り専用に' },
  { label: 'Record',        type: 'type', detail: '<K, V> — キーと値のマップ型' },
  { label: 'Pick',          type: 'type', detail: '<T, K> — プロパティを選択して部分型を作る' },
  { label: 'Omit',          type: 'type', detail: '<T, K> — プロパティを除外した部分型を作る' },
  { label: 'Exclude',       type: 'type', detail: '<T, U> — ユニオンから U を除外する' },
  { label: 'Extract',       type: 'type', detail: '<T, U> — ユニオンから U に代入可能なものを抽出' },
  { label: 'NonNullable',   type: 'type', detail: '<T> — null と undefined を除去' },
  { label: 'ReturnType',    type: 'type', detail: '<F> — 関数型 F の返り値の型' },
  { label: 'Parameters',    type: 'type', detail: '<F> — 関数型 F の引数型タプル' },
  { label: 'Awaited',       type: 'type', detail: '<T> — Promise<T> を解決した型（T）' },
  { label: 'InstanceType',  type: 'type', detail: '<C> — コンストラクタ C のインスタンス型' },
]

// JavaScript/Node.js のグローバルオブジェクト・関数
// WebContainer 内の TypeScript シナリオで使うものを優先的に列挙している
const JS_GLOBALS: Completion[] = [
  { label: 'console',             type: 'variable', detail: 'Console API',            info: 'console.log / error / warn / table / time / timeEnd' },
  { label: 'Math',                type: 'variable', detail: 'Math ユーティリティ',     info: 'Math.floor / ceil / round / random / abs / max / min / sqrt / pow' },
  { label: 'JSON',                type: 'variable', detail: 'JSON シリアライズ',       info: 'JSON.parse(text) / JSON.stringify(value, null, 2)' },
  { label: 'Date',                type: 'class',    detail: 'Date',                    info: 'new Date() / Date.now() / date.toISOString()' },
  { label: 'Error',               type: 'class',    detail: 'Error',                   info: 'new Error("message") / error.message / error.stack' },
  { label: 'TypeError',           type: 'class',    detail: 'TypeError' },
  { label: 'RangeError',          type: 'class',    detail: 'RangeError' },
  { label: 'Promise',             type: 'class',    detail: 'Promise<T>',              info: 'Promise.all / allSettled / race / resolve / reject' },
  { label: 'Array',               type: 'class',    detail: 'Array<T>',                info: 'Array.from / Array.isArray' },
  { label: 'Object',              type: 'variable', detail: 'Object ユーティリティ',   info: 'Object.keys / values / entries / assign / freeze / fromEntries' },
  { label: 'String',              type: 'class',    detail: 'String コンストラクタ' },
  { label: 'Number',              type: 'class',    detail: 'Number コンストラクタ',   info: 'Number.isNaN / isFinite / isInteger / parseInt / parseFloat' },
  { label: 'Map',                 type: 'class',    detail: 'Map<K, V>',               info: 'new Map() / map.get / set / has / delete / forEach' },
  { label: 'Set',                 type: 'class',    detail: 'Set<T>',                  info: 'new Set() / set.add / has / delete / forEach' },
  { label: 'WeakMap',             type: 'class',    detail: 'WeakMap<K, V>' },
  { label: 'WeakSet',             type: 'class',    detail: 'WeakSet<T>' },
  { label: 'RegExp',              type: 'class',    detail: 'RegExp',                  info: '/pattern/flags / new RegExp(pattern)' },
  { label: 'URL',                 type: 'class',    detail: 'URL パーサー' },
  { label: 'URLSearchParams',     type: 'class',    detail: 'クエリ文字列パーサー' },
  { label: 'AbortController',     type: 'class',    detail: 'AbortController',         info: 'fetch などの非同期操作をキャンセルするために使う' },
  { label: 'setTimeout',          type: 'function', detail: '(fn, delayMs?) => id' },
  { label: 'setInterval',         type: 'function', detail: '(fn, intervalMs) => id' },
  { label: 'clearTimeout',        type: 'function', detail: '(id) => void' },
  { label: 'clearInterval',       type: 'function', detail: '(id) => void' },
  { label: 'parseInt',            type: 'function', detail: '(string, radix?) => number' },
  { label: 'parseFloat',          type: 'function', detail: '(string) => number' },
  { label: 'isNaN',               type: 'function', detail: '(value) => boolean' },
  { label: 'isFinite',            type: 'function', detail: '(value) => boolean' },
  { label: 'encodeURIComponent',  type: 'function', detail: '(string) => string' },
  { label: 'decodeURIComponent',  type: 'function', detail: '(string) => string' },
  { label: 'fetch',               type: 'function', detail: '(url, init?) => Promise<Response>' },
  { label: 'structuredClone',     type: 'function', detail: '<T>(value: T) => T — ディープコピー' },
  { label: 'process',             type: 'variable', detail: 'Node.js process',         info: 'process.env / process.argv / process.exit() — Node.js 専用' },
]

// Express のよく使う型・関数。express パッケージが検出されたときだけ追加する。
// Language Service なしでのパッケージ補完として、シナリオ頻出 API を厳選している。
const EXPRESS_COMPLETIONS: Completion[] = [
  { label: 'express',      type: 'function', detail: '() => Application',           info: 'import express from "express"\nconst app = express()' },
  { label: 'Request',      type: 'type',     detail: 'express.Request',             info: 'req.params / req.query / req.body / req.headers / req.method / req.url' },
  { label: 'Response',     type: 'type',     detail: 'express.Response',            info: 'res.send() / res.json() / res.status() / res.redirect() / res.set()' },
  { label: 'NextFunction', type: 'type',     detail: 'express.NextFunction',        info: 'ミドルウェアで次の処理に進む: next()' },
  { label: 'Router',       type: 'class',    detail: 'express.Router()',            info: 'ルートをモジュール単位に分割するために使う' },
  { label: 'Application',  type: 'type',     detail: 'express.Application',         info: 'express() が返すアプリケーションオブジェクト' },
]

// Kysely のよく使う型・関数。kysely パッケージが検出されたときだけ追加する。
const KYSELY_COMPLETIONS: Completion[] = [
  { label: 'Kysely',       type: 'class',    detail: 'Kysely<DB>',                 info: 'new Kysely({ dialect })\n.selectFrom() / .insertInto() / .updateTable() / .deleteFrom()' },
  { label: 'sql',          type: 'function', detail: 'sql テンプレートタグ',        info: 'sql`SELECT * FROM ${sql.table("users")}`' },
  { label: 'Generated',    type: 'type',     detail: 'Generated<T>',               info: 'SERIAL / AUTO_INCREMENT カラム（INSERT 時は省略可）' },
  { label: 'Insertable',   type: 'type',     detail: 'Insertable<Table>',          info: 'INSERT に渡せるオブジェクトの型' },
  { label: 'Selectable',   type: 'type',     detail: 'Selectable<Table>',          info: 'SELECT 結果の行の型' },
  { label: 'Updateable',   type: 'type',     detail: 'Updateable<Table>',          info: 'UPDATE の set() に渡せるオブジェクトの型' },
]

/**
 * package.json の文字列内容を解析し、インストール済みパッケージに対応する補完候補を返す。
 *
 * TypeScript Language Service（型ファイル読み込み）なしで済む代替手段として、
 * 各シナリオで使うパッケージの主要 API をあらかじめ定義しておく方式を採用している。
 * package.json が壊れていたり dependencies がない場合は空配列を返す。
 */
export function getPackageCompletions(packageJsonContent: string): Completion[] {
  let deps: Record<string, string> = {}
  try {
    const parsed = JSON.parse(packageJsonContent) as { dependencies?: Record<string, string> }
    deps = parsed.dependencies ?? {}
  } catch {
    // JSON パース失敗は無視して空の補完を返す
    return []
  }

  const completions: Completion[] = []
  if ('express' in deps)  completions.push(...EXPRESS_COMPLETIONS)
  if ('kysely'  in deps)  completions.push(...KYSELY_COMPLETIONS)
  return completions
}

// TypeScript・JavaScript 全シナリオ共通のグローバル補完候補。
// CodeEditor に渡してベースの補完リストとして使う。
export const TS_GLOBAL_COMPLETIONS: Completion[] = [
  ...TS_PRIMITIVE_TYPES,
  ...TS_UTILITY_TYPES,
  ...JS_GLOBALS,
]
