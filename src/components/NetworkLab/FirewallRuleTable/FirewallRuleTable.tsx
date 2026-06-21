// ファイアウォールルール照合ビジュアライザー。
// firewallState が存在するとき ProtocolInspector の代わりに表示する。
// マッチしたルールを黄色ハイライト、verdictを上部バナーで表示。

import { useEffect, useRef, useState } from 'react'
import type { FirewallState } from '../../../network/simulator/types'
import { useI18n } from '../../../i18n'

interface Props { state: FirewallState }

export function FirewallRuleTable({ state }: Props) {
  const { locale } = useI18n()
  const { rules, verdict, currentSrc, currentDst, currentProto, currentPort } = state

  // verdict が変化したタイミングでスライドアニメーションをトリガーする
  const [animate, setAnimate] = useState(false)
  const prevVerdictRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (verdict && verdict !== prevVerdictRef.current) {
      setAnimate(false)
      // 1フレーム待ってからclassを付け直すことでアニメーションを再生する
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true))
      })
    }
    prevVerdictRef.current = verdict
  }, [verdict])

  const permitCls = 'bg-green-500/20 text-green-400 border-green-500/40'
  const denyCls   = 'bg-red-500/20 text-red-400 border-red-500/40'

  return (
    <div className="space-y-2">
      {/* verdict バナー（スライドインアニメーション）*/}
      {verdict && (
        <div
          className={`flex items-center justify-center gap-2 rounded border py-2 text-sm font-bold
            transition-all duration-500
            ${animate ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
            ${verdict === 'permit' ? permitCls : denyCls}`}
        >
          <span>{verdict === 'permit' ? '✓ PERMIT' : '✗ DENY'}</span>
        </div>
      )}

      {/* 現在照合中のパケット情報 */}
      <div className="rounded border border-dark-border bg-dark-bg/30 px-2 py-1.5 font-mono text-[10px] dark:border-dark-border dark:bg-dark-bg/30 light:border-light-border light:bg-gray-50">
        <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {currentSrc} → {currentDst}
        </span>
        <span className="ml-2 text-cyan-400">
          {currentProto}{currentPort ? `:${currentPort}` : ''}
        </span>
      </div>

      {/* ルールテーブル */}
      <div className="overflow-x-auto rounded border border-dark-border dark:border-dark-border light:border-light-border">
        <table className="w-full min-w-[220px] text-[10px]">
          <thead>
            <tr className="border-b border-dark-border bg-dark-bg/40 dark:border-dark-border dark:bg-dark-bg/40 light:border-light-border light:bg-gray-50">
              {['#', locale === 'ja' ? 'アクション' : 'Action', 'Src', 'Dst', 'Proto', 'Port'].map(h => (
                <th key={h} className="px-1.5 py-1 text-left font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr
                key={rule.id}
                className={`border-b border-dark-border/40 transition-colors last:border-b-0
                  dark:border-dark-border/40 light:border-light-border/40
                  ${rule.matched
                    ? 'bg-yellow-500/20'
                    : 'odd:bg-dark-bg/10 dark:odd:bg-dark-bg/10 light:odd:bg-gray-50/60'
                  }`}
              >
                <td className="px-1.5 py-0.5 text-dark-textDim">{rule.id}</td>
                <td className={`px-1.5 py-0.5 font-semibold ${rule.action === 'permit' ? 'text-green-400' : 'text-red-400'}`}>
                  {rule.action.toUpperCase()}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-dark-text dark:text-dark-text light:text-light-text">
                  {rule.src}
                </td>
                <td className="px-1.5 py-0.5 font-mono text-dark-text dark:text-dark-text light:text-light-text">
                  {rule.dst}
                </td>
                <td className="px-1.5 py-0.5 text-dark-text dark:text-dark-text light:text-light-text">
                  {rule.proto}
                </td>
                <td className="px-1.5 py-0.5 text-dark-text dark:text-dark-text light:text-light-text">
                  {rule.port ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
