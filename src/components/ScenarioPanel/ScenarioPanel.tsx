import { useState } from 'react'
import { computeLineDiff, summarizeDiff, type DiffLine } from '../../lib/simpleDiff'
import { useI18n } from '../../i18n'

interface ScenarioPanelProps {
  title: string
  description: string
  hints: string[]
  solution: string | Record<string, string>
  // 現在のエディタ内容（差分表示に使用）。DB コースは文字列、プログラミングコースはファイル群。
  currentContent?: string | Record<string, string>
  // 模範解答を確認表示したとき（confirming → visible の遷移）に呼ばれるコールバック。
  // シナリオ完了マークを付けるために親コンポーネントが使う。
  onSolutionViewed?: () => void
}

// 差分タブは currentContent が渡されているときのみ表示する
type PanelTab = 'problem' | 'hints' | 'solution' | 'diff'

// boolean フラグ 2 個では「confirming（確認中）」という第 3 状態が表現できないため union で定義する
type SolutionState = 'hidden' | 'confirming' | 'visible'

export function ScenarioPanel({
  title,
  description,
  hints,
  solution,
  currentContent,
  onSolutionViewed,
}: ScenarioPanelProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<PanelTab>('problem')
  const [solutionState, setSolutionState] = useState<SolutionState>('hidden')

  // 何番目のヒントまで表示したか（0 = 未表示）。
  // ヒントを一気に見せずに段階的に開示することで、
  // 学習者が自力で考える時間を確保する。
  const [visibleHintCount, setVisibleHintCount] = useState(0)

  const hasDiffTab = currentContent !== undefined

  const PANEL_TABS: { id: PanelTab; label: string }[] = [
    { id: 'problem', label: t.scenarioPanel.tabProblem },
    { id: 'hints', label: t.scenarioPanel.tabHints(hints.length) },
    { id: 'solution', label: t.scenarioPanel.tabSolution },
    ...(hasDiffTab ? [{ id: 'diff' as PanelTab, label: t.scenarioPanel.tabDiff }] : []),
  ]

  const hasMoreHints = visibleHintCount < hints.length
  const allHintsRevealed = visibleHintCount >= hints.length && hints.length > 0

  // 解答テキスト（ファイル群の場合はファイル名ヘッダー付きで結合する）
  const solutionText =
    typeof solution === 'string'
      ? solution
      : Object.entries(solution)
          .map(([filename, code]) => `// === ${filename} ===\n${code}`)
          .join('\n\n')

  return (
    <div className="flex h-full flex-col bg-dark-sidebar dark:bg-dark-sidebar light:bg-light-sidebar">
      {/* role="tablist" でタブグループをスクリーンリーダーに伝える */}
      <div
        role="tablist"
        aria-label={t.scenarioPanel.ariaLabel}
        className="flex flex-shrink-0 border-b border-dark-border dark:border-dark-border light:border-light-border"
      >
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-dark-text dark:text-dark-text light:text-light-text'
                : 'text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h2 className="mb-3 text-sm font-bold text-dark-text dark:text-dark-text light:text-light-text">
          {title}
        </h2>

        {activeTab === 'problem' && (
          <div className="prose prose-sm prose-invert dark:prose-invert max-w-none">
            <MarkdownRenderer text={description} />
          </div>
        )}

        {activeTab === 'hints' && (
          <div className="space-y-3">
            {visibleHintCount === 0 && (
              <p className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {t.scenarioPanel.hintsPrompt}
              </p>
            )}

            {hints.slice(0, visibleHintCount).map((hint, i) => (
              <div
                key={i}
                className="rounded-md border border-yellow-600/30 bg-yellow-600/10 p-3"
              >
                <div className="mb-1 text-xs font-semibold text-yellow-400">
                  {t.scenarioPanel.hintLabel(i)}
                </div>
                <div className="text-xs text-dark-text dark:text-dark-text light:text-light-text">
                  {hint}
                </div>
              </div>
            ))}

            {hasMoreHints && (
              <button
                onClick={() => setVisibleHintCount((prev) => prev + 1)}
                className="w-full rounded-md border border-yellow-600/40 px-3 py-2 text-xs font-medium text-yellow-400 transition-colors hover:border-yellow-500/60 hover:bg-yellow-600/10"
              >
                {t.scenarioPanel.hintRevealButton(visibleHintCount, hints.length)}
              </button>
            )}

            {allHintsRevealed && (
              <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {t.scenarioPanel.allHintsRevealed}
              </p>
            )}
          </div>
        )}

        {activeTab === 'solution' && (
          <div>
            {solutionState === 'hidden' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-4xl">{t.scenarioPanel.solutionLock}</div>
                <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim whitespace-pre-line">
                  {t.scenarioPanel.solutionLockedMessage}
                </p>
                <button
                  onClick={() => setSolutionState('confirming')}
                  className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {t.scenarioPanel.showSolutionButton}
                </button>
              </div>
            )}

            {solutionState === 'confirming' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-4xl">{t.scenarioPanel.solutionConfirmIcon}</div>
                <p className="text-center text-sm font-medium text-dark-text dark:text-dark-text light:text-light-text">
                  {t.scenarioPanel.solutionConfirmTitle}
                </p>
                <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  {t.scenarioPanel.solutionConfirmMessage}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSolutionState('hidden')}
                    className="rounded-md border border-dark-border px-4 py-2 text-xs font-medium text-dark-textDim transition-colors hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
                  >
                    {t.scenarioPanel.solutionCancelButton}
                  </button>
                  <button
                    onClick={() => {
                      setSolutionState('visible')
                      // 解答を確認したことを親に通知してシナリオ完了マークを付ける
                      onSolutionViewed?.()
                    }}
                    className="rounded-md bg-amber-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                  >
                    {t.scenarioPanel.solutionShowButton}
                  </button>
                </div>
              </div>
            )}

            {solutionState === 'visible' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-400">{t.scenarioPanel.solutionLabel}</span>
                  <button
                    onClick={() => setSolutionState('hidden')}
                    className="text-xs text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
                  >
                    {t.scenarioPanel.solutionHideButton}
                  </button>
                </div>
                <pre className="overflow-auto rounded-md bg-dark-bg p-3 text-xs text-dark-text dark:bg-dark-bg dark:text-dark-text light:bg-gray-100 light:text-light-text">
                  <code>{solutionText}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diff' && hasDiffTab && (
          <DiffTab currentContent={currentContent!} solution={solution} />
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// 差分タブのコンテンツ
// ----------------------------------------------------------------

interface DiffTabProps {
  currentContent: string | Record<string, string>
  solution: string | Record<string, string>
}

function DiffTab({ currentContent, solution }: DiffTabProps) {
  const { t } = useI18n()

  if (typeof currentContent === 'string' && typeof solution === 'string') {
    return (
      <SingleFileDiff
        label={t.scenarioPanel.diffVsLabel}
        current={currentContent}
        expected={solution}
      />
    )
  }

  if (typeof currentContent === 'object' && typeof solution === 'object') {
    const solutionFiles = Object.entries(solution)
    return (
      <div className="space-y-4">
        {solutionFiles.map(([filename, expectedCode]) => (
          <SingleFileDiff
            key={filename}
            label={filename}
            current={currentContent[filename] ?? ''}
            expected={expectedCode}
          />
        ))}
      </div>
    )
  }

  return (
    <p className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
      {useI18n().t.scenarioPanel.diffError}
    </p>
  )
}

// ----------------------------------------------------------------
// 単一ファイルの差分表示
// ----------------------------------------------------------------

interface SingleFileDiffProps {
  label: string
  current: string
  expected: string
}

function SingleFileDiff({ label, current, expected }: SingleFileDiffProps) {
  const { t } = useI18n()
  const diffLines = computeLineDiff(current, expected)

  if (diffLines === null) {
    return (
      <div className="rounded-md border border-dark-border p-3">
        <div className="mb-2 text-xs font-semibold text-dark-textDim">{label}</div>
        <p className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {t.scenarioPanel.diffTooLong}
        </p>
      </div>
    )
  }

  const { added, removed, equal } = summarizeDiff(diffLines)
  const hasChanges = added > 0 || removed > 0

  return (
    <div className="rounded-md border border-dark-border dark:border-dark-border light:border-light-border">
      {/* ファイルヘッダー：差分の概要を一行で示す */}
      <div className="flex items-center gap-3 border-b border-dark-border px-3 py-2 dark:border-dark-border light:border-light-border">
        <span className="text-xs font-semibold text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {label}
        </span>
        <div className="ml-auto flex gap-2 text-xs">
          {hasChanges ? (
            <>
              {removed > 0 && <span className="text-red-400">{t.scenarioPanel.diffRemoved(removed)}</span>}
              {added > 0 && <span className="text-green-400">{t.scenarioPanel.diffAdded(added)}</span>}
              <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {t.scenarioPanel.diffEqual(equal)}
              </span>
            </>
          ) : (
            <span className="text-green-400">{t.scenarioPanel.diffMatches}</span>
          )}
        </div>
      </div>

      {hasChanges ? (
        <DiffLines lines={diffLines} />
      ) : (
        <div className="px-3 py-4 text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {t.scenarioPanel.diffMatchesMessage}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// 差分行のレンダリング（変更のない行を周辺数行のみ表示）
// ----------------------------------------------------------------

// 変更行の前後何行を context として表示するか
const CONTEXT_LINES = 3

interface DiffLinesProps {
  lines: DiffLine[]
}

function DiffLines({ lines }: DiffLinesProps) {
  const changedIndices = new Set(
    lines.flatMap((line, i) => (line.kind !== 'equal' ? [i] : []))
  )

  const visibleIndices = new Set<number>()
  for (const idx of changedIndices) {
    for (let d = -CONTEXT_LINES; d <= CONTEXT_LINES; d++) {
      const target = idx + d
      if (target >= 0 && target < lines.length) visibleIndices.add(target)
    }
  }

  const elements: React.ReactNode[] = []
  let prevIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (!visibleIndices.has(i)) continue

    if (prevIdx !== -1 && i > prevIdx + 1) {
      elements.push(
        <div key={`gap-${i}`} className="border-y border-dark-border/50 px-3 py-0.5 text-xs text-dark-textDim dark:border-dark-border/50 light:border-light-border">
          ···
        </div>
      )
    }

    elements.push(<DiffLineRow key={i} line={lines[i]} />)
    prevIdx = i
  }

  return (
    <div className="overflow-x-auto">
      <pre className="font-mono text-xs leading-5">{elements}</pre>
    </div>
  )
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const { kind, text, lineNo } = line

  const rowClass =
    kind === 'added'
      ? 'bg-green-500/10 text-green-400'
      : kind === 'removed'
      ? 'bg-red-500/10 text-red-400'
      : 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'

  const prefix = kind === 'added' ? '+' : kind === 'removed' ? '-' : ' '

  return (
    <div className={`flex items-start gap-0 px-3 py-0 ${rowClass}`}>
      <span className="mr-2 w-7 flex-shrink-0 select-none text-right opacity-50">
        {kind !== 'added' ? lineNo : ''}
      </span>
      <span className="mr-2 w-3 flex-shrink-0 select-none opacity-70">{prefix}</span>
      <span className="whitespace-pre">{text}</span>
    </div>
  )
}

// ----------------------------------------------------------------
// マークダウンレンダラー
// ----------------------------------------------------------------

function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code
            key={i}
            className="rounded bg-dark-bg px-1 py-0.5 font-mono text-blue-300 dark:bg-dark-bg light:bg-gray-100 light:text-blue-600"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        )
      )}
    </>
  )
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1 text-xs text-dark-text dark:text-dark-text light:text-light-text">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="mt-4 text-sm font-bold text-dark-text dark:text-dark-text light:text-light-text">
              {line.slice(3)}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="mt-3 text-xs font-bold text-blue-400">
              {line.slice(4)}
            </h3>
          )
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-dark-textDim">•</span>
              <span>{renderInlineCode(line.slice(2))}</span>
            </div>
          )
        }
        if (line.startsWith('```')) return null
        if (line.trim() === '') return <div key={i} className="h-2" />
        return <p key={i}>{renderInlineCode(line)}</p>
      })}
    </div>
  )
}
