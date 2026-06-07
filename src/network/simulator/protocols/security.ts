// ネットワークセキュリティシミュレーター
// ファイアウォールACL・TLSハンドシェイク・ARP詐称・SYNフラッド

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, FirewallState,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  firewallState?: FirewallState,
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
    firewallState,
  }
}

function pkt(
  id: string,
  type: 'generic' | 'http_request' | 'http_response' | 'tcp_syn' | 'tcp_rst' | 'arp_request' | 'arp_reply' | 'tls_client_hello' | 'tls_server_hello' | 'tls_finished' | 'tls_data',
  from: string,
  to: string,
  progress: number,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

// ---- ファイアウォール ACL ----

export function* firewallAclSimulator(topology: Topology): NetworkStepGenerator {
  const outside = topology.nodes.find(n => n.id === 'outside') ?? topology.nodes[0]!
  const fw = topology.nodes.find(n => n.type === 'firewall') ?? topology.nodes.find(n => n.id === 'fw') ?? topology.nodes[1]!
  const webServer = topology.nodes.find(n => n.id === 'web') ?? topology.nodes.find(n => n.id === 'server') ?? topology.nodes[2]!
  const dbServer = topology.nodes.find(n => n.id === 'db') ?? topology.nodes[topology.nodes.length - 1]!

  const aclRules: FirewallState['rules'] = [
    { id: 1, action: 'permit', src: 'any', dst: webServer.ip ?? '10.0.0.10', proto: 'TCP', port: 80 },
    { id: 2, action: 'permit', src: 'any', dst: webServer.ip ?? '10.0.0.10', proto: 'TCP', port: 443 },
    { id: 3, action: 'deny',   src: 'any', dst: dbServer.ip ?? '10.0.0.20',  proto: 'TCP', port: 3306 },
    { id: 4, action: 'deny',   src: 'any', dst: 'any',                       proto: 'any' },
  ]

  yield {
    state: empty(topology, [], 'init', {
      rules: aclRules,
      currentSrc: '', currentDst: '', currentProto: '',
    }),
    log: {
      ja: 'ファイアウォール ACL（アクセスコントロールリスト）: パケットを送信元IP・宛先IP・プロトコル・ポートで照合し、permit/deny を順番に適用する。最初にマッチしたルールが適用される（暗黙のdeny all）。',
      en: 'Firewall ACL: Match packets by src IP, dst IP, protocol, port. Apply first matching rule (permit/deny). Implicit deny all at the end.',
    },
  }

  // 許可されるリクエスト（同じ PacketOnLink.id 'acl-http-link' を使うことで outside→fw→webServer のアニメーションが連続する）
  const req1 = pkt('acl-http', 'http_request', outside.id, fw.id, 0, {
    'Src': outside.ip ?? '203.0.113.5', 'Dst': webServer.ip ?? '10.0.0.10',
    'Protocol': 'TCP', 'Dst Port': '80',
  })
  yield {
    state: empty(topology, [req1], 'check_permit', {
      rules: aclRules.map((r, i) => ({ ...r, matched: i === 0 })),
      currentSrc: outside.ip ?? '203.0.113.5',
      currentDst: webServer.ip ?? '10.0.0.10',
      currentProto: 'TCP', currentPort: 80,
    }),
    log: {
      ja: `HTTP リクエスト（Src=${outside.ip ?? '203.0.113.5'}, Dst=${webServer.ip ?? '10.0.0.10'}:80）がファイアウォールに到達。ルール1（permit TCP→:80）にマッチ → 通過許可。`,
      en: `HTTP request (Src=${outside.ip ?? '203.0.113.5'}, Dst=${webServer.ip ?? '10.0.0.10'}:80) arrives at firewall. Matches rule 1 (permit TCP port 80) → Permitted.`,
    },
    highlightPacketId: 'acl-http',
  }

  const pass1 = pkt('acl-http', 'http_request', fw.id, webServer.id, 0, {
    'Status': 'Permitted by rule 1',
  })
  yield {
    state: empty(topology, [pass1], 'permitted', {
      rules: aclRules.map((r, i) => ({ ...r, matched: i === 0 })),
      currentSrc: outside.ip ?? '203.0.113.5',
      currentDst: webServer.ip ?? '10.0.0.10',
      currentProto: 'TCP', currentPort: 80,
      verdict: 'permit',
    }),
    log: {
      ja: `パケットがウェブサーバー（${webServer.label}）へ転送されました。`,
      en: `Packet forwarded to web server (${webServer.label}).`,
    },
    highlightPacketId: 'acl-http',
  }

  // 拒否されるリクエスト
  const req2 = pkt('acl-deny', 'generic', outside.id, fw.id, 0, {
    'Src': outside.ip ?? '203.0.113.5', 'Dst': dbServer.ip ?? '10.0.0.20',
    'Protocol': 'TCP', 'Dst Port': '3306', 'Attempt': 'DB Access from outside',
  })
  yield {
    state: empty(topology, [req2], 'check_deny', {
      rules: aclRules.map((r, i) => ({ ...r, matched: i === 2 })),
      currentSrc: outside.ip ?? '203.0.113.5',
      currentDst: dbServer.ip ?? '10.0.0.20',
      currentProto: 'TCP', currentPort: 3306,
    }),
    log: {
      ja: `DBアクセス試行（Dst=${dbServer.ip ?? '10.0.0.20'}:3306）。ルール1,2 不一致 → ルール3（deny TCP→:3306）にマッチ → 廃棄。`,
      en: `DB access attempt (Dst=${dbServer.ip ?? '10.0.0.20'}:3306). Rules 1,2 no match → Rule 3 (deny TCP port 3306) matches → Dropped.`,
    },
    highlightPacketId: 'acl-deny',
  }

  yield {
    state: empty(topology, [], 'denied', {
      rules: aclRules.map((r, i) => ({ ...r, matched: i === 2 })),
      currentSrc: outside.ip ?? '203.0.113.5',
      currentDst: dbServer.ip ?? '10.0.0.20',
      currentProto: 'TCP', currentPort: 3306,
      verdict: 'deny',
    }),
    log: {
      ja: 'パケット廃棄。ステートフルファイアウォールでは確立済みセッションの戻りパケットは自動的に許可（コネクショントラッキング）。ACLは一般に境界防御の第一層として機能する。',
      en: 'Packet dropped. Stateful firewalls auto-permit return traffic for established sessions (connection tracking). ACL serves as the first layer of perimeter defense.',
    },
  }
}

// ---- TLS 1.3ハンドシェイク ----

export function* tlsHandshakeSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'overview'),
    log: {
      ja: 'TLS（Transport Layer Security）1.3: HTTPS・メール・VPN などで使われる暗号化プロトコル。1-RTT（初回）または 0-RTT（再接続）でハンドシェイクが完了する。TLS 1.2 より大幅に高速化。',
      en: 'TLS 1.3: Encryption protocol for HTTPS, email, VPN, etc. Completes handshake in 1-RTT (first connect) or 0-RTT (reconnect). Significantly faster than TLS 1.2.',
    },
  }

  const ch = pkt('tls-ch', 'tls_client_hello', client.id, server.id, 0, {
    'Message': 'ClientHello',
    'TLS Version': '1.3', 'Random': '28-byte nonce',
    'Cipher Suites': 'TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256',
    'Supported Groups': 'x25519, P-256',
    'Key Share': 'x25519 public key (32 bytes)',
    'SNI': 'example.com',
  })
  yield {
    state: empty(topology, [ch], 'client_hello'),
    log: {
      ja: `${client.label} が ClientHello を送信。対応暗号スイート・鍵共有（ECDHE x25519公開鍵）・SNI（Server Name Indication）を一緒に送る。TLS 1.3 では最初から鍵共有情報を送ることで 1-RTT を実現。`,
      en: `${client.label} sends ClientHello with supported cipher suites, key share (ECDHE x25519 public key), and SNI. TLS 1.3 includes key share in first message for 1-RTT.`,
    },
    highlightPacketId: 'tls-ch',
  }

  const sh = pkt('tls-sh', 'tls_server_hello', server.id, client.id, 0, {
    'Message': 'ServerHello + (Certificate + CertificateVerify + Finished)',
    'Chosen Cipher': 'TLS_AES_256_GCM_SHA384',
    'Key Share': 'Server x25519 public key',
    'Certificate': 'example.com.crt (RSA/ECDSA signed)',
    'Status': 'Encrypted from here',
  })
  yield {
    state: empty(topology, [sh], 'server_hello'),
    log: {
      ja: `${server.label} が ServerHello を返信（暗号スイート・サーバー鍵共有）。同じフライトで Certificate・CertificateVerify・Finished も送信。ここからサーバー→クライアント方向は暗号化済み。`,
      en: `${server.label} replies ServerHello (cipher suite + server key share). Also sends Certificate, CertificateVerify, Finished in same flight. Server→client encrypted from here.`,
    },
    highlightPacketId: 'tls-sh',
  }

  yield {
    state: empty(topology, [], 'key_derivation'),
    log: {
      ja: '鍵導出: 両者がECDHE共有秘密を計算 → ハッシュ関数（HKDF-SHA384）でセッション鍵を導出。前方秘匿性（PFS）: セッション鍵が漏れても過去の通信は解読不可。',
      en: 'Key derivation: Both compute ECDHE shared secret → derive session key via HKDF-SHA384. Perfect Forward Secrecy (PFS): leaked session key cannot decrypt past sessions.',
    },
  }

  const fin = pkt('tls-fin', 'tls_finished', client.id, server.id, 0, {
    'Message': 'Finished', 'Verify Data': 'HMAC of all handshake messages',
  })
  yield {
    state: empty(topology, [fin], 'finished'),
    log: {
      ja: `${client.label} が Finished メッセージ（ハンドシェイク全体のHMAC）を送信してハンドシェイク完了。以降のアプリケーションデータは AES-256-GCM で暗号化・認証される。`,
      en: `${client.label} sends Finished (HMAC of entire handshake). Handshake complete. Application data encrypted and authenticated with AES-256-GCM.`,
    },
    highlightPacketId: 'tls-fin',
  }

  const data = pkt('tls-data', 'tls_data', client.id, server.id, 0, {
    'Content': 'Encrypted HTTP/1.1 request',
    'Encryption': 'AES-256-GCM', 'Auth Tag': '16 bytes',
  })
  yield {
    state: empty(topology, [data], 'encrypted_data'),
    log: {
      ja: '暗号化されたアプリケーションデータ（例: HTTPS リクエスト）を送受信。TLS レコードはフラグメント最大16KB。GCM で暗号化+認証を同時に行う（AEAD）。',
      en: 'Encrypted application data (e.g. HTTPS request) exchanged. TLS records max 16KB. GCM provides encryption+authentication simultaneously (AEAD).',
    },
    highlightPacketId: 'tls-data',
  }
}

// ---- ARP詐称（ARP Spoofing）攻撃デモ ----

export function* arpSpoofingSimulator(topology: Topology): NetworkStepGenerator {
  const victim = topology.nodes.find(n => n.id === 'victim') ?? topology.nodes.find(n => n.id === 'host1') ?? topology.nodes[0]!
  const attacker = topology.nodes.find(n => n.id === 'attacker') ?? topology.nodes.find(n => n.id === 'host2') ?? topology.nodes[1]!
  const gateway = topology.nodes.find(n => n.type === 'router') ?? topology.nodes.find(n => n.id === 'gw') ?? topology.nodes[2] ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'normal'),
    log: {
      ja: '正常状態: 被害者（Victim）のARPテーブルに正しいゲートウェイのMACが登録されている。Victim → Internet の通信はゲートウェイを経由。',
      en: 'Normal: Victim\'s ARP table has correct gateway MAC. Victim → Internet traffic routes through gateway.',
    },
  }

  // 攻撃者が偽ARPリプライをブロードキャスト
  const fakeArp1 = pkt('spoof-1', 'arp_reply', attacker.id, victim.id, 0, {
    'Opcode': '2 (Reply - UNSOLICITED)', 'Sender MAC': attacker.mac ?? 'CC:CC:CC:CC:CC:CC',
    'Sender IP': gateway.ip ?? '192.168.1.1',
    'Target MAC': victim.mac ?? 'AA:AA:AA:AA:AA:AA',
    'Note': '⚠ Fake! Attacker claims to be the gateway.',
  })
  yield {
    state: empty(topology, [fakeArp1], 'fake_arp'),
    log: {
      ja: `攻撃者（${attacker.label}）が偽の Gratuitous ARP Reply を送信: 「私のMACは ${attacker.mac ?? 'CC:CC:CC:CC:CC:CC'} で、IPは ${gateway.ip ?? '192.168.1.1'}（ゲートウェイIP）です」。被害者のARPテーブルを上書き。`,
      en: `Attacker (${attacker.label}) sends forged Gratuitous ARP Reply: "My MAC is ${attacker.mac ?? 'CC:CC:CC:CC:CC:CC'}, IP is ${gateway.ip ?? '192.168.1.1'} (gateway IP)." Overwrites victim's ARP table.`,
    },
    highlightPacketId: 'spoof-1',
  }

  const spoofArpTable: Record<string, Array<{ ip: string; mac: string }>> = {
    [victim.id]: [{ ip: gateway.ip ?? '192.168.1.1', mac: attacker.mac ?? 'CC:CC:CC:CC:CC:CC' }],
  }

  yield {
    state: { topology, packets: [], arpTables: spoofArpTable, routingTables: {}, macTables: {}, activeOsiLayer: null, capsuleLayers: [], phase: 'table_poisoned' },
    log: {
      ja: `被害者のARPテーブルが汚染: ${gateway.ip ?? '192.168.1.1'} → ${attacker.mac ?? 'CC:CC:CC:CC:CC:CC'}（本来は ${gateway.mac ?? 'BB:BB:BB:BB:BB:BB'}）。以降の通信は攻撃者を経由する（MITM）。`,
      en: `Victim's ARP table poisoned: ${gateway.ip ?? '192.168.1.1'} → ${attacker.mac ?? 'CC:CC:CC:CC:CC:CC'} (should be ${gateway.mac ?? 'BB:BB:BB:BB:BB:BB'}). All traffic now routes through attacker (MITM).`,
    },
  }

  const intercepted = pkt('mitm-1', 'http_request', victim.id, attacker.id, 0.5, {
    'Original Dst': gateway.ip ?? '192.168.1.1', 'Actual Dst MAC': attacker.mac ?? 'CC:CC:CC:CC:CC:CC',
    'Status': 'Intercepted by attacker',
  })
  yield {
    state: { topology, packets: [intercepted], arpTables: spoofArpTable, routingTables: {}, macTables: {}, activeOsiLayer: null, capsuleLayers: [], phase: 'intercepted' },
    log: {
      ja: '被害者の全トラフィックが攻撃者を経由。攻撃者は平文トラフィックを盗聴・改ざんしてから本物のゲートウェイへ転送（Man-in-the-Middle）。',
      en: 'All victim\'s traffic routed through attacker. Attacker can sniff/modify plaintext traffic before forwarding to real gateway (Man-in-the-Middle).',
    },
    highlightPacketId: 'mitm-1',
  }

  yield {
    state: empty(topology, [], 'defense'),
    log: {
      ja: '対策: ① Dynamic ARP Inspection（DAI）: スイッチが DHCP Snooping テーブルと照合して偽ARPを廃棄。② スタティックARPエントリ（重要サーバー）。③ TLS/HTTPS で暗号化（MITM対策の第二層）。',
      en: 'Defenses: ① Dynamic ARP Inspection (DAI): Switch discards ARP not matching DHCP Snooping table. ② Static ARP entries (critical servers). ③ TLS/HTTPS (second layer MITM defense).',
    },
  }
}

// ---- SYNフラッド ----

export function* synFloodSimulator(topology: Topology): NetworkStepGenerator {
  const attacker = topology.nodes.find(n => n.id === 'attacker') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes.find(n => n.type !== 'host') ?? topology.nodes[1]!
  const normalClient = topology.nodes.find(n => n.id === 'client')

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'SYNフラッド攻撃: TCP の3ウェイハンドシェイクを悪用した DoS/DDoS 攻撃。攻撃者が偽の送信元IP で大量の SYN を送信し、サーバーの接続キュー（SYN-RECEIVED 状態）を枯渇させる。',
      en: 'SYN flood: DoS/DDoS exploiting TCP 3-way handshake. Attacker sends many SYNs with spoofed source IPs, exhausting server\'s connection queue (SYN-RECEIVED state).',
    },
  }

  const synPackets: PacketOnLink[] = Array.from({ length: 5 }, (_, i) => ({
    id: `syn-flood-${i}-link`,
    packet: {
      id: `syn-flood-${i}`,
      type: 'tcp_syn' as const,
      header: {
        srcIp: `1.2.3.${i}`,
        dstIp: server.ip ?? '10.0.0.10',
        srcPort: 10000 + i * 1000,
        dstPort: 80,
        flags: ['SYN'],
        extras: { 'Note': 'Spoofed source IP' },
      },
    },
    fromNodeId: attacker.id, toNodeId: server.id,
    progress: Math.random() * 0.8, broadcast: false,
  }))

  yield {
    state: empty(topology, synPackets, 'flooding'),
    log: {
      ja: `${attacker.label} が毎秒数万の偽 SYN を送信（送信元IPはランダムに詐称）。${server.label} は SYN-ACK を返すが、偽IPには届かないため ACK が返らず接続が半開き（Half-open）のままになる。`,
      en: `${attacker.label} sends tens of thousands of spoofed SYNs per second. ${server.label} replies SYN-ACK to spoofed IPs, which never respond → half-open connections fill queue.`,
    },
  }

  yield {
    state: empty(topology, [], 'exhaustion'),
    log: {
      ja: 'バックログキューが溢れると正常なクライアントの SYN も破棄される → サービス拒否（DoS）状態。接続キューのデフォルト上限は OS によって異なる（Linuxで通常128〜1024）。',
      en: 'When backlog queue fills, legitimate SYNs are also dropped → Denial of Service. Default queue limit varies by OS (Linux: typically 128–1024).',
    },
  }

  yield {
    state: empty(topology, [], 'syn_cookies'),
    log: {
      ja: 'SYN Cookie 対策（RFC 4987）: サーバーが SYN-ACK の初期 SEQ 番号を暗号ハッシュで生成し、接続状態を保存しない。ACK を受け取った時だけ接続を確立。バックログキューを消費しない。',
      en: 'SYN Cookie defense (RFC 4987): Server generates initial SEQ in SYN-ACK as cryptographic hash, stores no state. Only allocates connection on receiving valid ACK. No backlog consumed.',
    },
  }

  yield {
    state: empty(topology, [], 'other_defenses'),
    log: {
      ja: 'その他の対策: ① IP レート制限（iptables -m limit）。② ファイアウォールでのしきい値検知と遮断。③ DDoS 緩和サービス（Cloudflare・AWS Shield）。④ Anycast でトラフィックを分散。',
      en: 'Other defenses: ① IP rate limiting (iptables -m limit). ② Firewall threshold detection and blocking. ③ DDoS mitigation services (Cloudflare, AWS Shield). ④ Anycast to distribute traffic.',
    },
  }

  if (normalClient) {
    const legitSyn = pkt('legit-syn', 'tcp_syn', normalClient.id, server.id, 0.5, {
      'Status': 'Legitimate request - BLOCKED by exhausted queue',
    })
    yield {
      state: empty(topology, [legitSyn], 'collateral'),
      log: {
        ja: `正規のクライアント（${normalClient.label}）からの SYN も接続キューが満杯で廃棄。これがDoS（サービス妨害）。SYN Cookie があれば正規クライアントは通過できる。`,
        en: `Legitimate client (${normalClient.label}) SYN also dropped due to full queue. This is DoS. With SYN Cookie, legitimate clients still connect.`,
      },
      highlightPacketId: 'legit-syn',
    }
  }
}
