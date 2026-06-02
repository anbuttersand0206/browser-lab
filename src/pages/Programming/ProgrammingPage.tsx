import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { useNavigate } from 'react-router-dom'
import { Zap, Sun, Moon, ArrowLeft, ChevronRight, HelpCircle } from 'lucide-react'
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

// バージョンフィールドを付けることで、将来のデータ形式変更時に
// 古い保存データを安全に棄却できる。
interface ProgProgress {
  version: 1
  scenarioId: string
  files: Record<string, string>
  updatedAt: string
}

// files の値がすべて string であることを検証するヘルパー。
// JSON.parse で得た unknown から Record<string, string> を型安全に取り出すために使う。
function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value as object).every((v) => typeof v === 'string')
}

// JSON.parse 後の unknown を型安全に検証する型ガード。
function isValidProgProgress(value: unknown): value is ProgProgress {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && typeof v.scenarioId === 'string' && isStringRecord(v.files)
}

// 前回終了時のシナリオとファイル群を LocalStorage から復元する。
// バージョン不一致・JSON 破損・存在しないシナリオ ID はいずれもデフォルトにフォールバックする。
function restoreProgrammingProgress(): { scenario: ProgrammingScenario; files: Record<string, string> } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) return { scenario: programmingScenarios[0], files: programmingScenarios[0].files }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidProgProgress(parsed)) return { scenario: programmingScenarios[0], files: programmingScenarios[0].files }
    const scenario = programmingScenarios.find((s) => s.id === parsed.scenarioId) ?? programmingScenarios[0]
    return { scenario, files: parsed.files }
  } catch {
    // JSON 破損時はデフォルトで起動する
    return { scenario: programmingScenarios[0], files: programmingScenarios[0].files }
  }
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
  const { resolvedTheme, setTheme } = useTheme()
  const { exportJson, importJson } = useJsonIO()

  // ユーザーがメモリ消費への同意を与えるまで WebContainers を起動しない。
  // コースページに入るたびに同意を求め、ユーザーが意図せず重いリソースを
  // ロードしてしまうことを防ぐ。
  const [hasConsented, setHasConsented] = useState(false)

  const { status, output, run, killProcess, clearOutput, readFileFromContainer } = useWebContainer(hasConsented)

  // 前回の進捗を復元する（ページ再訪問時にシナリオ選択と編集ファイルを引き継ぐ）
  const [scenario, setScenario] = useState<ProgrammingScenario>(() => restoreProgrammingProgress().scenario)
  const [files, setFiles] = useState<Record<string, string>>(() => restoreProgrammingProgress().files)
  const [activeFile, setActiveFile] = useState('index.ts')
  // savedFiles はエクスポート後の状態を保持し、isDirty の基準となる
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(() => restoreProgrammingProgress().files)

  const isDirty = JSON.stringify(files) !== JSON.stringify(savedFiles)

  const [paneSizes, setPaneSizes] = useState<PaneSizes>({
    sidebarWidthPx: 200,
    scenarioWidthPx: 320,
    consoleHeightPx: 160,
  })

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
        setFiles(nextFiles)
        setSavedFiles(nextFiles)
        alert('DBスナップショットを seed.sql として追加しました。\n「実行」するとDBが復元された状態でコードが動きます。')
        return
      }

      // 通常のプログラミングコースJSON読み込み
      // as キャストの代わりに型ガードでランタイム検証する。
      // ファイルパスのパストラバーサルや不正なデータ形状をここで排除する。
      const result = validateProgrammingExport(raw)
      if (!result.ok) {
        alert(`読み込みエラー: ${result.reason}`)
        return
      }
      if (Object.keys(result.data.files).length > 0) {
        setFiles(result.data.files)
        setSavedFiles(result.data.files)
      }
    } catch {
      // ファイル未選択・キャンセルの場合は何もしない
    }
  }, [importJson, files])

  const { pendingNav, guardNavigate, confirmSaveAndGo, confirmDiscardAndGo, cancelNavigation } =
    useUnsavedGuard({ isDirty, onSave: handleExport })

  const handleScenarioSelect = (nextScenario: ProgrammingScenario) => {
    guardNavigate(() => {
      setScenario(nextScenario)
      setFiles(nextScenario.files)
      setSavedFiles(nextScenario.files)
      setActiveFile('index.ts')
      clearOutput()
    }, `シナリオ「${nextScenario.title}」に移動`)
  }

  const handleRun = () => {
    run(files)
  }

  const updateActiveFile = (content: string) => {
    setFiles((prev) => ({ ...prev, [activeFile]: content }))
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
  const debouncedFiles = useDebounce(files, SAVE_DEBOUNCE_MS)

  useEffect(() => {
    const progress: ProgProgress = {
      version: 1,
      scenarioId: debouncedScenarioId,
      files: debouncedFiles,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(LS_KEY, JSON.stringify(progress))
  }, [debouncedScenarioId, debouncedFiles])

  const [isHelpOpen, setIsHelpOpen] = useState(false)

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
          className="ml-2 rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <HelpCircle size={14} />
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
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
                <span className="leading-relaxed">{s.title}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-dark-border dark:border-dark-border light:border-light-border">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              ファイル
            </div>
            {Object.keys(files).map((filename) => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                  activeFile === filename
                    ? 'bg-dark-active text-dark-text dark:bg-dark-active dark:text-dark-text light:bg-light-active light:text-light-text'
                    : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                }`}
              >
                <span className="font-mono text-dark-textDim">
                  {filename.endsWith('.json') ? '{}' : filename.endsWith('.sql') ? 'SQL' : 'TS'}
                </span>
                {filename}
              </button>
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
              />
            )}
          </div>

          <div
            className="resize-handle-horizontal"
            onMouseDown={(e) => startDrag('console', e)}
          />

          <div style={{ height: paneSizes.consoleHeightPx }} className="flex-shrink-0">
            <Console output={output} onClear={clearOutput} />
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
