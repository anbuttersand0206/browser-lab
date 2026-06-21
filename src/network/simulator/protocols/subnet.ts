// アドレッシング関連シミュレーター
// サブネット計算・CIDR・VLSM・NAT/NAPT・IPv6 の動作をステップで表現する

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, SubnetInfo,
} from '../types'

function empty(
  topology: Topology,
  packets: PacketOnLink[] = [],
  phase = 'info',
  subnetInfo?: SubnetInfo,
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
    subnetInfo,
  }
}

function pkt(
  id: string,
  type: 'icmp_request' | 'icmp_reply' | 'igmp_report' | 'dhcp_discover' | 'generic',
  from: string,
  to: string,
  progress: number,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

function makePacket(
  id: string,
  type: 'generic' | 'http_request' | 'http_response' | 'icmp_request',
  srcIp: string,
  dstIp: string,
  extras?: Record<string, string>,
): Packet {
  return { id, type, header: { srcIp, dstIp, extras } }
}

// ---- IPクラスフルアドレッシング ----

export function* ipClassfulSimulator(topology: Topology): NetworkStepGenerator {
  const host = topology.nodes.find(n => n.type === 'host') ?? topology.nodes[0]!
  const rtr  = topology.nodes.find(n => n.type === 'router') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [pkt('ca', 'icmp_request', host.id, rtr.id, 0, {
      'Class': 'A', 'Leading bits': '0xxxxxxx', 'Src IP example': '10.0.0.1', 'Network/Host bits': '8/24',
    })], 'classA'),
    log: {
      ja: 'クラスA: 先頭ビット=0。ネットワーク部8bit・ホスト部24bit。範囲 1.0.0.0〜126.0.0.0。大規模組織向け（最大1,677万台）',
      en: 'Class A: leading bit=0. 8-bit network, 24-bit host. Range 1.0.0.0–126.0.0.0. For large orgs (up to 16.7M hosts).',
    },
    highlightPacketId: 'ca',
  }
  yield {
    state: empty(topology, [pkt('cb', 'icmp_request', host.id, rtr.id, 0, {
      'Class': 'B', 'Leading bits': '10xxxxxx', 'Src IP example': '172.16.0.1', 'Network/Host bits': '16/16',
    })], 'classB'),
    log: {
      ja: 'クラスB: 先頭2ビット=10。ネットワーク部16bit・ホスト部16bit。範囲 128.0.0.0〜191.255.0.0。中規模組織向け（最大65,534台）',
      en: 'Class B: leading bits=10. 16-bit network, 16-bit host. Range 128.0.0.0–191.255.0.0. Mid-size orgs (up to 65,534 hosts).',
    },
    highlightPacketId: 'cb',
  }
  yield {
    state: empty(topology, [pkt('cc', 'icmp_request', host.id, rtr.id, 0, {
      'Class': 'C', 'Leading bits': '110xxxxx', 'Src IP example': '192.168.1.1', 'Network/Host bits': '24/8',
    })], 'classC'),
    log: {
      ja: 'クラスC: 先頭3ビット=110。ネットワーク部24bit・ホスト部8bit。範囲 192.0.0.0〜223.255.255.0。小規模組織向け（最大254台）',
      en: 'Class C: leading bits=110. 24-bit network, 8-bit host. Range 192.0.0.0–223.255.255.0. Small orgs (up to 254 hosts).',
    },
    highlightPacketId: 'cc',
  }
  yield {
    state: empty(topology, [pkt('cd', 'igmp_report', host.id, rtr.id, 0, {
      'Class': 'D', 'Leading bits': '1110xxxx', 'Range': '224.0.0.0–239.255.255.255', 'Use': 'Multicast only',
    })], 'classD'),
    log: {
      ja: 'クラスD: 先頭4ビット=1110。224.0.0.0〜239.255.255.255。マルチキャスト専用（ホスト割り当て不可）',
      en: 'Class D: leading bits=1110. 224.0.0.0–239.255.255.255. Multicast only (no host assignment).',
    },
    highlightPacketId: 'cd',
  }
  yield {
    state: empty(topology, [pkt('ce', 'generic', host.id, rtr.id, 0, {
      'Class': 'E', 'Leading bits': '1111xxxx', 'Range': '240.0.0.0–255.255.255.255', 'Use': 'Experimental / Reserved',
    })], 'classE'),
    log: {
      ja: 'クラスE: 先頭4ビット=1111。240.0.0.0〜255.255.255.255。実験・予約用。クラスフルは1981年のRFC 791が基礎。CIDRによりほぼ廃止された。',
      en: 'Class E: leading bits=1111. 240.0.0.0–255.255.255.255. Experimental/reserved. Classful is based on RFC 791 (1981) and largely superseded by CIDR.',
    },
    highlightPacketId: 'ce',
  }
  yield {
    state: empty(topology, [pkt('priv', 'icmp_request', host.id, rtr.id, 0, {
      'RFC': '1918', 'Private ranges': '10/8, 172.16/12, 192.168/16', 'Internet routable': 'No – NAT required',
    })], 'private'),
    log: {
      ja: 'プライベートアドレス（RFC 1918）: 10.0.0.0/8・172.16.0.0/12・192.168.0.0/16。インターネットにルーティングされない。NATで変換して外部通信する。',
      en: 'Private addresses (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Not routed on internet. Use NAT for external access.',
    },
    highlightPacketId: 'priv',
  }
}

// ---- CIDRとサブネッティング ----

export function* subnettingSimulator(topology: Topology): NetworkStepGenerator {
  const host = topology.nodes.find(n => n.type === 'host') ?? topology.nodes[0]!
  const rtr  = topology.nodes.find(n => n.type === 'router') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [pkt('sub-init', 'icmp_request', host.id, rtr.id, 0, {
      'Network': '192.168.1.0/24', 'Mask': '255.255.255.0', 'Host range': '192.168.1.1–.254',
    })], 'init', {
      address: '192.168.1.0', prefix: 24,
      networkAddr: '192.168.1.0', broadcastAddr: '192.168.1.255',
      firstHost: '192.168.1.1', lastHost: '192.168.1.254', totalHosts: 254,
    }),
    log: {
      ja: '192.168.1.0/24 のネットワーク。サブネットマスク 255.255.255.0。ホストアドレス 192.168.1.1〜.254（254台）',
      en: 'Network 192.168.1.0/24. Subnet mask 255.255.255.0. Host range: 192.168.1.1–.254 (254 hosts).',
    },
    highlightPacketId: 'sub-init',
  }
  yield {
    state: empty(topology, [pkt('sub-25', 'icmp_request', host.id, rtr.id, 0, {
      'Split': '/24 → 2× /25', 'Subnet①': '192.168.1.0/25 (.0–.127)', 'Subnet②': '192.168.1.128/25 (.128–.255)',
    })], 'divide2', {
      address: '192.168.1.0', prefix: 25,
      networkAddr: '192.168.1.0', broadcastAddr: '192.168.1.127',
      firstHost: '192.168.1.1', lastHost: '192.168.1.126', totalHosts: 126,
    }),
    log: {
      ja: '/25 で 2 分割: サブネット① 192.168.1.0/25（.0〜.127）とサブネット② 192.168.1.128/25（.128〜.255）。各126台。',
      en: 'Split to /25: Subnet①192.168.1.0/25(.0–.127) and Subnet②192.168.1.128/25(.128–.255). 126 hosts each.',
    },
    highlightPacketId: 'sub-25',
  }
  yield {
    state: empty(topology, [pkt('sub-26', 'icmp_request', rtr.id, host.id, 0, {
      'Split': '/24 → 4× /26', 'Subnets': '.0/26, .64/26, .128/26, .192/26', 'Hosts each': '62',
    })], 'divide4', {
      address: '192.168.1.0', prefix: 26,
      networkAddr: '192.168.1.0', broadcastAddr: '192.168.1.63',
      firstHost: '192.168.1.1', lastHost: '192.168.1.62', totalHosts: 62,
    }),
    log: {
      ja: '/26 で 4 分割: .0/26・.64/26・.128/26・.192/26。各62台。借りるビット数=2→サブネット数2²=4個。',
      en: '/26 splits into 4: .0/26, .64/26, .128/26, .192/26. 62 hosts each. Borrowed bits=2 → 2²=4 subnets.',
    },
    highlightPacketId: 'sub-26',
  }
  yield {
    state: empty(topology, [], 'math'),
    log: {
      ja: 'サブネット計算の公式: ホスト数 = 2^ホストビット数 - 2（ネットワーク/ブロードキャストアドレス除く）。サブネット数 = 2^借用ビット数。',
      en: 'Formula: Hosts = 2^(host bits) - 2 (exclude network/broadcast). Subnets = 2^(borrowed bits).',
    },
  }
  yield {
    state: empty(topology, [], 'binary'),
    log: {
      ja: '例: 192.168.1.0/26 → 2進数 11000000.10101000.00000001.00[000000]。[] 内がホスト部（6bit）。ネットワーク部はマスクで1が立っている部分。',
      en: 'e.g. 192.168.1.0/26 → binary: 11000000.10101000.00000001.00[000000]. [] is host part (6 bits). Network part is where mask=1.',
    },
  }
}

// ---- VLSM（可変長サブネットマスク） ----

export function* vlsmSimulator(topology: Topology): NetworkStepGenerator {
  const host = topology.nodes.find(n => n.type === 'host') ?? topology.nodes[0]!
  const rtr  = topology.nodes.find(n => n.type === 'router') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'init'),
    log: {
      ja: 'VLSM（Variable Length Subnet Masking）: 同一アドレス空間内で異なるサブネットマスク長を混在させる技術。アドレス空間を無駄なく使える。',
      en: 'VLSM: Use different prefix lengths within the same address space to minimize waste.',
    },
  }
  yield {
    state: empty(topology, [pkt('vlsm-req', 'icmp_request', host.id, rtr.id, 0, {
      'Method': 'VLSM (Best-fit)', 'Space': '10.0.0.0/24', 'Depts': 'A=100, B=50, C=25, WAN=2',
    })], 'req', {
      address: '10.0.0.0', prefix: 24,
      networkAddr: '10.0.0.0', broadcastAddr: '10.0.0.255',
      firstHost: '10.0.0.1', lastHost: '10.0.0.254', totalHosts: 254,
    }),
    log: {
      ja: '要件: 部署A=100台、部署B=50台、部署C=25台、WAN=2台。10.0.0.0/24 を VLSM で割り付ける。',
      en: 'Requirements: Dept-A=100, Dept-B=50, Dept-C=25, WAN=2. Allocate 10.0.0.0/24 with VLSM.',
    },
    highlightPacketId: 'vlsm-req',
  }
  yield {
    state: empty(topology, [pkt('vlsm-a', 'icmp_request', host.id, rtr.id, 0, {
      'Dept A': '10.0.0.0/25', 'Hosts': '126 (need 100)', 'Remaining': '10.0.0.128–255',
    })], 'deptA', {
      address: '10.0.0.0', prefix: 25,
      networkAddr: '10.0.0.0', broadcastAddr: '10.0.0.127',
      firstHost: '10.0.0.1', lastHost: '10.0.0.126', totalHosts: 126,
    }),
    log: {
      ja: '部署A（100台）→ 10.0.0.0/25（126台収容）。残り: 10.0.0.128〜255。',
      en: 'Dept-A (100 hosts) → 10.0.0.0/25 (fits 126). Remaining: 10.0.0.128–255.',
    },
    highlightPacketId: 'vlsm-a',
  }
  yield {
    state: empty(topology, [pkt('vlsm-b', 'icmp_request', rtr.id, host.id, 0, {
      'Dept B': '10.0.0.128/26', 'Hosts': '62 (need 50)', 'Remaining': '10.0.0.192–255',
    })], 'deptB', {
      address: '10.0.0.128', prefix: 26,
      networkAddr: '10.0.0.128', broadcastAddr: '10.0.0.191',
      firstHost: '10.0.0.129', lastHost: '10.0.0.190', totalHosts: 62,
    }),
    log: {
      ja: '部署B（50台）→ 10.0.0.128/26（62台収容）。残り: 10.0.0.192〜255。',
      en: 'Dept-B (50 hosts) → 10.0.0.128/26 (fits 62). Remaining: 10.0.0.192–255.',
    },
    highlightPacketId: 'vlsm-b',
  }
  yield {
    state: empty(topology, [pkt('vlsm-c', 'icmp_request', host.id, rtr.id, 0, {
      'Dept C': '10.0.0.192/27', 'Hosts': '30 (need 25)', 'Remaining': '10.0.0.224–255',
    })], 'deptC', {
      address: '10.0.0.192', prefix: 27,
      networkAddr: '10.0.0.192', broadcastAddr: '10.0.0.223',
      firstHost: '10.0.0.193', lastHost: '10.0.0.222', totalHosts: 30,
    }),
    log: {
      ja: '部署C（25台）→ 10.0.0.192/27（30台収容）。残り: 10.0.0.224〜255。',
      en: 'Dept-C (25 hosts) → 10.0.0.192/27 (fits 30). Remaining: 10.0.0.224–255.',
    },
    highlightPacketId: 'vlsm-c',
  }
  yield {
    state: empty(topology, [pkt('vlsm-wan', 'generic', host.id, rtr.id, 0.5, {
      'WAN P2P': '10.0.0.224/30', 'Hosts': '2', 'IPv4 saved': '252 addresses vs classful approach',
    })], 'wan', {
      address: '10.0.0.224', prefix: 30,
      networkAddr: '10.0.0.224', broadcastAddr: '10.0.0.227',
      firstHost: '10.0.0.225', lastHost: '10.0.0.226', totalHosts: 2,
    }),
    log: {
      ja: 'WAN（P2Pリンク=2台）→ 10.0.0.224/30（2台収容）。クラスフルでは /24 を 4 つ使っていたところ、VLSMで 1 つの /24 に収めた。',
      en: 'WAN (P2P=2) → 10.0.0.224/30. With classful, you would need 4 separate /24s. VLSM fits all in one /24.',
    },
    highlightPacketId: 'vlsm-wan',
  }
}

// ---- NAT/NAPT ----

export function* natNaptSimulator(topology: Topology): NetworkStepGenerator {
  const natNode = topology.nodes.find(n => n.id === 'nat') ?? topology.nodes.find(n => n.type === 'router')!
  const client  = topology.nodes.find(n => n.id === 'client') ?? topology.nodes.find(n => n.type === 'host')!
  const internet = topology.nodes.find(n => n.id === 'internet') ?? topology.nodes.find(n => n.type === 'internet') ?? topology.nodes[2]!

  yield {
    state: empty(topology, [], 'init'),
    log: {
      ja: 'NAPT（Network Address Port Translation）: 複数のプライベートIPを1つのグローバルIPに変換する技術。ポート番号で各通信を識別する。',
      en: 'NAPT: Map multiple private IPs to one global IP using port numbers to distinguish each session.',
    },
  }

  // クライアント→NATルーター（progress=0: client出発）
  const req1: PacketOnLink = {
    id: 'nat-req-link',
    packet: makePacket('nat-req', 'http_request', '192.168.1.10', '203.0.113.80', {
      'Src Port': '50000', 'Dst Port': '80', 'Protocol': 'TCP',
    }),
    fromNodeId: client.id, toNodeId: natNode.id, progress: 0, broadcast: false,
  }
  yield {
    state: empty(topology, [req1], 'req_to_nat'),
    log: {
      ja: `${client.label}（192.168.1.10:50000）が 203.0.113.80:80 へ HTTP リクエスト送信。まずNATルーターへ到達。`,
      en: `${client.label} (192.168.1.10:50000) sends HTTP request to 203.0.113.80:80. Arrives at NAT router first.`,
    },
    highlightPacketId: 'nat-req',
  }

  // NATルーター到達（progress=1: client→natNodeのアニメーションが走る）
  yield {
    state: empty(topology, [{ ...req1, progress: 1 }], 'req_at_nat'),
    log: {
      ja: 'HTTPリクエストがNATルーターに到達。送信元IPとポートを変換します。',
      en: 'HTTP request arrives at NAT router. Translating source IP and port.',
    },
    highlightPacketId: 'nat-req',
  }

  yield {
    state: empty(topology, [], 'nat_translate'),
    log: {
      ja: 'NATルーターが変換テーブルに記録し、送信元を変換: 192.168.1.10:50000 → 203.0.113.1:8001。グローバルIPでインターネットへ転送。',
      en: 'NAT router records in translation table and rewrites src: 192.168.1.10:50000 → 203.0.113.1:8001. Forwards to internet with global IP.',
    },
  }

  // NATルーター→インターネット（progress=1: natNode→internetのアニメーションが走る。nat_translateで一旦クリアされるため新規パケット扱い）
  const req2: PacketOnLink = {
    id: 'nat-req-link',
    packet: makePacket('nat-req2', 'http_request', '203.0.113.1', '203.0.113.80', {
      'Src Port': '8001 (translated)', 'Dst Port': '80', 'Protocol': 'TCP',
    }),
    fromNodeId: natNode.id, toNodeId: internet.id, progress: 1, broadcast: false,
  }
  yield {
    state: empty(topology, [req2], 'req_to_internet'),
    log: {
      ja: '変換後パケット（送信元 203.0.113.1:8001）がインターネットへ送出。サーバーはグローバルIPにしか見えない。',
      en: 'Translated packet (src 203.0.113.1:8001) sent to internet. Server only sees the global IP.',
    },
    highlightPacketId: 'nat-req2',
  }

  // 応答パケット: インターネット→NATルーター（progress=0: internet出発）
  const rep1: PacketOnLink = {
    id: 'nat-rep-link',
    packet: makePacket('nat-rep', 'http_response', '203.0.113.80', '203.0.113.1', {
      'Src Port': '80', 'Dst Port': '8001', 'Status': '200 OK',
    }),
    fromNodeId: internet.id, toNodeId: natNode.id, progress: 0, broadcast: false,
  }
  yield {
    state: empty(topology, [rep1], 'rep_to_nat'),
    log: {
      ja: 'サーバーが 203.0.113.1:8001 へ応答。NATルーターがテーブルを逆引きして 192.168.1.10:50000 へ転送。',
      en: 'Server replies to 203.0.113.1:8001. NAT router reverse-looks up table and forwards to 192.168.1.10:50000.',
    },
    highlightPacketId: 'nat-rep',
  }

  // NATルーター到達（progress=1: internet→natNodeのアニメーションが走る）
  yield {
    state: empty(topology, [{ ...rep1, progress: 1 }], 'rep_at_nat'),
    log: {
      ja: 'レスポンスがNATルーターに到達。逆変換: 203.0.113.1:8001 → 192.168.1.10:50000。',
      en: 'Response arrives at NAT router. Reverse translation: 203.0.113.1:8001 → 192.168.1.10:50000.',
    },
    highlightPacketId: 'nat-rep',
  }

  // NATルーター→クライアント（progress=1: natNode→clientのアニメーションが走る）
  const rep2: PacketOnLink = {
    id: 'nat-rep-link',
    packet: makePacket('nat-rep2', 'http_response', '203.0.113.80', '192.168.1.10', {
      'Src Port': '80', 'Dst Port': '50000 (restored)', 'Status': '200 OK',
    }),
    fromNodeId: natNode.id, toNodeId: client.id, progress: 1, broadcast: false,
  }
  yield {
    state: empty(topology, [rep2], 'done'),
    log: {
      ja: `HTTP レスポンスが ${client.label} に届きました。NATテーブル: 192.168.1.10:50000 ↔ 203.0.113.1:8001。複数端末が同じグローバルIPを共有できる。`,
      en: `HTTP response delivered to ${client.label}. NAT table: 192.168.1.10:50000 ↔ 203.0.113.1:8001. Multiple hosts share one global IP.`,
    },
    highlightPacketId: 'nat-rep2',
  }
}

// ---- IPv6入門 ----

export function* ipv6Simulator(topology: Topology): NetworkStepGenerator {
  const host = topology.nodes.find(n => n.type === 'host') ?? topology.nodes[0]!
  const rtr  = topology.nodes.find(n => n.type === 'router') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [pkt('ipv6-addr', 'generic', host.id, rtr.id, 0, {
      'Version': 'IPv6', 'Bits': '128', 'Example': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    })], 'header'),
    log: {
      ja: 'IPv6アドレス: 128bit を 16bit×8グループ（コロン区切り16進数）で表記。例: 2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      en: 'IPv6 address: 128 bits in 8 groups of 16 bits (hex, colon-separated). e.g. 2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    },
    highlightPacketId: 'ipv6-addr',
  }
  yield {
    state: empty(topology, [pkt('ipv6-comp', 'generic', host.id, rtr.id, 0, {
      'Full': '2001:0db8:0000:0000:8a2e:0370:7334', 'Compressed': '2001:db8::8a2e:370:7334',
    })], 'compression'),
    log: {
      ja: '省略規則: ① 各グループの先頭0は省略可（0000→0）。② 連続する全0グループは :: に短縮（一か所のみ）。例: 2001:db8::8a2e:370:7334',
      en: 'Compression: ① Leading zeros per group omitted (0000→0). ② Consecutive all-zero groups replaced by :: (once only). e.g. 2001:db8::8a2e:370:7334',
    },
    highlightPacketId: 'ipv6-comp',
  }
  yield {
    state: empty(topology, [pkt('ipv6-ll', 'generic', host.id, rtr.id, 0, {
      'Loopback': '::1', 'Link-local': 'fe80::/10', 'Global unicast': '2000::/3',
    })], 'types'),
    log: {
      ja: '特殊アドレス: ループバック=::1（IPv4の127.0.0.1相当）。未指定=::（0.0.0.0相当）。リンクローカル=fe80::/10（自動設定）。グローバルユニキャスト=2000::/3。',
      en: 'Special: Loopback=::1 (≈127.0.0.1). Unspecified=:: (≈0.0.0.0). Link-local=fe80::/10 (auto-configured). Global unicast=2000::/3.',
    },
    highlightPacketId: 'ipv6-ll',
  }
  yield {
    state: empty(topology, [pkt('ipv6-hdr', 'generic', host.id, rtr.id, 0, {
      'Fixed header': '40 bytes', 'No Options field': 'Use extension headers', 'No checksum': 'Upper layer handles',
    })], 'header_fields'),
    log: {
      ja: 'IPv6ヘッダー（固定40バイト）: バージョン(4)・トラフィッククラス(8)・フローラベル(20)・ペイロード長(16)・次ヘッダー(8)・ホップ制限(8)・送信元(128)・宛先(128)。オプションは拡張ヘッダーで対応。',
      en: 'IPv6 header (fixed 40 bytes): Version(4), Traffic Class(8), Flow Label(20), Payload Length(16), Next Header(8), Hop Limit(8), Src(128), Dst(128). Options via extension headers.',
    },
    highlightPacketId: 'ipv6-hdr',
  }
  yield {
    state: empty(topology, [pkt('ipv6-slaac', 'icmp_reply', rtr.id, host.id, 0, {
      'Message': 'Router Advertisement (RA)', 'Prefix': '2001:db8::/64', 'SLAAC': 'EUI-64 from MAC → auto-config',
    })], 'slaac'),
    log: {
      ja: 'SLAAC（Stateless Address Autoconfiguration, RFC 4862）: ルーターアドバタイズメント(RA)でプレフィックスを受け取り、自分のMACアドレスからEUI-64でインターフェースIDを生成。DHCPなしでアドレスが設定される。',
      en: 'SLAAC (RFC 4862): Receive prefix from Router Advertisement (RA), generate Interface ID from MAC via EUI-64. Address configured without DHCP.',
    },
    highlightPacketId: 'ipv6-slaac',
  }
  yield {
    state: empty(topology, [pkt('ipv6-dual', 'generic', host.id, rtr.id, 0, {
      'Mode': 'Dual Stack', 'IPv4': '192.168.1.10', 'IPv6': '2001:db8::1', 'NAT64': 'IPv6-only → IPv4',
    })], 'transition'),
    log: {
      ja: '移行技術: デュアルスタック（IPv4+IPv6同時実装）・6to4トンネリング・NAT64（IPv6→IPv4変換）。IPv4枯渇への対応として現在も移行が続いている。',
      en: 'Transition: Dual stack (IPv4+IPv6 simultaneously), 6to4 tunneling, NAT64 (IPv6→IPv4). Migration continues as IPv4 exhaustion solution.',
    },
    highlightPacketId: 'ipv6-dual',
  }
}
