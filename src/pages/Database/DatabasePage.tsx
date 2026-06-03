import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { useNavigate } from 'react-router-dom'
import { Database, Sun, Moon, ArrowLeft, Play, ChevronRight, HelpCircle } from 'lucide-react'
import { usePGLite, type QueryResult } from '../../hooks/usePGLite'
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard'
import { useJsonIO } from '../../hooks/useJsonIO'
import { useTheme } from '../../hooks/useTheme'
import { CodeEditor } from '../../components/Editor/CodeEditor'
import { ResultGrid } from '../../components/DBClient/ResultGrid/ResultGrid'
import { TableTree } from '../../components/DBClient/TableTree/TableTree'
import { QueryHistory } from '../../components/DBClient/QueryHistory/QueryHistory'
import { SchemaView } from '../../components/DBClient/SchemaView/SchemaView'
import { ScenarioPanel } from '../../components/ScenarioPanel/ScenarioPanel'
import { UnsavedModal } from '../../components/UnsavedModal/UnsavedModal'
import { ResourceConsentModal, type ResourceSpec } from '../../components/ResourceConsentModal/ResourceConsentModal'
import { Toolbar } from '../../components/Toolbar/Toolbar'
import { HelpModal, EDITOR_COMMON_SHORTCUTS, DB_SHORTCUTS } from '../../components/HelpModal/HelpModal'
import { databaseScenarios, type DatabaseScenario } from '../../scenarios/database'
import { validateDatabaseExport, extractDatabaseSnapshot } from '../../lib/importValidator'

// リサイズ可能な3ペインのサイズをまとめて管理する
interface PaneSizes {
  sidebarWidthPx: number
  scenarioWidthPx: number
  editorHeightPx: number
}

type DragTarget = 'sidebar' | 'scenario' | 'editor'

interface DragState {
  target: DragTarget
  startX: number
  startY: number
  startSizePx: number
}

// LocalStorage キー。他コースと競合しないようにプレフィックスを揃える。
const LS_KEY = 'browser-lab:db:progress'

// 入力が止まってから保存するまでの待機時間（ミリ秒）
const SAVE_DEBOUNCE_MS = 1000

// バージョンフィールドを付けることで、将来のデータ形式変更時に
// 古い保存データを安全に棄却できる。
interface DbProgress {
  version: 1
  scenarioId: string
  sql: string
  updatedAt: string
}

// JSON.parse 後の unknown を型安全に検証する型ガード。
// zod を追加しない代わりに最小限のフィールドチェックで代替する。
function isValidDbProgress(value: unknown): value is DbProgress {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && typeof v.scenarioId === 'string' && typeof v.sql === 'string'
}

// 前回終了時のシナリオと SQL を LocalStorage から復元する。
// バージョン不一致・JSON 破損・存在しないシナリオ ID はいずれもデフォルトにフォールバックする。
function restoreDbProgress(): { scenario: DatabaseScenario; sql: string } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) return { scenario: databaseScenarios[0], sql: databaseScenarios[0].initialSQL }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidDbProgress(parsed)) return { scenario: databaseScenarios[0], sql: databaseScenarios[0].initialSQL }
    const scenario = databaseScenarios.find((s) => s.id === parsed.scenarioId) ?? databaseScenarios[0]
    return { scenario, sql: parsed.sql }
  } catch {
    // JSON 破損時はデフォルトで起動する
    return { scenario: databaseScenarios[0], sql: databaseScenarios[0].initialSQL }
  }
}

// PGLite のリソース仕様（同意モーダルに渡す）
// ビルド出力からの実測値: postgres-*.wasm ≈ 8 MB、postgres-*.data ≈ 5 MB
const PGLITE_RESOURCES: ResourceSpec[] = [
  {
    name: 'ブラウザ内 PostgreSQL（PGLite）',
    description:
      'PostgreSQL を WebAssembly でブラウザ内で動作させます。インストール不要で本物の SQL を実行できます。',
    estimatedMemoryRange: '50〜150 MB',
    estimatedDownloadSize: '約 13 MB（WASM + データファイル）',
    cautions: [
      'ページをリロードするとデータベースの内容は消去されます',
      'JSON エクスポートでクエリ履歴を手元に保存できます',
    ],
  },
]

const DATABASE_RECOMMENDATIONS = [
  '空きメモリ 2 GB 以上を推奨します',
  '他のブラウザタブを閉じると動作が安定します',
  'ページリロード前にクエリを JSON エクスポートしてください',
]

export default function DatabasePage() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { exportJson, importJson } = useJsonIO()

  // ユーザーがメモリ消費への同意を与えるまで PGLite を起動しない。
  // PGLite の初期化時に ~13 MB の WASM バイナリをダウンロードするため、
  // ページに入るたびに同意を求めてユーザーの意図しないロードを防ぐ。
  const [hasConsented, setHasConsented] = useState(false)

  const { ready, error: dbError, exec, tables, refreshTables, exportSnapshot } = usePGLite(hasConsented)

  // 前回の進捗を復元する（ページ再訪問時にシナリオ選択と編集内容を引き継ぐ）
  const [scenario, setScenario] = useState<DatabaseScenario>(() => restoreDbProgress().scenario)
  const [sql, setSql] = useState<string>(() => restoreDbProgress().sql)
  // savedSql はエクスポート後の状態を保持し、isDirty の基準となる
  const [savedSql, setSavedSql] = useState<string>(() => restoreDbProgress().sql)
  const [latestResult, setLatestResult] = useState<QueryResult[]>([])
  // queryHistory は JSON エクスポート用に実行済みクエリを蓄積する
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([])
  const [isExecuting, setIsExecuting] = useState(false)

  const isDirty = sql !== savedSql

  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    sidebarWidthPx: 220,
    scenarioWidthPx: 320,
    editorHeightPx: 240,
  })

  const handleExport = useCallback(async () => {
    // 現在のPGLite DBの状態をSQLダンプとして同梱する。
    // プログラミングコースのシナリオ3で読み込むとDBを復元した状態で起動できる。
    const databaseSnapshot = await exportSnapshot()

    exportJson(
      {
        course: 'database',
        exportedAt: new Date().toISOString(),
        scenario: scenario.id,
        queries: queryHistory.map(({ sql, executedAt, rowCount }) => ({ sql, executedAt, rowCount })),
        currentEditorContent: sql,
        ...(databaseSnapshot ? { databaseSnapshot } : {}),
      },
      `browser-lab-${scenario.id}-${Date.now()}.json`
    )
    setSavedSql(sql)
  }, [exportJson, exportSnapshot, scenario.id, queryHistory, sql])

  const handleImport = useCallback(async () => {
    try {
      const raw = await importJson()

      // プログラミングコースのJSONをDBコースに読み込む場合のクロスコース処理。
      // databaseSnapshot を抽出し、現在のDBにテーブル・データを適用する。
      const snapshot = extractDatabaseSnapshot(raw)
      if (snapshot) {
        const shouldApply = confirm(
          'DBスナップショットが見つかりました。\n現在の DB に適用しますか？\n\n' +
          '（CREATE TABLE IF NOT EXISTS で実行するため既存テーブルは上書きされません）'
        )
        if (shouldApply) {
          const statements = snapshot.split(';').map((s) => s.trim()).filter(Boolean)
          for (const stmt of statements) {
            await exec(stmt + ';')
          }
          await refreshTables()
          alert('スナップショットを適用しました。')
        }
        return
      }

      // 通常のDBコースJSON読み込み
      // as キャストの代わりに型ガードでランタイム検証する。
      // SQL 内容の長さ超過や不正なデータ形状をここで排除する。
      const result = validateDatabaseExport(raw)
      if (!result.ok) {
        alert(`読み込みエラー: ${result.reason}`)
        return
      }
      if (result.data.currentEditorContent) {
        setSql(result.data.currentEditorContent)
        setSavedSql(result.data.currentEditorContent)
      }
    } catch {
      // ファイル未選択・キャンセルの場合は何もしない
    }
  }, [importJson, exec, refreshTables])

  const { pendingNav, guardNavigate, confirmSaveAndGo, confirmDiscardAndGo, cancelNavigation } =
    useUnsavedGuard({ isDirty, onSave: handleExport })

  const handleScenarioSelect = (nextScenario: DatabaseScenario) => {
    guardNavigate(() => {
      setScenario(nextScenario)
      setSql(nextScenario.initialSQL)
      setSavedSql(nextScenario.initialSQL)
      setLatestResult([])
    }, `シナリオ「${nextScenario.title}」に移動`)
  }

  // セミコロン区切りで複数ステートメントを順次実行し、最後の結果をグリッドに表示する。
  // PGLite は1クエリずつしか受け付けないため分割して逐次実行する。
  const executeSql = useCallback(async () => {
    if (!ready || isExecuting) return
    setIsExecuting(true)
    try {
      const statements = sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter(Boolean)

      const newResults: QueryResult[] = []
      for (const stmt of statements) {
        const result = await exec(stmt + ';')
        newResults.push(result)
      }

      const lastResult = newResults[newResults.length - 1]
      setLatestResult([lastResult])
      setQueryHistory((prev) => [...prev, ...newResults])
      await refreshTables()
    } finally {
      setIsExecuting(false)
    }
  }, [ready, isExecuting, sql, exec, refreshTables])

  const handleTableClick = (tableName: string) => {
    setSql(`SELECT * FROM ${tableName} LIMIT 100;`)
  }

  // ドラッグ中の状態。mousedown から mousemove/mouseup までを ref で追跡する。
  // state にすると不要な再レンダリングが発生するため ref を使う。
  const dragStateRef = useRef<DragState | null>(null)

  const startDrag = (target: DragTarget, e: React.MouseEvent) => {
    e.preventDefault()
    let startSizePx: number
    if (target === 'sidebar') {
      startSizePx = paneSizes.sidebarWidthPx
    } else if (target === 'scenario') {
      startSizePx = paneSizes.scenarioWidthPx
    } else {
      startSizePx = paneSizes.editorHeightPx
    }
    dragStateRef.current = { target, startX: e.clientX, startY: e.clientY, startSizePx }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return
      const { target, startX, startY, startSizePx } = dragStateRef.current

      if (target === 'sidebar') {
        const newWidth = Math.max(160, Math.min(400, startSizePx + e.clientX - startX))
        setPaneSizes((prev) => ({ ...prev, sidebarWidthPx: newWidth }))
      } else if (target === 'scenario') {
        // シナリオパネルは右端固定なので、右に引っ張ると小さくなる（符号が逆）
        const newWidth = Math.max(200, Math.min(600, startSizePx - (e.clientX - startX)))
        setPaneSizes((prev) => ({ ...prev, scenarioWidthPx: newWidth }))
      } else {
        const newHeight = Math.max(100, Math.min(600, startSizePx + e.clientY - startY))
        setPaneSizes((prev) => ({ ...prev, editorHeightPx: newHeight }))
      }
    }
    const handleMouseUp = () => { dragStateRef.current = null }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // 入力が止まってから SAVE_DEBOUNCE_MS 後に保存する。
  // 1文字ごとに同期書き込みしないための debounce。
  const debouncedScenarioId = useDebounce(scenario.id, SAVE_DEBOUNCE_MS)
  const debouncedSql = useDebounce(sql, SAVE_DEBOUNCE_MS)

  useEffect(() => {
    const progress: DbProgress = {
      version: 1,
      scenarioId: debouncedScenarioId,
      sql: debouncedSql,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(LS_KEY, JSON.stringify(progress))
  }, [debouncedScenarioId, debouncedSql])

  // Ctrl+S / Cmd+S でエクスポートできるようにする。
  // ブラウザ標準の「ページを保存」ダイアログを preventDefault で抑制している。
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key === 's'
      if (!isSaveShortcut) return
      e.preventDefault()
      handleExport()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleExport])

  // ステータスバー表示値を説明変数として先に計算し、JSX 内の条件式を減らす
  // 同意前は「起動待機中」を表示し、意図せず起動していないことをユーザーに示す
  const dbStatusTextColor =
    !hasConsented ? 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
    : !ready       ? 'text-yellow-400'
    : dbError      ? 'text-red-400'
    :                'text-green-400'

  const dbStatusDotClass =
    !hasConsented ? 'bg-gray-500'
    : !ready       ? 'animate-pulse bg-yellow-400'
    : dbError      ? 'bg-red-400'
    :                'bg-green-400'

  const dbStatusLabel =
    !hasConsented ? '起動待機中'
    : !ready       ? 'PGLite 初期化中...'
    : dbError      ? 'エラー'
    :                'PostgreSQL 稼働中'

  const isExecuteDisabled = !ready || isExecuting

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSchemaViewOpen, setIsSchemaViewOpen] = useState(false)

  return (
    <div className="flex h-full flex-col bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      <div className="flex h-9 flex-shrink-0 items-center gap-2 border-b border-dark-border bg-dark-tab px-3 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
        <button
          onClick={() => guardNavigate(() => navigate('/'), 'トップページに戻る')}
          className="flex items-center gap-1 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <ArrowLeft size={13} />
          Browser Lab
        </button>
        <span className="text-dark-textDim">/</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
          <Database size={13} />
          DB学習コース
        </span>
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 text-xs ${dbStatusTextColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dbStatusDotClass}`} />
          {dbStatusLabel}
        </div>

        <button
          onClick={() => setIsHelpOpen(true)}
          title="キーボードショートカット一覧"
          aria-label="キーボードショートカット一覧を表示"
          className="ml-2 rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <HelpCircle size={14} />
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          className="rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          style={{ width: paneSizes.sidebarWidthPx }}
          className="flex flex-shrink-0 flex-col overflow-hidden border-r border-dark-border bg-dark-sidebar dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        >
          <div className="border-b border-dark-border dark:border-dark-border light:border-light-border">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              シナリオ
            </div>
            {databaseScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => handleScenarioSelect(s)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  scenario.id === s.id
                    ? 'bg-dark-active text-dark-text dark:bg-dark-active dark:text-dark-text light:bg-light-active light:text-light-text'
                    : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                }`}
              >
                <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-green-400" />
                <span className="leading-relaxed">{s.title}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            <TableTree
              tables={tables}
              onTableClick={handleTableClick}
              onShowSchema={() => setIsSchemaViewOpen(true)}
            />
            {/* 実行済みクエリを履歴として表示し、クリックでエディタに再読み込みできる */}
            <QueryHistory queries={queryHistory} onSelect={setSql} />
          </div>
        </div>

        <div
          className="resize-handle"
          onMouseDown={(e) => startDrag('sidebar', e)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            isDirty={isDirty}
            onSave={handleExport}
            onLoad={handleImport}
            extra={
              <button
                onClick={executeSql}
                disabled={isExecuteDisabled}
                className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
                  isExecuteDisabled
                    ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title="Ctrl+Enter でも実行できます"
              >
                {isExecuting ? (
                  <>
                    <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    実行中...
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    実行 (Ctrl+Enter)
                  </>
                )}
              </button>
            }
          />

          <div style={{ height: paneSizes.editorHeightPx }} className="flex-shrink-0 overflow-hidden">
            {!ready ? (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {hasConsented ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    PostgreSQLを初期化しています...
                  </>
                ) : (
                  <span>同意後に PostgreSQL を起動します</span>
                )}
              </div>
            ) : (
              <CodeEditor
                key={scenario.id}
                value={sql}
                onChange={setSql}
                language="sql"
                onCtrlEnter={executeSql}
                sqlTables={tables.map((t) => ({ name: t.name, columns: t.columns.map((c) => c.name) }))}
              />
            )}
          </div>

          <div
            className="resize-handle-horizontal"
            onMouseDown={(e) => startDrag('editor', e)}
          />

          <div className="flex-1 overflow-hidden border-t border-dark-border dark:border-dark-border light:border-light-border">
            <ResultGrid results={latestResult} />
          </div>
        </div>

        <div
          className="resize-handle"
          onMouseDown={(e) => startDrag('scenario', e)}
        />

        <div
          style={{ width: paneSizes.scenarioWidthPx }}
          className="flex-shrink-0 overflow-hidden border-l border-dark-border dark:border-dark-border light:border-light-border"
        >
          {/* シナリオ変更時に ScenarioPanel を再マウントし、ヒント開示数・解答表示状態をリセットする */}
          <ScenarioPanel
            key={scenario.id}
            title={scenario.title}
            description={scenario.description}
            hints={scenario.hints}
            solution={scenario.solution}
          />
        </div>
      </div>

      <UnsavedModal
        isOpen={pendingNav !== null}
        onSaveAndGo={confirmSaveAndGo}
        onDiscardAndGo={confirmDiscardAndGo}
        onCancel={cancelNavigation}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        groups={[EDITOR_COMMON_SHORTCUTS, DB_SHORTCUTS]}
      />

      <SchemaView
        tables={tables}
        exec={exec}
        isOpen={isSchemaViewOpen}
        onClose={() => setIsSchemaViewOpen(false)}
      />

      {/* 同意前はコース全体を覆うモーダルを表示し、PGLite の起動をブロックする */}
      {!hasConsented && (
        <ResourceConsentModal
          courseName="DB 学習コース"
          resources={PGLITE_RESOURCES}
          recommendations={DATABASE_RECOMMENDATIONS}
          onAccept={() => setHasConsented(true)}
          onCancel={() => navigate('/')}
        />
      )}
    </div>
  )
}
