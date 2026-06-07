// L2/スイッチング拡張シミュレーター
// CSMA/CD・MACラーニング・VLAN・STP の動作をステップで表現する

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, VlanState, StpState,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  vlanState?: VlanState,
  stpState?: StpState,
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
    vlanState, stpState,
  }
}

function pkt(
  id: string,
  type: 'generic' | 'arp_request' | 'stp_bpdu' | 'arp_reply',
  from: string,
  to: string,
  progress: number,
  broadcast = false,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast }
}

// ---- CSMA/CD ----

export function* csmaCdSimulator(topology: Topology): NetworkStepGenerator {
  const nodes = topology.nodes
  const host1 = nodes[0]!
  const host2 = nodes[1]!

  yield {
    state: empty(topology, [], 'listen'),
    log: {
      ja: 'CSMA/CD（Carrier Sense Multiple Access / Collision Detection）: イーサネットの旧アクセス制御方式。送信前に搬送波を検知（CS）し、他の送信がなければ送信開始。',
      en: 'CSMA/CD: Pre-transmission, station senses carrier (CS). If idle, starts transmitting.',
    },
  }

  const t1 = pkt('frame-a', 'generic', host1.id, host2.id, 0.3, false, { 'Frame': 'A→B', 'Status': 'Transmitting' })
  yield {
    state: empty(topology, [t1], 'transmit'),
    log: {
      ja: `${host1.label} がフレームを送信開始。同時に ${host2.label} も送信を開始してしまった場合…`,
      en: `${host1.label} starts transmitting. Meanwhile ${host2.label} also starts (collision scenario)…`,
    },
  }

  const t2a = { ...t1, progress: 0.5 }
  const t2b = pkt('frame-b', 'generic', host2.id, host1.id, 0.5, false, { 'Frame': 'B→A', 'Status': 'Transmitting' })
  yield {
    state: empty(topology, [t2a, t2b], 'collision'),
    log: {
      ja: '衝突（Collision）発生！ 両局が同時に送信しているため、電気信号が混ざる。衝突検知（CD）でこれを検知したら即座に送信を停止。',
      en: 'Collision detected! Both stations transmitting simultaneously — signals garbled. Both stop immediately upon detecting collision (CD).',
    },
  }

  yield {
    state: empty(topology, [], 'jam'),
    log: {
      ja: 'ジャム信号（Jam Signal）を送出して全局に衝突を通知。その後 Exponential Backoff（指数バックオフ）でランダム時間待機。',
      en: 'Jam signal broadcast to notify all stations of collision. Then wait a random time using Exponential Backoff before retrying.',
    },
  }

  yield {
    state: empty(topology, [], 'backoff'),
    log: {
      ja: 'バックオフ: 再試行回数 n に対し、0〜2ⁿ-1 のランダムスロット待機。n=1なら0か1スロット、n=2なら0〜3スロット。最大16回で廃棄。',
      en: 'Backoff: After n attempts, wait random 0–(2ⁿ-1) slot times. n=1: 0 or 1 slot. n=2: 0–3 slots. Discard after 16 attempts.',
    },
  }

  const t3 = pkt('frame-a2', 'generic', host1.id, host2.id, 0, false, { 'Frame': 'A→B', 'Status': 'Retransmitting' })
  yield {
    state: empty(topology, [t3], 'retransmit'),
    log: {
      ja: 'バックオフ後に再送。今度は衝突なく成功。スイッチング（全二重）環境では CSMA/CD は不要で、現代ではスイッチが一般的。',
      en: 'Retransmit after backoff. Success this time. In switched (full-duplex) environments CSMA/CD is unnecessary — modern networks use switches.',
    },
  }
}

// ---- MACアドレス学習 ----

export function* macLearningSimulator(topology: Topology): NetworkStepGenerator {
  const sw = topology.nodes.find(n => n.type === 'switch') ?? topology.nodes[1]!
  const hostA = topology.nodes.find(n => n.id === 'host1') ?? topology.nodes[0]!
  const hostB = topology.nodes.find(n => n.id === 'host2') ?? topology.nodes[2] ?? topology.nodes[1]!
  const hostC = topology.nodes.find(n => n.id === 'host3')

  const emptyMac: Record<string, Record<string, string>> = {}

  yield {
    state: {
      topology, packets: [],
      arpTables: {}, routingTables: {}, macTables: emptyMac,
      activeOsiLayer: null, capsuleLayers: [], phase: 'init',
    },
    log: {
      ja: `スイッチ ${sw.label} の MACアドレステーブルは空。${hostA.label}→${hostB.label} へフレーム送信開始。`,
      en: `Switch ${sw.label} MAC table is empty. ${hostA.label} sends a frame to ${hostB.label}.`,
    },
  }

  // hostA → sw フラッド
  const f1 = pkt('mac-f1', 'generic', hostA.id, sw.id, 0, false, {
    'Src MAC': hostA.mac ?? 'AA:BB:CC:01', 'Dst MAC': hostB.mac ?? 'AA:BB:CC:02',
  })
  yield {
    state: {
      topology, packets: [f1],
      arpTables: {}, routingTables: {}, macTables: emptyMac,
      activeOsiLayer: null, capsuleLayers: [], phase: 'learn_src',
    },
    log: {
      ja: `フレームがスイッチに到達。送信元MACを学習: port1 → ${hostA.mac ?? 'AA:BB:CC:01'}。宛先MACは未知なのでフラッディング。`,
      en: `Frame arrives at switch. Learns source MAC: port1 → ${hostA.mac ?? 'AA:BB:CC:01'}. Destination unknown → flood all ports.`,
    },
  }

  // フラッディング
  const swId = sw.id
  const links = topology.links
  const floodLinks = links.filter(l => l.from === swId || l.to === swId)
  const floodPackets: PacketOnLink[] = floodLinks
    .filter(l => {
      const otherId = l.from === swId ? l.to : l.from
      return otherId !== hostA.id
    })
    .map((l, i) => {
      const otherId = l.from === swId ? l.to : l.from
      return pkt(`mac-flood-${i}`, 'generic', swId, otherId, 0, true, {
        'Src MAC': hostA.mac ?? 'AA:BB:CC:01', 'Dst MAC': hostB.mac ?? 'AA:BB:CC:02', 'Action': 'Flood',
      })
    })

  const macAfterLearnA: Record<string, Record<string, string>> = {
    [sw.id]: { [hostA.mac ?? 'AA:BB:CC:01']: hostA.id },
  }

  yield {
    state: {
      topology, packets: floodPackets,
      arpTables: {}, routingTables: {}, macTables: macAfterLearnA,
      activeOsiLayer: null, capsuleLayers: [], phase: 'flood',
    },
    log: {
      ja: `フラッディング中（${hostA.label} ポート以外の全ポートへ送出）。MACテーブルに ${hostA.mac ?? 'AA:BB:CC:01'} を登録済み。`,
      en: `Flooding to all ports except source. MAC table now has ${hostA.mac ?? 'AA:BB:CC:01'} → port(${hostA.label}).`,
    },
  }

  // hostB が応答フレームを返す→スイッチが学習
  // 同じ PacketOnLink.id ('mac-reply-link') を使うことで hostB→sw→hostA のアニメーションが連続する
  const rep1 = pkt('mac-reply', 'generic', hostB.id, sw.id, 0, false, {
    'Src MAC': hostB.mac ?? 'AA:BB:CC:02', 'Dst MAC': hostA.mac ?? 'AA:BB:CC:01',
  })
  const macAfterLearnB: Record<string, Record<string, string>> = {
    [sw.id]: {
      [hostA.mac ?? 'AA:BB:CC:01']: hostA.id,
      [hostB.mac ?? 'AA:BB:CC:02']: hostB.id,
    },
  }
  yield {
    state: {
      topology, packets: [rep1],
      arpTables: {}, routingTables: {}, macTables: macAfterLearnB,
      activeOsiLayer: null, capsuleLayers: [], phase: 'learn_b',
    },
    log: {
      ja: `${hostB.label} が返答フレーム送信。スイッチが ${hostB.mac ?? 'AA:BB:CC:02'} → port(${hostB.label}) を学習。これ以降は直接転送（フラッディングなし）。`,
      en: `${hostB.label} sends reply. Switch learns ${hostB.mac ?? 'AA:BB:CC:02'} → port(${hostB.label}). Future frames forwarded directly.`,
    },
  }

  const fwd = pkt('mac-reply', 'generic', sw.id, hostA.id, 0, false, {
    'Action': 'Direct forward', 'Dst MAC': hostA.mac ?? 'AA:BB:CC:01',
  })
  yield {
    state: {
      topology, packets: [fwd],
      arpTables: {}, routingTables: {}, macTables: macAfterLearnB,
      activeOsiLayer: null, capsuleLayers: [], phase: 'forward',
    },
    log: {
      ja: `スイッチが ${hostA.mac ?? 'AA:BB:CC:01'} 宛てのフレームを直接 ${hostA.label} ポートへ転送。MACテーブルのエントリは一定時間後にエージアウトする（デフォルト300秒）。`,
      en: `Switch forwards frame to ${hostA.label} directly using MAC table. Entries age out after idle period (default 300s).`,
    },
  }

  if (hostC) {
    yield {
      state: {
        topology, packets: [],
        arpTables: {}, routingTables: {}, macTables: macAfterLearnB,
        activeOsiLayer: null, capsuleLayers: [], phase: 'done',
      },
      log: {
        ja: 'テーブルが満杯になるか不明MACは引き続きフラッド。スイッチングの高速化の秘密はこのMACテーブルにある。',
        en: 'Unknown MACs continue to be flooded. The MAC table is the core of high-speed switching.',
      },
    }
  }
}

// ---- VLAN概念 ----

export function* vlanConceptSimulator(topology: Topology): NetworkStepGenerator {
  const vlanA: VlanState = {
    vlans: [
      { id: 10, name: 'Sales', color: '#60a5fa', memberNodeIds: ['host1', 'host2'] },
      { id: 20, name: 'Dev',   color: '#f59e0b', memberNodeIds: ['host3', 'host4'] },
    ],
    trunkLinkIds: [],
  }

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'VLAN（Virtual LAN）: 物理的なスイッチをソフトウェアで論理分割し、複数の仮想L2セグメントを作る技術。IEEE 802.1Q で標準化。',
      en: 'VLAN: Logically segment a physical switch into multiple virtual L2 segments. Standardized as IEEE 802.1Q.',
    },
  }
  yield {
    state: empty(topology, [], 'broadcast', vlanA),
    log: {
      ja: 'VLAN 10（Sales）と VLAN 20（Dev）でブロードキャストドメインを分離。VLAN 10 のブロードキャストは VLAN 20 には届かない。',
      en: 'Separate broadcast domains: VLAN10(Sales) and VLAN20(Dev). VLAN10 broadcasts are invisible to VLAN20.',
    },
  }
  yield {
    state: empty(topology, [], 'security', vlanA),
    log: {
      ja: 'セキュリティ上の利点: VLAN間通信にはルーターまたはL3スイッチが必要。これを「VLAN間ルーティング」という。デフォルトでは別VLANとは通信不可。',
      en: 'Security benefit: Inter-VLAN traffic requires a router or L3 switch (inter-VLAN routing). By default, VLANs cannot communicate.',
    },
  }
  yield {
    state: empty(topology, [], 'port_types'),
    log: {
      ja: 'ポート種別: アクセスポート（1つのVLANのみ）はPCやサーバーに接続。トランクポート（複数VLAN）はスイッチ間やルーター接続に使う。',
      en: 'Port types: Access port (single VLAN) for PCs/servers. Trunk port (multiple VLANs) for switch-to-switch or router links.',
    },
  }
  yield {
    state: empty(topology, [], 'config'),
    log: {
      ja: 'Ciscoの設定例: interface Fa0/1 → switchport mode access → switchport access vlan 10。スイッチのデフォルトVLANは VLAN1（管理VLANとして残すことが多い）。',
      en: 'Cisco config: interface Fa0/1 → switchport mode access → switchport access vlan 10. Default VLAN is VLAN1 (often kept as mgmt VLAN).',
    },
  }
}

// ---- 802.1Qトランキング ----

export function* vlanTrunkSimulator(topology: Topology): NetworkStepGenerator {
  const sw1 = topology.nodes.find(n => n.id === 'sw1') ?? topology.nodes.find(n => n.type === 'switch')!
  const sw2 = topology.nodes.find(n => n.id === 'sw2') ?? topology.nodes.filter(n => n.type === 'switch')[1] ?? sw1
  const trunkLink = topology.links[0]!

  const vlanState: VlanState = {
    vlans: [
      { id: 10, name: 'VLAN10', color: '#60a5fa', memberNodeIds: [] },
      { id: 20, name: 'VLAN20', color: '#f59e0b', memberNodeIds: [] },
    ],
    trunkLinkIds: [trunkLink.id],
  }

  yield {
    state: empty(topology, [], 'init', vlanState),
    log: {
      ja: '802.1Qタグ付きVLAN（トランキング）: スイッチ間リンクで複数VLANのフレームを伝送する仕組み。4バイトのVLANタグをイーサネットフレームに挿入する。',
      en: '802.1Q trunking: Carry multiple VLAN frames over a single link. Insert a 4-byte VLAN tag into Ethernet frames.',
    },
  }

  yield {
    state: empty(topology, [], 'tag_format', vlanState),
    log: {
      ja: '802.1Qタグ形式（4バイト）: TPID（2バイト=0x8100）+ TCI（2バイト）。TCI内: PCP(3bit=優先度)・DEI(1bit)・VID(12bit=VLAN ID 0〜4094）。',
      en: '802.1Q tag (4 bytes): TPID (2B=0x8100) + TCI (2B). TCI: PCP(3b=priority), DEI(1b), VID(12b=VLAN ID 0–4094).',
    },
  }

  const taggedPkt = pkt('trunk-1', 'generic', sw1.id, sw2.id, 0, false, {
    'TPID': '0x8100', 'VLAN ID': '10', 'Priority': '0', 'Frame': 'Tagged for VLAN10',
  })
  yield {
    state: empty(topology, [taggedPkt], 'send_tagged', { ...vlanState, taggedVlanId: 10 }),
    log: {
      ja: `${sw1.label} が VLAN10 のフレームにタグ(VID=10)を付けてトランクリンクへ送出。`,
      en: `${sw1.label} adds VLAN tag (VID=10) to frame and sends it over the trunk link.`,
    },
  }

  yield {
    state: empty(topology, [], 'native', vlanState),
    log: {
      ja: 'ネイティブVLAN: タグなしフレームはネイティブVLAN（通常VLAN1）として扱われる。両スイッチのネイティブVLANが一致していないとVLANホッピング攻撃の対象になる。',
      en: 'Native VLAN: Untagged frames on trunk belong to native VLAN (default VLAN1). Mismatched native VLANs enable VLAN hopping attacks.',
    },
  }
  yield {
    state: empty(topology, [], 'dtp', vlanState),
    log: {
      ja: 'DTP（Dynamic Trunking Protocol）: Cisco独自のトランク自動ネゴシエーション。セキュリティ上の理由から無効化（switchport nonegotiate）が推奨される。',
      en: 'DTP: Cisco-proprietary trunk auto-negotiation. Recommended to disable (switchport nonegotiate) for security.',
    },
  }
}

// ---- STPフェーズ ----

export function* stpPhasesSimulator(topology: Topology): NetworkStepGenerator {
  const sw1 = topology.nodes.find(n => n.id === 'sw1') ?? topology.nodes[0]!
  const sw2 = topology.nodes.find(n => n.id === 'sw2') ?? topology.nodes[1]!
  const sw3 = topology.nodes.find(n => n.id === 'sw3') ?? topology.nodes[2] ?? sw2

  const initStp: StpState = {
    rootBridgeId: '',
    portStates: {},
  }

  yield {
    state: empty(topology, [], 'concept', undefined, initStp),
    log: {
      ja: 'STP（Spanning Tree Protocol, IEEE 802.1D）: スイッチループを自動検出・遮断し、ループフリーなL2トポロジーを保つプロトコル。BPDU（Bridge Protocol Data Unit）を交換して動作する。',
      en: 'STP (IEEE 802.1D): Automatically detects and breaks switch loops, maintaining a loop-free L2 topology. Uses BPDU exchanges.',
    },
  }

  // BPDUフラッディング
  const bpdu1 = pkt('bpdu-1', 'stp_bpdu', sw1.id, sw2.id, 0, true, {
    'Root Bridge ID': '8000.AA:00:00:00:00:01', 'Root Path Cost': '0', 'Bridge ID': '8000.AA:00:00:00:00:01',
  })
  const bpdu2 = pkt('bpdu-2', 'stp_bpdu', sw2.id, sw3.id, 0, true, {
    'Root Bridge ID': '9000.AA:00:00:00:00:02', 'Root Path Cost': '0', 'Bridge ID': '9000.AA:00:00:00:00:02',
  })
  yield {
    state: empty(topology, [bpdu1, bpdu2], 'bpdu_election', undefined, initStp),
    log: {
      ja: 'ルートブリッジ選出: 全スイッチがBPDUをフラッディング。Bridge ID（優先値2B + MACアドレス6B）が最小のスイッチがルートブリッジになる。',
      en: 'Root bridge election: All switches flood BPDUs. The switch with the lowest Bridge ID (2B priority + 6B MAC) becomes root bridge.',
    },
  }

  const rootStp: StpState = {
    rootBridgeId: sw1.id,
    portStates: {
      [`${sw1.id}-${sw2.id}`]: 'forwarding',
      [`${sw1.id}-${sw3.id}`]: 'forwarding',
      [`${sw2.id}-${sw1.id}`]: 'forwarding',
      [`${sw2.id}-${sw3.id}`]: 'blocking',  // ループ防止
      [`${sw3.id}-${sw1.id}`]: 'forwarding',
      [`${sw3.id}-${sw2.id}`]: 'blocking',
    },
  }
  yield {
    state: empty(topology, [], 'root_selected', undefined, rootStp),
    log: {
      ja: `${sw1.label} がルートブリッジに選出（Bridge ID が最小）。ルートポート: 各スイッチでルートブリッジに最も近いポート（最小コスト）。`,
      en: `${sw1.label} elected root bridge (lowest Bridge ID). Root port: each non-root switch selects the port closest to root (min cost).`,
    },
  }

  yield {
    state: empty(topology, [], 'port_roles', undefined, rootStp),
    log: {
      ja: 'ポート役割: ルートポート（非ルートスイッチの最短経路ポート）・指定ポート（各セグメントの最善ポート）・非指定ポート（ブロッキング状態）。',
      en: 'Port roles: Root port (best path to root on non-root switch), Designated port (best port on each segment), Non-designated port (blocking).',
    },
  }

  yield {
    state: empty(topology, [], 'states', undefined, rootStp),
    log: {
      ja: 'ポート状態遷移（802.1D）: Blocking(20s) → Listening(15s) → Learning(15s) → Forwarding。合計50秒のコンバージェンス時間がSTPの欠点（RSTPで改善）。',
      en: 'Port state transitions (802.1D): Blocking(20s) → Listening(15s) → Learning(15s) → Forwarding. 50s convergence is STP\'s weakness (improved by RSTP).',
    },
  }

  yield {
    state: empty(topology, [], 'rstp', undefined, rootStp),
    log: {
      ja: 'RSTP（IEEE 802.1w）: コンバージェンス時間を1〜2秒に短縮。ポート状態をDiscarding/Learning/Forwardingの3つに簡略化。現代ネットワークでは通常RSTPが使われる。',
      en: 'RSTP (802.1w): Convergence in 1–2 seconds. Simplifies port states to Discarding/Learning/Forwarding. RSTP is the modern standard.',
    },
  }
}

// ---- STP再コンバージェンス ----

export function* stpReconvergeSimulator(topology: Topology): NetworkStepGenerator {
  const sw1 = topology.nodes.find(n => n.id === 'sw1') ?? topology.nodes[0]!
  const sw2 = topology.nodes.find(n => n.id === 'sw2') ?? topology.nodes[1]!
  const sw3 = topology.nodes.find(n => n.id === 'sw3') ?? topology.nodes[2] ?? sw2

  const normalStp: StpState = {
    rootBridgeId: sw1.id,
    portStates: {
      [`${sw2.id}-${sw3.id}`]: 'blocking',
      [`${sw3.id}-${sw2.id}`]: 'blocking',
    },
  }

  yield {
    state: empty(topology, [], 'normal', undefined, normalStp),
    log: {
      ja: '初期状態: STP収束済み。ルートブリッジ=' + sw1.label + '。SW2-SW3間リンクは循環防止のためブロッキング。',
      en: `Initial: STP converged. Root bridge=${sw1.label}. Link between ${sw2.label}-${sw3.label} is blocking (loop prevention).`,
    },
  }

  const failStp: StpState = { ...normalStp, portStates: { ...normalStp.portStates } }
  const updatedLinks = topology.links.map(l =>
    (l.from === sw1.id && l.to === sw2.id) || (l.from === sw2.id && l.to === sw1.id)
      ? { ...l, status: 'down' as const }
      : l
  )
  const failTopology = { ...topology, links: updatedLinks }

  yield {
    state: empty(failTopology, [], 'link_fail', undefined, failStp),
    log: {
      ja: `${sw1.label}〜${sw2.label} 間のリンクが障害（down）。${sw2.label} はルートブリッジへの経路を失う。Hello BPDU が途絶え、Max Age（20秒）後に TCN を送出。`,
      en: `Link ${sw1.label}–${sw2.label} fails. ${sw2.label} loses path to root. After Hello BPDUs stop for Max Age (20s), sends TCN.`,
    },
  }

  const bpduTcn = pkt('tcn-1', 'stp_bpdu', sw2.id, sw3.id, 0, false, {
    'Type': 'TCN (Topology Change Notification)', 'From': sw2.label,
  })
  yield {
    state: empty(failTopology, [bpduTcn], 'tcn', undefined, failStp),
    log: {
      ja: `${sw2.label} がTCN BPDUを ${sw3.label} 経由でルートへ伝達。ルートはTCA（Topology Change Acknowledgment）を返送。`,
      en: `${sw2.label} sends TCN BPDU via ${sw3.label} to root. Root replies with TCA (Topology Change Acknowledgment).`,
    },
  }

  const reconvStp: StpState = {
    rootBridgeId: sw1.id,
    portStates: {
      [`${sw2.id}-${sw3.id}`]: 'forwarding',
      [`${sw3.id}-${sw2.id}`]: 'forwarding',
    },
  }

  yield {
    state: empty(failTopology, [], 'reconverge', undefined, reconvStp),
    log: {
      ja: `ブロッキングだった SW2-SW3 間ポートが Listening → Learning → Forwarding に遷移（〜50秒）。新しいループフリートポロジーで通信再開。`,
      en: `Blocking SW2-SW3 port transitions through Listening → Learning → Forwarding (~50s). Traffic resumes on new loop-free topology.`,
    },
  }

  yield {
    state: empty(failTopology, [], 'rstp_note', undefined, reconvStp),
    log: {
      ja: 'RSTPでは同じシナリオで1〜2秒で再コンバージェンスが完了。PortFast（アクセスポートの即時Forwarding）とUplinkFastも有効な最適化。',
      en: 'RSTP achieves the same reconvergence in 1–2 seconds. PortFast (immediate Forwarding on access ports) and UplinkFast are also useful optimizations.',
    },
  }
}
