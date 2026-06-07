// TCPシミュレーター
// スリーウェイハンドシェイク → データ転送 → 接続終了 のシーケンスをステップで表現する

import type { NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, PacketType } from '../types'

function emptyState(topology: Topology, packets: PacketOnLink[], phase: string): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
  }
}

function makeTcpPacket(
  id: string, type: PacketType,
  srcIp: string, dstIp: string,
  srcPort: number, dstPort: number,
  flags: string[], seq: number, ack: number,
  appData?: string,
): Packet {
  return {
    id,
    type,
    header: {
      etherType: '0x0800 (IPv4)',
      srcIp, dstIp,
      protocol: '6 (TCP)',
      srcPort, dstPort, flags, seq, ack,
      appData,
      extras: {
        'Window Size': '65535',
        'Checksum': '0xABCD (valid)',
        ...(appData ? { 'Payload': appData } : {}),
      },
    },
  }
}

function makeLink(packet: Packet, from: string, to: string, progress: number): PacketOnLink {
  return { id: packet.id + '-link', packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

export function* tcpSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client')!
  const server = topology.nodes.find(n => n.id === 'server')!

  yield {
    state: emptyState(topology, [], 'init'),
    log: {
      ja: `${client.label}（${client.ip}:52000）が ${server.label}（${server.ip}:80）へのTCP接続を開始します。`,
      en: `${client.label} (${client.ip}:52000) initiates a TCP connection to ${server.label} (${server.ip}:80).`,
    },
  }

  // ---- スリーウェイハンドシェイク ----

  // SYN
  const syn = makeTcpPacket('syn', 'tcp_syn', client.ip!, server.ip!, 52000, 80, ['SYN'], 1000, 0)
  yield {
    state: emptyState(topology, [makeLink(syn, client.id, server.id, 0)], 'syn_sent'),
    log: {
      ja: `[1/3] SYN 送信: クライアントがシーケンス番号 1000 を提示し、接続要求を送ります。`,
      en: `[1/3] SYN sent: Client proposes sequence number 1000 and requests connection.`,
    },
    highlightPacketId: 'syn',
  }

  yield {
    state: emptyState(topology, [makeLink(syn, client.id, server.id, 1)], 'syn_arrived'),
    log: {
      ja: `SYN がサーバーに到達。サーバーは SYN-ACK で応答します。`,
      en: `SYN arrived at server. Server responds with SYN-ACK.`,
    },
    highlightPacketId: 'syn',
  }

  // SYN-ACK
  const synAck = makeTcpPacket('syn-ack', 'tcp_syn_ack', server.ip!, client.ip!, 80, 52000, ['SYN', 'ACK'], 5000, 1001)
  yield {
    state: emptyState(topology, [makeLink(synAck, server.id, client.id, 0)], 'syn_ack_sent'),
    log: {
      ja: `[2/3] SYN-ACK 送信: サーバーは受信確認（ACK=1001）と自身のシーケンス番号（SEQ=5000）を返します。`,
      en: `[2/3] SYN-ACK sent: Server acknowledges (ACK=1001) and proposes its own sequence number (SEQ=5000).`,
    },
    highlightPacketId: 'syn-ack',
  }

  yield {
    state: emptyState(topology, [makeLink(synAck, server.id, client.id, 1)], 'syn_ack_arrived'),
    log: {
      ja: `SYN-ACK がクライアントに到達。クライアントは ACK で確認応答します。`,
      en: `SYN-ACK arrived at client. Client sends final ACK to complete the handshake.`,
    },
    highlightPacketId: 'syn-ack',
  }

  // ACK
  const ack = makeTcpPacket('ack', 'tcp_ack', client.ip!, server.ip!, 52000, 80, ['ACK'], 1001, 5001)
  yield {
    state: emptyState(topology, [makeLink(ack, client.id, server.id, 1)], 'handshake_done'),
    log: {
      ja: `[3/3] ACK 送信: ハンドシェイク完了。TCP接続が確立しました。双方向のデータ転送が可能になります。`,
      en: `[3/3] ACK sent: Handshake complete. TCP connection established. Bidirectional data transfer is now possible.`,
    },
    highlightPacketId: 'ack',
  }

  // ---- データ転送 ----

  yield {
    state: emptyState(topology, [], 'data_phase'),
    log: {
      ja: `接続確立後、クライアントが HTTP GET リクエストを送信します。`,
      en: `Connection established. Client sends HTTP GET request.`,
    },
  }

  const data = makeTcpPacket('data', 'tcp_data', client.ip!, server.ip!, 52000, 80, ['ACK', 'PSH'], 1001, 5001, 'GET / HTTP/1.1')
  yield {
    state: emptyState(topology, [makeLink(data, client.id, server.id, 1)], 'data_sent'),
    log: {
      ja: `HTTP GET リクエスト到達。サーバーはデータを受信し、ACK で確認してからレスポンスを返します。`,
      en: `HTTP GET request arrived. Server acknowledges receipt and sends the response.`,
    },
    highlightPacketId: 'data',
  }

  // ---- 接続終了（FIN/FIN-ACK）----

  yield {
    state: emptyState(topology, [], 'close_phase'),
    log: {
      ja: `データ転送完了。クライアントが接続終了を開始します（4-way FIN）。`,
      en: `Data transfer complete. Client initiates connection close (4-way FIN).`,
    },
  }

  const fin = makeTcpPacket('fin', 'tcp_fin', client.ip!, server.ip!, 52000, 80, ['FIN', 'ACK'], 1100, 5200)
  yield {
    state: emptyState(topology, [makeLink(fin, client.id, server.id, 1)], 'fin_sent'),
    log: {
      ja: `FIN 送信: クライアントがこれ以上データを送らないことを通知します。`,
      en: `FIN sent: Client signals it will send no more data.`,
    },
    highlightPacketId: 'fin',
  }

  const finAck = makeTcpPacket('fin-ack', 'tcp_fin_ack', server.ip!, client.ip!, 80, 52000, ['FIN', 'ACK'], 5200, 1101)
  yield {
    state: emptyState(topology, [makeLink(finAck, server.id, client.id, 1)], 'done'),
    log: {
      ja: `FIN-ACK 受信: TCP接続が正常にクローズされました。ポート 52000 が解放されます。`,
      en: `FIN-ACK received: TCP connection cleanly closed. Port 52000 is now released.`,
    },
    highlightPacketId: 'fin-ack',
  }
}
