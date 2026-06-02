import { useState } from 'react'

interface ScenarioPanelProps {
  title: string
  description: string
  hints: string[]
  solution: string | Record<string, string>
}

type PanelTab = 'problem' | 'hints' | 'solution'

// boolean フラグ 2 個では「confirming（確認中）」という第 3 状態が表現できないため union で定義する
type SolutionState = 'hidden' | 'confirming' | 'visible'

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'problem', label: '問題文' },
  { id: 'hints', label: 'ヒント' },
  { id: 'solution', label: '解答例' },
]

export function ScenarioPanel({ title, description, hints, solution }: ScenarioPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('problem')
  const [solutionState, setSolutionState] = useState<SolutionState>('hidden')

  // 何番目のヒントまで表示したか（0 = 未表示）。
  // ヒントを一気に見せずに段階的に開示することで、
  // 学習者が自力で考える時間を確保する。
  const [visibleHintCount, setVisibleHintCount] = useState(0)

  const hasMoreHints = visibleHintCount < hints.length
  const allHintsRevealed = visibleHintCount >= hints.length && hints.length > 0

  const solutionText =
    typeof solution === 'string'
      ? solution
      : Object.entries(solution)
          .map(([filename, code]) => `// === ${filename} ===\n${code}`)
          .join('\n\n')

  const tabLabel = (tab: { id: PanelTab; label: string }) => {
    if (tab.id === 'hints') return `${tab.label} (${hints.length})`
    return tab.label
  }

  return (
    <div className="flex h-full flex-col bg-dark-sidebar dark:bg-dark-sidebar light:bg-light-sidebar">
      {/* role="tablist" でタブグループをスクリーンリーダーに伝える */}
      <div
        role="tablist"
        aria-label="シナリオパネル"
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
            {tabLabel(tab)}
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
                まず自分で考えてみましょう。行き詰まったらヒントを少しずつ開きましょう。
              </p>
            )}

            {hints.slice(0, visibleHintCount).map((hint, i) => (
              <div
                key={i}
                className="rounded-md border border-yellow-600/30 bg-yellow-600/10 p-3"
              >
                <div className="mb-1 text-xs font-semibold text-yellow-400">
                  ヒント {i + 1}
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
                ヒント {visibleHintCount + 1} を見る ({visibleHintCount + 1}/{hints.length})
              </button>
            )}

            {allHintsRevealed && (
              <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                すべてのヒントを表示しました
              </p>
            )}
          </div>
        )}

        {activeTab === 'solution' && (
          <div>
            {solutionState === 'hidden' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-4xl">🔒</div>
                <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  まず自分で解いてみましょう！<br />
                  解答例を見る前にヒントを参考にしてください。
                </p>
                <button
                  onClick={() => setSolutionState('confirming')}
                  className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  解答例を表示する
                </button>
              </div>
            )}

            {solutionState === 'confirming' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-4xl">⚠️</div>
                <p className="text-center text-sm font-medium text-dark-text dark:text-dark-text light:text-light-text">
                  本当に解答例を見ますか？
                </p>
                <p className="text-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  自力で解けそうならヒントをもう一度確認してみましょう。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSolutionState('hidden')}
                    className="rounded-md border border-dark-border px-4 py-2 text-xs font-medium text-dark-textDim transition-colors hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
                  >
                    やはりやめる
                  </button>
                  <button
                    onClick={() => setSolutionState('visible')}
                    className="rounded-md bg-amber-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                  >
                    はい、表示する
                  </button>
                </div>
              </div>
            )}

            {solutionState === 'visible' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-400">解答例</span>
                  <button
                    onClick={() => setSolutionState('hidden')}
                    className="text-xs text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
                  >
                    非表示にする
                  </button>
                </div>
                <pre className="overflow-auto rounded-md bg-dark-bg p-3 text-xs text-dark-text dark:bg-dark-bg dark:text-dark-text light:bg-gray-100 light:text-light-text">
                  <code>{solutionText}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// マークダウンのインラインコード（`backtick`）を <code> タグに変換する
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

// シナリオ説明文のマークダウンをシンプルにレンダリングする。
// 外部ライブラリを避けてバンドルサイズを抑えるための最小実装。
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
        if (line.startsWith('```')) {
          // コードブロック記号は表示しない
          return null
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />
        }
        return <p key={i}>{renderInlineCode(line)}</p>
      })}
    </div>
  )
}
