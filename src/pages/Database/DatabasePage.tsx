import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { useNavigate, useParams } from 'react-router-dom'
import { Database, Sun, Moon, ArrowLeft, Play, ChevronRight, HelpCircle, CheckCircle2, AlignLeft, Languages } from 'lucide-react'
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
import { ResourceConsentModal } from '../../components/ResourceConsentModal/ResourceConsentModal'
import { Toolbar } from '../../components/Toolbar/Toolbar'
import { HelpModal } from '../../components/HelpModal/HelpModal'
import { useI18n } from '../../i18n'
import { useCompletedScenarios } from '../../hooks/useCompletedScenarios'
import { databaseScenarios, type DatabaseScenario } from '../../scenarios/database'
import { validateDatabaseExport, extractDatabaseSnapshot } from '../../lib/importValidator'
import { formatSql } from '../../lib/sqlFormatter'
import { judgeDbOutput } from '../../lib/clearJudge'

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
// v2: シナリオごとにSQLを個別保存することで、切り替え後も編集内容が残るようにした
interface DbProgressV2 {
  version: 2
  scenarioId: string
  // シナリオID → 編集中のSQL のマップ。シナリオを切り替えても前の作業が消えない。
  scenarioContents: Record<string, string>
  updatedAt: string
}

// v1 形式（最後の1シナリオのみ保存）。v2 へのマイグレーション用に残す。
interface DbProgressV1 {
  version: 1
  scenarioId: string
  sql: string
  updatedAt: string
}

// JSON.parse 後の unknown を型安全に検証する型ガード（v2）
function isDbProgressV2(value: unknown): value is DbProgressV2 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.version !== 2 || typeof v.scenarioId !== 'string') return false
  // scenarioContents の値がすべて string であることを確認する
  if (typeof v.scenarioContents !== 'object' || v.scenarioContents === null) return false
  return Object.values(v.scenarioContents as object).every((x) => typeof x === 'string')
}

// v1 形式の型ガード（マイグレーション時のみ使用）
function isDbProgressV1(value: unknown): value is DbProgressV1 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && typeof v.scenarioId === 'string' && typeof v.sql === 'string'
}

// 前回終了時のシナリオと各シナリオの SQL を LocalStorage から復元する。
// バージョン不一致・JSON 破損・存在しないシナリオ ID はすべてデフォルトにフォールバック。
// v1 → v2 のマイグレーション: v1 の sql を scenarioId に紐づけて引き継ぐ。
function restoreDbProgress(): { scenario: DatabaseScenario; scenarioContents: Record<string, string> } {
  const defaultResult = { scenario: databaseScenarios[0], scenarioContents: {} }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) return defaultResult

    const parsed: unknown = JSON.parse(raw)

    // v2 形式: そのまま復元する
    if (isDbProgressV2(parsed)) {
      const scenario = databaseScenarios.find((s) => s.id === parsed.scenarioId) ?? databaseScenarios[0]
      return { scenario, scenarioContents: parsed.scenarioContents }
    }

    // v1 形式: 旧データを失わずにマイグレーションする
    if (isDbProgressV1(parsed)) {
      const scenario = databaseScenarios.find((s) => s.id === parsed.scenarioId) ?? databaseScenarios[0]
      return { scenario, scenarioContents: { [scenario.id]: parsed.sql } }
    }

    return defaultResult
  } catch {
    // JSON 破損時はデフォルトで起動する
    return defaultResult
  }
}

export default function DatabasePage() {
  const navigate = useNavigate()
  const { locale, setLocale, t } = useI18n()
  const { scenarioId: urlScenarioId } = useParams<{ scenarioId?: string }>()
  const { resolvedTheme, setTheme } = useTheme()
  const { exportJson, importJson } = useJsonIO()

  // ユーザーがメモリ消費への同意を与えるまで PGLite を起動しない。
  // PGLite の初期化時に ~13 MB の WASM バイナリをダウンロードするため、
  // ページに入るたびに同意を求めてユーザーの意図しないロードを防ぐ。
  const [hasConsented, setHasConsented] = useState(false)

  const { ready, error: dbError, exec, tables, refreshTables, exportSnapshot } = usePGLite(hasConsented)

  // LocalStorage から前回の進捗を一度だけ読む。
  // useState lazy initializer は初回マウント時のみ実行されるため、
  // レンダリングのたびに localStorage を読まないよう防止できる。
  const [savedProgress] = useState(() => restoreDbProgress())

  // URLパラメータのシナリオIDに対応するシナリオオブジェクト
  // 不正なIDの場合は null になりフォールバック先で吸収する
  const urlMatchedScenario = urlScenarioId
    ? (databaseScenarios.find((s) => s.id === urlScenarioId) ?? null)
    : null

  const initialScenario = urlMatchedScenario ?? savedProgress.scenario

  // URLパラメータ → LocalStorage → デフォルトの優先順でシナリオを決定する
  const [scenario, setScenario] = useState<DatabaseScenario>(initialScenario)

  // シナリオごとの編集内容を一括管理する（切り替えても前の作業が消えない）
  const [scenarioContents, setScenarioContents] = useState<Record<string, string>>(
    savedProgress.scenarioContents
  )

  // アクティブシナリオの SQL（保存済み内容があれば復元、なければ initialSQL）
  const initialSql = savedProgress.scenarioContents[initialScenario.id] ?? initialScenario.initialSQL
  const [sql, setSql] = useState<string>(initialSql)
  // savedSql はエクスポート後の状態を保持し、isDirty の基準となる
  const [savedSql, setSavedSql] = useState<string>(initialSql)

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

  // SQL変更時に sql state と scenarioContents を同時に更新するラッパー。
  // 呼び出し元が setSql + setScenarioContents を個別に呼ぶとシナリオIDの
  // クロージャずれが起きやすいため、一か所にまとめる。
  const updateSql = useCallback((newSql: string) => {
    setSql(newSql)
    setScenarioContents((prev) => ({ ...prev, [scenario.id]: newSql }))
  }, [scenario.id])

  // 初回マウント時にURLへシナリオIDを付与する。
  // ページを直接開いた場合（/#/database のみ）に対し、現在のシナリオIDを追加して
  // ブックマークやシェアで直接リンクできるようにする。
  useEffect(() => {
    if (!urlScenarioId) {
      navigate(`/database/${initialScenario.id}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 初回マウント時のみ実行

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
        const shouldApply = confirm(t.confirm.applySnapshot)
        if (shouldApply) {
          const statements = snapshot.split(';').map((s) => s.trim()).filter(Boolean)
          for (const stmt of statements) {
            await exec(stmt + ';')
          }
          await refreshTables()
          alert(t.confirm.snapshotApplied)
        }
        return
      }

      // 通常のDBコースJSON読み込み
      // as キャストの代わりに型ガードでランタイム検証する。
      const result = validateDatabaseExport(raw)
      if (!result.ok) {
        alert(t.confirm.importError(result.reason))
        return
      }
      if (result.data.currentEditorContent) {
        const importedSql = result.data.currentEditorContent
        updateSql(importedSql)
        setSavedSql(importedSql)
      }
    } catch {
      // ファイル未選択・キャンセルの場合は何もしない
    }
  }, [importJson, exec, refreshTables, updateSql])

  const { pendingNav, guardNavigate, confirmSaveAndGo, confirmDiscardAndGo, cancelNavigation } =
    useUnsavedGuard({ isDirty, onSave: handleExport })

  const handleScenarioSelect = (nextScenario: DatabaseScenario) => {
    guardNavigate(() => {
      // 保存済みの編集内容を復元し、なければ初期 SQL を使う
      const nextSql = scenarioContents[nextScenario.id] ?? nextScenario.initialSQL
      setScenario(nextScenario)
      setSql(nextSql)
      setSavedSql(nextSql)
      setLatestResult([])
      // シナリオが変わったら前のクリア通知を隠す
      setShowClearNotification(false)
      // URLを更新してシナリオへの直接リンクを可能にする
      navigate(`/database/${nextScenario.id}`)
    }, `シナリオ「${nextScenario.title}」に移動`)
  }

  // クリア通知の表示フラグ（採点合格時に true になり、タイマーで自動的に消える）
  const [showClearNotification, setShowClearNotification] = useState(false)

  // 採点トリガー用カウンター。実行が完了するたびにインクリメントされる。
  // executeSql の useCallback deps に markCompleted/isCompleted を含めずに済む設計:
  // 採点判定は executeSql の外の useEffect に分離し、このカウンターで起動する。
  const [execCount, setExecCount] = useState(0)
  // 採点対象の最新実行結果を ref で保持する（useEffect の deps から外すため）
  const lastResultsRef = useRef<QueryResult[]>([])

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

      // 採点のために結果を保存し、判定 effect をトリガーする
      lastResultsRef.current = newResults
      setExecCount((c) => c + 1)
    } finally {
      setIsExecuting(false)
    }
  }, [ready, isExecuting, sql, exec, refreshTables])

  const handleTableClick = (tableName: string) => {
    updateSql(`SELECT * FROM ${tableName} LIMIT 100;`)
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
  const debouncedScenarioContents = useDebounce(scenarioContents, SAVE_DEBOUNCE_MS)

  useEffect(() => {
    const progress: DbProgressV2 = {
      version: 2,
      scenarioId: debouncedScenarioId,
      scenarioContents: debouncedScenarioContents,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(LS_KEY, JSON.stringify(progress))
  }, [debouncedScenarioId, debouncedScenarioContents])

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
    !hasConsented ? t.status.idle
    : !ready       ? t.status.pgInit
    : dbError      ? t.status.pgError
    :                t.status.pgRunning

  const isExecuteDisabled = !ready || isExecuting

  const { markCompleted, isCompleted } = useCompletedScenarios()

  // 実行完了のたびにクリア採点を行う。
  // execCount が変化するのは executeSql 完了後のみのため、採点は必要なときだけ走る。
  useEffect(() => {
    // 初回マウント時（execCount === 0）と clearCriteria が未定義のシナリオはスキップ
    if (execCount === 0 || !scenario.clearCriteria) return
    const passed = judgeDbOutput(lastResultsRef.current, scenario.clearCriteria)
    if (passed && !isCompleted('database', scenario.id)) {
      markCompleted('database', scenario.id)
      setShowClearNotification(true)
    }
  }, [execCount, scenario, isCompleted, markCompleted])

  // クリア通知を一定時間後に自動消去する。
  // 通知は採点成功時のみ出るため、timer が動くのは短い間だけ。
  useEffect(() => {
    if (!showClearNotification) return
    const timerId = setTimeout(() => setShowClearNotification(false), 4000)
    return () => clearTimeout(timerId)
  }, [showClearNotification])

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSchemaViewOpen, setIsSchemaViewOpen] = useState(false)

  // シナリオの初期 SQL にリセットする。
  // 誤操作防止のため window.confirm で確認を取ってから実行する。
  const handleReset = () => {
    const confirmed = window.confirm(t.confirm.resetDb(scenario.title))
    if (!confirmed) return
    const initialSql = scenario.initialSQL
    updateSql(initialSql)
    setSavedSql(initialSql)
    setLatestResult([])
  }

  // SQL を整形してエディタに反映する。
  // コード・ガード: PGLite が未起動の場合は整形のみ行い、実行はしない。
  const handleFormat = () => {
    const formatted = formatSql(sql)
    updateSql(formatted)
  }

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
          {t.nav.dbCourse}
        </span>
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 text-xs ${dbStatusTextColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dbStatusDotClass}`} />
          {dbStatusLabel}
        </div>

        <button
          onClick={() => setIsHelpOpen(true)}
          title={t.helpModal.title}
          aria-label={t.helpModal.title}
          className="ml-2 rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <HelpCircle size={14} />
        </button>
        {/* 言語切り替えボタン */}
        <button
          onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
          aria-label={t.locale.switchLabel}
          title={t.locale.switchLabel}
          className="rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <Languages size={14} />
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? t.theme.light : t.theme.dark}
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
              {t.sidebar.scenarios}
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
                <span className="flex-1 leading-relaxed">{s.title}</span>
                {isCompleted('database', s.id) && (
                  <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-green-400" aria-label="完了済み" />
                )}
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
            <QueryHistory queries={queryHistory} onSelect={updateSql} />
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
            onReset={handleReset}
            extra={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleFormat}
                  title={t.toolbar.formatTooltip}
                  aria-label={t.toolbar.format}
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
                >
                  <AlignLeft size={12} />
                  {t.toolbar.format}
                </button>
                <button
                  onClick={executeSql}
                  disabled={isExecuteDisabled}
                  className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
                    isExecuteDisabled
                      ? 'cursor-not-allowed bg-gray-600 text-gray-400'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={t.toolbar.execute}
                >
                  {isExecuting ? (
                    <>
                      <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t.toolbar.executing}
                    </>
                  ) : (
                    <>
                      <Play size={12} />
                      {t.toolbar.execute}
                    </>
                  )}
                </button>
              </div>
            }
          />

          <div style={{ height: paneSizes.editorHeightPx }} className="flex-shrink-0 overflow-hidden">
            {!ready ? (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {hasConsented ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t.status.initializingPostgres}
                  </>
                ) : (
                  <span>{t.status.waitingForPostgres}</span>
                )}
              </div>
            ) : (
              <CodeEditor
                key={scenario.id}
                value={sql}
                onChange={updateSql}
                language="sql"
                onCtrlEnter={executeSql}
                sqlTables={tables.map((tbl) => ({ name: tbl.name, columns: tbl.columns.map((c) => c.name) }))}
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
            currentContent={sql}
            onSolutionViewed={() => markCompleted('database', scenario.id)}
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
        groups={[t.shortcuts.editorCommon, t.shortcuts.db]}
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
          resources={[t.resources.pglite]}
          recommendations={t.recommendations.database}
          onAccept={() => setHasConsented(true)}
          onCancel={() => navigate('/')}
        />
      )}

      {/* クリア通知バナー（採点合格時に表示し、4秒後に自動消去） */}
      {showClearNotification && (
        <button
          type="button"
          onClick={() => setShowClearNotification(false)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-green-500/50 bg-green-500/15 px-4 py-3 text-sm font-medium text-green-400 shadow-lg transition-colors hover:bg-green-500/25"
          aria-label={t.clearNotification}
          aria-live="polite"
        >
          <CheckCircle2 size={16} />
          {t.clearNotification}
        </button>
      )}
    </div>
  )
}
