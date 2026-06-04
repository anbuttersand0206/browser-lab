// import は必ずファイル先頭に置く（ESモジュール仕様）
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrainCircuit, Sun, Moon, ArrowLeft, ChevronDown, ChevronRight, Languages } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useI18n } from '../../i18n'
import type { AlgorithmId, AlgorithmCategory, VisualizerType } from '../../algorithms/registry'
import { ALGORITHM_BY_ID, BY_CATEGORY, CATEGORIES, defaultConfig, createGenerator, MAX_STEPS } from '../../algorithms/registry'
import type { AlgorithmConfig, AlgorithmStep, GridConfig, CellType } from '../../algorithms/types'
import { ControlPanel } from '../../components/AlgorithmViewer/ControlPanel'
import { StepLog } from '../../components/AlgorithmViewer/StepLog'
import { SortVisualizer } from '../../components/AlgorithmViewer/visualizers/SortVisualizer'
import { ArraySearchVisualizer } from '../../components/AlgorithmViewer/visualizers/ArraySearchVisualizer'
import { GridVisualizer } from '../../components/AlgorithmViewer/visualizers/GridVisualizer'
import { HanoiVisualizer } from '../../components/AlgorithmViewer/visualizers/HanoiVisualizer'
import { FibonacciVisualizer } from '../../components/AlgorithmViewer/visualizers/FibonacciVisualizer'
import { EuclideanVisualizer } from '../../components/AlgorithmViewer/visualizers/EuclideanVisualizer'
import { MonteCarloVisualizer } from '../../components/AlgorithmViewer/visualizers/MonteCarloVisualizer'
import { ConvolutionVisualizer } from '../../components/AlgorithmViewer/visualizers/ConvolutionVisualizer'
import { PoolingVisualizer } from '../../components/AlgorithmViewer/visualizers/PoolingVisualizer'
import { KMeansVisualizer } from '../../components/AlgorithmViewer/visualizers/KMeansVisualizer'
import { PerceptronVisualizer } from '../../components/AlgorithmViewer/visualizers/PerceptronVisualizer'

// 速度レベル 1〜5 に対応する遅延時間（ミリ秒）。
// 最低速 1200ms は「手動でステップを目で追える」基準、
// 最高速 20ms は人間がアニメーションと認識できる下限に合わせた。
const SPEED_DELAY_MS = [1200, 500, 200, 80, 20]

const DEFAULT_SIDEBAR_WIDTH_PX = 200
const DEFAULT_INFO_WIDTH_PX = 280
const MIN_SIDEBAR_WIDTH_PX = 140
const MAX_SIDEBAR_WIDTH_PX = 320
const MIN_INFO_WIDTH_PX = 200
const MAX_INFO_WIDTH_PX = 400
const MIN_LOG_HEIGHT_PX = 80
// ログパネルの最大高さをメインエリアの 50% に制限する
const MAX_LOG_HEIGHT_RATIO = 0.5

export default function AlgorithmPage() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const alg = t.algorithm

  const [selectedId, setSelectedId] = useState<AlgorithmId>('bubble')
  const meta = ALGORITHM_BY_ID[selectedId]

  const [config, setConfig] = useState<AlgorithmConfig>(() => defaultConfig('bubble'))

  // ---- ステップ管理 ----
  const [steps, setSteps] = useState<AlgorithmStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedLevel, setSpeedLevel] = useState(3)
  // タイマー ID を ref で管理する理由: state に持つと clearTimeout のたびに再レンダリングが走るため
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [gridEditMode, setGridEditMode] = useState<'wall' | 'start' | 'goal'>('wall')

  // ---- ペインサイズ ----
  const [sidebarWidthPx, setSidebarWidthPx] = useState(DEFAULT_SIDEBAR_WIDTH_PX)
  const [infoWidthPx, setInfoWidthPx] = useState(DEFAULT_INFO_WIDTH_PX)
  const [logHeightPx, setLogHeightPx] = useState(160)
  // mainRef は中央カラム全体の高さ計測のみに使う（ログリサイズの上限計算で必要）
  const mainRef = useRef<HTMLDivElement>(null)
  const [mainHeightPx, setMainHeightPx] = useState(600)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setMainHeightPx(entry.contentRect.height))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // アルゴリズムまたは設定が変わったときにステップを全件事前生成する。
  // ジェネレーターを事前展開して配列に格納する理由:
  // - ステップ実行・巻き戻し・速度変更を currentStep のインデックス操作だけで実現するため。
  // - MAX_STEPS で打ち切るのは、無限ループ系アルゴリズムでメモリを消費しきるのを防ぐ安全弁。
  useEffect(() => {
    setIsPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)

    const gen = createGenerator(selectedId, config)
    const generatedSteps: AlgorithmStep[] = []
    let result = gen.next()
    while (!result.done && generatedSteps.length < MAX_STEPS) {
      generatedSteps.push(result.value)
      result = gen.next()
    }

    setSteps(generatedSteps)
    setCurrentStep(0)
  }, [selectedId, config])

  // アニメーションタイマー: isPlaying が true のとき、一定間隔で currentStep を進める。
  // setInterval を使わず setTimeout + cleanup にする理由:
  // 速度変更・一時停止のたびにタイマーが依存変数の変化によって自動的にリセットされるため。
  useEffect(() => {
    if (!isPlaying) return
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false)
      return
    }
    timerRef.current = setTimeout(() => {
      setCurrentStep(prev => prev + 1)
    }, SPEED_DELAY_MS[speedLevel - 1])
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentStep, steps.length, speedLevel])

  const handlePlay = () => {
    if (currentStep >= steps.length - 1) setCurrentStep(0)
    setIsPlaying(prev => !prev)
  }

  const handleStep = () => {
    setIsPlaying(false)
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStep(0)
  }

  // アルゴリズムを切り替える際に steps を即座に空にする理由:
  // React の useEffect は非同期に実行されるため、切替直後に1フレーム分のレンダリングが走る。
  // このとき古い steps が残っていると、新しいビジュアライザーが異なる型の state を受け取り
  // `state.poles.map(...)` のような TypeError が発生する。
  // steps を空にすることで currentState = null になり、全ビジュアライザーのガード節が働く。
  const handleSelectAlgorithm = (id: AlgorithmId) => {
    setIsPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    setSteps([])
    setSelectedId(id)
    setConfig(defaultConfig(id))
    setCurrentStep(0)
  }

  const handleCellClick = (r: number, c: number) => {
    const gridCfg = config as GridConfig
    const newCells: CellType[][] = gridCfg.cells.map(row => [...row])
    let newStart = gridCfg.start
    let newGoal = gridCfg.goal

    if (gridEditMode === 'wall') {
      if (r === newStart[0] && c === newStart[1]) return
      if (r === newGoal[0] && c === newGoal[1]) return
      newCells[r][c] = newCells[r][c] === 'wall' ? 'empty' : 'wall'
    } else if (gridEditMode === 'start') {
      newCells[newStart[0]][newStart[1]] = 'empty'
      newStart = [r, c]
      newCells[r][c] = 'start'
    } else {
      newCells[newGoal[0]][newGoal[1]] = 'empty'
      newGoal = [r, c]
      newCells[r][c] = 'goal'
    }

    setConfig({ ...gridCfg, cells: newCells, start: newStart, goal: newGoal })
  }

  const handleClearWalls = () => {
    const gridCfg = config as GridConfig
    const newCells = gridCfg.cells.map(row =>
      row.map(cell => (cell === 'wall' ? 'empty' : cell) as CellType)
    )
    setConfig({ ...gridCfg, cells: newCells })
  }

  // ドラッグによるペインリサイズのイベントハンドラーを生成する。
  // mousemove と mouseup を window レベルで登録する理由:
  // ハンドルから素早くマウスを動かしてもリサイズが途切れないようにするため。
  function makeDragHandler(onDrag: (delta: number) => void, axis: 'x' | 'y') {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      const startPos = axis === 'x' ? e.clientX : e.clientY
      const onMove = (ev: MouseEvent) => onDrag(ev[axis === 'x' ? 'clientX' : 'clientY'] - startPos)
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  const currentState = steps[currentStep]?.state ?? null
  const visualizerType = meta.visualizerType

  const [collapsed, setCollapsed] = useState<Record<AlgorithmCategory, boolean>>({
    sort: false, search: false, classic: false, ml: false,
  })

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  const toggleLocale = () => setLocale(locale === 'ja' ? 'en' : 'ja')

  return (
    <div className="flex h-full flex-col bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      {/* ヘッダー */}
      <div className="flex h-10 flex-shrink-0 items-center gap-3 border-b border-dark-border bg-dark-sidebar px-3 dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <ArrowLeft size={14} />
          {alg.nav.backToTop}
        </button>
        <div className="flex items-center gap-1.5 text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
          <BrainCircuit size={14} className="text-purple-400" />
          {alg.pageTitle}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1 rounded border border-dark-border px-2 py-0.5 text-xs text-dark-textDim hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
          >
            <Languages size={12} />
            {locale === 'ja' ? t.locale.en : t.locale.ja}
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 rounded border border-dark-border px-2 py-0.5 text-xs text-dark-textDim hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
          >
            {resolvedTheme === 'dark'
              ? <><Sun size={12} />{t.theme.light}</>
              : <><Moon size={12} />{t.theme.dark}</>}
          </button>
        </div>
      </div>

      {/* 3ペインレイアウト */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左サイドバー: アルゴリズムリスト */}
        <div
          style={{ width: sidebarWidthPx, minWidth: sidebarWidthPx }}
          className="flex flex-col overflow-hidden border-r border-dark-border bg-dark-sidebar dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        >
          <div className="overflow-y-auto">
            {CATEGORIES.map(cat => (
              <div key={cat}>
                <button
                  onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wider text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
                >
                  {alg.categories[cat]}
                  {collapsed[cat] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
                {!collapsed[cat] && BY_CATEGORY[cat].map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAlgorithm(a.id)}
                    className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                      selectedId === a.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                    }`}
                  >
                    {alg.algorithms[a.id]?.name ?? a.id}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* サイドバーリサイズハンドル */}
        <div
          className="resize-handle"
          onMouseDown={makeDragHandler(delta => {
            setSidebarWidthPx(prev =>
              Math.max(MIN_SIDEBAR_WIDTH_PX, Math.min(MAX_SIDEBAR_WIDTH_PX, prev + delta))
            )
          }, 'x')}
        />

        {/* 中央ペイン: コントロール + ビジュアライザー + ログ */}
        <div ref={mainRef} className="flex flex-1 flex-col overflow-hidden">
          {/*
            コントロールパネルは flex-shrink-0 で自然な高さを保持する。
            これまで visualizerHeightPx = mainH - logHeightPx - 1 としていたが、
            コントロールパネルの高さを考慮していなかったため、
            全要素の合計が mainH を超えてコントロールが見えなくなっていた。
            flexbox の flex-1 + min-h-0 を使うことで、コントロールパネルの高さを
            自動的に差し引いた残り空間をビジュアライザーが使う。
          */}
          <div className="flex-shrink-0">
            <ControlPanel
              algorithmId={selectedId}
              category={meta.category}
              config={config}
              onConfigChange={newCfg => setConfig(newCfg)}
              isPlaying={isPlaying}
              canStep={currentStep < steps.length - 1}
              onPlay={handlePlay}
              onStep={handleStep}
              onReset={handleReset}
              speedLevel={speedLevel}
              onSpeedChange={setSpeedLevel}
            />
          </div>

          {/* ビジュアライザー: 残りスペースを flexbox で自動分配 */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <VisualizerSwitch
              type={visualizerType}
              algorithmId={selectedId}
              state={currentState}
              config={config}
              isRunning={isPlaying || currentStep > 0}
              gridEditMode={gridEditMode}
              onEditModeChange={setGridEditMode}
              onCellClick={handleCellClick}
              onClearWalls={handleClearWalls}
            />
          </div>

          {/* ログリサイズハンドル */}
          <div
            className="resize-handle-horizontal flex-shrink-0"
            onMouseDown={makeDragHandler(delta => {
              setLogHeightPx(prev =>
                Math.max(MIN_LOG_HEIGHT_PX, Math.min(mainHeightPx * MAX_LOG_HEIGHT_RATIO, prev - delta))
              )
            }, 'y')}
          />

          {/* ステップログ: 固定高さ */}
          <div
            style={{ height: logHeightPx }}
            className="flex-shrink-0 overflow-hidden border-t border-dark-border dark:border-dark-border light:border-light-border"
          >
            <StepLog steps={steps} currentStep={currentStep} />
          </div>
        </div>

        {/* 右パネルリサイズハンドル */}
        <div
          className="resize-handle"
          onMouseDown={makeDragHandler(delta => {
            setInfoWidthPx(prev =>
              Math.max(MIN_INFO_WIDTH_PX, Math.min(MAX_INFO_WIDTH_PX, prev - delta))
            )
          }, 'x')}
        />

        {/* 右パネル: アルゴリズム情報 */}
        <div
          style={{ width: infoWidthPx, minWidth: infoWidthPx }}
          className="flex flex-col overflow-hidden border-l border-dark-border bg-dark-sidebar dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        >
          <AlgorithmInfo algorithmId={selectedId} />
        </div>
      </div>
    </div>
  )
}

// ---- ビジュアライザーディスパッチ ----

interface SwitchProps {
  type: VisualizerType
  algorithmId: AlgorithmId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // state は visualizerType ごとに異なる型を持つため、ここでは any を許容する。
  // 呼び出し元の handleSelectAlgorithm で setSteps([]) を先行実行するため、
  // アルゴリズム切替直後は state = null になり、各ビジュアライザーのガード節が機能する。
  state: any
  config: AlgorithmConfig
  isRunning: boolean
  gridEditMode: 'wall' | 'start' | 'goal'
  onEditModeChange: (mode: 'wall' | 'start' | 'goal') => void
  onCellClick: (r: number, c: number) => void
  onClearWalls: () => void
}

function VisualizerSwitch({
  type, algorithmId, state, config,
  isRunning, gridEditMode, onEditModeChange, onCellClick, onClearWalls,
}: SwitchProps) {
  switch (type) {
    case 'sort':
      return <SortVisualizer state={state} />
    case 'linearSearch':
      return <ArraySearchVisualizer state={state} type="linearSearch" />
    case 'binarySearch':
      return <ArraySearchVisualizer state={state} type="binarySearch" />
    case 'grid':
      return (
        <GridVisualizer
          algorithmId={algorithmId}
          config={config as GridConfig}
          state={state}
          isRunning={isRunning}
          editMode={gridEditMode}
          onEditModeChange={onEditModeChange}
          onCellClick={onCellClick}
          onClearWalls={onClearWalls}
        />
      )
    case 'hanoi':      return <HanoiVisualizer state={state} />
    case 'fibonacci':  return <FibonacciVisualizer state={state} />
    case 'euclidean':  return <EuclideanVisualizer state={state} />
    case 'montecarlo': return <MonteCarloVisualizer state={state} />
    case 'convolution':return <ConvolutionVisualizer state={state} />
    case 'pooling':    return <PoolingVisualizer state={state} />
    case 'kmeans':     return <KMeansVisualizer state={state} />
    case 'perceptron': return <PerceptronVisualizer state={state} />
    default:           return null
  }
}

// ---- アルゴリズム情報パネル ----

function AlgorithmInfo({ algorithmId }: { algorithmId: AlgorithmId }) {
  const { t } = useI18n()
  const alg = t.algorithm
  const meta = ALGORITHM_BY_ID[algorithmId]
  const info = alg.algorithms[algorithmId]

  if (!info) return null

  const labelCls = 'text-xs font-medium uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
  const valueCls = 'text-xs leading-relaxed text-dark-text dark:text-dark-text light:text-light-text'
  const sectionCls = 'border-b border-dark-border px-4 py-3 dark:border-dark-border light:border-light-border'

  return (
    <div className="flex flex-col overflow-y-auto">
      <div className={`${sectionCls} bg-purple-500/5`}>
        <h2 className="text-sm font-bold text-dark-text dark:text-dark-text light:text-light-text">
          {info.name}
        </h2>
        <span className="mt-0.5 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {alg.categories[meta.category]}
        </span>
      </div>

      <div className={sectionCls}>
        <div className={`${labelCls} mb-2`}>{alg.info.description}</div>
        <p className={valueCls}>{info.description}</p>
      </div>

      <div className={sectionCls}>
        <div className={`${labelCls} mb-2`}>{alg.info.timeComplexity}</div>
        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            { label: alg.info.bestCase,    val: meta.complexities.best,    color: 'text-green-400' },
            { label: alg.info.averageCase, val: meta.complexities.average, color: 'text-yellow-400' },
            { label: alg.info.worstCase,   val: meta.complexities.worst,   color: 'text-red-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded bg-dark-hover p-1.5 dark:bg-dark-hover light:bg-light-hover">
              <div className="text-[9px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim">{label}</div>
              <div className={`mt-0.5 font-mono text-xs font-medium ${color}`}>{val}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className={labelCls}>{alg.info.spaceComplexity}</span>
          <span className="font-mono text-xs text-purple-400">{meta.complexities.space}</span>
        </div>
      </div>

      <div className={sectionCls}>
        <div className={`${labelCls} mb-2`}>{alg.info.useCases}</div>
        <p className={valueCls}>{info.useCases}</p>
      </div>

      <div className="px-4 py-3">
        <div className={`${labelCls} mb-2`}>{alg.info.visualGuide}</div>
        <p className={valueCls}>{info.visualGuide}</p>
      </div>
    </div>
  )
}
