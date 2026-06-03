import { useState, useEffect, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { TableInfo, QueryResult } from '../../../hooks/usePGLite'

// ---- データ型 ----

interface ForeignKey {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
}

// ---- レイアウト定数 ----

// テーブルボックスの幅と各行の高さ。
// 220px はカラム名 + 型名が収まる最小幅として経験的に決めた値。
const TABLE_W = 220
const HEADER_H = 36
const ROW_H = 26

// テーブル間の余白。FK 矢印のベジェ制御点の折り返し距離にも使う。
const H_GAP = 120
const V_GAP = 80

const SVG_PAD = 40  // SVG の外周余白
const MAX_COLS = 3  // 1行に並べる最大テーブル数

// ---- レイアウト計算ヘルパー ----

function calcTableH(table: TableInfo): number {
  return HEADER_H + table.columns.length * ROW_H
}

// グリッドレイアウトで各テーブルの (x, y) を計算する。
// 行ごとに最も高いテーブルを基準にして次の行の Y を決めるため、
// 各行の最大高さを事前に求めてから Y を積み上げている。
function calcPositions(tables: TableInfo[]): Map<string, { x: number; y: number }> {
  const cols = Math.min(MAX_COLS, tables.length)
  const positions = new Map<string, { x: number; y: number }>()
  let currentY = SVG_PAD
  const totalRows = Math.ceil(tables.length / cols)

  for (let row = 0; row < totalRows; row++) {
    const rowSlice = tables.slice(row * cols, (row + 1) * cols)
    const rowMaxH = Math.max(...rowSlice.map(calcTableH))

    rowSlice.forEach((table, c) => {
      positions.set(table.name, {
        x: SVG_PAD + c * (TABLE_W + H_GAP),
        y: currentY,
      })
    })
    currentY += rowMaxH + V_GAP
  }
  return positions
}

function calcSvgSize(
  tables: TableInfo[],
  positions: Map<string, { x: number; y: number }>
): { width: number; height: number } {
  if (tables.length === 0) return { width: 480, height: 240 }
  const maxX = Math.max(...tables.map(t => (positions.get(t.name)?.x ?? 0) + TABLE_W))
  const maxY = Math.max(...tables.map(t => (positions.get(t.name)?.y ?? 0) + calcTableH(t)))
  return { width: maxX + SVG_PAD, height: maxY + SVG_PAD }
}

// ---- SVG サブコンポーネント ----

interface TableBoxProps {
  table: TableInfo
  pos: { x: number; y: number }
  // "テーブル名.カラム名" 形式のセットで PK/FK を判定する
  pkSet: Set<string>
  fkSet: Set<string>
}

function TableBox({ table, pos, pkSet, fkSet }: TableBoxProps) {
  const h = calcTableH(table)
  const { x, y } = pos

  // ヘッダー部分のパス（上部 2 角だけ丸める）。
  // SVG の rect は 4 角まとめて rx で丸めるしかないため、
  // 下部を角ばらせたいヘッダーは path で描いている。
  const r = 4
  const headerPath = [
    `M ${x + r} ${y}`,
    `L ${x + TABLE_W - r} ${y}`,
    `Q ${x + TABLE_W} ${y} ${x + TABLE_W} ${y + r}`,
    `L ${x + TABLE_W} ${y + HEADER_H}`,
    `L ${x} ${y + HEADER_H}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ')

  return (
    <g>
      {/* ボディ（全体の外枠を兼ねる） */}
      <rect x={x} y={y} width={TABLE_W} height={h} rx={r} fill="#1e293b" stroke="#334155" strokeWidth={1} />

      {/* ヘッダー（上部のみ角丸） */}
      <path d={headerPath} fill="#1d4ed8" />
      <text
        x={x + TABLE_W / 2} y={y + HEADER_H / 2 + 5}
        textAnchor="middle" fill="white"
        fontSize={13} fontWeight="bold" fontFamily="monospace"
      >
        {table.name.length > 20 ? table.name.slice(0, 19) + '…' : table.name}
      </text>

      {/* カラム行 */}
      {table.columns.map((col, i) => {
        const rowY = y + HEADER_H + i * ROW_H
        const key = `${table.name}.${col.name}`
        const isPk = pkSet.has(key)
        const isFk = fkSet.has(key)
        const dotColor = isPk ? '#f59e0b' : isFk ? '#818cf8' : '#475569'
        const nameColor = isPk ? '#fde68a' : isFk ? '#c7d2fe' : '#cbd5e1'

        return (
          <g key={col.name}>
            {i > 0 && (
              <line x1={x + 1} y1={rowY} x2={x + TABLE_W - 1} y2={rowY} stroke="#334155" />
            )}
            {/* PK / FK インジケーターの点 */}
            <circle cx={x + 14} cy={rowY + ROW_H / 2} r={4} fill={dotColor} />
            {/* カラム名 */}
            <text x={x + 26} y={rowY + ROW_H / 2 + 4} fontSize={11} fill={nameColor} fontFamily="monospace">
              {col.name.length > 16 ? col.name.slice(0, 15) + '…' : col.name}
            </text>
            {/* 型名（右端に小さく） */}
            <text
              x={x + TABLE_W - 8} y={rowY + ROW_H / 2 + 4}
              fontSize={10} fill="#64748b" textAnchor="end" fontFamily="sans-serif"
            >
              {col.type.length > 12 ? col.type.slice(0, 11) + '…' : col.type}
            </text>
          </g>
        )
      })}
    </g>
  )
}

interface FkLineProps {
  fk: ForeignKey
  positions: Map<string, { x: number; y: number }>
  tables: TableInfo[]
}

// FK 参照をベジェ曲線で描画する。
// from テーブル（FK 側）の該当カラムから to テーブル（PK 側）の該当カラムへ矢印を引く。
// テーブルの相対位置に応じて接続辺（左 or 右 or 右迂回）を自動選択する。
function FkLine({ fk, positions, tables }: FkLineProps) {
  const fromPos = positions.get(fk.fromTable)
  const toPos = positions.get(fk.toTable)
  const fromTable = tables.find(t => t.name === fk.fromTable)
  const toTable = tables.find(t => t.name === fk.toTable)
  if (!fromPos || !toPos || !fromTable || !toTable) return null

  const fromColIdx = fromTable.columns.findIndex(c => c.name === fk.fromColumn)
  const toColIdx = toTable.columns.findIndex(c => c.name === fk.toColumn)
  if (fromColIdx === -1 || toColIdx === -1) return null

  const fromY = fromPos.y + HEADER_H + fromColIdx * ROW_H + ROW_H / 2
  const toY = toPos.y + HEADER_H + toColIdx * ROW_H + ROW_H / 2

  let fromX: number, toX: number, cp1x: number, cp2x: number

  if (fromPos.x < toPos.x) {
    // FK テーブルが左にある → from の右端 → to の左端
    fromX = fromPos.x + TABLE_W
    toX = toPos.x
    cp1x = fromX + H_GAP / 2
    cp2x = toX - H_GAP / 2
  } else if (fromPos.x > toPos.x) {
    // FK テーブルが右にある → from の左端 → to の右端
    fromX = fromPos.x
    toX = toPos.x + TABLE_W
    cp1x = fromX - H_GAP / 2
    cp2x = toX + H_GAP / 2
  } else {
    // 同一列（自己参照や縦並びの参照）→ 右端の外側を迂回する
    fromX = fromPos.x + TABLE_W
    toX = toPos.x + TABLE_W
    cp1x = fromX + 70
    cp2x = toX + 70
  }

  const d = `M ${fromX} ${fromY} C ${cp1x} ${fromY} ${cp2x} ${toY} ${toX} ${toY}`

  return (
    <path
      d={d}
      fill="none"
      stroke="rgba(129,140,248,0.75)"
      strokeWidth={1.5}
      markerEnd="url(#er-arrow)"
    />
  )
}

// ---- メインコンポーネント ----

interface SchemaViewProps {
  tables: TableInfo[]
  // PGLite に対して情報スキーマクエリを発行するために usePGLite の exec を受け取る
  exec: (sql: string) => Promise<QueryResult>
  isOpen: boolean
  onClose: () => void
}

export function SchemaView({ tables, exec, isOpen, onClose }: SchemaViewProps) {
  const [foreignKeys, setForeignKeys] = useState<ForeignKey[]>([])
  // "テーブル名.カラム名" 形式のセット。O(1) で PK/FK 判定するために使う。
  const [pkSet, setPkSet] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // モーダルが開かれるたびに制約情報を再取得する。
  // テーブルが増減している場合があるため毎回クエリする。
  const fetchConstraints = useCallback(async () => {
    if (tables.length === 0) return
    setIsLoading(true)
    try {
      // PK カラムを取得する
      const pkResult = await exec(
        `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema   = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema    = 'public'`
      )
      const newPkSet = new Set<string>(
        (pkResult.rows as { table_name: string; column_name: string }[])
          .map(r => `${r.table_name}.${r.column_name}`)
      )
      setPkSet(newPkSet)

      // FK 関係を取得する（参照元テーブル・カラム → 参照先テーブル・カラム）
      const fkResult = await exec(
        `SELECT
           tc.table_name   AS from_table,
           kcu.column_name AS from_column,
           ccu.table_name  AS to_table,
           ccu.column_name AS to_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema   = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema   = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema    = 'public'`
      )
      setForeignKeys(
        (fkResult.rows as {
          from_table: string; from_column: string
          to_table: string; to_column: string
        }[]).map(r => ({
          fromTable: r.from_table,
          fromColumn: r.from_column,
          toTable: r.to_table,
          toColumn: r.to_column,
        }))
      )
    } catch {
      // クエリ失敗は無視する（テーブルが存在しない等の想定内エラーの可能性があるため）
    } finally {
      setIsLoading(false)
    }
  }, [tables, exec])

  useEffect(() => {
    if (!isOpen) return
    fetchConstraints()
  }, [isOpen, fetchConstraints])

  // ESC キーで閉じる（HelpModal と同じ方針）
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // FK カラムを "テーブル名.カラム名" で管理し、各カラムが FK かを O(1) で判定する
  const fkColumnSet = new Set<string>(
    foreignKeys.map(fk => `${fk.fromTable}.${fk.fromColumn}`)
  )

  const positions = calcPositions(tables)
  const { width: svgW, height: svgH } = calcSvgSize(tables, positions)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schema-view-title"
    >
      {/* 背景クリックで閉じる */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative flex max-h-[90vh] w-[92vw] max-w-5xl flex-col rounded-lg border border-dark-border bg-dark-sidebar shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">

        {/* ヘッダー */}
        <div className="flex flex-shrink-0 items-center gap-4 border-b border-dark-border px-5 py-3 dark:border-dark-border light:border-light-border">
          <h2
            id="schema-view-title"
            className="text-sm font-semibold text-dark-text dark:text-dark-text light:text-light-text"
          >
            ER 図（スキーマ可視化）
          </h2>
          {/* 凡例 */}
          <div className="flex flex-1 items-center gap-4 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              主キー（PK）
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-400" />
              外部キー（FK）
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-px w-5 bg-indigo-400/70" />
              FK 参照（→ 参照先）
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="ER図を閉じる"
            className="rounded p-1 text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* 本体 */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              <Loader2 size={18} className="animate-spin" />
              スキーマを読み込んでいます...
            </div>
          ) : tables.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              テーブルがまだありません。SQL を実行してテーブルを作成してください。
            </div>
          ) : (
            <svg
              width={svgW}
              height={svgH}
              style={{
                display: 'block',
                background: '#0f172a',
                borderRadius: '8px',
                maxWidth: '100%',
              }}
            >
              <defs>
                {/* FK 参照の矢印マーカー（参照先テーブルの端に表示する） */}
                <marker
                  id="er-arrow"
                  markerWidth="10" markerHeight="8"
                  refX="9" refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 10 4, 0 8" fill="rgba(129,140,248,0.85)" />
                </marker>
              </defs>

              {/* テーブルボックスを先に描き、FK 線をその上に重ねる。
                  線がテーブルの端から出ているように見えるためこの描画順にしている。 */}
              {tables.map((table) => {
                const pos = positions.get(table.name)
                if (!pos) return null
                return (
                  <TableBox
                    key={table.name}
                    table={table}
                    pos={pos}
                    pkSet={pkSet}
                    fkSet={fkColumnSet}
                  />
                )
              })}

              {foreignKeys.map((fk, i) => (
                <FkLine key={i} fk={fk} positions={positions} tables={tables} />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
