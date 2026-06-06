// 初回訪問者向けのチュートリアルモーダル。
// localStorage に完了フラグを保存することで、2回目以降は表示しない。
// コース紹介を 4 ステップのカルーセルで示す。

import { useState, useCallback } from 'react'
import { FlaskConical, Server, Zap, Database, BrainCircuit, CheckCircle2 } from 'lucide-react'
import { useI18n } from '../../i18n'

const LS_KEY_DONE = 'browser-lab:tutorial-done'

// 初回起動かどうかを確認する。値が存在すれば「完了済み」と判断する。
export function isTutorialDone(): boolean {
  try {
    return localStorage.getItem(LS_KEY_DONE) === 'true'
  } catch {
    // localStorage が使えない環境（プライベートモード等）では表示しない
    return true
  }
}

function markTutorialDone(): void {
  try {
    localStorage.setItem(LS_KEY_DONE, 'true')
  } catch { /* 保存失敗は無視 */ }
}

interface TutorialModalProps {
  onClose: () => void
}

// 各ステップに対応するアイコンとアクセントカラー
const STEP_META = [
  { icon: Server,       accent: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/10' },
  { icon: Zap,         accent: 'text-blue-400',   border: 'border-blue-500/40',   bg: 'bg-blue-500/10'   },
  { icon: Database,    accent: 'text-green-400',  border: 'border-green-500/40',  bg: 'bg-green-500/10'  },
  { icon: BrainCircuit,accent: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10' },
] as const

export function TutorialModal({ onClose }: TutorialModalProps) {
  const { t } = useI18n()
  const tutorial = t.tutorial
  const [stepIndex, setStepIndex] = useState(0)

  const totalSteps = tutorial.steps.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1

  const step = tutorial.steps[stepIndex]
  const meta = STEP_META[stepIndex]
  const StepIcon = meta.icon

  const handleClose = useCallback(() => {
    markTutorialDone()
    onClose()
  }, [onClose])

  const handleNext = useCallback(() => {
    if (isLast) {
      handleClose()
    } else {
      setStepIndex((i) => i + 1)
    }
  }, [isLast, handleClose])

  const handlePrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  return (
    // オーバーレイ。クリックしても閉じない（Escape キーや×ボタンのみ）
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tutorial.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-dark-border bg-dark-sidebar shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">

        {/* ── ヘッダー ── */}
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4 dark:border-dark-border light:border-light-border">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim" />
            <span className="text-sm font-bold text-dark-text dark:text-dark-text light:text-light-text">
              {tutorial.title}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
          >
            {tutorial.skipButton}
          </button>
        </div>

        {/* ── ステップインジケーター ── */}
        <div className="flex items-center justify-center gap-2 pt-4">
          {tutorial.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIndex(i)}
              aria-label={`ステップ ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? 'w-6 bg-blue-500'
                  : 'w-2 bg-dark-border hover:bg-dark-textDim dark:bg-dark-border dark:hover:bg-dark-textDim light:bg-light-border light:hover:bg-light-textDim'
              }`}
            />
          ))}
        </div>

        {/* ── コンテンツ ── */}
        <div className="flex-1 px-6 py-6">
          {/* コースアイコンとタイトル */}
          <div className="mb-5 flex items-center gap-4">
            <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 ${meta.border} ${meta.bg} ${meta.accent}`}>
              <StepIcon size={28} />
            </div>
            <div>
              <div className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {stepIndex + 1} / {totalSteps}
              </div>
              <h2 className="text-base font-bold text-dark-text dark:text-dark-text light:text-light-text">
                {step.title}
              </h2>
            </div>
          </div>

          {/* 説明文 */}
          <p className="mb-5 text-sm leading-relaxed text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {step.description}
          </p>

          {/* ポイント一覧 */}
          <ul className="space-y-2">
            {step.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-dark-text dark:text-dark-text light:text-light-text">
                <CheckCircle2 size={13} className={`mt-0.5 flex-shrink-0 ${meta.accent}`} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── フッター（ナビゲーション） ── */}
        <div className="flex items-center justify-between border-t border-dark-border px-6 py-4 dark:border-dark-border light:border-light-border">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="text-xs text-dark-textDim transition-colors hover:text-dark-text disabled:opacity-30 dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
          >
            {tutorial.prevButton}
          </button>

          <button
            onClick={handleNext}
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          >
            {isLast ? tutorial.doneButton : tutorial.nextButton}
          </button>
        </div>
      </div>
    </div>
  )
}
