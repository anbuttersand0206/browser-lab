// DNSシミュレーター
// ブラウザ → リゾルバ → ルートDNS → TLD → 権威DNS の再帰クエリをステップで表現する

import type { NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet } from '../types'

function emptyState(topology: Topology, packets: PacketOnLink[], phase: string): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
  }
}

function makeQuery(id: string, srcIp: string, dstIp: string, name: string, type: string): Packet {
  return {
    id,
    type: 'dns_query',
    header: {
      srcIp, dstIp,
      protocol: '17 (UDP)',
      srcPort: 54321, dstPort: 53,
      extras: {
        'Transaction ID': '0x1A2B',
        'Flags': '0x0100 (Standard query, recursion desired)',
        'Questions': `${name} IN ${type}`,
      },
    },
  }
}

function makeResponse(id: string, srcIp: string, dstIp: string, name: string, answer: string): Packet {
  return {
    id,
    type: 'dns_response',
    header: {
      srcIp, dstIp,
      protocol: '17 (UDP)',
      srcPort: 53, dstPort: 54321,
      extras: {
        'Transaction ID': '0x1A2B',
        'Flags': '0x8180 (Standard query response, No error)',
        'Answers': `${name} IN A ${answer}`,
        'TTL': '300',
      },
    },
  }
}

function makeReferralResponse(id: string, srcIp: string, dstIp: string, authority: string): Packet {
  return {
    id,
    type: 'dns_response',
    header: {
      srcIp, dstIp,
      protocol: '17 (UDP)',
      srcPort: 53, dstPort: 54321,
      extras: {
        'Transaction ID': '0x1A2B',
        'Flags': '0x8100 (Referral, No error)',
        'Authority': authority,
      },
    },
  }
}

function link(packet: Packet, from: string, to: string, progress: number): PacketOnLink {
  return { id: packet.id + '-link', packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

export function* dnsSimulator(topology: Topology): NetworkStepGenerator {
  const client    = topology.nodes.find(n => n.id === 'client')!
  const resolver  = topology.nodes.find(n => n.id === 'resolver')!
  const rootDns   = topology.nodes.find(n => n.id === 'root_dns')!
  const tldDns    = topology.nodes.find(n => n.id === 'tld_dns')!
  const authDns   = topology.nodes.find(n => n.id === 'auth_dns')!
  const targetName = 'www.example.com'

  yield {
    state: emptyState(topology, [], 'init'),
    log: {
      ja: `ブラウザが ${targetName} を開こうとしています。まずキャッシュを確認…キャッシュなし。DNSリゾルバへクエリを送ります。`,
      en: `Browser is opening ${targetName}. Checking cache... no entry. Sending query to DNS resolver.`,
    },
  }

  // 1. client → resolver
  const q1 = makeQuery('q1', client.ip!, resolver.ip!, targetName, 'A')
  yield {
    state: emptyState(topology, [link(q1, client.id, resolver.id, 1)], 'q_to_resolver'),
    log: {
      ja: `クライアントがリゾルバ（${resolver.ip}）へクエリ: "${targetName} の IP アドレスを教えてください"`,
      en: `Client queries resolver (${resolver.ip}): "What is the IP of ${targetName}?"`,
    },
    highlightPacketId: 'q1',
  }

  // 2. resolver → root DNS
  const q2 = makeQuery('q2', resolver.ip!, rootDns.ip!, targetName, 'A')
  yield {
    state: emptyState(topology, [link(q2, resolver.id, rootDns.id, 1)], 'q_to_root'),
    log: {
      ja: `リゾルバがルートDNS（${rootDns.ip}）へ問い合わせ。ルートDNSは .com の TLD DNSサーバーを紹介します。`,
      en: `Resolver queries Root DNS (${rootDns.ip}). Root DNS refers to the .com TLD DNS server.`,
    },
    highlightPacketId: 'q2',
  }

  // 3. root DNS referral → resolver
  const r1 = makeReferralResponse('r1', rootDns.ip!, resolver.ip!, `com. IN NS ${tldDns.ip}`)
  yield {
    state: emptyState(topology, [link(r1, rootDns.id, resolver.id, 1)], 'root_referral'),
    log: {
      ja: `ルートDNS から委任応答: ".com の権威サーバーは ${tldDns.label}（${tldDns.ip}）です"`,
      en: `Root DNS referral: ".com authoritative server is ${tldDns.label} (${tldDns.ip})"`,
    },
    highlightPacketId: 'r1',
  }

  // 4. resolver → TLD DNS
  const q3 = makeQuery('q3', resolver.ip!, tldDns.ip!, targetName, 'A')
  yield {
    state: emptyState(topology, [link(q3, resolver.id, tldDns.id, 1)], 'q_to_tld'),
    log: {
      ja: `リゾルバが .com TLD DNS（${tldDns.ip}）へ問い合わせ。TLD DNS は example.com の権威DNSを紹介します。`,
      en: `Resolver queries .com TLD DNS (${tldDns.ip}). TLD DNS refers to example.com's authoritative DNS.`,
    },
    highlightPacketId: 'q3',
  }

  // 5. TLD DNS referral → resolver
  const r2 = makeReferralResponse('r2', tldDns.ip!, resolver.ip!, `example.com. IN NS ${authDns.ip}`)
  yield {
    state: emptyState(topology, [link(r2, tldDns.id, resolver.id, 1)], 'tld_referral'),
    log: {
      ja: `TLD DNS から委任応答: "example.com の権威サーバーは ${authDns.label}（${authDns.ip}）です"`,
      en: `TLD DNS referral: "example.com authoritative server is ${authDns.label} (${authDns.ip})"`,
    },
    highlightPacketId: 'r2',
  }

  // 6. resolver → auth DNS
  const q4 = makeQuery('q4', resolver.ip!, authDns.ip!, targetName, 'A')
  yield {
    state: emptyState(topology, [link(q4, resolver.id, authDns.id, 1)], 'q_to_auth'),
    log: {
      ja: `リゾルバが権威DNS（${authDns.ip}）へ最終問い合わせ。権威DNSは実際のIPアドレスを知っています。`,
      en: `Resolver queries authoritative DNS (${authDns.ip}) — it knows the actual IP address.`,
    },
    highlightPacketId: 'q4',
  }

  // 7. auth DNS response → resolver
  const r3 = makeResponse('r3', authDns.ip!, resolver.ip!, targetName, '93.184.216.34')
  yield {
    state: emptyState(topology, [link(r3, authDns.id, resolver.id, 1)], 'auth_response'),
    log: {
      ja: `権威DNS から応答: "${targetName} の IP は 93.184.216.34、TTL=300秒"`,
      en: `Authoritative DNS responds: "${targetName} is 93.184.216.34, TTL=300 seconds"`,
    },
    highlightPacketId: 'r3',
  }

  // 8. resolver → client (with caching note)
  const r4 = makeResponse('r4', resolver.ip!, client.ip!, targetName, '93.184.216.34')
  yield {
    state: emptyState(topology, [link(r4, resolver.id, client.id, 1)], 'done'),
    log: {
      ja: `リゾルバがクライアントに返答: "${targetName} = 93.184.216.34"。リゾルバはこの結果を300秒間キャッシュします。次回は即座に返答できます。`,
      en: `Resolver responds to client: "${targetName} = 93.184.216.34". Resolver caches this for 300 seconds — next query gets an instant response.`,
    },
    highlightPacketId: 'r4',
  }
}
