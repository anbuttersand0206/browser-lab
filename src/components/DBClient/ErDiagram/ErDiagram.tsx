// 現在のスキーマから ER 図を SVG として描画するコンポーネント。
// usePGLite が返す TableInfo[] を受け取りグリッドレイアウトで配置する。
// 外部キー情報は information_schema から別途取得する必要があるため、
// このバージョンではテーブル構造のみを可視化する（テーブル間の矢印は省略）。

import type { TableInfo } from '../../../hooks/usePGLite'

interface ErDiagramProps {
  tables: TableInfo[]
}

// 1テーブルあたりのボックスサイズ
const BOX_WIDTH = 180
const HEADER_HEIGHT = 28
const ROW_HEIGHT = 20
const PADDING = 20
const COLS = 3

function tableBoxHeight(table: TableInfo): number {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 4
}

export function ErDiagram({ tables }: ErDiagramProps) {
  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        テーブルがありません。DDL を実行してからご確認ください。
      </div>
    )
  }

  // グリッド配置: COLS 列で折り返す
  const positions = tables.map((table, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const prevRowTables = tables.slice(row * COLS, row * COLS)
    // 同じ行の最大高さを求めてオフセットを計算する
    let yOffset = PADDING
    for (let r = 0; r < row; r++) {
      const rowTables = tables.slice(r * COLS, r * COLS + COLS)
      const maxH = Math.max(...rowTables.map((t) => tableBoxHeight(t)))
      yOffset += maxH + PADDING
    }
    void prevRowTables
    return {
      table,
      x: PADDING + col * (BOX_WIDTH + PADDING),
      y: yOffset,
    }
  })

  const totalRows = Math.ceil(tables.length / COLS)
  let svgHeight = PADDING
  for (let r = 0; r < totalRows; r++) {
    const rowTables = tables.slice(r * COLS, r * COLS + COLS)
    const maxH = Math.max(...rowTables.map((t) => tableBoxHeight(t)))
    svgHeight += maxH + PADDING
  }
  const svgWidth = PADDING + COLS * (BOX_WIDTH + PADDING)

  return (
    <div className="h-full overflow-auto p-2">
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        className="font-mono text-[11px]"
        aria-label="ER図"
      >
        {positions.map(({ table, x, y }) => {
          const boxH = tableBoxHeight(table)
          return (
            <g key={table.name}>
              {/* テーブル枠 */}
              <rect
                x={x}
                y={y}
                width={BOX_WIDTH}
                height={boxH}
                rx={4}
                className="fill-dark-sidebar stroke-dark-border dark:fill-dark-sidebar dark:stroke-dark-border"
                fill="#252526"
                stroke="#3e3e42"
                strokeWidth={1}
              />
              {/* テーブル名ヘッダー背景 */}
              <rect
                x={x}
                y={y}
                width={BOX_WIDTH}
                height={HEADER_HEIGHT}
                rx={4}
                fill="#0078d4"
                opacity={0.85}
              />
              {/* 角を丸くするためヘッダー下部を直角に上書き */}
              <rect
                x={x}
                y={y + HEADER_HEIGHT - 4}
                width={BOX_WIDTH}
                height={4}
                fill="#0078d4"
                opacity={0.85}
              />
              {/* テーブル名 */}
              <text
                x={x + BOX_WIDTH / 2}
                y={y + HEADER_HEIGHT / 2 + 4}
                textAnchor="middle"
                fill="white"
                fontWeight="bold"
                fontSize={11}
              >
                {table.name}
              </text>

              {/* カラム行 */}
              {table.columns.map((col, ci) => {
                const rowY = y + HEADER_HEIGHT + ci * ROW_HEIGHT
                const isLast = ci === table.columns.length - 1
                return (
                  <g key={col.name}>
                    {/* カラム行の区切り線（最終行は省略） */}
                    {!isLast && (
                      <line
                        x1={x + 4}
                        y1={rowY + ROW_HEIGHT}
                        x2={x + BOX_WIDTH - 4}
                        y2={rowY + ROW_HEIGHT}
                        stroke="#3e3e42"
                        strokeWidth={0.5}
                      />
                    )}
                    {/* カラム名 */}
                    <text
                      x={x + 8}
                      y={rowY + ROW_HEIGHT / 2 + 4}
                      fill={col.nullable ? '#858585' : '#cccccc'}
                      fontSize={10}
                    >
                      {col.nullable ? col.name : `${col.name}*`}
                    </text>
                    {/* カラム型（右寄せ） */}
                    <text
                      x={x + BOX_WIDTH - 8}
                      y={rowY + ROW_HEIGHT / 2 + 4}
                      textAnchor="end"
                      fill="#4e9a92"
                      fontSize={9}
                    >
                      {col.type}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      {/* 凡例 */}
      <div className="mt-2 flex items-center gap-4 px-2 text-[10px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        <span><span className="text-dark-text">col*</span> = NOT NULL</span>
        <span><span className="text-dark-textDim">col</span> = nullable</span>
        <span><span style={{ color: '#4e9a92' }}>型名</span> = データ型</span>
      </div>
    </div>
  )
}
