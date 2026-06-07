// OSIモデル / カプセル化シミュレーター
// HTTPリクエストが各層を通過し、ヘッダーが付加されていくアニメーションをステップで表現する

import type { NetworkStepGenerator, NetworkState, Topology } from '../types'

const FULL_LAYERS = ['Ethernet Header', 'IP Header', 'TCP Header', 'HTTP Data', 'Ethernet Trailer']

function stateAt(topology: Topology, layer: number | null, layers: string[], phase: string): NetworkState {
  return {
    topology, packets: [],
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: layer, capsuleLayers: layers, phase,
  }
}

export function* osiModelSimulator(topology: Topology): NetworkStepGenerator {
  yield {
    state: stateAt(topology, null, [], 'init'),
    log: {
      ja: `OSI参照モデルを可視化します。送信側でカプセル化（ヘッダー付加）し、受信側でデカプセル化（ヘッダー除去）する流れを確認してください。`,
      en: `Visualizing the OSI reference model. Watch how the sender encapsulates (adds headers) and the receiver decapsulates (strips headers).`,
    },
  }

  // ---- 送信側カプセル化（Layer 7 → Layer 1） ----

  yield {
    state: stateAt(topology, 7, ['HTTP Data'], 'layer7'),
    log: {
      ja: `[送信側 Layer 7 アプリケーション層] HTTP リクエストが生成されます: "GET / HTTP/1.1"。アプリケーションのデータ（PDU: メッセージ）。`,
      en: `[Sender Layer 7 Application] HTTP request created: "GET / HTTP/1.1". Application data (PDU: Message).`,
    },
  }

  yield {
    state: stateAt(topology, 6, ['HTTP Data'], 'layer6'),
    log: {
      ja: `[送信側 Layer 6 プレゼンテーション層] データのエンコード・暗号化（HTTPS では TLS）を担う。TCP/IPモデルではアプリ層に統合。`,
      en: `[Sender Layer 6 Presentation] Handles encoding and encryption (TLS for HTTPS). In TCP/IP model, merged with Application layer.`,
    },
  }

  yield {
    state: stateAt(topology, 5, ['HTTP Data'], 'layer5'),
    log: {
      ja: `[送信側 Layer 5 セッション層] 通信セッションの確立・維持・終了を管理。TCP/IPモデルではアプリ層に統合。`,
      en: `[Sender Layer 5 Session] Manages session establishment, maintenance, and termination. Merged with Application in TCP/IP.`,
    },
  }

  yield {
    state: stateAt(topology, 4, ['TCP Header', 'HTTP Data'], 'layer4'),
    log: {
      ja: `[送信側 Layer 4 トランスポート層] TCP ヘッダーが付加されます（送信元/宛先ポート、SEQ/ACK番号、フラグ）。PDU: セグメント。`,
      en: `[Sender Layer 4 Transport] TCP header added (src/dst port, SEQ/ACK, flags). PDU: Segment.`,
    },
  }

  yield {
    state: stateAt(topology, 3, ['IP Header', 'TCP Header', 'HTTP Data'], 'layer3'),
    log: {
      ja: `[送信側 Layer 3 ネットワーク層] IP ヘッダーが付加されます（送信元/宛先 IP、TTL、プロトコル番号）。PDU: パケット。`,
      en: `[Sender Layer 3 Network] IP header added (src/dst IP, TTL, protocol). PDU: Packet.`,
    },
  }

  yield {
    state: stateAt(topology, 2, FULL_LAYERS, 'layer2'),
    log: {
      ja: `[送信側 Layer 2 データリンク層] Ethernet フレームヘッダー（MAC アドレス）とトレーラー（FCS）が付加されます。PDU: フレーム。`,
      en: `[Sender Layer 2 Data Link] Ethernet frame header (MAC addresses) and trailer (FCS) added. PDU: Frame.`,
    },
  }

  yield {
    state: stateAt(topology, 1, FULL_LAYERS, 'layer1'),
    log: {
      ja: `[送信側 Layer 1 物理層] フレームがビット列（電気信号・光・電波）に変換されて送信されます。PDU: ビット。カプセル化完了！`,
      en: `[Sender Layer 1 Physical] Frame converted to bit stream (electrical, optical, or radio signals). PDU: Bits. Encapsulation complete!`,
    },
  }

  // ---- 物理媒体を通じて受信側へ転送 ----

  yield {
    state: {
      topology,
      packets: [{
        id: 'osi-pkt-link',
        packet: { id: 'osi-pkt', type: 'http_request', header: { appData: 'HTTP Frame' } },
        fromNodeId: 'src',
        toNodeId: 'dst',
        progress: 1,
        broadcast: false,
      }],
      arpTables: {}, routingTables: {}, macTables: {},
      activeOsiLayer: null,
      capsuleLayers: FULL_LAYERS,
      phase: 'traveling',
    },
    log: {
      ja: `カプセル化されたフレームが物理媒体（ケーブル）を通じて受信側へ伝送されています。`,
      en: `The fully encapsulated frame is traveling through the physical medium (cable) to the receiver.`,
    },
  }

  // ---- 受信側デカプセル化（Layer 1 → Layer 7） ----

  yield {
    state: stateAt(topology, 1, FULL_LAYERS, 'decap_start'),
    log: {
      ja: `[受信側 Layer 1 物理層] ビット列を受信し、フレームとして組み立てます。`,
      en: `[Receiver Layer 1 Physical] Receives bits and assembles them into a frame.`,
    },
  }

  yield {
    state: stateAt(topology, 2, ['IP Header', 'TCP Header', 'HTTP Data'], 'decap_l2'),
    log: {
      ja: `[受信側 Layer 2 データリンク層] Ethernet ヘッダー/トレーラーを除去し、MACアドレスを確認。自分宛のフレームなので上位層へ渡します。`,
      en: `[Receiver Layer 2 Data Link] Strip Ethernet header/trailer, check MAC address. It's for us, pass up.`,
    },
  }

  yield {
    state: stateAt(topology, 3, ['TCP Header', 'HTTP Data'], 'decap_l3'),
    log: {
      ja: `[受信側 Layer 3 ネットワーク層] IP ヘッダーを除去し、宛先 IP を確認。上位層へ渡します。`,
      en: `[Receiver Layer 3 Network] Strip IP header, verify destination IP. Pass up to transport layer.`,
    },
  }

  yield {
    state: stateAt(topology, 4, ['HTTP Data'], 'decap_l4'),
    log: {
      ja: `[受信側 Layer 4 トランスポート層] TCP ヘッダーを除去し、ポート番号で対象アプリケーションを特定。ACK を返して信頼性を確保します。`,
      en: `[Receiver Layer 4 Transport] Strip TCP header, identify target app by port. Send ACK for reliability.`,
    },
  }

  yield {
    state: stateAt(topology, 7, ['HTTP Data'], 'decap_done'),
    log: {
      ja: `[受信側 Layer 7 アプリケーション層] HTTP リクエストが最終的にアプリケーションに届きました。デカプセル化完了！`,
      en: `[Receiver Layer 7 Application] HTTP request delivered to the application. Decapsulation complete!`,
    },
  }
}
