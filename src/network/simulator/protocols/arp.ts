// ARPシミュレーター
// Broadcast→ターゲット返答→ARPテーブル更新 の流れをステップで表現する

import type { NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet } from '../types'

function buildState(
  topology: Topology,
  packets: PacketOnLink[],
  arpTables: Record<string, string[][]>,
  phase: string,
): NetworkState {
  const arpTablesFormatted: Record<string, Array<{ ip: string; mac: string }>> = {}
  for (const [nodeId, entries] of Object.entries(arpTables)) {
    arpTablesFormatted[nodeId] = entries.map(([ip, mac]) => ({ ip, mac }))
  }
  return {
    topology,
    packets,
    arpTables: arpTablesFormatted,
    routingTables: {},
    macTables: {},
    activeOsiLayer: null,
    capsuleLayers: [],
    phase,
  }
}

// ARPリクエストパケットを生成する
function makeArpReqPacket(id: string, srcMac: string, srcIp: string, targetIp: string): Packet {
  return {
    id,
    type: 'arp_request',
    header: {
      srcMac,
      dstMac: 'FF:FF:FF:FF:FF:FF',
      etherType: '0x0806 (ARP)',
      srcIp,
      dstIp: targetIp,
      extras: {
        'Opcode': '1 (Request)',
        'Sender MAC': srcMac,
        'Sender IP': srcIp,
        'Target MAC': '00:00:00:00:00:00 (Unknown)',
        'Target IP': targetIp,
      },
    },
  }
}

function makeArpReplyPacket(id: string, srcMac: string, srcIp: string, dstMac: string, dstIp: string): Packet {
  return {
    id,
    type: 'arp_reply',
    header: {
      srcMac,
      dstMac,
      etherType: '0x0806 (ARP)',
      srcIp,
      dstIp,
      extras: {
        'Opcode': '2 (Reply)',
        'Sender MAC': srcMac,
        'Sender IP': srcIp,
        'Target MAC': dstMac,
        'Target IP': dstIp,
      },
    },
  }
}

export function* arpSimulator(topology: Topology): NetworkStepGenerator {
  const nodes = topology.nodes
  const links = topology.links

  const host1 = nodes.find(n => n.id === 'host1')!
  const host2 = nodes.find(n => n.id === 'host2')!
  const sw    = nodes.find(n => n.id === 'sw1')

  const arpTables: Record<string, string[][]> = {
    host1: [],
    host2: [],
  }

  // step 0: 初期状態
  yield {
    state: buildState(topology, [], arpTables, 'init'),
    log: {
      ja: `${host1.label}（${host1.ip}）が ${host2.ip} の MAC アドレスを知りたい。ARP Request を送信します。`,
      en: `${host1.label} (${host1.ip}) wants to find the MAC address of ${host2.ip}. Sending ARP Request.`,
    },
  }

  // step 1: ブロードキャスト送信
  const reqPacket = makeArpReqPacket('arp-req', host1.mac!, host1.ip!, host2.ip!)
  const broadcastLinks = sw
    ? links.filter(l => l.from === host1.id || l.to === host1.id)
    : links.filter(l => l.from === host1.id || l.to === host1.id)

  const broadcastPackets: PacketOnLink[] = broadcastLinks.map((link, i) => ({
    id: `arp-req-${i}`,
    packet: reqPacket,
    fromNodeId: host1.id,
    toNodeId: link.from === host1.id ? link.to : link.from,
    progress: 0,
    broadcast: true,
  }))

  yield {
    state: buildState(topology, broadcastPackets, arpTables, 'request_sent'),
    log: {
      ja: `ARP Request をブロードキャスト送信（宛先 MAC: FF:FF:FF:FF:FF:FF）。同一セグメントの全ノードに届きます。`,
      en: `ARP Request broadcast (dst MAC: FF:FF:FF:FF:FF:FF). All nodes in the segment receive it.`,
    },
    highlightPacketId: 'arp-req',
  }

  // step 2: ブロードキャスト到達
  const arrivedPackets: PacketOnLink[] = broadcastPackets.map(p => ({ ...p, progress: 1 }))
  yield {
    state: buildState(topology, arrivedPackets, arpTables, 'request_received'),
    log: {
      ja: `全ノードが ARP Request を受信。${host2.ip} を持つ ${host2.label} のみが返答します。他のノードは無視します。`,
      en: `All nodes received the ARP Request. Only ${host2.label} (${host2.ip}) replies; others ignore it.`,
    },
  }

  // step 3: ARP Reply 送信
  const replyPacket = makeArpReplyPacket('arp-reply', host2.mac!, host2.ip!, host1.mac!, host1.ip!)
  const replyPackets: PacketOnLink[] = [{
    id: 'arp-reply-0',
    packet: replyPacket,
    fromNodeId: host2.id,
    toNodeId: sw?.id ?? host1.id,
    progress: 0,
    broadcast: false,
  }]

  yield {
    state: buildState(topology, replyPackets, arpTables, 'reply_sent'),
    log: {
      ja: `${host2.label} が ARP Reply を送信: 「私の MAC は ${host2.mac} です」（ユニキャスト）`,
      en: `${host2.label} sends ARP Reply: "My MAC is ${host2.mac}" (unicast)`,
    },
    highlightPacketId: 'arp-reply',
  }

  // step 4: Reply がhost1に到達
  const replyArrived: PacketOnLink[] = [{
    ...replyPackets[0],
    fromNodeId: sw?.id ?? host2.id,
    toNodeId: host1.id,
    progress: 1,
  }]

  yield {
    state: buildState(topology, replyArrived, arpTables, 'reply_arrived'),
    log: {
      ja: `ARP Reply が ${host1.label} に届きました。`,
      en: `ARP Reply arrived at ${host1.label}.`,
    },
    highlightPacketId: 'arp-reply',
  }

  // step 5: ARPテーブル更新
  arpTables.host1 = [[host2.ip!, host2.mac!]]
  arpTables.host2 = [[host1.ip!, host1.mac!]]

  yield {
    state: buildState(topology, [], arpTables, 'done'),
    log: {
      ja: `${host1.label} の ARP テーブルが更新されました。次回から ${host2.ip} への通信はブロードキャストせずに直接送信できます。`,
      en: `${host1.label}'s ARP table updated. Future packets to ${host2.ip} can be sent directly without broadcasting.`,
    },
  }
}
