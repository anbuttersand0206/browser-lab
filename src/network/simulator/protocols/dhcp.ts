// DHCPシミュレーター
// DISCOVER → OFFER → REQUEST → ACK の4ステップ（DORAプロセス）をステップで表現する

import type { NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet } from '../types'

function emptyState(topology: Topology, packets: PacketOnLink[], phase: string): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
  }
}

function makeDhcp(id: string, type: 'dhcp_discover' | 'dhcp_offer' | 'dhcp_request' | 'dhcp_ack', extras: Record<string, string>): Packet {
  const typeLabels = {
    dhcp_discover: 'DHCPDISCOVER (1)',
    dhcp_offer:    'DHCPOFFER (2)',
    dhcp_request:  'DHCPREQUEST (3)',
    dhcp_ack:      'DHCPACK (5)',
  }
  return {
    id,
    type,
    header: {
      srcMac: type === 'dhcp_discover' || type === 'dhcp_request' ? '00:1A:2B:3C:4D:5E' : extras['Server MAC'] ?? 'N/A',
      dstMac: type === 'dhcp_offer' ? '00:1A:2B:3C:4D:5E' : 'FF:FF:FF:FF:FF:FF',
      etherType: '0x0800 (IPv4)',
      protocol: '17 (UDP)',
      srcPort: type === 'dhcp_discover' || type === 'dhcp_request' ? 68 : 67,
      dstPort: type === 'dhcp_discover' || type === 'dhcp_request' ? 67 : 68,
      extras: {
        'DHCP Message Type': typeLabels[type],
        'Transaction ID': '0xDEADBEEF',
        'Client MAC': '00:1A:2B:3C:4D:5E',
        ...extras,
      },
    },
  }
}

function link(packet: Packet, from: string, to: string, progress: number, broadcast = false): PacketOnLink {
  return { id: packet.id + '-link', packet, fromNodeId: from, toNodeId: to, progress, broadcast }
}

export function* dhcpSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client')!
  const dhcpSv = topology.nodes.find(n => n.id === 'dhcp')!
  const router = topology.nodes.find(n => n.id === 'router1')

  yield {
    state: emptyState(topology, [], 'init'),
    log: {
      ja: `新しいホスト（MAC: 00:1A:2B:3C:4D:5E）がネットワークに接続しました。まだ IP アドレスがありません。`,
      en: `New host (MAC: 00:1A:2B:3C:4D:5E) connected to the network. No IP address yet.`,
    },
  }

  // 1. DISCOVER（ブロードキャスト）
  const discover = makeDhcp('discover', 'dhcp_discover', {
    'Requested IP': '(none)',
    'Client IP': '0.0.0.0',
    'Your IP': '0.0.0.0',
    'Message': 'Client broadcasts "Is there a DHCP server? I need an IP!"',
  })
  yield {
    state: emptyState(topology, [link(discover, client.id, dhcpSv.id, 0, true)], 'discover_sent'),
    log: {
      ja: `[1/4 DISCOVER] クライアントが DHCPDISCOVER をブロードキャスト: "DHCP サーバーはいますか？IP アドレスをください"`,
      en: `[1/4 DISCOVER] Client broadcasts DHCPDISCOVER: "Is there a DHCP server? Please give me an IP address."`,
    },
    highlightPacketId: 'discover',
  }

  yield {
    state: emptyState(topology, [link(discover, client.id, dhcpSv.id, 1, true)], 'discover_arrived'),
    log: {
      ja: `DHCPDISCOVER が DHCP サーバーに到達。サーバーは空きIPアドレスをプールから選択します。`,
      en: `DHCPDISCOVER arrived at DHCP server. Server selects an available IP from its pool.`,
    },
  }

  // 2. OFFER
  const offer = makeDhcp('offer', 'dhcp_offer', {
    'Your IP': '192.168.1.100',
    'Subnet Mask': '255.255.255.0',
    'Router': router?.ip ?? '192.168.1.1',
    'DNS Server': '8.8.8.8',
    'Lease Time': '86400 seconds (24 hours)',
    'Server IP': dhcpSv.ip ?? '192.168.1.1',
  })
  yield {
    state: emptyState(topology, [link(offer, dhcpSv.id, client.id, 1)], 'offer_sent'),
    log: {
      ja: `[2/4 OFFER] DHCP サーバーが DHCPOFFER: "192.168.1.100 を 24 時間貸し出せます"`,
      en: `[2/4 OFFER] DHCP server sends DHCPOFFER: "I can offer 192.168.1.100 for 24 hours."`,
    },
    highlightPacketId: 'offer',
  }

  // 3. REQUEST（ブロードキャスト: 他のDHCPサーバーへの通知も兼ねる）
  const request = makeDhcp('request', 'dhcp_request', {
    'Requested IP': '192.168.1.100',
    'Server Identifier': dhcpSv.ip ?? '192.168.1.1',
    'Message': 'Client broadcasts acceptance of the offer',
  })
  yield {
    state: emptyState(topology, [link(request, client.id, dhcpSv.id, 1, true)], 'request_sent'),
    log: {
      ja: `[3/4 REQUEST] クライアントが DHCPREQUEST をブロードキャスト: "192.168.1.100 を使います！"（他のDHCPサーバーへの通知も兼ねる）`,
      en: `[3/4 REQUEST] Client broadcasts DHCPREQUEST: "I'll use 192.168.1.100!" (also notifies other DHCP servers).`,
    },
    highlightPacketId: 'request',
  }

  // 4. ACK
  const ack = makeDhcp('ack', 'dhcp_ack', {
    'Your IP': '192.168.1.100',
    'Subnet Mask': '255.255.255.0',
    'Router': router?.ip ?? '192.168.1.1',
    'DNS Server': '8.8.8.8',
    'Lease Time': '86400 seconds (24 hours)',
    'T1 Renewal Time': '43200 seconds',
    'T2 Rebinding Time': '75600 seconds',
  })
  yield {
    state: emptyState(topology, [link(ack, dhcpSv.id, client.id, 1)], 'done'),
    log: {
      ja: `[4/4 ACK] DHCPACK: IPアドレス 192.168.1.100 の払い出し完了。クライアントは ARP でアドレス重複を確認してから使用を開始します。`,
      en: `[4/4 ACK] DHCPACK: IP address 192.168.1.100 assigned. Client performs ARP probe to check for conflicts before using it.`,
    },
    highlightPacketId: 'ack',
  }
}
