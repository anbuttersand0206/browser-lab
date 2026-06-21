// ルーティング拡張シミュレーター
// デフォルトゲートウェイ・スタティックルート・RIP・OSPF DR/BDR・BGP基礎

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, RouteEntry,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  routingTables: Record<string, RouteEntry[]> = {},
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
  }
}

function pkt(
  id: string,
  type: 'generic' | 'icmp_request' | 'rip_request' | 'rip_response' | 'bgp_open' | 'bgp_update' | 'bgp_keepalive' | 'ospf_hello' | 'ospf_lsa' | 'http_request' | 'tcp_syn' | 'tcp_data',
  from: string,
  to: string,
  progress: number,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

function route(network: string, prefix: number, nextHop: string, iface: string, metric: number): RouteEntry {
  return { network, prefix, nextHop, iface, metric }
}

// ---- TCPIPモデル（4層） ----

export function* tcpIpModelSimulator(topology: Topology): NetworkStepGenerator {
  const src = topology.nodes.find(n => n.id === 'src') ?? topology.nodes[0]!
  const dst = topology.nodes.find(n => n.id === 'dst') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'overview'),
    log: {
      ja: 'TCP/IPモデル（インターネットプロトコルスイート）: OSI参照モデルを4層に整理した実装モデル。現在のインターネットはTCP/IPモデルに基づいている。',
      en: 'TCP/IP model (Internet Protocol Suite): Practical 4-layer model vs. OSI\'s 7 layers. The modern internet runs on TCP/IP.',
    },
  }
  yield {
    state: empty(topology, [pkt('tcpip-app', 'http_request', src.id, dst.id, 0, {
      'TCP/IP Layer': '4 – Application', 'OSI equiv': '5–7', 'Protocols': 'HTTP/HTTPS/FTP/SMTP/DNS/DHCP',
    })], 'layer4_app'),
    log: {
      ja: '第4層 アプリケーション層: HTTP・HTTPS・FTP・SMTP・DNS・DHCP・SSH・Telnet 等のアプリケーションプロトコル。OSIの5〜7層に相当。',
      en: 'Layer 4 – Application: HTTP, HTTPS, FTP, SMTP, DNS, DHCP, SSH, Telnet. Corresponds to OSI layers 5–7.',
    },
    highlightPacketId: 'tcpip-app',
  }
  yield {
    state: empty(topology, [pkt('tcpip-trn', 'tcp_syn', src.id, dst.id, 0, {
      'TCP/IP Layer': '3 – Transport', 'OSI equiv': '4', 'Protocols': 'TCP (reliable) / UDP (fast)',
    })], 'layer3_transport'),
    log: {
      ja: '第3層 トランスポート層: TCP（信頼性・順序保証・フロー制御）と UDP（軽量・低遅延）。ポート番号でアプリケーションを識別。OSI第4層に相当。',
      en: 'Layer 3 – Transport: TCP (reliability, ordering, flow control) and UDP (lightweight, low-latency). Port numbers identify applications. Corresponds to OSI layer 4.',
    },
    highlightPacketId: 'tcpip-trn',
  }
  yield {
    state: empty(topology, [pkt('tcpip-net', 'icmp_request', src.id, dst.id, 0, {
      'TCP/IP Layer': '2 – Internet', 'OSI equiv': '3', 'Protocols': 'IP / ICMP / IGMP / ARP',
    })], 'layer2_internet'),
    log: {
      ja: '第2層 インターネット層: IP（アドレッシング・ルーティング）・ICMP・IGMP・ARP。OSI第3層に相当。グローバルな経路選択を担う。',
      en: 'Layer 2 – Internet: IP (addressing, routing), ICMP, IGMP, ARP. Corresponds to OSI layer 3. Handles global routing.',
    },
    highlightPacketId: 'tcpip-net',
  }
  yield {
    state: empty(topology, [pkt('tcpip-lnk', 'generic', src.id, dst.id, 0, {
      'TCP/IP Layer': '1 – Link', 'OSI equiv': '1–2', 'Protocols': 'Ethernet / Wi-Fi / PPP',
    })], 'layer1_link'),
    log: {
      ja: '第1層 リンク層（ネットワークインターフェース層）: Ethernet・Wi-Fi・PPP など、物理媒体とその直接制御。OSIの1〜2層に相当。MACアドレスを使う。',
      en: 'Layer 1 – Link (Network Interface): Ethernet, Wi-Fi, PPP. Physical media and direct control. Corresponds to OSI layers 1–2. Uses MAC addresses.',
    },
    highlightPacketId: 'tcpip-lnk',
  }
  yield {
    state: empty(topology, [], 'vs_osi'),
    log: {
      ja: 'OSIとTCP/IPの対応: OSI(7層)はモデル・教育用、TCP/IP(4層)は実装・実用。現代では両方の知識が必要。試験(CCNA等)ではOSIが基準として使われる。',
      en: 'OSI vs TCP/IP: OSI (7 layers) is a reference model for teaching; TCP/IP (4 layers) is the practical implementation. Both are needed in industry.',
    },
  }
}

// ---- デフォルトゲートウェイ ----

export function* defaultGatewaySimulator(topology: Topology): NetworkStepGenerator {
  const hostA = topology.nodes.find(n => n.id === 'host1') ?? topology.nodes.find(n => n.type === 'host')!
  const router = topology.nodes.find(n => n.type === 'router')!
  const internet = topology.nodes.find(n => n.type === 'internet') ?? topology.nodes[topology.nodes.length - 1]!

  const routeTable: Record<string, RouteEntry[]> = {
    [hostA.id]: [
      route('192.168.1.0', 24, 'local', 'eth0', 0),
      route('0.0.0.0', 0, router.ip ?? '192.168.1.1', 'eth0', 0),
    ],
    [router.id]: [
      route('192.168.1.0', 24, 'local', 'eth0', 0),
      route('0.0.0.0', 0, '203.0.113.1', 'wan0', 0),
    ],
  }

  yield {
    state: empty(topology, [], 'init', routeTable),
    log: {
      ja: 'デフォルトゲートウェイ: ホストが宛先を自分のサブネット内に見つけられない場合に「とりあえず送る」先のルーターIP。0.0.0.0/0 のルートで表現。',
      en: 'Default gateway: The router IP hosts send to when the destination is not in their subnet. Expressed as 0.0.0.0/0 route.',
    },
  }

  // 同じ PacketOnLink.id ('dgw-link') を使うことで host→router のアニメーションが連続する
  const p1 = pkt('dgw', 'generic', hostA.id, router.id, 0, {
    'Src IP': hostA.ip ?? '192.168.1.10', 'Dst IP': '8.8.8.8',
    'Next Hop': router.ip ?? '192.168.1.1', 'Reason': 'No match in subnet → default GW',
  })
  yield {
    state: empty(topology, [p1], 'send_to_gw', routeTable),
    log: {
      ja: `${hostA.label} が 8.8.8.8 へ送信。サブネット（192.168.1.0/24）外なので、デフォルトゲートウェイ（${router.ip ?? '192.168.1.1'}）へ転送。`,
      en: `${hostA.label} sends to 8.8.8.8. Outside subnet (192.168.1.0/24) → forward to default gateway (${router.ip ?? '192.168.1.1'}).`,
    },
    highlightPacketId: 'dgw',
  }

  const p2 = pkt('dgw', 'generic', router.id, internet.id, 0, {
    'Src IP': hostA.ip ?? '192.168.1.10', 'Dst IP': '8.8.8.8',
    'Action': 'Route lookup → default route → forward to ISP',
  })
  yield {
    state: empty(topology, [p2], 'router_forward', routeTable),
    log: {
      ja: `${router.label} がルーティングテーブルで 8.8.8.8 を検索。デフォルトルート（0.0.0.0/0）にマッチ → ISP (203.0.113.1) へ転送。`,
      en: `${router.label} looks up 8.8.8.8. Matches default route (0.0.0.0/0) → forward to ISP (203.0.113.1).`,
    },
    highlightPacketId: 'dgw',
  }

  yield {
    state: empty(topology, [], 'priority', routeTable),
    log: {
      ja: 'ルートの優先順位（最長一致優先）: 192.168.1.5 は /24 に一致。172.16.0.1 は /24 不一致→デフォルト(/0)。より長いプレフィックスが常に優先される。',
      en: 'Longest prefix match: 192.168.1.5 matches /24. 172.16.0.1 misses /24 → default (/0). Longer prefix always wins.',
    },
  }
}

// ---- RIP（距離ベクトル型ルーティング） ----

export function* ripSimulator(topology: Topology): NetworkStepGenerator {
  const routers = topology.nodes.filter(n => n.type === 'router')
  const r1 = routers[0] ?? topology.nodes[0]!
  const r2 = routers[1] ?? topology.nodes[1]!
  const r3 = routers[2] ?? topology.nodes[2]!

  const initialRoutes: Record<string, RouteEntry[]> = {
    [r1.id]: [route('10.1.0.0', 24, 'local', 'lo', 0)],
    [r2.id]: [route('10.2.0.0', 24, 'local', 'lo', 0)],
    [r3.id]: [route('10.3.0.0', 24, 'local', 'lo', 0)],
  }

  yield {
    state: empty(topology, [], 'concept', initialRoutes),
    log: {
      ja: 'RIP（Routing Information Protocol, RFC 1058）: 距離ベクトル型ルーティングプロトコル。30秒毎にルーティングテーブル全体をブロードキャスト/マルチキャスト（224.0.0.9）で隣接ルーターに広告する。',
      en: 'RIP (RFC 1058): Distance-vector routing. Every 30s, broadcast/multicast (224.0.0.9) full routing table to neighbors.',
    },
  }

  // R1→R2へRIPアップデート
  const ripUpdate1 = pkt('rip-u1', 'rip_response', r1.id, r2.id, 0, {
    'Protocol': 'RIP v2', 'Command': 'Response (Update)',
    'Route': '10.1.0.0/24 metric=1',
  })
  yield {
    state: empty(topology, [ripUpdate1], 'r1_advertise', initialRoutes),
    log: {
      ja: `${r1.label} が RIP Update 送信: 「10.1.0.0/24 はメトリック1で到達可能」。メトリックはホップ数（最大15。16=到達不能）。`,
      en: `${r1.label} sends RIP Update: "10.1.0.0/24 reachable with metric=1." Metric is hop count (max 15; 16=unreachable).`,
    },
    highlightPacketId: 'rip-u1',
  }

  const afterR1: Record<string, RouteEntry[]> = {
    ...initialRoutes,
    [r2.id]: [
      route('10.2.0.0', 24, 'local', 'lo', 0),
      route('10.1.0.0', 24, r1.ip ?? '10.12.0.1', 'eth0', 1),
    ],
  }
  yield {
    state: empty(topology, [], 'r2_learned', afterR1),
    log: {
      ja: `${r2.label} が 10.1.0.0/24 を学習（nextHop=${r1.ip ?? '10.12.0.1'}, metric=1）。次回の Update で ${r3.label} へ広告（metric+1=2）。`,
      en: `${r2.label} learns 10.1.0.0/24 (nextHop=${r1.ip ?? '10.12.0.1'}, metric=1). Next update to ${r3.label} will advertise metric=2.`,
    },
  }

  const ripUpdate2 = pkt('rip-u2', 'rip_response', r2.id, r3.id, 0, {
    'Protocol': 'RIP v2',
    'Routes': '10.1.0.0/24 metric=2, 10.2.0.0/24 metric=1',
  })
  const fullRoutes: Record<string, RouteEntry[]> = {
    [r1.id]: [route('10.1.0.0', 24, 'local', 'lo', 0), route('10.2.0.0', 24, r2.ip ?? '10.12.0.2', 'eth0', 1), route('10.3.0.0', 24, r2.ip ?? '10.12.0.2', 'eth0', 2)],
    [r2.id]: afterR1[r2.id]!,
    [r3.id]: [route('10.3.0.0', 24, 'local', 'lo', 0), route('10.2.0.0', 24, r2.ip ?? '10.12.0.2', 'eth0', 1), route('10.1.0.0', 24, r2.ip ?? '10.12.0.2', 'eth0', 2)],
  }
  yield {
    state: empty(topology, [ripUpdate2], 'convergence', fullRoutes),
    log: {
      ja: `${r2.label} から ${r3.label} へ Update。複数周期後にコンバージェンス完了。各ルーターが全ネットワーク（10.1〜3）を学習。`,
      en: `${r2.label} updates ${r3.label}. After several cycles, convergence completes. Each router knows all networks (10.1–3).`,
    },
    highlightPacketId: 'rip-u2',
  }

  yield {
    state: empty(topology, [], 'limitations', fullRoutes),
    log: {
      ja: 'RIPの制限: ① ホップ数15がmax（大規模ネットワーク不可）。② スローコンバージェンス（分単位）。③ ループカウントトゥインフィニティ。→ 大規模環境では OSPF/BGP が使われる。',
      en: 'RIP limitations: ① Max 15 hops (no large networks). ② Slow convergence (minutes). ③ Count-to-infinity loops. → OSPF/BGP for large networks.',
    },
  }
}

// ---- OSPF DR/BDR選出 ----

export function* ospfDrBdrSimulator(topology: Topology): NetworkStepGenerator {
  const routers = topology.nodes.filter(n => n.type === 'router')
  const r1 = routers[0] ?? topology.nodes[0]!
  const r2 = routers[1] ?? topology.nodes[1]!
  const r3 = routers[2] ?? topology.nodes[2]!

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'OSPF DR/BDR選出: マルチアクセスネットワーク（共有イーサネット）では、n台のルーターが各々LSAを全员に送ると n×(n-1) の通信が発生。DR（Designated Router）がこれを代表して集約する。',
      en: 'OSPF DR/BDR: On multi-access networks, n routers exchanging LSAs causes n×(n-1) adjacencies. DR (Designated Router) aggregates on behalf of all.',
    },
  }

  const h1 = pkt('ospf-h1', 'ospf_hello', r1.id, r2.id, 0, {
    'Router ID': r1.ip ?? '1.1.1.1', 'Priority': '1', 'DR': '0.0.0.0', 'BDR': '0.0.0.0',
  })
  const h2 = pkt('ospf-h2', 'ospf_hello', r2.id, r3.id, 0, {
    'Router ID': r2.ip ?? '2.2.2.2', 'Priority': '2', 'DR': '0.0.0.0', 'BDR': '0.0.0.0',
  })
  yield {
    state: empty(topology, [h1, h2], 'hello_exchange'),
    log: {
      ja: '全ルーターが Hello パケット（宛先 224.0.0.5 ALLSPFRouters）を送信。Hello 内の Priority と Router ID で DR/BDR を選出する。',
      en: 'All routers send Hello packets (dst 224.0.0.5 ALLSPFRouters). DR/BDR election uses Priority + Router ID in Hello.',
    },
  }

  yield {
    state: empty(topology, [], 'election_rule'),
    log: {
      ja: 'DR/BDR選出ルール: ① Priority が最大のルーターが DR（デフォルト 1、0=選出不参加）。② Priority 同一なら Router ID が最大のルーターが DR。Priority 2 位が BDR。',
      en: 'Election rule: ① Highest Priority → DR (default 1; 0=no election). ② Tie-break: highest Router ID. Runner-up Priority → BDR.',
    },
  }

  const drRoutes: Record<string, RouteEntry[]> = {
    [r2.id]: [route('224.0.0.5', 32, 'local', 'eth0', 0)],
  }
  yield {
    state: empty(topology, [], 'dr_elected', drRoutes),
    log: {
      ja: `${r2.label}（Priority=2, Router ID=${r2.ip ?? '2.2.2.2'}）が DR に選出。DRothers は 224.0.0.6（ALLDRouters）へのみ LSA を送り、DR が代表して全体へフラッディング。`,
      en: `${r2.label} (Priority=2, Router ID=${r2.ip ?? '2.2.2.2'}) elected DR. DROthers send LSAs only to 224.0.0.6 (ALLDRouters). DR floods to all.`,
    },
  }

  yield {
    state: empty(topology, [], 'bdr_role'),
    log: {
      ja: 'BDR（Backup DR）: DRが停止した場合に即座にDRに昇格するスタンバイ。BDR も LSA を受信・保持して障害に備える。DRへのHello途絶（Dead Interval）でBDRが昇格。',
      en: 'BDR: Standby that immediately promotes to DR if DR fails. BDR also receives/stores LSAs. Promotes after Dead Interval without Hello from DR.',
    },
  }
}

// ---- BGP基礎 ----

export function* bgpBasicsSimulator(topology: Topology): NetworkStepGenerator {
  const routers = topology.nodes.filter(n => n.type === 'router')
  const r1 = routers[0] ?? topology.nodes[0]!
  const r2 = routers[1] ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'BGP（Border Gateway Protocol, RFC 4271）: インターネットの経路制御に使われる EGP（外部ゲートウェイプロトコル）。AS（自律システム）間でプレフィックスを交換する。',
      en: 'BGP (RFC 4271): EGP used for internet routing. Exchanges prefixes between AS (Autonomous Systems).',
    },
  }

  const open1 = pkt('bgp-open1', 'bgp_open', r1.id, r2.id, 0, {
    'Message Type': 'OPEN', 'My AS': '65001', 'BGP Version': '4',
    'Hold Time': '180s', 'BGP Identifier': r1.ip ?? '1.1.1.1',
  })
  yield {
    state: empty(topology, [open1], 'open'),
    log: {
      ja: `BGPセッション確立（TCPポート179）: ${r1.label}（AS 65001）が ${r2.label}（AS 65002）へ OPEN メッセージを送信。AS番号・BGP ID・Hold Timeを交換。`,
      en: `BGP session (TCP port 179): ${r1.label} (AS 65001) sends OPEN to ${r2.label} (AS 65002). Exchange AS#, BGP ID, Hold Time.`,
    },
    highlightPacketId: 'bgp-open1',
  }

  const keepalive = pkt('bgp-ka', 'bgp_keepalive', r2.id, r1.id, 0, {
    'Message Type': 'KEEPALIVE', 'Meaning': 'Accept OPEN, session established',
  })
  yield {
    state: empty(topology, [keepalive], 'keepalive'),
    log: {
      ja: `${r2.label} が KEEPALIVE を返送 → BGP セッション確立（Established 状態）。Hold Timer 内に KEEPALIVE が届かないとセッションがリセットされる。`,
      en: `${r2.label} sends KEEPALIVE → BGP session Established. If no KEEPALIVE before Hold Timer expires, session resets.`,
    },
    highlightPacketId: 'bgp-ka',
  }

  const update1 = pkt('bgp-upd1', 'bgp_update', r1.id, r2.id, 0, {
    'Message Type': 'UPDATE', 'NLRI': '203.0.113.0/24',
    'Path Attributes': 'ORIGIN=IGP, AS_PATH=65001, NEXT_HOP=1.1.1.1, LOCAL_PREF=100',
  })
  yield {
    state: empty(topology, [update1], 'update'),
    log: {
      ja: `UPDATE メッセージでプレフィックス広告。AS_PATH で経路ループを防止（自AS番号があれば廃棄）。NEXT_HOP・LOCAL_PREF・MED・COMMUNITY などの属性でベストパス選択。`,
      en: `UPDATE advertises prefixes. AS_PATH prevents loops (discard if own AS# in path). Attributes (NEXT_HOP, LOCAL_PREF, MED, COMMUNITY) used for best-path selection.`,
    },
    highlightPacketId: 'bgp-upd1',
  }

  yield {
    state: empty(topology, [], 'types'),
    log: {
      ja: 'iBGP vs eBGP: 同一AS内のBGPセッションが iBGP、AS間が eBGP。iBGPではFull Mesh または Route Reflector が必要（iBGPルートをiBGPピアへ再広告しないルール）。',
      en: 'iBGP vs eBGP: Sessions within same AS=iBGP, between ASes=eBGP. iBGP requires full mesh or Route Reflector (iBGP routes not re-advertised to iBGP peers).',
    },
  }
}
