// 高度なルーティング・WAN・設計演習シミュレーター
// OSPF多エリア・BGPパス選択・NAPT詳細・ダイクストラ可視化・設計演習

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet,
  RouteEntry, OspfState,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  ospfState?: OspfState,
  routingTables: Record<string, RouteEntry[]> = {},
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
    ospfState,
  }
}

function pkt(
  id: string,
  type: 'ospf_hello' | 'ospf_lsa' | 'ospf_lsack' | 'bgp_open' | 'bgp_update' | 'bgp_keepalive' | 'generic',
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

// ---- OSPF多エリア ----

export function* ospfMultiAreaSimulator(topology: Topology): NetworkStepGenerator {
  const routers = topology.nodes.filter(n => n.type === 'router')
  const abr = routers.find(n => n.id === 'abr') ?? routers[0]!
  const area0r = routers.find(n => n.id === 'core') ?? routers[1] ?? routers[0]!
  const area1r = routers.find(n => n.id === 'edge') ?? routers[2] ?? routers[0]!

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'OSPF多エリア設計: 単一エリアではすべてのルーターがフルLSDB（Link State Database）を持ちSPF計算負荷が増大する。エリア分割で解決。バックボーンエリア（Area 0）が必須。',
      en: 'OSPF multi-area: Single area forces all routers to hold full LSDB and run SPF. Area segmentation solves scale. Backbone Area (Area 0) is mandatory.',
    },
  }

  yield {
    state: empty(topology, [], 'area_types'),
    log: {
      ja: 'エリアの種類: バックボーン（Area 0）・スタブ（外部LSAなし・デフォルトルートのみ）・NSSA（外部経路を限定許可）・トータリースタブ（スタブ+サマリーLSAなし）。エリア設計でLSDBサイズを最小化。',
      en: 'Area types: Backbone (Area 0), Stub (no external LSAs, default only), NSSA (limited external), Totally Stub. Area design minimizes LSDB size.',
    },
  }

  const abrLsa = pkt('abr-lsa', 'ospf_lsa', abr.id, area0r.id, 0, {
    'LSA Type': '3 (Summary LSA)',
    'Advertising Router': abr.id,
    'Destination': '10.1.0.0/24 (Area 1)',
    'Cost': '10',
  })
  yield {
    state: empty(topology, [abrLsa], 'abr_summary'),
    log: {
      ja: `ABR（Area Border Router）= ${abr.label}: エリア境界に配置されるルーター。Area 1 の詳細LSAを Area 0 にはサマリーLSA（Type 3）として広告。エリア間の経路をエリア内から隠蔽しLSDB削減。`,
      en: `ABR (Area Border Router) = ${abr.label}: Placed at area boundary. Advertises Area 1 details to Area 0 as Summary LSA (Type 3). Hides intra-area routes, reducing LSDB.`,
    },
    highlightPacketId: 'abr-lsa',
  }

  const asbr = routers.find(n => n.id === 'asbr') ?? area1r
  const extLsa = pkt('ext-lsa', 'ospf_lsa', asbr.id, abr.id, 0, {
    'LSA Type': '5 (AS External LSA)',
    'Advertising Router': asbr.id,
    'Destination': '0.0.0.0/0 (Default from ISP)',
    'External Type': 'Type 2',
  })
  yield {
    state: empty(topology, [extLsa], 'asbr'),
    log: {
      ja: `ASBR（AS Boundary Router）: 外部ネットワーク（ISP, BGP経路）をOSPFドメインに再配布するルーター。Type 5 LSA（ASエクスターナルLSA）をOSPFドメイン全体に広告。`,
      en: `ASBR (AS Boundary Router): Redistributes external networks (ISP, BGP) into OSPF. Type 5 LSA (AS External) flooded throughout OSPF domain.`,
    },
    highlightPacketId: 'ext-lsa',
  }

  const fullOspf: OspfState = {
    lsaDatabase: {
      [area0r.id]: [
        { routerId: area0r.id, neighbors: [{ id: abr.id, cost: 10 }] },
      ],
      [abr.id]: [
        { routerId: abr.id, neighbors: [{ id: area0r.id, cost: 10 }, { id: area1r.id, cost: 5 }] },
      ],
      [area1r.id]: [
        { routerId: area1r.id, neighbors: [{ id: abr.id, cost: 5 }] },
      ],
    },
    shortestPaths: {
      [area0r.id]: [area0r.id, abr.id, area1r.id],
    },
  }

  yield {
    state: empty(topology, [], 'converged', fullOspf),
    log: {
      ja: `多エリアOSPFコンバージェンス完了。各エリア内でSPF計算。エリア間はABRのサマリーLSAでルーティング。エリア内変更がエリア外のSPF再計算をトリガーしない（スケーラビリティ）。`,
      en: `Multi-area OSPF converged. SPF runs within each area. Inter-area routing via ABR summary LSAs. Intra-area change doesn't trigger inter-area SPF (scalability).`,
    },
  }
}

// ---- BGPパス選択 ----

export function* bgpPathSelectionSimulator(topology: Topology): NetworkStepGenerator {
  const routers = topology.nodes.filter(n => n.type === 'router')
  const myRouter = routers[0] ?? topology.nodes[0]!
  const isp1 = routers[1] ?? topology.nodes[1]!
  const isp2 = routers[2] ?? topology.nodes[2] ?? isp1

  yield {
    state: empty(topology, [], 'overview'),
    log: {
      ja: 'BGPベストパス選択: 同一プレフィックスへ複数の経路がある場合、BGPは属性を順番に評価してベストパスを決定する。"We Love Oranges As Oranges Mean Pure Refreshment"（選択基準の覚え方）。',
      en: 'BGP Best Path Selection: For multiple paths to same prefix, BGP evaluates attributes in order. Mnemonic: "We Love Oranges As Oranges Mean Pure Refreshment".',
    },
  }

  const upd1 = pkt('bgp-p1', 'bgp_update', isp1.id, myRouter.id, 0, {
    'Prefix': '8.8.8.0/24', 'LOCAL_PREF': '100', 'AS_PATH': '65100 65200',
    'MED': '50', 'NEXT_HOP': isp1.ip ?? '1.1.1.1', 'Origin': 'IGP',
  })
  const upd2 = pkt('bgp-p2', 'bgp_update', isp2.id, myRouter.id, 0, {
    'Prefix': '8.8.8.0/24', 'LOCAL_PREF': '100', 'AS_PATH': '65300',
    'MED': '100', 'NEXT_HOP': isp2.ip ?? '2.2.2.2', 'Origin': 'EGP',
  })
  yield {
    state: empty(topology, [upd1, upd2], 'receive_paths'),
    log: {
      ja: `${myRouter.label} が 8.8.8.0/24 へ2つの経路を受信。ISP1: AS_PATH=65100 65200, LOCAL_PREF=100, MED=50, Origin=IGP。ISP2: AS_PATH=65300, LOCAL_PREF=100, MED=100, Origin=EGP。`,
      en: `${myRouter.label} receives 2 paths to 8.8.8.0/24. ISP1: AS_PATH=65100 65200, LP=100, MED=50, Origin=IGP. ISP2: AS_PATH=65300, LP=100, MED=100, Origin=EGP.`,
    },
  }

  yield {
    state: empty(topology, [], 'step1_weight'),
    log: {
      ja: 'ステップ1: Weight（Cisco独自）が最大のパスを選択。デフォルト0。両パス同値 → 次のステップへ。',
      en: 'Step 1: Highest Weight (Cisco proprietary). Default 0. Tie → next step.',
    },
  }
  yield {
    state: empty(topology, [], 'step2_lp'),
    log: {
      ja: 'ステップ2: LOCAL_PREF が最大のパスを選択。両パスとも100 → 次のステップへ。LOCAL_PREFは同一AS内で通用し、デフォルト100。',
      en: 'Step 2: Highest LOCAL_PREF. Both=100 → next step. LOCAL_PREF is shared within an AS. Default=100.',
    },
  }
  yield {
    state: empty(topology, [], 'step3_as_path'),
    log: {
      ja: 'ステップ3: AS_PATH が最短のパスを選択。ISP1=2ホップ（65100 65200）、ISP2=1ホップ（65300）→ ISP2 が優先！（ここで決定）。',
      en: 'Step 3: Shortest AS_PATH. ISP1=2 hops (65100 65200), ISP2=1 hop (65300) → ISP2 wins! (Decision made here.)',
    },
  }
  yield {
    state: empty(topology, [], 'attributes_summary'),
    log: {
      ja: '続くステップ（参考）: Origin(IGP<EGP<Incomplete)・MED（最小）・eBGP vs iBGP・IGPコスト・Router IDの小さい方。Weight/LOCAL_PREFは自AS内でベストパスを制御する主要な手段。',
      en: 'Further steps: Origin (IGP<EGP<Incomplete), MED (lowest), eBGP>iBGP, IGP cost, lowest Router ID. Weight/LOCAL_PREF are the primary tools for controlling inbound/outbound traffic.',
    },
  }
}

// ---- NAPT詳細（ポート変換テーブル） ----

export function* naptDetailSimulator(topology: Topology): NetworkStepGenerator {
  const clients = topology.nodes.filter(n => n.type === 'host')
  const c1 = clients[0] ?? topology.nodes[0]!
  const c2 = clients[1] ?? topology.nodes[1]!
  const natRouter = topology.nodes.find(n => n.type === 'router') ?? topology.nodes[2]!

  yield {
    state: empty(topology, [], 'table_concept'),
    log: {
      ja: 'NAPTテーブル（PAT: Port Address Translation）: プライベートIPとポートの組み合わせをグローバルIPとポートに1対1でマッピング。同時接続数はポート番号の数（最大65535）に制限される。',
      en: 'NAPT table (PAT): Maps private IP+port pairs to global IP+port 1-to-1. Max concurrent sessions limited by port numbers (~65535).',
    },
  }

  yield {
    state: empty(topology, [], 'multi_session'),
    log: {
      ja: `NAPTテーブル例: ${c1.ip ?? '192.168.1.10'}:50001→8.8.8.8:80 は ${natRouter.ip ?? '203.0.113.1'}:8001 にマップ。${c2.ip ?? '192.168.1.20'}:60001→8.8.8.8:80 は ${natRouter.ip ?? '203.0.113.1'}:8003 にマップ。同一グローバルIPを複数クライアントが共有。`,
      en: `NAPT table: ${c1.ip ?? '192.168.1.10'}:50001→8.8.8.8:80 mapped to 203.0.113.1:8001. ${c2.ip ?? '192.168.1.20'}:60001→8.8.8.8:80 mapped to 203.0.113.1:8003. Multiple clients share one global IP.`,
    },
  }

  yield {
    state: empty(topology, [], 'restrictions'),
    log: {
      ja: 'NAPTの制限: ① 外部から内部への通信開始が不可（UPnP/DMZ/ポートフォワーディングで解決）。② VPNプロトコルによっては問題（NAT-T/ESP）。③ ALG（Application Layer Gateway）がSIP等の埋め込みIPアドレスを変換。',
      en: 'NAPT limitations: ① External cannot initiate connections (solve with UPnP/DMZ/port forwarding). ② Some VPN protocols issues (NAT-T/ESP). ③ ALG rewrites embedded IPs in SIP etc.',
    },
  }

  yield {
    state: empty(topology, [], 'hairpin'),
    log: {
      ja: 'ヘアピンNAT（NATループバック）: 内部クライアントが外部ドメイン名（グローバルIP）で内部サーバーにアクセスする際、NATルーターが折り返してルーティングする仕組み。対応していないルーターも多い。',
      en: 'Hairpin NAT (NAT loopback): Internal client accesses internal server via its global domain name. Router reflects traffic back internally. Not all routers support this.',
    },
  }
}

// ---- ダイクストラアルゴリズム可視化 ----

export function* dijkstraDemoSimulator(topology: Topology): NetworkStepGenerator {
  const routers = topology.nodes.filter(n => n.type === 'router')
  const src = routers[0] ?? topology.nodes[0]!
  const mid1 = routers[1] ?? topology.nodes[1]!
  const mid2 = routers[2] ?? topology.nodes[2]!
  const dst = routers[3] ?? topology.nodes[topology.nodes.length - 1]!

  const initialRoutes: Record<string, RouteEntry[]> = {}

  yield {
    state: empty(topology, [], 'concept', undefined, initialRoutes),
    log: {
      ja: 'ダイクストラアルゴリズム: OSPFのSPF計算に使われる最短経路アルゴリズム。負の重みのない有向グラフで動作。OSPFのコスト（= 10^8 / 帯域幅bps）を重みとして最小コスト経路を計算。',
      en: 'Dijkstra: Shortest path algorithm used by OSPF SPF computation. Works on directed graphs with non-negative weights. OSPF cost = 10^8 / bandwidth(bps).',
    },
  }

  yield {
    state: empty(topology, [], 'init_state', undefined, {
      [src.id]: [route('0.0.0.0', 0, 'local', 'lo', 0)],
    }),
    log: {
      ja: `初期状態: ${src.label} をソースに設定。距離: ${src.label}=0、その他=∞。未訪問ノードセット={${routers.map(r => r.label).join(', ')}}。`,
      en: `Init: Source=${src.label}. Distances: ${src.label}=0, others=∞. Unvisited={${routers.map(r => r.label).join(', ')}}.`,
    },
  }

  yield {
    state: empty(topology, [], 'step1', undefined, {
      [src.id]: [
        route('0.0.0.0', 0, 'local', 'lo', 0),
        route(mid1.ip ?? '10.0.2.0', 24, mid1.ip ?? '10.0.2.1', 'eth0', 10),
        route(mid2.ip ?? '10.0.3.0', 24, mid2.ip ?? '10.0.3.1', 'eth1', 20),
      ],
    }),
    log: {
      ja: `ステップ1: ${src.label}（コスト0）を確定。隣接の ${mid1.label}（コスト=10）・${mid2.label}（コスト=20）へのコストを更新。次に最小コスト=${mid1.label}（10）を処理。`,
      en: `Step 1: Settle ${src.label} (cost=0). Update neighbors: ${mid1.label}(cost=10), ${mid2.label}(cost=20). Next: process min cost=${mid1.label}(10).`,
    },
  }

  yield {
    state: empty(topology, [], 'step2', undefined, {
      [src.id]: [
        route('0.0.0.0', 0, 'local', 'lo', 0),
        route(mid1.ip ?? '10.0.2.0', 24, mid1.ip ?? '10.0.2.1', 'eth0', 10),
        route(mid2.ip ?? '10.0.3.0', 24, mid2.ip ?? '10.0.3.1', 'eth1', 20),
        route(dst.ip ?? '10.0.4.0', 24, mid1.ip ?? '10.0.2.1', 'eth0', 25),
      ],
    }),
    log: {
      ja: `ステップ2: ${mid1.label}（コスト10）を確定。${dst.label} へのコストを 10+15=25 に更新（20 < 25 なので ${mid2.label} 経由は変更なし）。未訪問: {${mid2.label}, ${dst.label}}。`,
      en: `Step 2: Settle ${mid1.label} (cost=10). Update ${dst.label} cost to 10+15=25. (Still 20 via ${mid2.label} unchanged). Unvisited: {${mid2.label}, ${dst.label}}.`,
    },
  }

  yield {
    state: empty(topology, [], 'step3'),
    log: {
      ja: `ステップ3: ${mid2.label}（コスト20）を確定。${dst.label} への経路を再チェック: ${mid2.label} 経由=20+3=23 < 現在25 → コストを23に更新して経路変更。`,
      en: `Step 3: Settle ${mid2.label} (cost=20). Recheck ${dst.label}: via ${mid2.label}=20+3=23 < current 25 → update cost to 23 and change path.`,
    },
  }

  yield {
    state: empty(topology, [], 'done'),
    log: {
      ja: `最終: ${dst.label} の最短コスト=23（${src.label} → ${mid2.label} → ${dst.label}）。OSPFはルーター台数が増えるほどSPF計算量がO(E log V)で増加。多エリア設計でSPFスコープを限定する理由がここにある。`,
      en: `Final: Shortest cost to ${dst.label}=23 via (${src.label}→${mid2.label}→${dst.label}). OSPF SPF complexity O(E log V). Multi-area design limits SPF scope.`,
    },
  }
}

// ---- 設計演習：小規模オフィスネットワーク ----

export function* designSmallOfficeSimulator(topology: Topology): NetworkStepGenerator {
  yield {
    state: empty(topology, [], 'requirements'),
    log: {
      ja: '【設計演習 D-01】小規模オフィス（20台・1フロア）。要件: インターネット接続・Wi-Fi・プリンター共有・NASファイルサーバー・セキュリティ分離（ゲスト/業務）。',
      en: '[Design D-01] Small office (20 clients, 1 floor). Requirements: Internet, Wi-Fi, printer sharing, NAS file server, security separation (guest/business).',
    },
  }

  yield {
    state: empty(topology, [], 'topology_design'),
    log: {
      ja: '設計案: ISP→ブロードバンドルーター（NAPT）→L2スイッチ（24ポート）→PC/プリンター。Wi-Fi APはスイッチに接続。VLAN10=業務、VLAN20=ゲスト。ルーターのACLでVLAN間分離。',
      en: 'Design: ISP → Broadband router (NAPT) → L2 switch (24-port) → PCs/printers. Wi-Fi APs on switch. VLAN10=business, VLAN20=guest. Router ACL separates VLANs.',
    },
  }

  yield {
    state: empty(topology, [], 'addressing'),
    log: {
      ja: 'アドレス設計: 業務LAN=192.168.1.0/24（VLAN10）。ゲストLAN=192.168.2.0/24（VLAN20）。サーバー固定割り当て（192.168.1.10〜.19）。PCはDHCP（.100〜.200）。',
      en: 'Addressing: Business=192.168.1.0/24 (VLAN10), Guest=192.168.2.0/24 (VLAN20). Servers: static .10–.19. PCs: DHCP .100–.200.',
    },
  }

  yield {
    state: empty(topology, [], 'redundancy'),
    log: {
      ja: '可用性考慮: 小規模では冗長化コストが高い。優先順位: ① NASのRAID（データ保護）。② UPS（停電対策）。③ 予備スイッチの保管。④ ブロードバンドルーターの同一機種予備。',
      en: 'Availability: Redundancy is costly for small scale. Priority: ① NAS RAID. ② UPS. ③ Spare switch. ④ Same-model backup router.',
    },
  }

  yield {
    state: empty(topology, [], 'security'),
    log: {
      ja: 'セキュリティ: ① ゲストVLANはインターネットのみ許可（業務LAN遮断）。② Wi-FiはWPA3（WPA2でも可）。③ ルーターのFWでOutbound許可・Inbound拒否。④ NASへのアクセスはVLAN10のみ。',
      en: 'Security: ① Guest VLAN: internet only (block business LAN). ② Wi-Fi WPA3. ③ Router FW: permit outbound, deny inbound. ④ NAS access restricted to VLAN10.',
    },
  }
}

// ---- 設計演習：DMZを持つエンタープライズ ----

export function* designEnterpriseDmzSimulator(topology: Topology): NetworkStepGenerator {
  yield {
    state: empty(topology, [], 'requirements'),
    log: {
      ja: '【設計演習 D-02】中規模企業（300台・3フロア）。要件: 公開Webサーバー・メールサーバー・社内ファイルサーバー・リモートアクセスVPN・高可用性（SLA 99.9%）。',
      en: '[Design D-02] Mid-size enterprise (300 clients, 3 floors). Requirements: Public web, mail server, internal file server, remote-access VPN, HA (SLA 99.9%).',
    },
  }

  yield {
    state: empty(topology, [], 'dmz_concept'),
    log: {
      ja: 'DMZ（非武装地帯）設計: インターネット↔FW1↔DMZ（Web/Mailサーバー）↔FW2↔内部LAN。FW1は公開サービスポートのみ許可。FW2は内部→DMZのみ許可（DMZ→内部は拒否）。',
      en: 'DMZ design: Internet ↔ FW1 ↔ DMZ (Web/Mail) ↔ FW2 ↔ Internal LAN. FW1: permit only public service ports. FW2: permit internal→DMZ only (deny DMZ→internal).',
    },
  }

  yield {
    state: empty(topology, [], 'campus_design'),
    log: {
      ja: 'キャンパス設計（3階層）: コア（L3スイッチ×2 HSRP）→ディストリビューション（フロア毎L3スイッチ）→アクセス（各フロアL2スイッチ）。VLAN構成: 経営部(10)・技術部(20)・営業(30)・サーバー(40)・VoIP(50)。',
      en: 'Campus (3-tier): Core (2× L3 switch + HSRP) → Distribution (per-floor L3) → Access (floor L2). VLANs: Mgmt(10), Tech(20), Sales(30), Server(40), VoIP(50).',
    },
  }

  yield {
    state: empty(topology, [], 'redundancy'),
    log: {
      ja: '冗長化: ① コアスイッチ2台（HSRP/VRRP）。② ISP2重化（BGP or スタティック）。③ ファイアウォール Active/Standby（HA クラスタ）。④ サーバー NIC チーミング（LACP）。⑤ 全アップリンクにLACP。',
      en: 'Redundancy: ① 2 core switches (HSRP/VRRP). ② Dual ISP (BGP or static). ③ Firewall HA cluster. ④ Server NIC teaming (LACP). ⑤ LACP on all uplinks.',
    },
  }

  yield {
    state: empty(topology, [], 'vpn'),
    log: {
      ja: 'リモートアクセスVPN: ① SSL-VPN（Webブラウザ経由・クライアントレス）をゲスト・パートナー向けに提供。② IPsec/IKEv2 VPN（専用クライアント）を社員向けに提供。スプリットトンネリングで帯域節約。',
      en: 'Remote access VPN: ① SSL-VPN (clientless, browser) for guests/partners. ② IPsec/IKEv2 VPN (dedicated client) for employees. Split tunneling for bandwidth efficiency.',
    },
  }
}
