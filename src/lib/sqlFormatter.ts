// SQLフォーマッター
// 外部ライブラリ不要の軽量実装。文字列リテラルとコメントを保護しながら
// キーワードを大文字に統一し、主要節の前に改行を挿入する。

type TokenKind = 'literal' | 'line-comment' | 'block-comment' | 'code'

interface Token {
  kind: TokenKind
  text: string
}

// 大文字化するSQLキーワード（\b でワード境界照合）
// 多くのキーワードを網羅しつつ、テーブル名・カラム名を誤変換しないよう単語境界に限定する
const KEYWORD_RE =
  /\b(select|from|where|join|inner|outer|left|right|full|cross|on|and|or|not|in|between|like|as|distinct|with|case|when|then|else|end|having|limit|offset|into|values|set|begin|commit|rollback|to|savepoint|explain|analyze|null|true|false|references|default|check|unique|serial|integer|bigint|text|varchar|numeric|boolean|timestamp|date|time|group|order|by|union|all|create|drop|alter|table|index|insert|update|delete|primary|foreign|key|char|int|float|double|real|smallint|row_number|rank|dense_rank|lag|lead|sum|count|avg|min|max|coalesce|nullif|cast|over|partition|rows|unbounded|preceding|following|current|generate_series|random|exists|returns|view|constraint|asc|desc)\b/gi

// 節の前に改行を挿入するキーワード。
// 長い複合キーワードを先に並べることで、後の短い単語との誤マッチを防ぐ。
// 例: "INNER JOIN" を先にマッチさせないと "JOIN" が単独でも改行されてしまう。
const CLAUSE_KEYWORDS = [
  'INNER JOIN',
  'LEFT OUTER JOIN',
  'LEFT JOIN',
  'RIGHT OUTER JOIN',
  'RIGHT JOIN',
  'FULL OUTER JOIN',
  'CROSS JOIN',
  'GROUP BY',
  'ORDER BY',
  'PARTITION BY',
  'UNION ALL',
  'UNION',
  'INSERT INTO',
  'DELETE FROM',
  'CREATE TABLE',
  'CREATE INDEX',
  'DROP TABLE',
  'DROP INDEX',
  'ALTER TABLE',
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'HAVING',
  'LIMIT',
  'OFFSET',
]

// 節キーワードを正規表現にまとめる（長いものが先に試される）
const CLAUSE_RE = new RegExp(
  '\\b(' + CLAUSE_KEYWORDS.map((k) => k.replace(/ /g, '\\s+')).join('|') + ')\\b',
  'g'
)

// SQLを文字列リテラル・コメント・コードに分割するトークナイザー。
// 文字列リテラルとコメントの内部はキーワード変換から保護するために分離する。
function tokenizeSql(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  let codeStart = 0

  const flushCode = () => {
    if (i > codeStart) tokens.push({ kind: 'code', text: sql.slice(codeStart, i) })
  }

  while (i < sql.length) {
    // シングルクォート文字列（PostgreSQL の '' エスケープに対応）
    if (sql[i] === "'") {
      flushCode()
      const start = i++
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue }
        if (sql[i] === "'") { i++; break }
        i++
      }
      tokens.push({ kind: 'literal', text: sql.slice(start, i) })
      codeStart = i
      continue
    }

    // 行コメント（-- から行末まで）
    if (sql[i] === '-' && sql[i + 1] === '-') {
      flushCode()
      const start = i
      while (i < sql.length && sql[i] !== '\n') i++
      tokens.push({ kind: 'line-comment', text: sql.slice(start, i) })
      codeStart = i
      continue
    }

    // ブロックコメント（/* ... */）
    if (sql[i] === '/' && sql[i + 1] === '*') {
      flushCode()
      const start = i
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      tokens.push({ kind: 'block-comment', text: sql.slice(start, i) })
      codeStart = i
      continue
    }

    i++
  }

  if (codeStart < sql.length) tokens.push({ kind: 'code', text: sql.slice(codeStart) })
  return tokens
}

// コードトークン内のSQLキーワードを大文字に変換し、主要節前に改行を挿入する
function formatCodePart(code: string): string {
  return code
    .replace(KEYWORD_RE, (m) => m.toUpperCase())
    .replace(CLAUSE_RE, '\n$1')
}

// SQLを整形する。
// 文字列リテラル・コメント内部は変更せず、コード部分のみキーワード大文字化と
// 主要節（SELECT/FROM/WHERE/JOIN 系など）前の改行挿入を行う。
// 各行の余分な空白を除去し、連続する空行を1行に抑制する。
export function formatSql(sql: string): string {
  const tokens = tokenizeSql(sql)
  const assembled = tokens
    .map((t) => (t.kind === 'code' ? formatCodePart(t.text) : t.text))
    .join('')

  return assembled
    .split('\n')
    .map((line) => line.trim())
    .reduce<string[]>((acc, line) => {
      // 連続する空行は1行に抑制する（コメントブロック後の空行乱立を防ぐ）
      const prevIsEmpty = acc.length > 0 && acc[acc.length - 1] === ''
      if (line === '' && prevIsEmpty) return acc
      acc.push(line)
      return acc
    }, [])
    .join('\n')
    .trim()
}
