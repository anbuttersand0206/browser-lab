// ネットワーク学習コースのメインページ。
// ビジュアライザーモード（SVGアニメーション）とハンズオンモード（WebContainerターミナル）を
// タブで切り替えられるハイブリッド設計。

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sun, Moon, Languages, Network, ChevronDown, ChevronRight,
  Play, Pause, SkipForward, SkipBack, RotateCcw, Gauge,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useI18n } from '../../i18n'
import { MobileWarning } from '../../components/MobileWarning/MobileWarning'
import { TopologyMap } from '../../components/NetworkLab/TopologyMap/TopologyMap'
import { NetworkInfoPanel } from '../../components/NetworkLab/NetworkInfoPanel/NetworkInfoPanel'
import {
  NETWORK_SCENARIOS, NETWORK_CATEGORIES, NETWORK_BY_CATEGORY, MAX_NETWORK_STEPS,
} from '../../network/scenarios/index'
import type { NetworkStep, NetworkCategory } from '../../network/simulator/types'

// 速度レベル 1〜5 に対応するstep間の遅延時間（ms）
const SPEED_DELAY_MS = [2000, 1000, 500, 250, 100]

const CATEGORY_LABELS: Record<NetworkCategory, { ja: string; en: string }> = {
  model:            { ja: 'ネットワークモデル',      en: 'Network Model' },
  addressing:       { ja: 'アドレッシング',          en: 'Addressing' },
  switching:        { ja: 'スイッチング (L2)',        en: 'Switching (L2)' },
  routing:          { ja: 'ルーティング (L3)',        en: 'Routing (L3)' },
  transport:        { ja: 'トランスポート層',         en: 'Transport Layer' },
  application:      { ja: 'アプリケーション層',       en: 'Application Layer' },
  advanced_routing: { ja: '高度なルーティング',       en: 'Advanced Routing' },
  wan:              { ja: 'WAN・広域接続',           en: 'WAN / Wide Area' },
  campus_network:   { ja: 'キャンパスネットワーク',   en: 'Campus Network' },
  security:         { ja: 'セキュリティ',             en: 'Security' },
  design:           { ja: '設計演習',                en: 'Design Exercises' },
}

const DEFAULT_SIDEBAR_W = 220
const DEFAULT_INFO_W = 280
const DEFAULT_LOG_H = 160
const MIN_SIDEBAR_W = 150
const MAX_SIDEBAR_W = 350
const MIN_INFO_W = 200
const MAX_INFO_W = 400
const MIN_LOG_H = 60
const MAX_LOG_RATIO = 0.5

export default function NetworkPage() {
  const navigate  = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { locale, setLocale } = useI18n()

  const [selectedId, setSelectedId] = useState(NETWORK_SCENARIOS[0].id)
  const scenario = NETWORK_SCENARIOS.find(s => s.id === selectedId)!

  // ---- ステップ管理 ----

  const [steps, setSteps] = useState<NetworkStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedLevel, setSpeedLevel] = useState(3)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null)

  // アルゴリズムコースと同じパターン: シナリオ変更時にステップを事前生成する
  useEffect(() => {
    setIsPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    setSelectedPacketId(null)

    const gen = scenario.simulate(scenario.topology)
    const generated: NetworkStep[] = []
    let result = gen.next()
    while (!result.done && generated.length < MAX_NETWORK_STEPS) {
      generated.push(result.value)
      result = gen.next()
    }
    setSteps(generated)
    setCurrentStep(0)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // アニメーションタイマー（アルゴリズムコースと同じsetTimeout方式）
  useEffect(() => {
    if (!isPlaying) return
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false)
      return
    }
    timerRef.current = setTimeout(() => setCurrentStep(prev => prev + 1), SPEED_DELAY_MS[speedLevel - 1])
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, currentStep, steps.length, speedLevel])

  // ステップ変更時にhighlightPacketIdを自動反映する
  useEffect(() => {
    const step = steps[currentStep]
    if (step?.highlightPacketId) setSelectedPacketId(step.highlightPacketId)
  }, [currentStep, steps])

  const handlePlay     = () => { if (currentStep >= steps.length - 1) setCurrentStep(0); setIsPlaying(p => !p) }
  const handleStep     = () => { setIsPlaying(false); setCurrentStep(p => Math.min(p + 1, steps.length - 1)) }
  const handleStepBack = () => { setIsPlaying(false); setCurrentStep(p => Math.max(p - 1, 0)) }
  const handleReset    = () => { setIsPlaying(false); setCurrentStep(0) }

  const handleSelectScenario = (id: string) => {
    setIsPlaying(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    setSteps([])
    setSelectedId(id)
    setCurrentStep(0)
  }

  // ---- ペインリサイズ ----

  const [sidebarW, setSidebarW] = useState(DEFAULT_SIDEBAR_W)
  const [infoW, setInfoW]       = useState(DEFAULT_INFO_W)
  const [logH, setLogH]         = useState(DEFAULT_LOG_H)
  const mainRef = useRef<HTMLDivElement>(null)
  const [mainH, setMainH] = useState(600)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setMainH(e.contentRect.height))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function makeDragHandler(onDrag: (delta: number) => void, axis: 'x' | 'y') {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      const start = axis === 'x' ? e.clientX : e.clientY
      const move = (ev: MouseEvent) => onDrag(ev[axis === 'x' ? 'clientX' : 'clientY'] - start)
      const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    }
  }

  const [collapsed, setCollapsed] = useState<Set<NetworkCategory>>(new Set())
  const toggleCollapse = (cat: NetworkCategory) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    return next
  })

  const currentState = steps[currentStep]?.state ?? null

  return (
    <div className="flex h-full flex-col bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      <MobileWarning />

      {/* ヘッダー */}
      <div className="flex h-10 flex-shrink-0 items-center gap-3 border-b border-dark-border bg-dark-sidebar px-3 dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <ArrowLeft size={14} />
          {locale === 'ja' ? 'トップへ戻る' : 'Back to Top'}
        </button>

        <div className="flex items-center gap-1.5 text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
          <Network size={14} className="text-cyan-400" />
          {locale === 'ja' ? 'ネットワーク学習' : 'Network Lab'}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
            className="flex items-center gap-1 rounded border border-dark-border px-2 py-0.5 text-xs text-dark-textDim hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
          >
            <Languages size={12} />
            {locale === 'ja' ? 'EN' : 'JA'}
          </button>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1 rounded border border-dark-border px-2 py-0.5 text-xs text-dark-textDim hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
          >
            {resolvedTheme === 'dark' ? <><Sun size={12} />{locale === 'ja' ? 'ライト' : 'Light'}</> : <><Moon size={12} />{locale === 'ja' ? 'ダーク' : 'Dark'}</>}
          </button>
        </div>
      </div>

      {/* 3ペインレイアウト */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左サイドバー: シナリオ一覧 */}
        <div
          style={{ width: sidebarW, minWidth: sidebarW }}
          className="flex flex-col overflow-hidden border-r border-dark-border bg-dark-sidebar dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        >
          <div className="overflow-y-auto">
            {NETWORK_CATEGORIES.map(cat => {
              const items = NETWORK_BY_CATEGORY[cat]
              if (items.length === 0) return null
              const isCollapsed = collapsed.has(cat)
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCollapse(cat)}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wider text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
                  >
                    {CATEGORY_LABELS[cat][locale]}
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {!isCollapsed && items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectScenario(s.id)}
                      className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                        selectedId === s.id
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                      }`}
                    >
                      {s.title[locale]}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* サイドバーリサイズハンドル */}
        <div
          className="resize-handle"
          onMouseDown={makeDragHandler(d => setSidebarW(prev => Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, prev + d))), 'x')}
        />

        {/* 中央ペイン */}
        <div ref={mainRef} className="flex flex-1 flex-col overflow-hidden">

          {/* コントロールパネル */}
          <NetworkControlPanel
            isPlaying={isPlaying}
            canStep={currentStep < steps.length - 1}
            canStepBack={currentStep > 0}
            onPlay={handlePlay}
            onStep={handleStep}
            onStepBack={handleStepBack}
            onReset={handleReset}
            speedLevel={speedLevel}
            onSpeedChange={setSpeedLevel}
            currentStep={currentStep}
            totalSteps={steps.length}
          />

          {/* トポロジーキャンバス */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <TopologyMap
              state={currentState}
              selectedPacketId={selectedPacketId}
              onSelectPacket={setSelectedPacketId}
            />
          </div>

          {/* ログリサイズハンドル */}
          <div
            className="resize-handle-horizontal flex-shrink-0"
            onMouseDown={makeDragHandler(d => setLogH(prev => Math.max(MIN_LOG_H, Math.min(mainH * MAX_LOG_RATIO, prev - d))), 'y')}
          />

          {/* ステップログ */}
          <div
            style={{ height: logH }}
            className="flex-shrink-0 overflow-hidden border-t border-dark-border dark:border-dark-border light:border-light-border"
          >
            <NetworkStepLog steps={steps} currentStep={currentStep} />
          </div>
        </div>

        {/* 右パネルリサイズハンドル */}
        <div
          className="resize-handle"
          onMouseDown={makeDragHandler(d => setInfoW(prev => Math.max(MIN_INFO_W, Math.min(MAX_INFO_W, prev - d))), 'x')}
        />

        {/* 右パネル: シナリオ情報 + ProtocolInspector */}
        <div
          style={{ width: infoW, minWidth: infoW }}
          className="flex flex-col overflow-hidden border-l border-dark-border bg-dark-sidebar dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        >
          <NetworkInfoPanel
            scenario={scenario}
            state={currentState}
            selectedPacketId={selectedPacketId}
          />
        </div>
      </div>
    </div>
  )
}

// ---- コントロールパネル ----

interface ControlProps {
  isPlaying: boolean
  canStep: boolean
  canStepBack: boolean
  onPlay: () => void
  onStep: () => void
  onStepBack: () => void
  onReset: () => void
  speedLevel: number
  onSpeedChange: (level: number) => void
  currentStep: number
  totalSteps: number
}

function NetworkControlPanel({
  isPlaying, canStep, canStepBack, onPlay, onStep, onStepBack, onReset,
  speedLevel, onSpeedChange, currentStep, totalSteps,
}: ControlProps) {
  const { locale } = useI18n()

  const btnCls = 'flex items-center justify-center rounded border border-dark-border p-1.5 transition-colors hover:bg-dark-hover dark:border-dark-border dark:hover:bg-dark-hover light:border-light-border light:hover:bg-light-hover disabled:opacity-40 disabled:cursor-not-allowed'
  const iconCls = 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'

  return (
    <div className="flex flex-shrink-0 items-center gap-2 border-b border-dark-border bg-dark-sidebar px-3 py-1.5 dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
      <button onClick={onReset} className={btnCls} title={locale === 'ja' ? 'リセット' : 'Reset'}>
        <RotateCcw size={13} className={iconCls} />
      </button>
      <button onClick={onStepBack} disabled={!canStepBack} className={btnCls} title={locale === 'ja' ? '1ステップ戻る' : 'Step Back'}>
        <SkipBack size={13} className={iconCls} />
      </button>
      <button onClick={onPlay} className={`${btnCls} min-w-[60px]`}>
        {isPlaying
          ? <><Pause size={13} className="text-cyan-400" /><span className="ml-1 text-xs text-cyan-400">{locale === 'ja' ? '一時停止' : 'Pause'}</span></>
          : <><Play size={13} className={iconCls} /><span className="ml-1 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">{locale === 'ja' ? '再生' : 'Play'}</span></>
        }
      </button>
      <button onClick={onStep} disabled={!canStep} className={btnCls} title={locale === 'ja' ? '1ステップ進む' : 'Step Forward'}>
        <SkipForward size={13} className={iconCls} />
      </button>

      {/* ステップカウンター */}
      {totalSteps > 0 && (
        <span className="rounded bg-dark-hover px-2 py-0.5 text-xs text-dark-textDim dark:bg-dark-hover dark:text-dark-textDim light:bg-light-hover light:text-light-textDim">
          {currentStep + 1} / {totalSteps}
        </span>
      )}

      {/* 速度スライダー */}
      <div className="ml-auto flex items-center gap-1.5">
        <Gauge size={12} className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim" />
        <input
          type="range" min={1} max={5} value={speedLevel}
          onChange={e => onSpeedChange(Number(e.target.value))}
          className="w-20 accent-cyan-500"
        />
        <span className="w-4 text-right text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {speedLevel}
        </span>
      </div>
    </div>
  )
}

// ---- ステップログ ----

function NetworkStepLog({ steps, currentStep }: { steps: NetworkStep[]; currentStep: number }) {
  const { locale } = useI18n()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentStep])

  const visible = steps.slice(0, currentStep + 1)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-dark-border px-3 py-1.5 dark:border-dark-border light:border-light-border">
        <span className="text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {locale === 'ja' ? 'ステップログ' : 'Step Log'}
        </span>
        {steps.length > 0 && (
          <span className="rounded bg-dark-hover px-1.5 py-0.5 text-xs text-dark-textDim dark:bg-dark-hover dark:text-dark-textDim light:bg-light-hover light:text-light-textDim">
            {currentStep + 1} / {steps.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono">
        {visible.length === 0 ? (
          <p className="p-2 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {locale === 'ja' ? '再生ボタンまたはステップボタンで開始してください' : 'Press Play or Step to start'}
          </p>
        ) : (
          visible.map((step, i) => (
            <div
              key={i}
              className={`mb-0.5 flex gap-2 rounded px-2 py-0.5 text-xs ${
                i === currentStep
                  ? 'bg-cyan-500/20 text-dark-text dark:text-dark-text light:text-light-text'
                  : 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
              }`}
            >
              <span className="shrink-0 text-cyan-400">[{i + 1}]</span>
              <span>{step.log[locale]}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
