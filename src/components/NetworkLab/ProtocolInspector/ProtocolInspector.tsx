// パケットのプロトコルヘッダーを分解して表示するコンポーネント。
// パケットをクリックしたときに右パネルに表示する。

import type { Packet } from '../../../network/simulator/types'
import { useI18n } from '../../../i18n'

interface Props {
  packet: Packet | null
}

// パケット種別の表示名
const PACKET_TYPE_LABEL: Record<string, { ja: string; en: string }> = {
  arp_request:     { ja: 'ARP Request',       en: 'ARP Request' },
  arp_reply:       { ja: 'ARP Reply',          en: 'ARP Reply' },
  icmp_request:    { ja: 'ICMP Echo Request',  en: 'ICMP Echo Request' },
  icmp_reply:      { ja: 'ICMP Echo Reply',    en: 'ICMP Echo Reply' },
  icmp_time_exceeded: { ja: 'ICMP Time Exceeded', en: 'ICMP Time Exceeded' },
  tcp_syn:         { ja: 'TCP SYN',            en: 'TCP SYN' },
  tcp_syn_ack:     { ja: 'TCP SYN-ACK',        en: 'TCP SYN-ACK' },
  tcp_ack:         { ja: 'TCP ACK',            en: 'TCP ACK' },
  tcp_data:        { ja: 'TCP データ',          en: 'TCP Data' },
  tcp_fin:         { ja: 'TCP FIN',            en: 'TCP FIN' },
  tcp_fin_ack:     { ja: 'TCP FIN-ACK',        en: 'TCP FIN-ACK' },
  tcp_rst:         { ja: 'TCP RST',            en: 'TCP RST' },
  udp:             { ja: 'UDP',                en: 'UDP' },
  dns_query:       { ja: 'DNS クエリ',          en: 'DNS Query' },
  dns_response:    { ja: 'DNS レスポンス',      en: 'DNS Response' },
  dhcp_discover:   { ja: 'DHCP Discover',      en: 'DHCP Discover' },
  dhcp_offer:      { ja: 'DHCP Offer',         en: 'DHCP Offer' },
  dhcp_request:    { ja: 'DHCP Request',       en: 'DHCP Request' },
  dhcp_ack:        { ja: 'DHCP ACK',           en: 'DHCP ACK' },
  ospf_hello:      { ja: 'OSPF Hello',         en: 'OSPF Hello' },
  ospf_lsa:        { ja: 'OSPF LSA Update',    en: 'OSPF LSA Update' },
  ospf_lsack:      { ja: 'OSPF LSA Ack',       en: 'OSPF LSA Ack' },
  stp_bpdu:        { ja: 'STP BPDU',           en: 'STP BPDU' },
}

const PACKET_COLORS: Record<string, string> = {
  arp_request: '#fbbf24', arp_reply: '#34d399',
  icmp_request: '#60a5fa', icmp_reply: '#34d399', icmp_time_exceeded: '#f87171',
  tcp_syn: '#a78bfa', tcp_syn_ack: '#c084fc', tcp_ack: '#818cf8', tcp_data: '#67e8f9',
  tcp_fin: '#fb923c', tcp_fin_ack: '#f97316', tcp_rst: '#ef4444',
  dns_query: '#86efac', dns_response: '#4ade80',
  dhcp_discover: '#fde68a', dhcp_offer: '#fcd34d', dhcp_request: '#fbbf24', dhcp_ack: '#f59e0b',
  ospf_hello: '#7dd3fc', ospf_lsa: '#38bdf8', ospf_lsack: '#0ea5e9',
  stp_bpdu: '#a5b4fc',
}

export function ProtocolInspector({ packet }: Props) {
  const { locale } = useI18n()

  if (!packet) {
    return (
      <div className="p-3 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {locale === 'ja' ? 'パケットをクリックすると詳細を表示します' : 'Click a packet to inspect its headers'}
      </div>
    )
  }

  const { type, header } = packet
  const label = PACKET_TYPE_LABEL[type]?.[locale] ?? type
  const color = PACKET_COLORS[type] ?? '#9ca3af'

  const labelCls = 'text-[10px] font-medium uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
  const valueCls = 'font-mono text-[11px] text-dark-text dark:text-dark-text light:text-light-text'
  const rowCls = 'flex items-start gap-1.5 border-b border-dark-border py-1 last:border-b-0 dark:border-dark-border light:border-light-border'

  function Row({ label: l, value }: { label: string; value: string | number | undefined }) {
    if (value === undefined) return null
    return (
      <div className={rowCls}>
        <span className={`${labelCls} w-28 shrink-0`}>{l}</span>
        <span className={valueCls}>{String(value)}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* パケット種別バッジ */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold text-dark-text dark:text-dark-text light:text-light-text">{label}</span>
      </div>

      <div className="space-y-2 px-3 pb-3">
        {/* Ethernet ヘッダー */}
        {(header.srcMac || header.dstMac) && (
          <Section title={locale === 'ja' ? '[ Ethernet Header ]' : '[ Ethernet Header ]'}>
            <Row label="src MAC" value={header.srcMac} />
            <Row label="dst MAC" value={header.dstMac} />
            <Row label="EtherType" value={header.etherType} />
          </Section>
        )}

        {/* IP ヘッダー */}
        {(header.srcIp || header.dstIp) && (
          <Section title="[ IP Header ]">
            <Row label="src IP" value={header.srcIp} />
            <Row label="dst IP" value={header.dstIp} />
            {header.ttl !== undefined && <Row label="TTL" value={header.ttl} />}
            <Row label="Protocol" value={header.protocol} />
          </Section>
        )}

        {/* トランスポートヘッダー */}
        {(header.srcPort !== undefined || header.flags) && (
          <Section title={header.flags ? '[ TCP Header ]' : '[ UDP Header ]'}>
            <Row label="src Port" value={header.srcPort} />
            <Row label="dst Port" value={header.dstPort} />
            {header.flags && <Row label="Flags" value={header.flags.join(' | ')} />}
            {header.seq !== undefined && <Row label="SEQ" value={header.seq} />}
            {header.ack !== undefined && <Row label="ACK" value={header.ack} />}
          </Section>
        )}

        {/* アプリケーションデータ */}
        {header.appData && (
          <Section title="[ Payload ]">
            <div className="font-mono text-[11px] text-dark-text dark:text-dark-text light:text-light-text">
              {header.appData}
            </div>
          </Section>
        )}

        {/* プロトコル固有フィールド */}
        {header.extras && Object.keys(header.extras).length > 0 && (
          <Section title={locale === 'ja' ? '[ プロトコル固有 ]' : '[ Protocol-Specific ]'}>
            {Object.entries(header.extras).map(([k, v]) => (
              <Row key={k} label={k} value={v} />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-dark-border bg-dark-hover/30 dark:border-dark-border dark:bg-dark-hover/30 light:border-light-border light:bg-light-hover/30">
      <div className="border-b border-dark-border px-2 py-1 text-[10px] font-medium text-dark-textDim dark:border-dark-border dark:text-dark-textDim light:border-light-border light:text-light-textDim">
        {title}
      </div>
      <div className="px-2 py-1">
        {children}
      </div>
    </div>
  )
}
