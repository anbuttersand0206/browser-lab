// トランスポート層拡張シミュレーター
// TCPスライディングウィンドウ・輻輳制御・4ウェイFIN・UDP比較

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, TcpWindowState,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  tcpWindowState?: TcpWindowState,
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
    tcpWindowState,
  }
}

function pkt(
  id: string,
  type: 'tcp_data' | 'tcp_ack' | 'tcp_syn' | 'tcp_fin' | 'tcp_fin_ack' | 'tcp_rst' | 'udp' | 'generic',
  from: string,
  to: string,
  progress: number,
  seq?: number,
  ack?: number,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { seq, ack, flags: type === 'tcp_data' ? ['PSH', 'ACK'] : undefined, extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

// ---- TCPスライディングウィンドウ ----

export function* tcpSlidingWindowSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'TCPスライディングウィンドウ（フロー制御）: ACKを待たずに複数セグメントを送れる仕組み。ウィンドウサイズ=一度に送れる未確認データ量。受信バッファを超えないよう動的に調整する。',
      en: 'TCP Sliding Window (flow control): Send multiple segments without waiting for each ACK. Window size = unacknowledged data allowed. Dynamically adjusted to not overflow receive buffer.',
    },
  }

  const win1: TcpWindowState = {
    windowSize: 4, sentUnacked: 0, nextSeq: 1,
    cwnd: 4, ssthresh: 16,
    congestionPhase: 'slow_start',
    segments: [
      { seq: 1, status: 'sent' }, { seq: 2, status: 'sent' },
      { seq: 3, status: 'sent' }, { seq: 4, status: 'sent' },
    ],
  }

  const d1 = pkt('tcp-d1', 'tcp_data', client.id, server.id, 0.2, 1, undefined, { 'Seg': '1/4', 'Window': '4' })
  const d2 = pkt('tcp-d2', 'tcp_data', client.id, server.id, 0.4, 2, undefined, { 'Seg': '2/4', 'Window': '4' })
  const d3 = pkt('tcp-d3', 'tcp_data', client.id, server.id, 0.6, 3, undefined, { 'Seg': '3/4', 'Window': '4' })
  const d4 = pkt('tcp-d4', 'tcp_data', client.id, server.id, 0.8, 4, undefined, { 'Seg': '4/4', 'Window': '4' })
  yield {
    state: empty(topology, [d1, d2, d3, d4], 'send_window', win1),
    log: {
      ja: `ウィンドウサイズ=4: ${client.label} が ACK なしに 4 セグメントを連続送信（SEQ 1〜4）。ACK が返るまで次の送信は待機。`,
      en: `Window size=4: ${client.label} sends 4 segments without waiting for ACK (SEQ 1–4). Next batch waits until ACK.`,
    },
  }

  const ack1 = pkt('tcp-a1', 'tcp_ack', server.id, client.id, 0, undefined, 3, { 'ACK': '3', 'RWND': '4' })
  const win2: TcpWindowState = {
    ...win1, sentUnacked: 2, nextSeq: 7,
    segments: [
      { seq: 1, status: 'acked' }, { seq: 2, status: 'acked' },
      { seq: 3, status: 'sent' }, { seq: 4, status: 'sent' },
      { seq: 5, status: 'sent' }, { seq: 6, status: 'sent' },
    ],
  }
  yield {
    state: empty(topology, [ack1], 'slide', win2),
    log: {
      ja: `${server.label} が ACK=3 を返送（累積確認: SEQ 1,2 を受信確認）。ウィンドウが 2 つスライド → SEQ 5,6 を新たに送信可能。`,
      en: `${server.label} sends ACK=3 (cumulative: SEQ 1 and 2 confirmed). Window slides by 2 → SEQ 5 and 6 can now be sent.`,
    },
    highlightPacketId: 'tcp-a1',
  }

  yield {
    state: empty(topology, [], 'rwnd'),
    log: {
      ja: '受信ウィンドウ（RWND）: ACK の TCP ヘッダー内「Window」フィールド（16bit）で受信バッファの空き量を通知。ゼロウィンドウ（RWND=0）で送信一時停止 → ウィンドウプローブで再開確認。',
      en: 'RWND: Receiver notifies buffer space via TCP header "Window" field (16 bits). Zero window (RWND=0) pauses sender. Window probe re-checks.',
    },
  }
}

// ---- TCP輻輳制御 ----

export function* tcpCongestionSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!

  const slowStart: TcpWindowState = {
    windowSize: 1, sentUnacked: 0, nextSeq: 1,
    cwnd: 1, ssthresh: 16,
    congestionPhase: 'slow_start',
    segments: [{ seq: 1, status: 'sent' }],
  }
  yield {
    state: empty(topology, [
      pkt('cong-ss1', 'tcp_data', client.id, server.id, 0, 1, undefined, { 'cwnd': '1 MSS', 'Phase': 'Slow Start' }),
    ], 'slow_start', slowStart),
    log: {
      ja: 'スロースタート（Slow Start）: 接続直後は cwnd（輻輳ウィンドウ）=1 MSS。ACK 1 つ受け取るごとに cwnd を 1 増加 → 指数関数的増加（1→2→4→8…）。',
      en: 'Slow Start: Initially cwnd=1 MSS. Each ACK increases cwnd by 1 → exponential growth (1→2→4→8…).',
    },
    highlightPacketId: 'cong-ss1',
  }

  const growing: TcpWindowState = { ...slowStart, cwnd: 8, windowSize: 8, ssthresh: 16, nextSeq: 9, segments: Array.from({ length: 8 }, (_, i) => ({ seq: i + 1, status: 'sent' as const })) }
  yield {
    state: empty(topology, [
      pkt('cong-g1', 'tcp_data', client.id, server.id, 0.15, 1, undefined, { 'cwnd': '8 MSS', 'Phase': 'Slow Start growing' }),
      pkt('cong-g2', 'tcp_data', client.id, server.id, 0.35, 2, undefined),
      pkt('cong-g3', 'tcp_data', client.id, server.id, 0.55, 3, undefined),
      pkt('cong-g4', 'tcp_data', client.id, server.id, 0.75, 4, undefined),
    ], 'growing', growing),
    log: {
      ja: 'cwnd が ssthresh（スロースタート閾値=16）に達するまで指数増加。ssthresh 到達後は輻輳回避フェーズへ移行（線形増加）。',
      en: 'cwnd grows exponentially until ssthresh (slow-start threshold=16). After reaching ssthresh, switches to Congestion Avoidance (linear growth).',
    },
  }

  const caPhase: TcpWindowState = { ...growing, cwnd: 18, windowSize: 18, congestionPhase: 'congestion_avoidance', segments: Array.from({ length: 18 }, (_, i) => ({ seq: i + 1, status: 'sent' as const })) }
  yield {
    state: empty(topology, [
      pkt('cong-ca1', 'tcp_data', client.id, server.id, 0.1, 1, undefined, { 'cwnd': '18 MSS', 'Phase': 'Congestion Avoidance' }),
      pkt('cong-ca2', 'tcp_data', client.id, server.id, 0.3, 2, undefined),
      pkt('cong-ca3', 'tcp_data', client.id, server.id, 0.5, 3, undefined),
      pkt('cong-ca4', 'tcp_data', client.id, server.id, 0.7, 4, undefined),
      pkt('cong-ca5', 'tcp_data', client.id, server.id, 0.9, 5, undefined),
    ], 'cong_avoid', caPhase),
    log: {
      ja: '輻輳回避（Congestion Avoidance）: cwnd を RTT ごとに 1 MSS 増加（線形増加）。パケットロスを検出するまで増加を続ける。',
      en: 'Congestion Avoidance: cwnd grows by 1 MSS per RTT (linear). Continues until packet loss detected.',
    },
  }

  const lostSeg: TcpWindowState = { ...caPhase, cwnd: 18, segments: caPhase.segments.map((s, i) => i === 10 ? { ...s, status: 'lost' as const } : s) }
  yield {
    state: empty(topology, [
      pkt('cong-l1', 'tcp_data', client.id, server.id, 0.4, 11, undefined, { 'Event': 'Packet loss detected (RTO)', 'Action': 'ssthresh=9, cwnd→1' }),
    ], 'loss', lostSeg),
    log: {
      ja: '輻輳検出（タイムアウト）: 再送タイマー（RTO）が切れたら輻輳とみなす。ssthresh = cwnd/2 = 9 に更新。cwnd = 1 MSS にリセットしてスロースタートをやり直す。',
      en: 'Congestion (timeout): If RTO expires, assume congestion. Set ssthresh = cwnd/2 = 9. Reset cwnd=1 and restart slow start.',
    },
    highlightPacketId: 'cong-l1',
  }

  const recovery: TcpWindowState = { ...slowStart, ssthresh: 9, cwnd: 1, segments: [{ seq: 11, status: 'retrans' as const }] }
  yield {
    state: empty(topology, [
      pkt('cong-rt', 'tcp_data', client.id, server.id, 0, 11, undefined, { 'Retransmit': 'SEQ=11', 'Trigger': '3× dup ACK → Fast Retransmit' }),
    ], 'recovery', recovery),
    log: {
      ja: '高速再送（Fast Retransmit）: 重複ACK 3 回で即座に再送（タイムアウト待たない）。高速回復（Fast Recovery）: ssthresh=cwnd/2 のまま cwnd=ssthresh+3 で輻輳回避フェーズ継続。',
      en: 'Fast Retransmit: 3 duplicate ACKs → immediate retransmit (no RTO wait). Fast Recovery: keep ssthresh=cwnd/2, set cwnd=ssthresh+3, continue Congestion Avoidance.',
    },
    highlightPacketId: 'cong-rt',
  }

  yield {
    state: empty(topology, [], 'reno_cubic'),
    log: {
      ja: '主要な輻輳制御アルゴリズム: TCP Reno（RFC 5681）・TCP CUBIC（Linux デフォルト）・TCP BBR（Google、帯域幅ベース）。QUIC/HTTP3 は独自の輻輳制御を持つ。',
      en: 'Main algorithms: TCP Reno (RFC 5681), TCP CUBIC (Linux default), TCP BBR (Google, bandwidth-based). QUIC/HTTP3 has its own congestion control.',
    },
  }
}

// ---- TCP 4ウェイFIN ----

export function* tcp4WayCloseSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'init'),
    log: {
      ja: 'TCP接続終了（4ウェイFIN）: TCPはデータ転送完了後、4回のハンドシェイクで接続を終了する。半二重クローズ（Half-close）をサポートするため4ウェイになる。',
      en: 'TCP 4-way FIN: After data transfer, TCP closes with 4 handshakes. 4-way is needed to support half-close (each direction closed independently).',
    },
  }

  const fin1 = pkt('fin-1', 'tcp_fin', client.id, server.id, 0, 1000, undefined, {
    'Flags': 'FIN,ACK', 'SEQ': '1000', 'Meaning': 'Client done sending',
  })
  yield {
    state: empty(topology, [fin1], 'fin1'),
    log: {
      ja: `ステップ1: ${client.label} が FIN 送信（SEQ=1000）。クライアント→サーバー方向の通信終了を宣言（FIN_WAIT_1 状態）。`,
      en: `Step 1: ${client.label} sends FIN (SEQ=1000). Declares end of client→server direction (FIN_WAIT_1 state).`,
    },
    highlightPacketId: 'fin-1',
  }

  const ack1 = pkt('ack-1', 'tcp_ack', server.id, client.id, 0, undefined, 1001, {
    'Flags': 'ACK', 'ACK': '1001', 'Meaning': 'FIN acknowledged',
  })
  yield {
    state: empty(topology, [ack1], 'ack1'),
    log: {
      ja: `ステップ2: ${server.label} が ACK（ACK=1001）を返送。クライアントは FIN_WAIT_2 へ。サーバーはまだデータを送れる（半二重クローズ）。`,
      en: `Step 2: ${server.label} sends ACK (ACK=1001). Client moves to FIN_WAIT_2. Server can still send data (half-close).`,
    },
    highlightPacketId: 'ack-1',
  }

  const fin2 = pkt('fin-2', 'tcp_fin', server.id, client.id, 0, 2000, undefined, {
    'Flags': 'FIN,ACK', 'SEQ': '2000', 'Meaning': 'Server also done',
  })
  yield {
    state: empty(topology, [fin2], 'fin2'),
    log: {
      ja: `ステップ3: ${server.label} も FIN を送信（SEQ=2000）。サーバー→クライアント方向の終了宣言。サーバーは LAST_ACK 状態へ。`,
      en: `Step 3: ${server.label} sends FIN (SEQ=2000). Declares end of server→client direction. Server enters LAST_ACK state.`,
    },
    highlightPacketId: 'fin-2',
  }

  const ack2 = pkt('ack-2', 'tcp_ack', client.id, server.id, 0, undefined, 2001, {
    'Flags': 'ACK', 'ACK': '2001', 'Meaning': 'Final ACK',
  })
  yield {
    state: empty(topology, [ack2], 'ack2'),
    log: {
      ja: `ステップ4: ${client.label} が最後の ACK（ACK=2001）を送信。クライアントは TIME_WAIT（2×MSL=4分）後に CLOSED。サーバーは即時 CLOSED。`,
      en: `Step 4: ${client.label} sends final ACK (ACK=2001). Client enters TIME_WAIT (2×MSL=4 min) then CLOSED. Server immediately CLOSED.`,
    },
    highlightPacketId: 'ack-2',
  }

  yield {
    state: empty(topology, [], 'time_wait'),
    log: {
      ja: 'TIME_WAIT の意味: 遅延パケットが次の接続に混入しないよう、古い接続のポートを一時使用禁止にする。MSL（Maximum Segment Lifetime）= 2分が一般的。サーバーアプリは SO_REUSEADDR で即時再使用可。',
      en: 'TIME_WAIT: Prevents delayed packets from corrupting the next connection by holding the port. MSL=2 min typically. Server apps use SO_REUSEADDR to bypass.',
    },
  }
}

// ---- UDP vs TCP比較 ----

export function* udpVsTcpSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'udp_header'),
    log: {
      ja: 'UDPヘッダー（8バイト固定）: 送信元ポート(16)・宛先ポート(16)・データグラム長(16)・チェックサム(16)のみ。シンプルで軽量。',
      en: 'UDP header (8 bytes fixed): Src Port (16b), Dst Port (16b), Length (16b), Checksum (16b) only. Simple and lightweight.',
    },
  }

  const udpPkt = pkt('udp-1', 'udp', client.id, server.id, 0.5, undefined, undefined, {
    'Protocol': 'UDP', 'Src Port': '52000', 'Dst Port': '53',
    'Length': '28', 'Connection': 'Connectionless',
  })
  yield {
    state: empty(topology, [udpPkt], 'udp_send'),
    log: {
      ja: 'UDP送信: コネクション確立なし（ハンドシェイクなし）。送りっぱなし。ロスしても再送しない。DNS（ポート53）・NTP・DHCP・動画ストリーミング・ゲームに使われる。',
      en: 'UDP: No connection setup (no handshake). Fire and forget. No retransmission on loss. Used for DNS(53), NTP, DHCP, video streaming, games.',
    },
    highlightPacketId: 'udp-1',
  }

  yield {
    state: empty(topology, [], 'comparison'),
    log: {
      ja: 'TCP vs UDP比較: TCP＝信頼性・順序保証・フロー/輻輳制御・コネクション型。UDP＝低遅延・軽量・ベストエフォート・コネクションレス。どちらが優れているかではなく、用途で使い分ける。',
      en: 'TCP vs UDP: TCP=reliable, ordered, flow/congestion control, connection-oriented. UDP=low-latency, lightweight, best-effort, connectionless. Use case determines the choice.',
    },
  }

  yield {
    state: empty(topology, [], 'quic'),
    log: {
      ja: 'QUIC（RFC 9000）: UDP上でTCPの信頼性を実装した次世代プロトコル。HTTP/3 の基盤。0-RTT 接続・多重化・ヘッド・オブ・ライン・ブロッキング解消などが特長。',
      en: 'QUIC (RFC 9000): TCP reliability implemented over UDP. Foundation of HTTP/3. Features: 0-RTT, multiplexing, eliminates head-of-line blocking.',
    },
  }

  yield {
    state: empty(topology, [], 'ports'),
    log: {
      ja: 'ウェルノウンポート番号: HTTP=80, HTTPS=443, FTP=21, SSH=22, SMTP=25, DNS=53, DHCP=67/68, SNMP=161, BGP=179, RDP=3389, MySQL=3306。IANA が管理（0〜1023）。',
      en: 'Well-known ports: HTTP=80, HTTPS=443, FTP=21, SSH=22, SMTP=25, DNS=53, DHCP=67/68, SNMP=161, BGP=179, RDP=3389, MySQL=3306. Managed by IANA (0–1023).',
    },
  }
}
