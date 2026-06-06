import { useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Shuffle } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { AlgorithmId, AlgorithmCategory } from '../../algorithms/registry'
import type { AlgorithmConfig, SortConfig, ArraySearchConfig, HanoiConfig, FibConfig, EuclidConfig, MonteCarloConfig, ConvConfig, PoolingConfig, KMeansConfig, PerceptronConfig } from '../../algorithms/types'

interface ControlPanelProps {
  algorithmId: AlgorithmId
  category: AlgorithmCategory
  config: AlgorithmConfig
  onConfigChange: (config: AlgorithmConfig) => void
  isPlaying: boolean
  canStep: boolean
  canStepBack: boolean
  onPlay: () => void
  onStepBack: () => void
  onStep: () => void
  onReset: () => void
  speedLevel: number
  onSpeedChange: (level: number) => void
}

const SPEED_DELAYS = [1200, 500, 200, 80, 20]

export function ControlPanel({
  algorithmId, category, config, onConfigChange,
  isPlaying, canStep, canStepBack, onPlay, onStepBack, onStep, onReset,
  speedLevel, onSpeedChange,
}: ControlPanelProps) {
  const { t } = useI18n()
  const alg = t.algorithm

  const btn = 'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors'
  const primaryBtn = `${btn} bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40`
  const secondaryBtn = `${btn} border border-dark-border bg-dark-sidebar text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:bg-light-sidebar light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text`

  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-dark-border p-3 dark:border-dark-border light:border-light-border">
      {/* 再生コントロール */}
      <div className="flex items-center gap-2">
        <button className={primaryBtn} onClick={onPlay}>
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isPlaying ? alg.controls.pause : alg.controls.play}
        </button>
        {/* 1ステップ戻る: ステップが配列に事前生成されているため、インデックスを減らすだけで実現できる */}
        <button className={secondaryBtn} onClick={onStepBack} disabled={!canStepBack || isPlaying}
          title={alg.controls.stepBack}>
          <SkipBack size={13} />
        </button>
        <button className={secondaryBtn} onClick={onStep} disabled={!canStep || isPlaying}>
          <SkipForward size={13} />
          {alg.controls.step}
        </button>
        <button className={secondaryBtn} onClick={onReset}>
          <RotateCcw size={13} />
          {alg.controls.reset}
        </button>
      </div>

      {/* 速度スライダー */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {alg.controls.speed}
        </span>
        <input
          type="range" min={1} max={5} value={speedLevel}
          onChange={e => onSpeedChange(Number(e.target.value))}
          className="h-1.5 w-24 cursor-pointer accent-blue-500"
        />
        <span className="min-w-[4rem] text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {alg.controls.speedLabels[speedLevel - 1]}
          <span className="ml-1 opacity-50">({SPEED_DELAYS[speedLevel - 1]}ms)</span>
        </span>
      </div>

      {/* アルゴリズム別の入力設定 */}
      <AlgorithmInputs
        algorithmId={algorithmId}
        category={category}
        config={config}
        onConfigChange={onConfigChange}
        disabled={isPlaying}
      />
    </div>
  )
}

interface InputProps {
  algorithmId: AlgorithmId
  category: AlgorithmCategory
  config: AlgorithmConfig
  onConfigChange: (config: AlgorithmConfig) => void
  disabled: boolean
}

function AlgorithmInputs({ algorithmId, category, config, onConfigChange, disabled }: InputProps) {
  const { t } = useI18n()
  const alg = t.algorithm
  const labelCls = 'text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
  const inputCls = 'rounded border border-dark-border bg-dark-bg px-2 py-1 text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-dark-border dark:bg-dark-bg dark:text-dark-text light:border-light-border light:bg-light-bg light:text-light-text disabled:opacity-50'
  const selectCls = inputCls

  // カスタム配列テキスト入力の状態。
  // hooks はコンポーネントのトップレベルで宣言する必要があるため、
  // sort ブランチの early return より前に置く。
  const [customArrayText, setCustomArrayText] = useState('')
  const [isCustomArrayError, setIsCustomArrayError] = useState(false)

  if (category === 'sort') {
    const c = config as SortConfig

    // フィッシャー・イェーツのシャッフル。配列の末尾から先頭に向かってランダムな位置と交換する。
    // length から 1〜length の一様分布を得るために Math.random() * (i + 1) を使う。
    const shuffleArray = (arr: number[]): number[] => {
      const result = [...arr]
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
      }
      return result
    }

    // カスタム配列テキストをパースして config に反映する。
    // 2〜30 個の整数のみ受け付ける（可視化フレームが 30 本超えると表示が崩れるため上限を設ける）。
    const applyCustomArray = () => {
      const trimmed = customArrayText.trim()
      // 空のまま適用しても意味がないため、スライダー状態をそのまま維持する
      if (!trimmed) return

      const parts = trimmed.split(',')
      const nums = parts.map(s => {
        const n = Number(s.trim())
        // 小数・NaN・空文字は弾く
        return Number.isInteger(n) && !isNaN(n) ? n : NaN
      })
      const isValid = nums.length >= 2 && nums.length <= 30 && nums.every(n => !isNaN(n))
      if (!isValid) {
        setIsCustomArrayError(true)
        return
      }
      setIsCustomArrayError(false)
      setCustomArrayText('')
      onConfigChange({ array: nums })
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* ランダム生成コントロール */}
        <span className={labelCls}>{alg.controls.arraySize}</span>
        <input type="range" min={6} max={30} value={c.array.length} disabled={disabled}
          onChange={e => {
            const size = Number(e.target.value)
            const arr = Array.from({ length: size }, (_, i) => i + 1)
            onConfigChange({ array: shuffleArray(arr) })
          }}
          className="h-1.5 w-20 cursor-pointer accent-blue-500 disabled:opacity-50"
        />
        <span className={labelCls}>{c.array.length}</span>
        <button disabled={disabled}
          className="flex items-center gap-1 rounded border border-dark-border bg-dark-sidebar px-2 py-1 text-xs text-dark-textDim hover:bg-dark-hover hover:text-dark-text disabled:opacity-50 dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:bg-light-sidebar light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
          onClick={() => {
            const arr = Array.from({ length: c.array.length }, (_, i) => i + 1)
            onConfigChange({ array: shuffleArray(arr) })
          }}>
          <Shuffle size={11} />{alg.controls.randomize}
        </button>

        {/* カスタム配列入力: 任意の順序でアルゴリズムを試したい場合に使う */}
        <span className={labelCls}>{alg.controls.customArray}</span>
        <input
          type="text"
          value={customArrayText}
          disabled={disabled}
          placeholder={alg.controls.customArrayPlaceholder}
          onChange={e => { setCustomArrayText(e.target.value); setIsCustomArrayError(false) }}
          onKeyDown={e => { if (e.key === 'Enter') applyCustomArray() }}
          className={`${inputCls} w-28 ${isCustomArrayError ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        <button
          disabled={disabled || !customArrayText.trim()}
          onClick={applyCustomArray}
          className="flex items-center gap-1 rounded border border-dark-border bg-dark-sidebar px-2 py-1 text-xs text-dark-textDim hover:bg-dark-hover hover:text-dark-text disabled:opacity-50 dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:bg-light-sidebar light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
        >
          {alg.controls.customArrayApply}
        </button>
        {/* バリデーションエラー: 入力形式が不正な場合のみ表示する */}
        {isCustomArrayError && (
          <span className="w-full text-xs text-red-400">{alg.controls.customArrayError}</span>
        )}
      </div>
    )
  }

  if (algorithmId === 'linear') {
    const c = config as ArraySearchConfig
    return (
      <div className="flex items-center gap-2">
        <span className={labelCls}>{alg.controls.targetValue}</span>
        <input type="number" value={c.target} disabled={disabled} className={`${inputCls} w-16`}
          onChange={e => onConfigChange({ ...c, target: Number(e.target.value) })} />
      </div>
    )
  }

  if (algorithmId === 'binary') {
    const c = config as ArraySearchConfig
    return (
      <div className="flex items-center gap-2">
        <span className={labelCls}>{alg.controls.targetValue}</span>
        <input type="number" value={c.target} disabled={disabled} className={`${inputCls} w-16`}
          onChange={e => onConfigChange({ ...c, target: Number(e.target.value) })} />
      </div>
    )
  }

  if (algorithmId === 'hanoi') {
    const c = config as HanoiConfig
    return (
      <div className="flex items-center gap-2">
        <span className={labelCls}>{alg.controls.numDisks}</span>
        <input type="range" min={2} max={7} value={c.numDisks} disabled={disabled}
          onChange={e => onConfigChange({ numDisks: Number(e.target.value) })}
          className="h-1.5 w-20 cursor-pointer accent-blue-500 disabled:opacity-50" />
        <span className={labelCls}>{c.numDisks}</span>
      </div>
    )
  }

  if (algorithmId === 'fibonacci') {
    const c = config as FibConfig
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>{alg.controls.nValue}</span>
          <input type="range" min={1} max={15} value={c.n} disabled={disabled}
            onChange={e => onConfigChange({ ...c, n: Number(e.target.value) })}
            className="h-1.5 w-20 cursor-pointer accent-blue-500 disabled:opacity-50" />
          <span className={labelCls}>{c.n}</span>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={c.useMemo} disabled={disabled}
            onChange={e => onConfigChange({ ...c, useMemo: e.target.checked })}
            className="cursor-pointer accent-blue-500 disabled:opacity-50" />
          <span className={labelCls}>{alg.controls.useMemo}</span>
        </label>
      </div>
    )
  }

  if (algorithmId === 'euclidean') {
    const c = config as EuclidConfig
    return (
      <div className="flex items-center gap-2">
        <span className={labelCls}>{alg.controls.inputA}</span>
        <input type="number" value={c.a} min={1} max={200} disabled={disabled} className={`${inputCls} w-16`}
          onChange={e => onConfigChange({ ...c, a: Math.max(1, Number(e.target.value)) })} />
        <span className={labelCls}>{alg.controls.inputB}</span>
        <input type="number" value={c.b} min={1} max={200} disabled={disabled} className={`${inputCls} w-16`}
          onChange={e => onConfigChange({ ...c, b: Math.max(1, Number(e.target.value)) })} />
      </div>
    )
  }

  if (algorithmId === 'montecarlo') {
    const c = config as MonteCarloConfig
    return (
      <div className="flex items-center gap-2">
        <span className={labelCls}>{alg.controls.numPoints}</span>
        <select value={c.numPoints} disabled={disabled} className={selectCls}
          onChange={e => onConfigChange({ numPoints: Number(e.target.value) })}>
          {[100, 200, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    )
  }

  if (algorithmId === 'convolution') {
    const c = config as ConvConfig
    const kernels = [
      { value: 'edge', label: 'Edge / エッジ検出' },
      { value: 'blur', label: 'Blur / ブラー' },
      { value: 'sharpen', label: 'Sharpen / シャープ化' },
    ]
    return (
      <div className="flex items-center gap-2">
        <span className={labelCls}>{alg.controls.kernelType}</span>
        <select value={c.kernelType} disabled={disabled} className={selectCls}
          onChange={e => onConfigChange({ kernelType: e.target.value as ConvConfig['kernelType'] })}>
          {kernels.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </div>
    )
  }

  if (algorithmId === 'pooling') {
    const c = config as PoolingConfig
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>{alg.controls.poolType}</span>
          <select value={c.poolType} disabled={disabled} className={selectCls}
            onChange={e => onConfigChange({ ...c, poolType: e.target.value as 'max' | 'avg' })}>
            <option value="max">{alg.controls.max}</option>
            <option value="avg">{alg.controls.avg}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className={labelCls}>{alg.controls.poolSize}</span>
          <select value={c.poolSize} disabled={disabled} className={selectCls}
            onChange={e => onConfigChange({ ...c, poolSize: Number(e.target.value) })}>
            <option value={2}>2×2</option>
            <option value={3}>3×3</option>
          </select>
        </div>
      </div>
    )
  }

  if (algorithmId === 'kmeans') {
    const c = config as KMeansConfig
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>{alg.controls.numClusters}</span>
          <input type="range" min={2} max={6} value={c.k} disabled={disabled}
            onChange={e => onConfigChange({ ...c, k: Number(e.target.value) })}
            className="h-1.5 w-16 cursor-pointer accent-blue-500 disabled:opacity-50" />
          <span className={labelCls}>{c.k}</span>
        </div>
      </div>
    )
  }

  if (algorithmId === 'perceptron') {
    const c = config as PerceptronConfig
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={labelCls}>{alg.controls.dataType}</span>
          <select value={c.dataType} disabled={disabled} className={selectCls}
            onChange={e => onConfigChange({ ...c, dataType: e.target.value as PerceptronConfig['dataType'] })}>
            <option value="and">AND</option>
            <option value="or">OR</option>
            <option value="nand">NAND</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className={labelCls}>{alg.controls.learningRate}</span>
          <select value={c.learningRate} disabled={disabled} className={selectCls}
            onChange={e => onConfigChange({ ...c, learningRate: Number(e.target.value) })}>
            {[0.01, 0.05, 0.1, 0.3, 0.5].map(lr => <option key={lr} value={lr}>{lr}</option>)}
          </select>
        </div>
      </div>
    )
  }

  return null
}
