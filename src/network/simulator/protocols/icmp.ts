// ICMP/pingシミュレーター
// Echo Request → Echo Reply の往復と、TTL 減算・Time Exceeded のシナリオを表現する

import type { NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet } from '../types'

function emptyState(topology: Topology, packets: PacketOnLink[], phase: string): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
  }
}

function makeIcmpReq(id: string, srcMac: string, dstMac: string, srcIp: string, dstIp: string, ttl: number, seq: number): Packet {
  return {
    id,
    type: 'icmp_request',
    header: {
      srcMac, dstMac,
      etherType: '0x0800 (IPv4)',
      srcIp, dstIp, ttl,
      protocol: '1 (ICMP)',
      extras: {
        'ICMP Type': '8 (Echo Request)',
        'ICMP Code': '0',
        'Sequence': String(seq),
        'Identifier': '0x1234',
      },
    },
  }
}

function makeIcmpReply(id: string, srcMac: string, dstMac: string, srcIp: string, dstIp: string, ttl: number, seq: number): Packet {
  return {
    id,
    type: 'icmp_reply',
    header: {
      srcMac, dstMac,
      etherType: '0x0800 (IPv4)',
      srcIp, dstIp, ttl,
      protocol: '1 (ICMP)',
      extras: {
        'ICMP Type': '0 (Echo Reply)',
        'ICMP Code': '0',
        'Sequence': String(seq),
        'Identifier': '0x1234',
      },
    },
  }
}

function makeTimeExceeded(id: string, srcIp: string, dstIp: string): Packet {
  return {
    id,
    type: 'icmp_time_exceeded',
    header: {
      srcIp, dstIp,
      protocol: '1 (ICMP)',
      extras: {
        'ICMP Type': '11 (Time Exceeded)',
        'ICMP Code': '0 (TTL exceeded in transit)',
      },
    },
  }
}

export function* icmpSimulator(topology: Topology): NetworkStepGenerator {
  const host1  = topology.nodes.find(n => n.id === 'host1')!
  const router = topology.nodes.find(n => n.id === 'router1')!
  const host2  = topology.nodes.find(n => n.id === 'host2')!

  // ARPが解決済みで直接通信できる前提
  yield {
    state: emptyState(topology, [], 'init'),
    log: {
      ja: `${host1.label} が ${host2.ip} へ ping（ICMP Echo Request）を送信します。TTL=64`,
      en: `${host1.label} sends a ping (ICMP Echo Request) to ${host2.ip}. TTL=64`,
    },
  }

  // host1 → router（progress=0: host1出発）
  // 同じ PacketOnLink.id を使うことでアニメーションが連続する
  const req1: PacketOnLink = {
    id: 'icmp-req-link',
    packet: makeIcmpReq('icmp-req', host1.mac!, router.mac!, host1.ip!, host2.ip!, 64, 1),
    fromNodeId: host1.id,
    toNodeId: router.id,
    progress: 0,
    broadcast: false,
  }
  yield {
    state: emptyState(topology, [req1], 'req_to_router'),
    log: {
      ja: `ICMP Echo Request がルーターへ向かっています（TTL=64）。`,
      en: `ICMP Echo Request heading to router (TTL=64).`,
    },
    highlightPacketId: 'icmp-req',
  }

  // ルーターでTTL減算→転送（progress=0: ルーター出発。同IDなのでhost1→routerのアニメーションが走る）
  const req2: PacketOnLink = {
    id: 'icmp-req-link',
    packet: makeIcmpReq('icmp-req', router.mac!, host2.mac!, host1.ip!, host2.ip!, 63, 1),
    fromNodeId: router.id,
    toNodeId: host2.id,
    progress: 0,
    broadcast: false,
  }
  yield {
    state: emptyState(topology, [req2], 'req_at_router'),
    log: {
      ja: `ルーターがパケットを転送。TTL を 1 減算（64→63）してから ${host2.label} へ送出します。`,
      en: `Router forwards the packet, decrementing TTL by 1 (64→63) before forwarding to ${host2.label}.`,
    },
    highlightPacketId: 'icmp-req',
  }

  // host2到達（progress=1: router→host2のアニメーションが走る）
  const req3: PacketOnLink = { ...req2, progress: 1 }
  yield {
    state: emptyState(topology, [req3], 'req_arrived'),
    log: {
      ja: `${host2.label} が ICMP Echo Request を受信しました。Echo Reply を返します。`,
      en: `${host2.label} received ICMP Echo Request. Sending Echo Reply.`,
    },
  }

  // Reply: host2 → router（progress=0: host2出発）
  const rep1: PacketOnLink = {
    id: 'icmp-rep-link',
    packet: makeIcmpReply('icmp-reply', host2.mac!, router.mac!, host2.ip!, host1.ip!, 64, 1),
    fromNodeId: host2.id,
    toNodeId: router.id,
    progress: 0,
    broadcast: false,
  }
  yield {
    state: emptyState(topology, [rep1], 'reply_to_router'),
    log: {
      ja: `ICMP Echo Reply がルーターへ向かっています（TTL=64）。`,
      en: `ICMP Echo Reply heading back to router (TTL=64).`,
    },
    highlightPacketId: 'icmp-reply',
  }

  // Reply: ルーター到達（progress=1: host2→routerのアニメーションが走る）
  yield {
    state: emptyState(topology, [{ ...rep1, progress: 1 }], 'reply_at_router'),
    log: {
      ja: `ICMP Echo Reply がルーターに到達。TTL を 1 減算（64→63）してから ${host1.label} へ転送します。`,
      en: `ICMP Echo Reply arrives at router. Decrementing TTL (64→63), forwarding to ${host1.label}.`,
    },
    highlightPacketId: 'icmp-reply',
  }

  // Reply: router → host1（progress=1: router→host1のアニメーションが走る）
  const rep2: PacketOnLink = {
    id: 'icmp-rep-link',
    packet: makeIcmpReply('icmp-reply', router.mac!, host1.mac!, host2.ip!, host1.ip!, 63, 1),
    fromNodeId: router.id,
    toNodeId: host1.id,
    progress: 1,
    broadcast: false,
  }
  yield {
    state: emptyState(topology, [rep2], 'reply_arrived'),
    log: {
      ja: `${host1.label} が ICMP Echo Reply を受信。ping 成功！往復時間（RTT）を計測できます。`,
      en: `${host1.label} received ICMP Echo Reply. Ping successful! Round-trip time (RTT) is now measurable.`,
    },
    highlightPacketId: 'icmp-reply',
  }

  // TTL=1 のパケットがルーターで破棄されるケースを追加
  yield {
    state: emptyState(topology, [], 'ttl_demo'),
    log: {
      ja: `--- TTL=1 のパケットをルーターへ送信するケース ---`,
      en: `--- Sending a packet with TTL=1 to the router ---`,
    },
  }

  const ttlReq: PacketOnLink = {
    id: 'icmp-ttl-link',
    packet: makeIcmpReq('icmp-ttl', host1.mac!, router.mac!, host1.ip!, host2.ip!, 1, 2),
    fromNodeId: host1.id,
    toNodeId: router.id,
    progress: 1,
    broadcast: false,
  }
  yield {
    state: emptyState(topology, [ttlReq], 'ttl_at_router'),
    log: {
      ja: `TTL=1 のパケットがルーターに到達。TTL を 0 にする前に破棄し、ICMP Time Exceeded を返します。`,
      en: `Packet with TTL=1 arrives at router. TTL would reach 0, so router discards it and sends ICMP Time Exceeded.`,
    },
    highlightPacketId: 'icmp-ttl',
  }

  const timeExc: PacketOnLink = {
    id: 'icmp-te-link',
    packet: makeTimeExceeded('icmp-te', router.ip!, host1.ip!),
    fromNodeId: router.id,
    toNodeId: host1.id,
    progress: 1,
    broadcast: false,
  }
  yield {
    state: emptyState(topology, [timeExc], 'done'),
    log: {
      ja: `ICMP Time Exceeded が ${host1.label} に到達。traceroute はこのメカニズムを利用して経路を探索します。`,
      en: `ICMP Time Exceeded arrives at ${host1.label}. traceroute uses this mechanism to discover the route.`,
    },
    highlightPacketId: 'icmp-te',
  }
}
