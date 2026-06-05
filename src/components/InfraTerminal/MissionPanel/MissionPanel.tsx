import { useState } from 'react'
import { ChevronDown, ChevronRight, Terminal, Info, Lightbulb, Lock, BookOpen, CheckCircle2, ArrowRight } from 'lucide-react'
import type { InfraMission, MissionLocale } from '../../../missions/infra'
import type { Locale } from '../../../i18n'

interface Props {
  mission: InfraMission
  locale: Locale
  isCleared: boolean
  onNextMission: () => void
  /** i18nUI文字列 */
  ui: MissionPanelUi
}

/** 親から受け取るUI文字列の型（i18nに対応） */
export interface MissionPanelUi {
  missionLabel: string
  backgroundLabel: string
  hintsLabel: string
  answerLabel: string
  commandsLabel: string
  showHintButton: (n: number, total: number) => string
  allHintsShown: string
  showAnswerButton: string
  hideAnswerButton: string
  answerWarning: string
  clearBanner: string
  nextMissionButton: string
}

type Tab = 'mission' | 'hints' | 'answer' | 'commands'

/**
 * ミッション説明・ヒント・解答・コマンド早見表を表示する右パネル。
 *
 * ヒントは段階的に開示（最大3段階）し、解答は警告確認後に表示する。
 * ミッションが変わったときは key で再マウントして全状態をリセットする。
 */
export function MissionPanel({ mission, locale, isCleared, onNextMission, ui }: Props) {
  const content: MissionLocale = mission.locale[locale]

  const [activeTab, setActiveTab] = useState<Tab>('mission')
  const [revealedHints, setRevealedHints] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [answerWarningShown, setAnswerWarningShown] = useState(false)
  const [backgroundExpanded, setBackgroundExpanded] = useState(false)

  const canRevealMoreHints = revealedHints < content.hints.length

  const handleShowAnswer = () => {
    if (!answerWarningShown) {
      // 1回目のクリックは警告を出して、2回目で解答を表示する
      setAnswerWarningShown(true)
    } else {
      setShowAnswer(true)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dark-sidebar dark:bg-dark-sidebar light:bg-light-sidebar">
      {/* クリアバナー */}
      {isCleared && (
        <div className="flex-shrink-0 border-b border-green-500/30 bg-green-500/10 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-400 dark:text-green-400 light:text-green-600">
            <CheckCircle2 size={15} />
            {ui.clearBanner}
          </div>
          <button
            onClick={onNextMission}
            className="mt-1.5 flex items-center gap-1 text-xs text-green-400 transition-colors hover:text-green-300 dark:text-green-400 dark:hover:text-green-300 light:text-green-600 light:hover:text-green-700"
          >
            {ui.nextMissionButton}
            <ArrowRight size={11} />
          </button>
        </div>
      )}

      {/* タブバー */}
      <div className="flex flex-shrink-0 border-b border-dark-border dark:border-dark-border light:border-light-border">
        {([ 'mission', 'hints', 'answer', 'commands'] as Tab[]).map((tab) => (
          <TabButton
            key={tab}
            active={activeTab === tab}
            label={tabLabel(tab, ui)}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'mission' && (
          <MissionTab content={content} ui={ui} expanded={backgroundExpanded} onToggleBackground={() => setBackgroundExpanded((v) => !v)} />
        )}
        {activeTab === 'hints' && (
          <HintsTab content={content} revealed={revealedHints} canReveal={canRevealMoreHints} onReveal={() => setRevealedHints((n) => n + 1)} ui={ui} />
        )}
        {activeTab === 'answer' && (
          <AnswerTab content={content} showAnswer={showAnswer} warningShown={answerWarningShown} onShow={handleShowAnswer} onHide={() => { setShowAnswer(false); setAnswerWarningShown(false) }} ui={ui} />
        )}
        {activeTab === 'commands' && (
          <CommandsTab content={content} ui={ui} />
        )}
      </div>
    </div>
  )
}

// ─── サブコンポーネント ───────────────────────────────────────────

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-b-2 border-orange-400 text-dark-text dark:text-dark-text light:text-light-text'
          : 'text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text'
      }`}
    >
      {label}
    </button>
  )
}

function tabLabel(tab: Tab, ui: MissionPanelUi): string {
  if (tab === 'mission')  return ui.missionLabel
  if (tab === 'hints')    return ui.hintsLabel
  if (tab === 'answer')   return ui.answerLabel
  return ui.commandsLabel
}

// ミッション文タブ: 問題文 + 折りたたみ式の背景説明
function MissionTab({ content, ui, expanded, onToggleBackground }: {
  content: MissionLocale
  ui: MissionPanelUi
  expanded: boolean
  onToggleBackground: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400">
        <Terminal size={12} />
        {ui.missionLabel}
      </div>

      {/* ミッション本文 */}
      <pre className="whitespace-pre-wrap rounded-lg border border-dark-border bg-dark-bg p-3 font-sans text-sm leading-relaxed text-dark-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-text light:border-light-border light:bg-white light:text-light-text">
        {content.description}
      </pre>

      {/* 背景説明（折りたたみ） */}
      <button
        onClick={onToggleBackground}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Info size={12} />
        {ui.backgroundLabel}
      </button>

      {expanded && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm leading-relaxed text-dark-text dark:text-dark-text light:text-light-text">
          {content.background.split('\n').map((line, i) => (
            <p key={i} className="mb-1 last:mb-0">{line || ' '}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ヒントタブ: 1段階ずつ開示する
function HintsTab({ content, revealed, canReveal, onReveal, ui }: {
  content: MissionLocale
  revealed: number
  canReveal: boolean
  onReveal: () => void
  ui: MissionPanelUi
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-400">
        <Lightbulb size={12} />
        {ui.hintsLabel}
      </div>

      {/* 開示済みのヒント */}
      {content.hints.slice(0, revealed).map((hint, i) => (
        <div
          key={i}
          className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm leading-relaxed text-dark-text dark:text-dark-text light:text-light-text"
        >
          <span className="mb-1 block text-xs font-medium text-yellow-400">
            Hint {i + 1}
          </span>
          {hint}
        </div>
      ))}

      {/* 次のヒントを表示するボタン */}
      {canReveal ? (
        <button
          onClick={onReveal}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-yellow-500/30 py-2 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/10"
        >
          <Lightbulb size={12} />
          {ui.showHintButton(revealed, content.hints.length)}
        </button>
      ) : (
        <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {ui.allHintsShown}
        </p>
      )}
    </div>
  )
}

// 解答タブ: 確認後に解答を表示する
function AnswerTab({ content, showAnswer, warningShown, onShow, onHide, ui }: {
  content: MissionLocale
  showAnswer: boolean
  warningShown: boolean
  onShow: () => void
  onHide: () => void
  ui: MissionPanelUi
}) {
  if (showAnswer) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-400">
          <BookOpen size={12} />
          {ui.answerLabel}
        </div>
        <pre className="whitespace-pre-wrap rounded-lg border border-green-500/20 bg-green-500/5 p-3 font-mono text-sm text-green-300 dark:text-green-300 light:text-green-700">
          {content.answer}
        </pre>
        <button
          onClick={onHide}
          className="text-xs text-dark-textDim underline hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          {ui.hideAnswerButton}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-4 text-center">
      <Lock size={28} className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim" />

      {warningShown && (
        <p className="max-w-[200px] text-xs text-yellow-400">
          {ui.answerWarning}
        </p>
      )}

      <button
        onClick={onShow}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          warningShown
            ? 'border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'border border-dark-border text-dark-textDim hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text'
        }`}
      >
        {ui.showAnswerButton}
      </button>
    </div>
  )
}

// コマンド早見表タブ
function CommandsTab({ content, ui }: { content: MissionLocale; ui: MissionPanelUi }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {ui.commandsLabel}
      </div>

      <div className="overflow-hidden rounded-lg border border-dark-border dark:border-dark-border light:border-light-border">
        {content.commands.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2 ${
              i < content.commands.length - 1
                ? 'border-b border-dark-border dark:border-dark-border light:border-light-border'
                : ''
            }`}
          >
            <code className="shrink-0 rounded bg-dark-bg px-1.5 py-0.5 font-mono text-xs text-orange-300 dark:bg-dark-bg dark:text-orange-300 light:bg-gray-100 light:text-orange-700">
              {item.cmd}
            </code>
            <span className="text-xs leading-relaxed text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
