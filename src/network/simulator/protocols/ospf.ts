// OSPFシミュレーター（簡略版）
// Hello → Neighbor確立 → LSAフラッディング → SPF計算 の流れをステップで表現する

import type { NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet, OspfState } from '../types'

function makeState(
  topology: Topology,
  packets: PacketOnLink[],
  ospf: OspfState,
  phase: string,
): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [],
    ospfState: ospf, phase,
  }
}

function makeHello(id: string, srcIp: string, routerId: string): Packet {
  return {
    id,
    type: 'ospf_hello',
    header: {
      srcIp, dstIp: '224.0.0.5',
      protocol: '89 (OSPF)',
      extras: {
        'OSPF Version': '2',
        'Message Type': '1 (Hello)',
        'Router ID': routerId,
        'Area ID': '0.0.0.0',
        'Hello Interval': '10 seconds',
        'Dead Interval': '40 seconds',
        'Priority': '1',
      },
    },
  }
}

function makeLsa(id: string, srcIp: string, routerId: string, neighbors: string): Packet {
  return {
    id,
    type: 'ospf_lsa',
    header: {
      srcIp, dstIp: '224.0.0.5',
      protocol: '89 (OSPF)',
      extras: {
        'Message Type': '4 (Link State Update)',
        'Router ID': routerId,
        'LSA Type': '1 (Router LSA)',
        'Link Count': neighbors,
        'LS Age': '0',
        'LS Sequence': '0x80000001',
      },
    },
  }
}

function link(packet: Packet, from: string, to: string, progress: number, broadcast = false): PacketOnLink {
  return { id: packet.id + '-link', packet, fromNodeId: from, toNodeId: to, progress, broadcast }
}

export function* ospfSimulator(topology: Topology): NetworkStepGenerator {
  const [r1, r2, r3] = ['r1', 'r2', 'r3'].map(id => topology.nodes.find(n => n.id === id)!)
  const links = topology.links

  const emptyOspf: OspfState = { lsaDatabase: {}, shortestPaths: {} }

  yield {
    state: makeState(topology, [], emptyOspf, 'init'),
    log: {
      ja: `3台のルーターがOSPFエリア0で起動しました。まず Hello パケットを送信してネイバーを発見します。`,
      en: `3 routers started in OSPF Area 0. First, they send Hello packets to discover neighbors.`,
    },
  }

  // Hello packets from all routers (multicast 224.0.0.5)
  const hellos: PacketOnLink[] = links.flatMap((lnk, i) => {
    const from = topology.nodes.find(n => n.id === lnk.from)!
    const to   = topology.nodes.find(n => n.id === lnk.to)!
    return [
      link(makeHello(`hello-${i}a`, from.ip!, from.id), lnk.from, lnk.to, 1, true),
      link(makeHello(`hello-${i}b`, to.ip!, to.id), lnk.to, lnk.from, 1, true),
    ]
  })

  yield {
    state: makeState(topology, hellos, emptyOspf, 'hello'),
    log: {
      ja: `各ルーターが Hello パケットをマルチキャスト（224.0.0.5）送信。隣接ルーターとのネイバー関係を確立します。`,
      en: `Routers multicast Hello packets (224.0.0.5). Establishing OSPF neighbor relationships.`,
    },
  }

  const ospfWithNeighbors: OspfState = {
    lsaDatabase: {
      [r1.id]: [{ routerId: r1.id, neighbors: [{ id: r2.id, cost: 1 }, { id: r3.id, cost: 2 }] }],
      [r2.id]: [{ routerId: r2.id, neighbors: [{ id: r1.id, cost: 1 }, { id: r3.id, cost: 1 }] }],
      [r3.id]: [{ routerId: r3.id, neighbors: [{ id: r1.id, cost: 2 }, { id: r2.id, cost: 1 }] }],
    },
    shortestPaths: {},
  }

  yield {
    state: makeState(topology, [], ospfWithNeighbors, 'neighbor_formed'),
    log: {
      ja: `ネイバー関係確立。各ルーターが Router LSA を生成し、リンク状態データベース（LSDB）に格納します。`,
      en: `Neighbor relationships established. Each router generates Router LSA and stores it in the Link State Database (LSDB).`,
    },
  }

  // LSA flooding
  const lsas: PacketOnLink[] = [
    link(makeLsa('lsa-r1', r1.ip!, r1.id, '2'), r1.id, r2.id, 1, true),
    link(makeLsa('lsa-r2', r2.ip!, r2.id, '2'), r2.id, r3.id, 1, true),
    link(makeLsa('lsa-r3', r3.ip!, r3.id, '2'), r3.id, r1.id, 1, true),
  ]

  yield {
    state: makeState(topology, lsas, ospfWithNeighbors, 'lsa_flood'),
    log: {
      ja: `LSA フラッディング: 各ルーターは受信したLSAをすべてのネイバーに転送します。全ルーターが同一のLSDBを持つようになります。`,
      en: `LSA Flooding: Each router forwards received LSAs to all neighbors. Eventually all routers have identical LSDBs.`,
    },
  }

  const finalOspf: OspfState = {
    ...ospfWithNeighbors,
    shortestPaths: {
      [r1.id]: [`${r1.id} → ${r2.id} (cost 1)`, `${r1.id} → ${r3.id} via ${r2.id} (cost 2)`],
      [r2.id]: [`${r2.id} → ${r1.id} (cost 1)`, `${r2.id} → ${r3.id} (cost 1)`],
      [r3.id]: [`${r3.id} → ${r2.id} (cost 1)`, `${r3.id} → ${r1.id} via ${r2.id} (cost 2)`],
    },
  }

  yield {
    state: makeState(topology, [], finalOspf, 'done'),
    log: {
      ja: `SPF（最短経路優先）アルゴリズムでルーティングテーブルを計算完了。各ルーターはネットワーク全体の最短経路を知っています。`,
      en: `SPF (Shortest Path First) algorithm computed routing tables. Each router now knows the shortest path to every network.`,
    },
  }
}
