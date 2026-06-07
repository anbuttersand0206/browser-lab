// キャンパスネットワーク設計シミュレーター
// 3階層アーキテクチャ・VLAN間ルーティング・HSRP・マルチキャスト

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet,
  VlanState, HsrpState,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  extra?: { vlanState?: VlanState; hsrpState?: HsrpState },
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
    ...(extra ?? {}),
  }
}

function pkt(
  id: string,
  type: 'generic' | 'hsrp_hello' | 'igmp_report' | 'igmp_query' | 'pim_hello',
  from: string,
  to: string,
  progress: number,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

// ---- キャンパス3階層アーキテクチャ ----

export function* campus3TierSimulator(topology: Topology): NetworkStepGenerator {
  yield {
    state: empty(topology, [], 'overview'),
    log: {
      ja: 'Ciscoが提唱するキャンパスネットワーク設計モデル: アクセス層・ディストリビューション層・コア層の3階層。各層が明確な役割を担うことで拡張性・可用性・管理性が向上する。',
      en: 'Cisco campus network hierarchical design: Access, Distribution, Core layers. Clear separation of roles improves scalability, availability, and manageability.',
    },
  }

  yield {
    state: empty(topology, [], 'access_layer'),
    log: {
      ja: 'アクセス層: PCやIPフォン・プリンターなどのエンドデバイスが接続するL2スイッチの層。ポート単位のVLAN割り当て・802.1X認証・PoE（IP電話向け）・スパニングツリー（PortFast）を担当。',
      en: 'Access Layer: L2 switches connecting end devices (PCs, IP phones, printers). Per-port VLAN, 802.1X auth, PoE, STP PortFast.',
    },
  }

  yield {
    state: empty(topology, [], 'distribution_layer'),
    log: {
      ja: 'ディストリビューション層: VLAN間ルーティング・アクセス制御（ACL）・STPルートブリッジ・デフォルトゲートウェイ冗長（HSRP/VRRP）・ルートフィルタリングを担当するL3スイッチの層。',
      en: 'Distribution Layer: L3 switches handling inter-VLAN routing, ACL, STP root, HSRP/VRRP gateway redundancy, route filtering.',
    },
  }

  yield {
    state: empty(topology, [], 'core_layer'),
    log: {
      ja: 'コア層: 高速バックボーンスイッチ。データセンター・WAN・インターネット出口を接続。シンプルさが重要（ACLやNATは設定しない）。高速かつ高可用性。10GbE/40GbE/100GbEが一般的。',
      en: 'Core Layer: High-speed backbone. Connects DC, WAN, internet. Simplicity is key (no ACL or NAT). High speed and availability. 10/40/100GbE typical.',
    },
  }

  yield {
    state: empty(topology, [], 'collapsed_core'),
    log: {
      ja: '2階層設計（Collapsed Core）: 中規模ネットワークではコアとディストリビューションを統合。コスト削減できるが、スケールアップが困難。',
      en: 'Collapsed Core (2-tier): Merge core and distribution for medium networks. Cost-effective but harder to scale up.',
    },
  }

  yield {
    state: empty(topology, [], 'bandwidth_rules'),
    log: {
      ja: '帯域設計のルール: アクセス→ディストリビューション: 20:1 オーバーサブスクリプション。ディストリビューション→コア: 4:1 。コア間: 1:1（オーバーサブスクリプションなし）。',
      en: 'Bandwidth design rules: Access→Distribution: 20:1 oversubscription. Distribution→Core: 4:1. Core-to-core: 1:1 (no oversubscription).',
    },
  }
}

// ---- VLAN間ルーティング ----

export function* interVlanRoutingSimulator(topology: Topology): NetworkStepGenerator {
  const l3switch = topology.nodes.find(n => n.type === 'router') ?? topology.nodes.find(n => n.id === 'l3sw') ?? topology.nodes[0]!
  const pc1 = topology.nodes.find(n => n.id === 'host1') ?? topology.nodes[1]!
  const pc2 = topology.nodes.find(n => n.id === 'host2') ?? topology.nodes[2]!

  const vlanState: VlanState = {
    vlans: [
      { id: 10, name: 'VLAN10 (Sales)', color: '#60a5fa', memberNodeIds: [pc1.id] },
      { id: 20, name: 'VLAN20 (Dev)', color: '#f59e0b', memberNodeIds: [pc2.id] },
    ],
    trunkLinkIds: [topology.links[0]?.id ?? ''],
  }

  yield {
    state: empty(topology, [], 'problem', { vlanState }),
    log: {
      ja: 'VLAN10（Sales: 192.168.10.x）と VLAN20（Dev: 192.168.20.x）は別ブロードキャストドメイン。デフォルトではL2スイッチはVLAN間通信を遮断する。',
      en: 'VLAN10 (Sales: 192.168.10.x) and VLAN20 (Dev: 192.168.20.x) are separate broadcast domains. L2 switches block inter-VLAN by default.',
    },
  }

  yield {
    state: empty(topology, [], 'method1', { vlanState }),
    log: {
      ja: '方法①：Router-on-a-Stick。ルーターの1ポートをトランクに設定し、サブインターフェースでVLAN毎の仮想ルーターとして機能させる（Fa0/0.10, Fa0/0.20）。低コストだが帯域ボトルネックになりやすい。',
      en: 'Method 1: Router-on-a-Stick. One router port as trunk + sub-interfaces per VLAN (Fa0/0.10, Fa0/0.20). Low cost but bandwidth bottleneck.',
    },
  }

  yield {
    state: empty(topology, [], 'method2', { vlanState }),
    log: {
      ja: '方法②：L3スイッチのSVI（Switched Virtual Interface）。各VLANにSVIを作成（interface vlan 10 / ip address 192.168.10.1 255.255.255.0）。ワイヤスピードでVLAN間ルーティング。現代の標準。',
      en: 'Method 2: L3 switch SVI (Switched Virtual Interface). Create SVI per VLAN (interface vlan 10 / ip address ...). Wire-speed inter-VLAN routing. Modern standard.',
    },
  }

  // 同じ PacketOnLink.id ('ivlan-link') を使うことで pc1→l3switch→pc2 のアニメーションが連続する
  const req = pkt('ivlan', 'generic', pc1.id, l3switch.id, 0, {
    'Src IP': pc1.ip ?? '192.168.10.10', 'Dst IP': pc2.ip ?? '192.168.20.20',
    'Src VLAN': '10', 'Dst VLAN': '20',
  })
  yield {
    state: empty(topology, [req], 'routing', { vlanState }),
    log: {
      ja: `${pc1.label}（VLAN10）から ${pc2.label}（VLAN20）へのパケット。L3スイッチの VLAN10 SVI（192.168.10.1）でルーティング判定 → VLAN20 SVI（192.168.20.1）経由で転送。`,
      en: `Packet from ${pc1.label} (VLAN10) to ${pc2.label} (VLAN20). L3 switch routes via VLAN10 SVI (192.168.10.1) → VLAN20 SVI (192.168.20.1).`,
    },
    highlightPacketId: 'ivlan',
  }

  const fwd = pkt('ivlan', 'generic', l3switch.id, pc2.id, 0, {
    'Src IP': pc1.ip ?? '192.168.10.10', 'Dst IP': pc2.ip ?? '192.168.20.20',
    'Routed': 'VLAN10 → VLAN20',
  })
  yield {
    state: empty(topology, [fwd], 'forwarded', { vlanState }),
    log: {
      ja: `L3スイッチが VLAN20 への転送完了。${pc1.label} と ${pc2.label} が通信可能になった。ACLで特定VLAN間通信を制限することも可能。`,
      en: `L3 switch forwarded to VLAN20. ${pc1.label} and ${pc2.label} can now communicate. ACLs can restrict specific inter-VLAN flows.`,
    },
    highlightPacketId: 'ivlan',
  }
}

// ---- HSRP障害切り替え ----

export function* hsrpFailoverSimulator(topology: Topology): NetworkStepGenerator {
  const r1 = topology.nodes.find(n => n.id === 'r1') ?? topology.nodes.find(n => n.type === 'router') ?? topology.nodes[0]!
  const r2 = topology.nodes.find(n => n.id === 'r2') ?? topology.nodes.filter(n => n.type === 'router')[1] ?? topology.nodes[1]!
  const hosts = topology.nodes.filter(n => n.type === 'host')
  const host = hosts[0] ?? topology.nodes[2]!

  const normalHsrp: HsrpState = {
    virtualIp: '192.168.1.254',
    activeRouterId: r1.id,
    standbyRouterId: r2.id,
    priority: { [r1.id]: 110, [r2.id]: 100 },
    state: { [r1.id]: 'active', [r2.id]: 'standby' },
  }

  yield {
    state: empty(topology, [], 'concept', { hsrpState: normalHsrp }),
    log: {
      ja: 'HSRP（Hot Standby Router Protocol, RFC 2281）: Cisco 独自の FHRP（First Hop Redundancy Protocol）。2台以上のルーターで仮想IPを共有し、デフォルトゲートウェイを冗長化する。',
      en: 'HSRP (RFC 2281): Cisco-proprietary FHRP. Multiple routers share a virtual IP as redundant default gateway.',
    },
  }

  const hello1 = pkt('hsrp-h1', 'hsrp_hello', r1.id, r2.id, 0, {
    'Group': '1', 'State': 'Active', 'Priority': '110', 'Virtual IP': '192.168.1.254',
    'Hello Time': '3s', 'Hold Time': '10s',
  })
  const hello2 = pkt('hsrp-h2', 'hsrp_hello', r2.id, r1.id, 0, {
    'Group': '1', 'State': 'Standby', 'Priority': '100', 'Virtual IP': '192.168.1.254',
  })
  yield {
    state: empty(topology, [hello1, hello2], 'hello', { hsrpState: normalHsrp }),
    log: {
      ja: `${r1.label}（Priority=110）がアクティブ、${r2.label}（Priority=100）がスタンバイ。3秒ごとに HSRP Hello（224.0.0.2:1985）を交換して状態を確認。`,
      en: `${r1.label} (Priority=110) is Active, ${r2.label} (Priority=100) is Standby. Exchange HSRP Hello every 3s (224.0.0.2:1985) to monitor.`,
    },
  }

  const failTopology = {
    ...topology,
    links: topology.links.map(l =>
      (l.from === r1.id || l.to === r1.id) ? { ...l, status: 'down' as const } : l
    ),
  }

  const failHsrp: HsrpState = {
    ...normalHsrp,
    state: { [r1.id]: 'init', [r2.id]: 'speak' },
    holdTimerExpired: true,
  }

  yield {
    state: empty(failTopology, [], 'r1_fail', { hsrpState: failHsrp }),
    log: {
      ja: `${r1.label} が障害。Hold Timer（10秒）の間 Hello が届かない → ${r2.label} が Speak 状態に遷移し、グループの制御を取得しようとする。`,
      en: `${r1.label} fails. No Hello for Hold Timer (10s) → ${r2.label} transitions to Speak state, attempting to take control.`,
    },
  }

  const promoteHsrp: HsrpState = {
    ...normalHsrp,
    activeRouterId: r2.id,
    standbyRouterId: r2.id,
    state: { [r1.id]: 'init', [r2.id]: 'active' },
  }

  yield {
    state: empty(failTopology, [], 'r2_active', { hsrpState: promoteHsrp }),
    log: {
      ja: `${r2.label} がアクティブルーターに昇格。仮想IP（192.168.1.254）の仮想MACアドレス（0000.0c07.ac01）のARPが再送され、スイッチのMACテーブルが更新される。`,
      en: `${r2.label} promoted to Active. Gratuitous ARP for virtual MAC (0000.0c07.ac01) updates switches. Failover takes ~10–15s with default timers.`,
    },
  }

  const hostTraffic = pkt('hsrp-traffic', 'generic', host.id, r2.id, 0, {
    'Dst': '192.168.1.254 (Virtual IP)', 'Routed by': r2.label,
  })
  yield {
    state: empty(failTopology, [hostTraffic], 'traffic_restored', { hsrpState: promoteHsrp }),
    log: {
      ja: `ホストは同じ仮想IP（192.168.1.254）を使い続ける。フェイルオーバーは自動・透過的。デフォルトで10〜15秒で完了（タイマー調整で1秒未満も可能）。`,
      en: `Hosts continue using the same virtual IP. Failover is automatic and transparent. Default 10–15s (tunable to sub-second).`,
    },
    highlightPacketId: 'hsrp-traffic',
  }

  yield {
    state: empty(failTopology, [], 'vrrp_note', { hsrpState: promoteHsrp }),
    log: {
      ja: 'VRRP（RFC 5798）: HSRPのオープン標準版。GLBPはCisco独自で複数ルーターに負荷分散（HSRP/VRRPは1台のみアクティブ）。現代ではVRRPが推奨される。',
      en: 'VRRP (RFC 5798): Open-standard HSRP equivalent. GLBP (Cisco) adds load balancing across multiple routers. VRRP is the recommended standard.',
    },
  }
}

// ---- マルチキャストとIGMP ----

export function* multicastIgmpSimulator(topology: Topology): NetworkStepGenerator {
  const source = topology.nodes.find(n => n.id === 'source') ?? topology.nodes[0]!
  const router1 = topology.nodes.find(n => n.type === 'router') ?? topology.nodes[1]!
  const receivers = topology.nodes.filter(n => n.type === 'host')
  const receiver1 = receivers[0] ?? topology.nodes[2]!

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'マルチキャスト: 1つの送信元から複数の受信者へ効率的に配信する通信方式。ユニキャスト（1対1）と異なりネットワーク上の複製を最小化。クラスDアドレス（224.0.0.0/4）を使用。',
      en: 'Multicast: Efficient one-to-many delivery. Minimizes network copies vs. unicast. Uses Class D addresses (224.0.0.0/4).',
    },
  }

  yield {
    state: empty(topology, [], 'use_cases'),
    log: {
      ja: 'マルチキャストのユースケース: 動画配信（IPTV）・ルーティングプロトコル（OSPF=224.0.0.5、RIP=224.0.0.9）・サービスディスカバリ（mDNS=224.0.0.251）・ストリーミング配信。',
      en: 'Use cases: IPTV, routing protocols (OSPF=224.0.0.5, RIP=224.0.0.9), service discovery (mDNS=224.0.0.251), streaming.',
    },
  }

  const igmpReport = pkt('igmp-r1', 'igmp_report', receiver1.id, router1.id, 0, {
    'Message Type': 'IGMP Membership Report (v3)',
    'Multicast Group': '239.1.1.1', 'Source': source.ip ?? '10.0.0.1',
    'Action': 'Join request',
  })
  yield {
    state: empty(topology, [igmpReport], 'igmp_join'),
    log: {
      ja: `${receiver1.label} が IGMP Membership Report 送信: 「マルチキャストグループ 239.1.1.1 に参加したい」。ルーターがこれを受けて転送ツリーに ${receiver1.label} を追加。`,
      en: `${receiver1.label} sends IGMP Membership Report: "I want to join multicast group 239.1.1.1." Router adds ${receiver1.label} to forwarding tree.`,
    },
    highlightPacketId: 'igmp-r1',
  }

  const igmpQuery = pkt('igmp-q', 'igmp_query', router1.id, receiver1.id, 0, {
    'Message Type': 'IGMP Membership Query',
    'Max Response Time': '10s', 'Multicast Group': '239.1.1.1',
  })
  yield {
    state: empty(topology, [igmpQuery], 'igmp_query'),
    log: {
      ja: 'ルーターが定期的に IGMP Query を送信: 「239.1.1.1 に参加しているホストはいますか？」。応答がなければそのグループの転送を停止（IGMP Leave）。',
      en: 'Router periodically sends IGMP Query: "Anyone still in group 239.1.1.1?" No response → stop forwarding (IGMP Leave).',
    },
    highlightPacketId: 'igmp-q',
  }

  yield {
    state: empty(topology, [], 'pim'),
    log: {
      ja: 'PIM（Protocol Independent Multicast）: ルーター間でマルチキャスト転送ツリーを構築するプロトコル。PIM-SM（スパースモード）が一般的: RP（Rendezvous Point）を中心にツリーを構築し、SPTに最適化。',
      en: 'PIM (Protocol Independent Multicast): Builds multicast forwarding trees between routers. PIM-SM (Sparse Mode) is common: builds shared tree via RP (Rendezvous Point), optimizes to SPT.',
    },
  }

  const multicastPkt = pkt('mcast-1', 'generic', source.id, router1.id, 0, {
    'Src IP': source.ip ?? '10.0.0.1', 'Dst IP': '239.1.1.1 (Multicast)',
    'Protocol': 'UDP', 'Content': 'Video stream',
  })
  yield {
    state: empty(topology, [multicastPkt], 'delivery'),
    log: {
      ja: `${source.label} がマルチキャストグループ 239.1.1.1 へビデオストリームを送信。ルーターが転送ツリーに従い、参加している受信者のみにフォワード。送信元は1コピーのみ送信。`,
      en: `${source.label} sends video stream to 239.1.1.1. Router forwards only to receivers in the tree. Source sends only one copy.`,
    },
    highlightPacketId: 'mcast-1',
  }
}
