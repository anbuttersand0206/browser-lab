// ネットワーク学習コースの右パネル。
// シナリオの説明・RFC・ユースケース・視覚ガイド・ARPテーブル等を表示する。

import type { NetworkScenario } from '../../../network/simulator/types'
import type { NetworkState } from '../../../network/simulator/types'
import { ProtocolInspector } from '../ProtocolInspector/ProtocolInspector'
import { TcpWindowChart } from '../TcpWindowChart/TcpWindowChart'
import { FirewallRuleTable } from '../FirewallRuleTable/FirewallRuleTable'
import { useI18n } from '../../../i18n'

interface Props {
  scenario: NetworkScenario | null
  state: NetworkState | null
  selectedPacketId: string | null
}

export function NetworkInfoPanel({ scenario, state, selectedPacketId }: Props) {
  const { locale } = useI18n()

  if (!scenario) return (
    <div className="p-4 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
      {locale === 'ja' ? 'シナリオを選択してください' : 'Select a scenario'}
    </div>
  )

  const selectedPacket = state?.packets.find(p => p.packet.id === selectedPacketId)?.packet
    ?? null

  const labelCls = 'text-xs font-medium uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
  const valueCls = 'text-xs leading-relaxed text-dark-text dark:text-dark-text light:text-light-text'
  const sectionCls = 'border-b border-dark-border px-4 py-3 dark:border-dark-border light:border-light-border'

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* タイトル */}
      <div className={`${sectionCls} bg-cyan-500/5`}>
        <h2 className="text-sm font-bold text-dark-text dark:text-dark-text light:text-light-text">
          {scenario.title[locale]}
        </h2>
        {scenario.rfcNumbers.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {scenario.rfcNumbers.map((rfc: string) => (
              <span key={rfc} className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400">
                {rfc}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={sectionCls}>
        <div className={`${labelCls} mb-2`}>{locale === 'ja' ? '概要' : 'Overview'}</div>
        <p className={valueCls}>{scenario.description[locale]}</p>
      </div>

      <div className={sectionCls}>
        <div className={`${labelCls} mb-1`}>{locale === 'ja' ? '実務でのユースケース' : 'Use Cases'}</div>
        <p className={valueCls}>{scenario.useCases[locale]}</p>
      </div>

      <div className={sectionCls}>
        <div className={`${labelCls} mb-1`}>{locale === 'ja' ? 'どこを見るべきか' : 'What to Watch'}</div>
        <p className={valueCls}>{scenario.visualGuide[locale]}</p>
      </div>

      {/* ARPテーブル（ARP/ICMPシナリオ時のみ） */}
      {state && Object.keys(state.arpTables).some(k => state.arpTables[k].length > 0) && (
        <div className={sectionCls}>
          <div className={`${labelCls} mb-2`}>ARP Table</div>
          {Object.entries(state.arpTables).map(([nodeId, entries]) => {
            if (entries.length === 0) return null
            return (
              <div key={nodeId} className="mb-2">
                <div className="mb-1 text-[10px] font-medium text-cyan-400">{nodeId}</div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                      <th className="text-left pr-3">IP</th>
                      <th className="text-left">MAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={i} className="font-mono text-dark-text dark:text-dark-text light:text-light-text">
                        <td className="pr-3">{e.ip}</td>
                        <td>{e.mac}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* OSPF状態 */}
      {state?.ospfState && Object.keys(state.ospfState.shortestPaths).length > 0 && (
        <div className={sectionCls}>
          <div className={`${labelCls} mb-2`}>SPF Routing Table</div>
          {Object.entries(state.ospfState.shortestPaths).map(([nodeId, paths]) => (
            <div key={nodeId} className="mb-2">
              <div className="mb-0.5 text-[10px] font-medium text-yellow-400">{nodeId}</div>
              {paths.map((path, i) => (
                <div key={i} className="font-mono text-[10px] text-dark-text dark:text-dark-text light:text-light-text">{path}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* TCPウィンドウビジュアライザー（tcpWindowState が存在するシナリオのみ）*/}
      {state?.tcpWindowState && (
        <div className={sectionCls}>
          <div className={`${labelCls} mb-2`}>{locale === 'ja' ? 'TCPウィンドウ' : 'TCP Window'}</div>
          <TcpWindowChart state={state.tcpWindowState} />
        </div>
      )}

      {/* ファイアウォールルール（firewallState があるとき ProtocolInspector の代わりに表示）*/}
      {state?.firewallState ? (
        <div className={sectionCls}>
          <div className={`${labelCls} mb-2`}>{locale === 'ja' ? 'ファイアウォール照合' : 'Firewall Match'}</div>
          <FirewallRuleTable state={state.firewallState} />
        </div>
      ) : (
        <div className={sectionCls}>
          <div className={`${labelCls} mb-2`}>{locale === 'ja' ? 'パケット詳細' : 'Packet Inspector'}</div>
          <ProtocolInspector packet={selectedPacket} />
        </div>
      )}
    </div>
  )
}
