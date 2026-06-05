import type { CryptoState } from '../../../algorithms/types'
import { useI18n } from '../../../i18n'

interface CryptoVisualizerProps {
  state: CryptoState | null
}

export function CryptoVisualizer({ state }: CryptoVisualizerProps) {
  const { locale } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">—</span>
      </div>
    )
  }

  const { steps, currentIndex } = state

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <table className="w-full border-collapse text-xs">
        <colgroup>
          <col style={{ width: '38%' }} />
          <col style={{ width: '62%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-dark-border dark:border-dark-border light:border-light-border">
            <th className="pb-1 text-left text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {locale === 'ja' ? 'ステップ' : 'Step'}
            </th>
            <th className="pb-1 text-left text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {locale === 'ja' ? '値' : 'Value'}
            </th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => {
            const isCurrent = i === currentIndex && !state.done
            const isDone = state.done

            return (
              <tr
                key={i}
                className={[
                  'border-b border-dark-border/30 transition-colors dark:border-dark-border/30 light:border-light-border/30',
                  isCurrent ? 'bg-yellow-500/10' : '',
                  step.highlight && isDone ? 'bg-purple-500/10' : '',
                ].join(' ')}
              >
                <td className={[
                  'py-1.5 pr-2 font-medium leading-snug',
                  isCurrent ? 'text-yellow-400' : 'text-dark-text dark:text-dark-text light:text-light-text',
                ].join(' ')}>
                  {locale === 'ja' ? step.label.ja : step.label.en}
                </td>
                <td className="py-1.5 font-mono text-[11px] text-dark-textDim dark:text-dark-textDim light:text-light-textDim break-all leading-snug">
                  {step.value}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {state.done && (
        <div className="mt-3 rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
          {locale === 'ja' ? '✓ 完了' : '✓ Complete'}
        </div>
      )}
    </div>
  )
}
