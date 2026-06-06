// 比較モード用の自己完結型アルゴリズムランナーパネル。
// 自分のステップ状態・再生状態・設定をすべて内包するため、
// 同じコンポーネントを2つ並べるだけで比較モードが実現できる。

import { useState, useEffect, useRef } from 'react'
import type { AlgorithmId, AlgorithmCategory } from '../../algorithms/registry'
import { ALGORITHM_BY_ID, BY_CATEGORY, CATEGORIES, defaultConfig, createGenerator, MAX_STEPS } from '../../algorithms/registry'
import type { AlgorithmConfig, AlgorithmStep, GridConfig, CellType } from '../../algorithms/types'
import { ControlPanel } from './ControlPanel'
import { StepLog } from './StepLog'
import { SortVisualizer } from './visualizers/SortVisualizer'
import { ArraySearchVisualizer } from './visualizers/ArraySearchVisualizer'
import { GridVisualizer } from './visualizers/GridVisualizer'
import { HanoiVisualizer } from './visualizers/HanoiVisualizer'
import { FibonacciVisualizer } from './visualizers/FibonacciVisualizer'
import { EuclideanVisualizer } from './visualizers/EuclideanVisualizer'
import { MonteCarloVisualizer } from './visualizers/MonteCarloVisualizer'
import { ConvolutionVisualizer } from './visualizers/ConvolutionVisualizer'
import { PoolingVisualizer } from './visualizers/PoolingVisualizer'
import { KMeansVisualizer } from './visualizers/KMeansVisualizer'
import { PerceptronVisualizer } from './visualizers/PerceptronVisualizer'
import { GraphVisualizer } from './visualizers/GraphVisualizer'
import { CryptoVisualizer } from './visualizers/CryptoVisualizer'
import { StringSearchVisualizer } from './visualizers/StringSearchVisualizer'
import { DPTableVisualizer } from './visualizers/DPTableVisualizer'
import { MazeVisualizer } from './visualizers/MazeVisualizer'
import { ScatterVisualizer } from './visualizers/ScatterVisualizer'
import { DecisionTreeVisualizer } from './visualizers/DecisionTreeVisualizer'
import { useI18n } from '../../i18n'

const SPEED_DELAY_MS = [1200, 500, 200, 80, 20]

interface AlgorithmRunnerPanelProps {
  /** パネルのアクセントカラー（左パネル: blue, 右パネル: purple 等） */
  accentColor?: 'blue' | 'purple'
}

export function AlgorithmRunnerPanel({ accentColor = 'blue' }: AlgorithmRunnerPanelProps) {
  const { t } = useI18n()
  const alg = t.algorithm

  const [selectedId, setSelectedId] = useState<AlgorithmId>('bubble')
  const meta = ALGORITHM_BY_ID[selectedId]

  const [config, setConfig] = useState<AlgorithmConfig>(() => defaultConfig('bubble'))
  const [steps, setSteps] = useState<AlgorithmStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedLevel, setSpeedLevel] = useState(3)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [gridEditMode, setGridEditMode] = useState<'wall' | 'start' | 'goal'>('wall')
  // ドロップダウン選択UI用の展開状態
  const [selectorOpen, setSelectorOpen] = useState(false)

  // アルゴリズムまたは設定が変わったときにステップを事前生成する
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

  // アニメーションタイマー
  useEffect(() => {
    if (!isPlaying) return
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false)
      return
    }
    timerRef.current = setTimeout(() => setCurrentStep((p) => p + 1), SPEED_DELAY_MS[speedLevel - 1])
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, currentStep, steps.length, speedLevel])

  const handlePlay = () => {
    if (currentStep >= steps.length - 1) setCurrentStep(0)
    setIsPlaying((p) => !p)
  }
  const handleStepBack = () => { setIsPlaying(false); setCurrentStep((p) => Math.max(p - 1, 0)) }
  const handleStep = () => { setIsPlaying(false); setCurrentStep((p) => Math.min(p + 1, steps.length - 1)) }
  const handleReset = () => { setIsPlaying(false); setCurrentStep(0) }

  const handleSelectAlgorithm = (id: AlgorithmId) => {
    setIsPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    setSteps([])
    setSelectedId(id)
    setConfig(defaultConfig(id))
    setCurrentStep(0)
    setSelectorOpen(false)
  }

  const handleCellClick = (r: number, c: number) => {
    const gridCfg = config as GridConfig
    const newCells: CellType[][] = gridCfg.cells.map((row) => [...row])
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
    setConfig({
      ...gridCfg,
      cells: gridCfg.cells.map((row) => row.map((cell) => (cell === 'wall' ? 'empty' : cell) as CellType)),
    })
  }

  const currentState = steps[currentStep]?.state ?? null
  const accentCls = accentColor === 'blue' ? 'border-blue-500/40 text-blue-400' : 'border-purple-500/40 text-purple-400'
  const accentBg = accentColor === 'blue' ? 'bg-blue-500/10' : 'bg-purple-500/10'

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-lg border ${accentCls}`}>
      {/* アルゴリズム選択ドロップダウン */}
      <div className={`flex flex-shrink-0 items-center gap-2 border-b border-dark-border px-3 py-2 ${accentBg} dark:border-dark-border light:border-light-border`}>
        <span className="text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
          {alg.algorithms[selectedId]?.name ?? selectedId}
        </span>
        <div className="relative">
          <button
            onClick={() => setSelectorOpen((v) => !v)}
            className="rounded border border-dark-border bg-dark-sidebar px-2 py-0.5 text-xs text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:bg-light-sidebar light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
          >
            変更
          </button>
          {selectorOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-48 overflow-y-auto rounded border border-dark-border bg-dark-sidebar shadow-xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
              {CATEGORIES.map((cat) => (
                <div key={cat}>
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                    {alg.categories[cat as AlgorithmCategory]}
                  </div>
                  {BY_CATEGORY[cat as AlgorithmCategory].map((a) => (
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
          )}
        </div>
        {/* ステップ進捗 */}
        <span className="ml-auto text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {currentStep + 1} / {steps.length}
        </span>
      </div>

      {/* コントロールパネル */}
      <div className="flex-shrink-0">
        <ControlPanel
          algorithmId={selectedId}
          category={meta.category}
          config={config}
          onConfigChange={setConfig}
          isPlaying={isPlaying}
          canStep={currentStep < steps.length - 1}
          canStepBack={currentStep > 0}
          onPlay={handlePlay}
          onStepBack={handleStepBack}
          onStep={handleStep}
          onReset={handleReset}
          speedLevel={speedLevel}
          onSpeedChange={setSpeedLevel}
        />
      </div>

      {/* ビジュアライザー */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <InternalVisualizerSwitch
          type={meta.visualizerType}
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

      {/* ステップログ（コンパクト固定高） */}
      <div className="h-24 flex-shrink-0 overflow-hidden border-t border-dark-border dark:border-dark-border light:border-light-border">
        <StepLog steps={steps} currentStep={currentStep} />
      </div>
    </div>
  )
}

// VisualizerSwitch のパネル内コピー（AlgorithmPage の同名関数と同じロジック）
// AlgorithmPage からエクスポートすると循環参照になるためここで再定義する。
function InternalVisualizerSwitch({
  type, algorithmId, state, config,
  isRunning, gridEditMode, onEditModeChange, onCellClick, onClearWalls,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: string; algorithmId: AlgorithmId; state: any; config: AlgorithmConfig
  isRunning: boolean; gridEditMode: 'wall' | 'start' | 'goal'
  onEditModeChange: (m: 'wall' | 'start' | 'goal') => void
  onCellClick: (r: number, c: number) => void
  onClearWalls: () => void
}) {
  switch (type) {
    case 'sort':          return <SortVisualizer state={state} />
    case 'linearSearch':  return <ArraySearchVisualizer state={state} type="linearSearch" />
    case 'binarySearch':  return <ArraySearchVisualizer state={state} type="binarySearch" />
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
    case 'hanoi':         return <HanoiVisualizer state={state} />
    case 'fibonacci':     return <FibonacciVisualizer state={state} />
    case 'euclidean':     return <EuclideanVisualizer state={state} />
    case 'montecarlo':    return <MonteCarloVisualizer state={state} />
    case 'convolution':   return <ConvolutionVisualizer state={state} />
    case 'pooling':       return <PoolingVisualizer state={state} />
    case 'kmeans':        return <KMeansVisualizer state={state} />
    case 'perceptron':    return <PerceptronVisualizer state={state} />
    case 'graphShortest': return <GraphVisualizer state={state} mode="shortest" />
    case 'graphMST':      return <GraphVisualizer state={state} mode="mst" />
    case 'crypto':        return <CryptoVisualizer state={state} />
    case 'stringSearch':  return <StringSearchVisualizer state={state} />
    case 'dpTable':       return <DPTableVisualizer state={state} />
    case 'maze':          return <MazeVisualizer state={state} />
    case 'scatter':
      return <ScatterVisualizer state={state} mode={algorithmId === 'svm' ? 'svm' : 'pca'} />
    case 'decisionTree':  return <DecisionTreeVisualizer state={state} />
    default:              return null
  }
}
