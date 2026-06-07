// ネットワークシミュレーターの共通型定義。
// AlgorithmStep/StepGenerator と同じパターンを踏襲し、
// ジェネレーター関数でプロトコルの動作をステップ単位で表現する。

export type LocalizedString = { ja: string; en: string }

// ---- トポロジー ----

export type NodeType = 'host' | 'switch' | 'router' | 'dns' | 'dhcp' | 'internet' | 'firewall'

export interface NetworkNode {
  id: string
  type: NodeType
  label: string
  ip?: string
  mac?: string
  // SVGキャンバス上の座標（ユーザードラッグで更新可能）
  position: { x: number; y: number }
}

export interface NetworkLink {
  id: string
  from: string
  to: string
  bandwidth?: string
  status: 'up' | 'down'
}

export interface Topology {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

// ---- パケット ----

export type PacketType =
  | 'arp_request' | 'arp_reply'
  | 'icmp_request' | 'icmp_reply' | 'icmp_time_exceeded'
  | 'tcp_syn' | 'tcp_syn_ack' | 'tcp_ack' | 'tcp_data' | 'tcp_fin' | 'tcp_fin_ack' | 'tcp_rst'
  | 'udp'
  | 'dns_query' | 'dns_response'
  | 'dhcp_discover' | 'dhcp_offer' | 'dhcp_request' | 'dhcp_ack'
  | 'ospf_hello' | 'ospf_lsa' | 'ospf_lsack'
  | 'stp_bpdu'
  | 'http_request' | 'http_response'
  | 'smtp' | 'ftp_control' | 'ftp_data'
  | 'bgp_open' | 'bgp_update' | 'bgp_keepalive'
  | 'rip_request' | 'rip_response'
  | 'hsrp_hello'
  | 'tls_client_hello' | 'tls_server_hello' | 'tls_finished' | 'tls_data'
  | 'igmp_report' | 'igmp_query' | 'pim_hello'
  | 'generic'

export interface PacketHeader {
  // Ethernet
  srcMac?: string
  dstMac?: string
  etherType?: string
  // IP
  srcIp?: string
  dstIp?: string
  ttl?: number
  protocol?: string
  // Transport
  srcPort?: number
  dstPort?: number
  flags?: string[]
  seq?: number
  ack?: number
  // Application
  appData?: string
  // プロトコル固有フィールド（ProtocolInspectorで表示する追加情報）
  extras?: Record<string, string>
}

export interface Packet {
  id: string
  type: PacketType
  header: PacketHeader
}

// リンク上を移動中のパケット。
// progress 0=送信元ノード位置、1=宛先ノード位置として描画する。
export interface PacketOnLink {
  id: string
  packet: Packet
  fromNodeId: string
  toNodeId: string
  // 0.0〜1.0。ステップごとに 0→1 へ変化し、CSS transition でスムーズに動く
  progress: number
  // ブロードキャストパケットは全リンクに同時に表示する
  broadcast: boolean
}

// ---- ノードの学習テーブル ----

export interface ArpEntry {
  ip: string
  mac: string
}

export interface RouteEntry {
  network: string      // e.g. "192.168.1.0"
  prefix: number       // CIDR prefix length
  nextHop: string      // 次ホストIP、または "local"/"default"
  iface: string        // インターフェース名
  metric: number
}

// スイッチのMACアドレステーブル: mac -> 接続先ノードID
export type MacTable = Record<string, string>

// ---- ネットワーク全体の状態スナップショット ----

export interface NetworkState {
  topology: Topology
  // 現在リンク上にあるパケット
  packets: PacketOnLink[]
  // nodeId -> ARPテーブル
  arpTables: Record<string, ArpEntry[]>
  // nodeId -> ルーティングテーブル
  routingTables: Record<string, RouteEntry[]>
  // スイッチのMACテーブル: switchId -> MacTable
  macTables: Record<string, MacTable>
  // OSIモデル表示用: 現在アクティブなレイヤー番号 (1-7, null=非表示)
  activeOsiLayer: number | null
  // カプセル化ビュー用: 積み重なったヘッダ名の配列（下から上の順）
  capsuleLayers: string[]
  // サブネット計算結果（アドレッシングシナリオで使用）
  subnetInfo?: SubnetInfo
  // OSPF状態（OSPFシナリオで使用）
  ospfState?: OspfState
  // STP状態（STPシナリオで使用）
  stpState?: StpState
  // VLAN情報（スイッチングシナリオで使用）
  vlanState?: VlanState
  // TCPウィンドウ状態（トランスポートシナリオで使用）
  tcpWindowState?: TcpWindowState
  // ファイアウォール状態（セキュリティシナリオで使用）
  firewallState?: FirewallState
  // HSRP状態（キャンパスシナリオで使用）
  hsrpState?: HsrpState
  phase: string
}

export interface VlanState {
  vlans: Array<{ id: number; name: string; color: string; memberNodeIds: string[] }>
  trunkLinkIds: string[]
  taggedVlanId?: number
}

export interface TcpWindowState {
  windowSize: number
  sentUnacked: number
  nextSeq: number
  cwnd: number
  ssthresh: number
  congestionPhase: 'slow_start' | 'congestion_avoidance' | 'fast_recovery'
  segments: Array<{ seq: number; status: 'sent' | 'acked' | 'lost' | 'retrans' }>
}

export interface FirewallState {
  rules: Array<{
    id: number
    action: 'permit' | 'deny'
    src: string
    dst: string
    proto: string
    port?: number
    matched?: boolean
  }>
  currentSrc: string
  currentDst: string
  currentProto: string
  currentPort?: number
  verdict?: 'permit' | 'deny'
}

export interface HsrpState {
  virtualIp: string
  activeRouterId: string
  standbyRouterId: string
  priority: Record<string, number>
  state: Record<string, 'active' | 'standby' | 'speak' | 'listen' | 'init'>
  holdTimerExpired?: boolean
}

export interface SubnetInfo {
  address: string
  prefix: number
  networkAddr: string
  broadcastAddr: string
  firstHost: string
  lastHost: string
  totalHosts: number
}

export interface OspfState {
  lsaDatabase: Record<string, OspfLsa[]>
  shortestPaths: Record<string, string[]>
}

export interface OspfLsa {
  routerId: string
  neighbors: Array<{ id: string; cost: number }>
}

export interface StpState {
  rootBridgeId: string
  portStates: Record<string, 'forwarding' | 'blocking' | 'disabled'>
}

// ---- シミュレーションステップ ----

export interface NetworkStep {
  state: NetworkState
  log: LocalizedString
  // このステップでProtocolInspectorに表示するパケットID
  highlightPacketId?: string
}

// ジェネレーター関数の戻り値型（AlgorithmStepGeneratorと同パターン）
export type NetworkStepGenerator = Generator<NetworkStep, void, never>

// ---- シナリオ定義 ----

export type NetworkCategory =
  | 'model'            // ネットワークモデル
  | 'addressing'       // アドレッシング
  | 'switching'        // スイッチング・L2
  | 'routing'          // ルーティング・L3
  | 'transport'        // トランスポート層
  | 'application'      // アプリケーション層
  | 'advanced_routing' // 高度なルーティング（OSPF多エリア・BGP・ダイクストラ）
  | 'wan'              // WAN・NAPT・QoS
  | 'campus_network'   // キャンパスネットワーク設計
  | 'security'         // ネットワークセキュリティ
  | 'design'           // 設計演習

export interface NetworkScenarioInfo {
  id: string
  category: NetworkCategory
  title: LocalizedString
  description: LocalizedString
  rfcNumbers: string[]
  useCases: LocalizedString
  visualGuide: LocalizedString
}

export interface NetworkScenario extends NetworkScenarioInfo {
  topology: Topology
  // シミュレーターはトポロジーを受け取りステップを生成する
  simulate: (topology: Topology) => NetworkStepGenerator
}
