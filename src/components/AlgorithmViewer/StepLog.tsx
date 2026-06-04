import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n'
import type { AlgorithmStep } from '../../algorithms/types'

interface StepLogProps {
  steps: AlgorithmStep[]
  currentStep: number
}

export function StepLog({ steps, currentStep }: StepLogProps) {
  const { locale, t } = useI18n()
  const alg = t.algorithm
  const bottomRef = useRef<HTMLDivElement>(null)

  // 新しいステップが追加されるたびに末尾へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentStep])

  const visibleSteps = steps.slice(0, currentStep + 1)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-dark-border px-3 py-1.5 dark:border-dark-border light:border-light-border">
        <span className="text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {alg.stepLog.title}
        </span>
        {steps.length > 0 && (
          <span className="rounded bg-dark-hover px-1.5 py-0.5 text-xs text-dark-textDim dark:bg-dark-hover dark:text-dark-textDim light:bg-light-hover light:text-light-textDim">
            {currentStep + 1} / {steps.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono">
        {visibleSteps.length === 0 ? (
          <p className="p-2 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            {alg.stepLog.empty}
          </p>
        ) : (
          visibleSteps.map((step, i) => (
            <div
              key={i}
              className={`mb-0.5 flex gap-2 rounded px-2 py-0.5 text-xs ${
                i === currentStep
                  ? 'bg-blue-500/20 text-dark-text dark:text-dark-text light:text-light-text'
                  : 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
              }`}
            >
              <span className="shrink-0 text-blue-400">{alg.stepLog.step(i + 1)}</span>
              <span>{step.log[locale]}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
