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

// ─── ネットワーク構成図（SVG） ────────────────────────────────────────────────

// ネットワークカテゴリのミッションで、概念を視覚的に補足するために表示する。
// テキスト説明だけでは分かりにくいプロトコルスタックやリクエスト/レスポンスの流れを
// 図示することで、学習の理解を補助する。
function NetworkDiagram() {
  return (
    <svg
      viewBox="0 0 320 140"
      className="w-full rounded-lg border border-blue-500/20 bg-blue-500/5"
      role="img"
      aria-label="クライアント・サーバー間の HTTP リクエスト/レスポンスの流れ"
    >
      {/* クライアントボックス */}
      <rect x="10" y="50" width="80" height="40" rx="6"
        className="fill-dark-bg stroke-blue-400/60 dark:fill-dark-bg light:fill-white"
        strokeWidth="1.5" />
      <text x="50" y="67" textAnchor="middle" fontSize="9"
        className="fill-blue-300 dark:fill-blue-300 light:fill-blue-600" fontWeight="600">
        Client
      </text>
      <text x="50" y="80" textAnchor="middle" fontSize="8"
        className="fill-dark-textDim dark:fill-dark-textDim light:fill-light-textDim">
        Browser
      </text>

      {/* DNS リゾルバボックス（中央） */}
      <rect x="120" y="10" width="80" height="35" rx="6"
        className="fill-dark-bg stroke-yellow-400/60 dark:fill-dark-bg light:fill-white"
        strokeWidth="1.5" />
      <text x="160" y="25" textAnchor="middle" fontSize="9"
        className="fill-yellow-300 dark:fill-yellow-300 light:fill-yellow-600" fontWeight="600">
        DNS
      </text>
      <text x="160" y="38" textAnchor="middle" fontSize="8"
        className="fill-dark-textDim dark:fill-dark-textDim light:fill-light-textDim">
        /etc/hosts
      </text>

      {/* サーバーボックス */}
      <rect x="230" y="50" width="80" height="40" rx="6"
        className="fill-dark-bg stroke-green-400/60 dark:fill-dark-bg light:fill-white"
        strokeWidth="1.5" />
      <text x="270" y="67" textAnchor="middle" fontSize="9"
        className="fill-green-300 dark:fill-green-300 light:fill-green-600" fontWeight="600">
        Server
      </text>
      <text x="270" y="80" textAnchor="middle" fontSize="8"
        className="fill-dark-textDim dark:fill-dark-textDim light:fill-light-textDim">
        :80 / :8080
      </text>

      {/* クライアント → DNS の矢印 */}
      <line x1="90" y1="60" x2="120" y2="35"
        className="stroke-yellow-400/50" strokeWidth="1" strokeDasharray="4,3" />
      <text x="96" y="48" fontSize="7"
        className="fill-yellow-400/70 dark:fill-yellow-400/70 light:fill-yellow-600/70">
        名前解決
      </text>

      {/* クライアント → サーバー の矢印（HTTP Request） */}
      <line x1="90" y1="65" x2="230" y2="65"
        className="stroke-blue-400/70" strokeWidth="1.5" markerEnd="url(#arrowBlue)" />
      <text x="160" y="60" textAnchor="middle" fontSize="8"
        className="fill-blue-300 dark:fill-blue-300 light:fill-blue-600">
        HTTP Request
      </text>

      {/* サーバー → クライアント の矢印（HTTP Response） */}
      <line x1="230" y1="80" x2="90" y2="80"
        className="stroke-green-400/70" strokeWidth="1.5" markerEnd="url(#arrowGreen)" />
      <text x="160" y="95" textAnchor="middle" fontSize="8"
        className="fill-green-300 dark:fill-green-300 light:fill-green-600">
        HTTP Response
      </text>

      {/* 矢印のマーカー定義 */}
      <defs>
        <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" className="fill-blue-400/70" />
        </marker>
        <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" className="fill-green-400/70" />
        </marker>
      </defs>

      {/* ログラベル（右下） */}
      <text x="230" y="105" fontSize="7"
        className="fill-dark-textDim dark:fill-dark-textDim light:fill-light-textDim">
        access.log に記録
      </text>
    </svg>
  )
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

      {/* タブバー: role="tablist" でスクリーンリーダーにタブグループを伝える */}
      <div
        role="tablist"
        aria-label="ミッションパネル"
        className="flex flex-shrink-0 border-b border-dark-border dark:border-dark-border light:border-light-border"
      >
        {([ 'mission', 'hints', 'answer', 'commands'] as Tab[]).map((tab) => (
          <TabButton
            key={tab}
            id={`mission-tab-${tab}`}
            panelId={`mission-panel-${tab}`}
            active={activeTab === tab}
            label={tabLabel(tab, ui)}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* タブコンテンツ: role="tabpanel" でスクリーンリーダーにパネル領域を伝える */}
      <div
        role="tabpanel"
        id={`mission-panel-${activeTab}`}
        aria-labelledby={`mission-tab-${activeTab}`}
        className="flex-1 overflow-auto p-4"
      >
        {activeTab === 'mission' && (
          <MissionTab content={content} ui={ui} category={mission.category} expanded={backgroundExpanded} onToggleBackground={() => setBackgroundExpanded((v) => !v)} />
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

function TabButton({ id, panelId, active, label, onClick }: {
  id: string
  panelId: string
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
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

// ミッション文タブ: 問題文 + 折りたたみ式の背景説明 + カテゴリ別補足図
function MissionTab({ content, ui, category, expanded, onToggleBackground }: {
  content: MissionLocale
  ui: MissionPanelUi
  category: string
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

      {/* ネットワークカテゴリのみ構成図を表示する。
          テキストだけでは掴みにくいプロトコルの流れを視覚的に補足する。 */}
      {category === 'network' && <NetworkDiagram />}

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
