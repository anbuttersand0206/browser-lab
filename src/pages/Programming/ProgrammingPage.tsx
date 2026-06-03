import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { useNavigate, useParams } from 'react-router-dom'
import { Zap, Sun, Moon, ArrowLeft, ChevronRight, HelpCircle, Plus, Check, X, CheckCircle2 } from 'lucide-react'
import { useWebContainer, type ContainerStatus } from '../../hooks/useWebContainer'
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard'
import { useJsonIO } from '../../hooks/useJsonIO'
import { useTheme } from '../../hooks/useTheme'
import { CodeEditor } from '../../components/Editor/CodeEditor'
import { Console } from '../../components/Console/Console'
import { ScenarioPanel } from '../../components/ScenarioPanel/ScenarioPanel'
import { UnsavedModal } from '../../components/UnsavedModal/UnsavedModal'
import { ResourceConsentModal, type ResourceSpec } from '../../components/ResourceConsentModal/ResourceConsentModal'
import { Toolbar } from '../../components/Toolbar/Toolbar'
import { HelpModal, EDITOR_COMMON_SHORTCUTS } from '../../components/HelpModal/HelpModal'
import { programmingScenarios, type ProgrammingScenario } from '../../scenarios/programming'
import { validateProgrammingExport, extractDatabaseSnapshot } from '../../lib/importValidator'
import { getPackageCompletions } from '../../lib/tsCompletions'
import { useCompletedScenarios } from '../../hooks/useCompletedScenarios'

// リサイズ可能な3ペインのサイズをまとめて管理する
interface PaneSizes {
  sidebarWidthPx: number
  scenarioWidthPx: number
  consoleHeightPx: number
}

type DragTarget = 'sidebar' | 'scenario' | 'console'

interface DragState {
  target: DragTarget
  startX: number
  startY: number
  startSizePx: number
}

// LocalStorage キー。他コースと競合しないようにプレフィックスを揃える。
const LS_KEY = 'browser-lab:prog:progress'

// 入力が止まってから保存するまでの待機時間（ミリ秒）
const SAVE_DEBOUNCE_MS = 1000

// v2: シナリオごとにファイル群を個別保存することで、切り替えても作業内容が残るようにした
interface ProgProgressV2 {
  version: 2
  scenarioId: string
  // シナリオID → ファイル群 のマップ
  scenarioContents: Record<string, Record<string, string>>
  updatedAt: string
}

// v1 形式（最後の1シナリオのみ保存）。v2 へのマイグレーション用に残す。
interface ProgProgressV1 {
  version: 1
  scenarioId: string
  files: Record<string, string>
  updatedAt: string
}

// files の値がすべて string であることを検証するヘルパー
function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value as object).every((v) => typeof v === 'string')
}

// Record<string, Record<string, string>> の型ガード
function isFilesMap(value: unknown): value is Record<string, Record<string, string>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value as object).every(isStringRecord)
}

// JSON.parse 後の unknown を型安全に検証する型ガード（v2）
function isProgProgressV2(value: unknown): value is ProgProgressV2 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 2 && typeof v.scenarioId === 'string' && isFilesMap(v.scenarioContents)
}

// v1 形式の型ガード（マイグレーション時のみ使用）
function isProgProgressV1(value: unknown): value is ProgProgressV1 {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && typeof v.scenarioId === 'string' && isStringRecord(v.files)
}

// 前回終了時のシナリオとファイル群を LocalStorage から復元する。
// バージョン不一致・JSON 破損・存在しないシナリオ ID はすべてデフォルトにフォールバック。
// v1 → v2 のマイグレーション: v1 の files を scenarioId に紐づけて引き継ぐ。
function restoreProgrammingProgress(): {
  scenario: ProgrammingScenario
  scenarioContents: Record<string, Record<string, string>>
} {
  const defaultResult = { scenario: programmingScenarios[0], scenarioContents: {} }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) return defaultResult

    const parsed: unknown = JSON.parse(raw)

    // v2 形式: そのまま復元する
    if (isProgProgressV2(parsed)) {
      const scenario = programmingScenarios.find((s) => s.id === parsed.scenarioId) ?? programmingScenarios[0]
      return { scenario, scenarioContents: parsed.scenarioContents }
    }

    // v1 形式: 旧データを失わずにマイグレーションする
    if (isProgProgressV1(parsed)) {
      const scenario = programmingScenarios.find((s) => s.id === parsed.scenarioId) ?? programmingScenarios[0]
      return { scenario, scenarioContents: { [scenario.id]: parsed.files } }
    }

    return defaultResult
  } catch {
    // JSON 破損時はデフォルトで起動する
    return defaultResult
  }
}

// ファイル名から言語バッジ文字列を返す。
// サイドバーの狭いスペースで拡張子を視覚的に区別するための短縮表記。
function getFileBadge(filename: string): string {
  if (filename.endsWith('.json'))                     return '{}'
  if (filename.endsWith('.sql'))                      return 'SQL'
  if (filename.endsWith('.tsx'))                      return 'TSX'
  if (filename.endsWith('.ts'))                       return 'TS'
  if (filename.endsWith('.js') || filename.endsWith('.mjs')) return 'JS'
  if (filename.endsWith('.html'))                     return 'HTML'
  if (filename.endsWith('.css'))                      return 'CSS'
  return '...'
}

// ContainerStatus をステータスバー表示用の文字列・色に変換する
function getStatusTextColor(status: ContainerStatus): string {
  if (status === 'booting') return 'text-yellow-400'
  if (status === 'running') return 'text-green-400'
  if (status === 'error') return 'text-red-400'
  return 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
}

function getStatusDotClass(status: ContainerStatus): string {
  if (status === 'booting') return 'animate-pulse bg-yellow-400'
  if (status === 'running') return 'animate-pulse bg-green-400'
  if (status === 'error') return 'bg-red-400'
  return 'bg-gray-500'
}

function getStatusLabel(status: ContainerStatus, hasConsented: boolean): string {
  // 同意前は「起動待機中」を表示し、意図せず起動していないことをユーザーに示す
  if (!hasConsented) return '起動待機中'
  if (status === 'booting') return 'WebContainer 起動中...'
  if (status === 'running') return '実行中'
  if (status === 'error') return 'エラー'
  return '準備完了'
}

// WebContainers のリソース仕様（同意モーダルに渡す）
const WEBCONTAINER_RESOURCES: ResourceSpec[] = [
  {
    name: 'Node.js 実行環境（WebContainers）',
    description:
      'ブラウザ内で完全な Node.js が動作します。npm install から実行まで、すべてブラウザ内で完結します。',
    estimatedMemoryRange: '200〜500 MB',
    estimatedDownloadSize: null,
    cautions: [
      '初回 npm install に数秒〜数十秒かかります',
      'npm パッケージのダウンロードにネットワーク接続が必要です',
      'シナリオを切り替えるたびに npm install が走ります',
    ],
  },
]

const PROGRAMMING_RECOMMENDATIONS = [
  '空きメモリ 4 GB 以上を推奨します',
  '安定したネットワーク接続を推奨します（npm install に使用）',
  '他のブラウザタブを閉じると動作が安定します',
]

export default function ProgrammingPage() {
  const navigate = useNavigate()
  const { scenarioId: urlScenarioId } = useParams<{ scenarioId?: string }>()
  const { resolvedTheme, setTheme } = useTheme()
  const { exportJson, importJson } = useJsonIO()

  // ユーザーがメモリ消費への同意を与えるまで WebContainers を起動しない。
  // コースページに入るたびに同意を求め、ユーザーが意図せず重いリソースを
  // ロードしてしまうことを防ぐ。
  const [hasConsented, setHasConsented] = useState(false)

  const { status, output, run, killProcess, clearOutput, readFileFromContainer, serverUrl } = useWebContainer(hasConsented)

  // LocalStorage から前回の進捗を一度だけ読む（レンダリングのたびに読まないよう防止）
  const [savedProgress] = useState(() => restoreProgrammingProgress())

  // URLパラメータのシナリオIDに対応するシナリオオブジェクト
  const urlMatchedScenario = urlScenarioId
    ? (programmingScenarios.find((s) => s.id === urlScenarioId) ?? null)
    : null

  const initialScenario = urlMatchedScenario ?? savedProgress.scenario

  // URLパラメータ → LocalStorage → デフォルトの優先順でシナリオを決定する
  const [scenario, setScenario] = useState<ProgrammingScenario>(initialScenario)

  // シナリオごとのファイル群を一括管理する（切り替えても前の作業が消えない）
  const [scenarioContents, setScenarioContents] = useState<Record<string, Record<string, string>>>(
    savedProgress.scenarioContents
  )

  // アクティブシナリオのファイル群（保存済みがあれば復元、なければ initialFiles）
  const initialFiles = savedProgress.scenarioContents[initialScenario.id] ?? initialScenario.files
  const [files, setFiles] = useState<Record<string, string>>(initialFiles)
  const [activeFile, setActiveFile] = useState('index.ts')
  // savedFiles はエクスポート後の状態を保持し、isDirty の基準となる
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(initialFiles)

  const isDirty = JSON.stringify(files) !== JSON.stringify(savedFiles)

  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    sidebarWidthPx: 200,
    scenarioWidthPx: 320,
    consoleHeightPx: 160,
  })

  // ファイル群変更時に files state と scenarioContents を同時に更新するラッパー。
  // setFiles を直接呼ぶと scenarioContents との乖離が起きやすいため一か所にまとめる。
  const updateFiles = useCallback((newFiles: Record<string, string>) => {
    setFiles(newFiles)
    setScenarioContents((prev) => ({ ...prev, [scenario.id]: newFiles }))
  }, [scenario.id])

  // 初回マウント時にURLへシナリオIDを付与する。
  // ページを直接開いた場合（/#/programming のみ）に対し、現在のシナリオIDを追加する。
  useEffect(() => {
    if (!urlScenarioId) {
      navigate(`/programming/${initialScenario.id}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 初回マウント時のみ実行

  const handleExport = useCallback(async () => {
    // コード実行後に生成された db-dump.sql があれば databaseSnapshot として同梱する。
    // DBコースで読み込むとテーブルを復元できる。
    const databaseSnapshot = await readFileFromContainer('db-dump.sql')

    exportJson(
      {
        course: 'programming',
        exportedAt: new Date().toISOString(),
        scenario: scenario.id,
        files,
        ...(databaseSnapshot ? { databaseSnapshot } : {}),
      },
      `browser-lab-${scenario.id}-${Date.now()}.json`
    )
    setSavedFiles({ ...files })
  }, [exportJson, readFileFromContainer, scenario.id, files])

  const handleImport = useCallback(async () => {
    try {
      const raw = await importJson()

      // DBコースのJSONをプログラミングコースに読み込む場合のクロスコース処理。
      // databaseSnapshot があれば seed.sql として追加し、コード実行時にDBが復元される。
      const snapshot = extractDatabaseSnapshot(raw)
      if (snapshot) {
        const nextFiles = { ...files, 'seed.sql': snapshot }
        updateFiles(nextFiles)
        setSavedFiles(nextFiles)
        alert('DBスナップショットを seed.sql として追加しました。\n「実行」するとDBが復元された状態でコードが動きます。')
        return
      }

      // 通常のプログラミングコースJSON読み込み
      // as キャストの代わりに型ガードでランタイム検証する。
      const result = validateProgrammingExport(raw)
      if (!result.ok) {
        alert(`読み込みエラー: ${result.reason}`)
        return
      }
      if (Object.keys(result.data.files).length > 0) {
        updateFiles(result.data.files)
        setSavedFiles(result.data.files)
      }
    } catch {
      // ファイル未選択・キャンセルの場合は何もしない
    }
  }, [importJson, files, updateFiles])

  const { pendingNav, guardNavigate, confirmSaveAndGo, confirmDiscardAndGo, cancelNavigation } =
    useUnsavedGuard({ isDirty, onSave: handleExport })

  const handleScenarioSelect = (nextScenario: ProgrammingScenario) => {
    guardNavigate(() => {
      // 保存済みのファイル群を復元し、なければ初期ファイルを使う
      const nextFiles = scenarioContents[nextScenario.id] ?? nextScenario.files
      setScenario(nextScenario)
      setFiles(nextFiles)
      setSavedFiles(nextFiles)
      setActiveFile('index.ts')
      clearOutput()
      // URLを更新してシナリオへの直接リンクを可能にする
      navigate(`/programming/${nextScenario.id}`)
    }, `シナリオ「${nextScenario.title}」に移動`)
  }

  const handleRun = () => {
    run(files)
  }

  const updateActiveFile = (content: string) => {
    updateFiles({ ...files, [activeFile]: content })
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
      startSizePx = paneSizes.consoleHeightPx
    }
    dragStateRef.current = { target, startX: e.clientX, startY: e.clientY, startSizePx }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return
      const { target, startX, startY, startSizePx } = dragStateRef.current

      if (target === 'sidebar') {
        const newWidth = Math.max(140, Math.min(400, startSizePx + e.clientX - startX))
        setPaneSizes((prev) => ({ ...prev, sidebarWidthPx: newWidth }))
      } else if (target === 'scenario') {
        // シナリオパネルは右端固定なので、右に引っ張ると小さくなる（符号が逆）
        const newWidth = Math.max(200, Math.min(600, startSizePx - (e.clientX - startX)))
        setPaneSizes((prev) => ({ ...prev, scenarioWidthPx: newWidth }))
      } else {
        // コンソールは下端固定なので、下に引っ張ると小さくなる（符号が逆）
        const newHeight = Math.max(80, Math.min(500, startSizePx - (e.clientY - startY)))
        setPaneSizes((prev) => ({ ...prev, consoleHeightPx: newHeight }))
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
  // ファイル編集は頻繁に発生するため、1文字ごとに同期書き込みしないための debounce。
  const debouncedScenarioId = useDebounce(scenario.id, SAVE_DEBOUNCE_MS)
  const debouncedScenarioContents = useDebounce(scenarioContents, SAVE_DEBOUNCE_MS)

  useEffect(() => {
    const progress: ProgProgressV2 = {
      version: 2,
      scenarioId: debouncedScenarioId,
      scenarioContents: debouncedScenarioContents,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(LS_KEY, JSON.stringify(progress))
  }, [debouncedScenarioId, debouncedScenarioContents])

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const { markCompleted, isCompleted } = useCompletedScenarios()

  // シナリオの初期ファイルにリセットする。
  // undo 履歴も消えるため、誤操作防止のために window.confirm で確認を取る。
  const handleReset = () => {
    const confirmed = window.confirm(
      `シナリオ「${scenario.title}」の初期コードに戻します。\n現在の編集内容は失われます。よろしいですか？`
    )
    if (!confirmed) return
    updateFiles(scenario.files)
    setSavedFiles(scenario.files)
    setActiveFile('index.ts')
    clearOutput()
  }

  // ファイル作成UI の表示フラグと入力中のファイル名
  const [isAddingFile, setIsAddingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  // 新規ファイル入力欄への ref（表示時に自動フォーカスするために使う）
  const newFileInputRef = useRef<HTMLInputElement>(null)

  // isAddingFile が true になった瞬間に入力欄にフォーカスを移す
  useEffect(() => {
    if (isAddingFile) newFileInputRef.current?.focus()
  }, [isAddingFile])

  const handleAddFile = () => {
    const trimmedName = newFileName.trim()
    // ガード節: 空ファイル名、または同名ファイルが既に存在する場合は追加しない
    if (!trimmedName || trimmedName in files) {
      setIsAddingFile(false)
      setNewFileName('')
      return
    }
    updateFiles({ ...files, [trimmedName]: '' })
    setActiveFile(trimmedName)
    setIsAddingFile(false)
    setNewFileName('')
  }

  const handleDeleteFile = (filename: string) => {
    // WebContainer はファイルなしで起動できないため、最後の 1 ファイルは削除不可にする
    if (Object.keys(files).length <= 1) return
    const nextFiles = Object.fromEntries(
      Object.entries(files).filter(([name]) => name !== filename)
    )
    updateFiles(nextFiles)
    // 削除対象がアクティブファイルだった場合は先頭ファイルに切り替える
    if (activeFile === filename) {
      setActiveFile(Object.keys(nextFiles)[0])
    }
  }

  const handleNewFileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAddFile()
    if (e.key === 'Escape') {
      setIsAddingFile(false)
      setNewFileName('')
    }
  }

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

  // package.json の dependencies を解析してパッケージ固有の補完候補を生成する。
  // package.json の内容が変わったときだけ再計算し、キーストロークのたびに実行しないよう
  // pkgJsonContent を個別に記憶してから useMemo の依存にしている。
  const pkgJsonContent = files['package.json'] ?? ''
  const extraTsCompletions = useMemo(
    () => getPackageCompletions(pkgJsonContent),
    [pkgJsonContent]
  )

  const isBooting = status === 'booting'
  const isRunning = status === 'running'

  // ステータスバー表示値を説明変数として先に計算し、JSX 内の条件式を減らす
  const statusTextColor = getStatusTextColor(status)
  const statusDotClass = getStatusDotClass(status)
  const statusLabel = getStatusLabel(status, hasConsented)

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
          <Zap size={13} />
          プログラミング学習
        </span>
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 text-xs ${statusTextColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
          {statusLabel}
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
          <div className="border-b border-dark-border px-3 py-2 dark:border-dark-border light:border-light-border">
            <div className="text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              シナリオ
            </div>
          </div>
          <div className="flex-1 overflow-auto py-1">
            {programmingScenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => handleScenarioSelect(s)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors ${
                  scenario.id === s.id
                    ? 'bg-dark-active text-dark-text dark:bg-dark-active dark:text-dark-text light:bg-light-active light:text-light-text'
                    : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                }`}
              >
                <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-blue-400" />
                <span className="flex-1 leading-relaxed">{s.title}</span>
                {isCompleted('programming', s.id) && (
                  <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0 text-green-400" aria-label="完了済み" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-dark-border dark:border-dark-border light:border-light-border">
            {/* ヘッダー行：「ファイル」ラベルと新規追加ボタン */}
            <div className="flex items-center px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                ファイル
              </span>
              <button
                type="button"
                onClick={() => setIsAddingFile(true)}
                aria-label="新しいファイルを追加"
                title="新しいファイルを追加"
                className="ml-auto rounded p-0.5 text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* 新規ファイル名入力欄（isAddingFile の間だけ表示） */}
            {isAddingFile && (
              <div className="flex items-center gap-1 px-2 pb-1">
                <input
                  ref={newFileInputRef}
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={handleNewFileKeyDown}
                  placeholder="filename.ts"
                  aria-label="新しいファイル名"
                  className="flex-1 rounded border border-dark-border bg-dark-bg px-2 py-0.5 font-mono text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text light:border-light-border light:bg-white light:text-light-text"
                />
                <button
                  type="button"
                  onClick={handleAddFile}
                  aria-label="ファイルを作成"
                  className="rounded p-0.5 text-green-400 transition-colors hover:text-green-300"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingFile(false); setNewFileName('') }}
                  aria-label="キャンセル"
                  className="rounded p-0.5 text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* ファイル一覧：ホバーで削除ボタンを表示する */}
            {Object.keys(files).map((filename) => (
              <div key={filename} className="group flex items-center">
                <button
                  onClick={() => setActiveFile(filename)}
                  className={`flex flex-1 items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                    activeFile === filename
                      ? 'bg-dark-active text-dark-text dark:bg-dark-active dark:text-dark-text light:bg-light-active light:text-light-text'
                      : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                  }`}
                >
                  <span className="font-mono text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                    {getFileBadge(filename)}
                  </span>
                  {filename}
                </button>
                {/* 最後の1ファイルは削除不可のためボタンを出さない */}
                {Object.keys(files).length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(filename)}
                    aria-label={`${filename} を削除`}
                    className="mr-1 rounded p-0.5 text-dark-textDim opacity-0 transition-all hover:text-red-400 group-hover:opacity-100 dark:text-dark-textDim dark:hover:text-red-400 light:text-light-textDim light:hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="resize-handle"
          onMouseDown={(e) => startDrag('sidebar', e)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Toolbar
            isDirty={isDirty}
            onRun={handleRun}
            onStop={killProcess}
            isRunning={isRunning}
            onSave={handleExport}
            onLoad={handleImport}
            onReset={handleReset}
          />

          <div className="flex-1 overflow-hidden">
            {isBooting ? (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                WebContainer を起動しています...（初回は少し時間がかかります）
              </div>
            ) : (
              <CodeEditor
                key={`${scenario.id}-${activeFile}`}
                value={files[activeFile] ?? ''}
                onChange={updateActiveFile}
                language="typescript"
                extraTsCompletions={extraTsCompletions}
              />
            )}
          </div>

          <div
            className="resize-handle-horizontal"
            onMouseDown={(e) => startDrag('console', e)}
          />

          <div style={{ height: paneSizes.consoleHeightPx }} className="flex-shrink-0">
            <Console output={output} onClear={clearOutput} serverUrl={serverUrl} />
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
            currentContent={files}
            onSolutionViewed={() => markCompleted('programming', scenario.id)}
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
        groups={[EDITOR_COMMON_SHORTCUTS]}
      />

      {/* 同意前はコース全体を覆うモーダルを表示し、WebContainers の起動をブロックする */}
      {!hasConsented && (
        <ResourceConsentModal
          courseName="プログラミング学習コース"
          resources={WEBCONTAINER_RESOURCES}
          recommendations={PROGRAMMING_RECOMMENDATIONS}
          onAccept={() => setHasConsented(true)}
          onCancel={() => navigate('/')}
        />
      )}
    </div>
  )
}
