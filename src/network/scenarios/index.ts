// ネットワーク学習コースのシナリオレジストリ。
// AlgorithmRegistry と同じパターンで、カテゴリ・シナリオID・トポロジー・シミュレーターを管理する。

import type { NetworkScenario, NetworkCategory, Topology, NetworkNode } from '../simulator/types'
import { arpSimulator }              from '../simulator/protocols/arp'
import { icmpSimulator }             from '../simulator/protocols/icmp'
import { tcpSimulator }              from '../simulator/protocols/tcp'
import { dnsSimulator }              from '../simulator/protocols/dns'
import { dhcpSimulator }             from '../simulator/protocols/dhcp'
import { ospfSimulator }             from '../simulator/protocols/ospf'
import { osiModelSimulator }         from '../simulator/protocols/model'
import {
  ipClassfulSimulator, subnettingSimulator, vlsmSimulator,
  natNaptSimulator, ipv6Simulator,
} from '../simulator/protocols/subnet'
import {
  csmaCdSimulator, macLearningSimulator,
  vlanConceptSimulator, vlanTrunkSimulator,
  stpPhasesSimulator, stpReconvergeSimulator,
} from '../simulator/protocols/ethernet2'
import {
  tcpIpModelSimulator, defaultGatewaySimulator,
  ripSimulator, ospfDrBdrSimulator, bgpBasicsSimulator,
} from '../simulator/protocols/routing2'
import {
  tcpSlidingWindowSimulator, tcpCongestionSimulator,
  tcp4WayCloseSimulator, udpVsTcpSimulator,
} from '../simulator/protocols/transport2'
import {
  httpRequestResponseSimulator, smtpSimulator,
  ftpModesSimulator, dnsRecordTypesSimulator,
} from '../simulator/protocols/application2'
import {
  firewallAclSimulator, tlsHandshakeSimulator,
  arpSpoofingSimulator, synFloodSimulator,
} from '../simulator/protocols/security'
import {
  campus3TierSimulator, interVlanRoutingSimulator,
  hsrpFailoverSimulator, multicastIgmpSimulator,
} from '../simulator/protocols/campus'
import {
  ospfMultiAreaSimulator, bgpPathSelectionSimulator,
  naptDetailSimulator, dijkstraDemoSimulator,
  designSmallOfficeSimulator, designEnterpriseDmzSimulator,
} from '../simulator/protocols/advanced'

// ---- トポロジー定義ヘルパー ----

function host(id: string, label: string, ip: string, mac: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'host', label, ip, mac, position: pos }
}
function sw(id: string, label: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'switch', label, position: pos }
}
function router(id: string, label: string, ip: string, mac: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'router', label, ip, mac, position: pos }
}
function dns(id: string, label: string, ip: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'dns', label, ip, position: pos }
}
function dhcp(id: string, label: string, ip: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'dhcp', label, ip, position: pos }
}
function internet(id: string, label: string, ip: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'internet', label, ip, position: pos }
}
function firewall(id: string, label: string, ip: string, pos: {x:number;y:number}): NetworkNode {
  return { id, type: 'firewall', label, ip, position: pos }
}
function link(id: string, from: string, to: string, bw?: string): { id: string; from: string; to: string; status: 'up'; bandwidth?: string } {
  return { id, from, to, status: 'up', bandwidth: bw }
}

// ---- トポロジー定義 ----

// 既存のトポロジー（前回実装分）
const arpTopology: Topology = {
  nodes: [
    host('host1', 'PC-A', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 120, y: 220 }),
    sw('sw1', 'SW1', { x: 320, y: 220 }),
    host('host2', 'PC-B', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 520, y: 220 }),
  ],
  links: [link('l1', 'host1', 'sw1'), link('l2', 'sw1', 'host2')],
}

const icmpTopology: Topology = {
  nodes: [
    host('host1', 'PC-A', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 100, y: 220 }),
    router('router1', 'Router', '192.168.1.1', 'AA:BB:CC:00:00:01', { x: 320, y: 220 }),
    host('host2', 'PC-B', '10.0.0.20', 'CC:DD:EE:FF:00:02', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'host1', 'router1'), link('l2', 'router1', 'host2')],
}

const tcpTopology: Topology = {
  nodes: [
    host('client', 'Client', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 120, y: 220 }),
    host('server', 'Server :80', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 520, y: 220 }),
  ],
  links: [link('l1', 'client', 'server')],
}

const dnsTopology: Topology = {
  nodes: [
    host('client', 'Browser', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 230 }),
    dns('resolver', 'Resolver\n8.8.8.8', '8.8.8.8', { x: 230, y: 230 }),
    dns('root_dns', 'Root DNS\n198.41.0.4', '198.41.0.4', { x: 380, y: 110 }),
    dns('tld_dns', '.com TLD\n192.5.6.30', '192.5.6.30', { x: 530, y: 230 }),
    dns('auth_dns', 'example.com NS\n205.251.196.1', '205.251.196.1', { x: 380, y: 350 }),
  ],
  links: [
    link('l1', 'client', 'resolver'),
    link('l2', 'resolver', 'root_dns'),
    link('l3', 'resolver', 'tld_dns'),
    link('l4', 'resolver', 'auth_dns'),
  ],
}

const dhcpTopology: Topology = {
  nodes: [
    host('client', 'New Host', '0.0.0.0', '00:1A:2B:3C:4D:5E', { x: 120, y: 220 }),
    sw('sw1', 'SW1', { x: 320, y: 220 }),
    dhcp('dhcp', 'DHCP Server\n192.168.1.1', '192.168.1.1', { x: 520, y: 120 }),
    router('router1', 'Gateway\n192.168.1.254', '192.168.1.254', 'AA:BB:00:00:00:01', { x: 520, y: 320 }),
  ],
  links: [link('l1', 'client', 'sw1'), link('l2', 'sw1', 'dhcp'), link('l3', 'sw1', 'router1')],
}

const ospfTopology: Topology = {
  nodes: [
    router('r1', 'Router-1\n10.0.1.1', '10.0.1.1', 'AA:00:00:00:00:01', { x: 180, y: 150 }),
    router('r2', 'Router-2\n10.0.2.1', '10.0.2.1', 'AA:00:00:00:00:02', { x: 460, y: 150 }),
    router('r3', 'Router-3\n10.0.3.1', '10.0.3.1', 'AA:00:00:00:00:03', { x: 320, y: 340 }),
  ],
  links: [link('l1', 'r1', 'r2'), link('l2', 'r2', 'r3'), link('l3', 'r3', 'r1')],
}

const osiTopology: Topology = {
  nodes: [
    // 左右のOSIパネル・カプセルスタックと重ならないよう中央ゾーン（x=220〜420）に配置
    host('src', 'Sender', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 230, y: 220 }),
    host('dst', 'Receiver', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 410, y: 220 }),
  ],
  links: [link('l1', 'src', 'dst')],
}

// ---- 新しいトポロジー ----

// アドレッシング系（シンプルな2ノード）
const simpleHostRouterTopology: Topology = {
  nodes: [
    host('host1', 'PC-A', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 150, y: 220 }),
    router('router1', 'Router\n192.168.1.1', '192.168.1.1', 'AA:BB:CC:00:00:01', { x: 470, y: 220 }),
  ],
  links: [link('l1', 'host1', 'router1')],
}

const natTopology: Topology = {
  nodes: [
    host('client', 'PC (Private)\n192.168.1.10', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 100, y: 220 }),
    router('nat', 'NAT Router\n203.0.113.1', '203.0.113.1', 'AA:BB:CC:00:00:01', { x: 320, y: 220 }),
    internet('internet', 'Internet\n203.0.113.80', '203.0.113.80', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'client', 'nat'), link('l2', 'nat', 'internet')],
}

const twoClientNatTopology: Topology = {
  nodes: [
    host('c1', 'PC-A\n192.168.1.10', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 150 }),
    host('c2', 'PC-B\n192.168.1.20', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 80, y: 300 }),
    router('nat', 'NAPT Router\n203.0.113.1', '203.0.113.1', 'AA:BB:CC:00:00:01', { x: 320, y: 220 }),
    internet('internet', 'Internet', '8.8.8.8', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'c1', 'nat'), link('l2', 'c2', 'nat'), link('l3', 'nat', 'internet')],
}

// スイッチング系
const csmaCdTopology: Topology = {
  nodes: [
    host('host1', 'PC-A', '10.0.0.1', 'AA:BB:CC:DD:EE:01', { x: 120, y: 220 }),
    host('host2', 'PC-B', '10.0.0.2', 'AA:BB:CC:DD:EE:02', { x: 520, y: 220 }),
  ],
  links: [link('l1', 'host1', 'host2', '10Mbps')],
}

const macLearningTopology: Topology = {
  nodes: [
    host('host1', 'PC-A', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 220 }),
    sw('sw1', 'SW1', { x: 320, y: 220 }),
    host('host2', 'PC-B', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 560, y: 220 }),
    host('host3', 'PC-C', '192.168.1.30', 'AA:BB:CC:DD:EE:03', { x: 320, y: 380 }),
  ],
  links: [
    link('l1', 'host1', 'sw1'), link('l2', 'sw1', 'host2'), link('l3', 'sw1', 'host3'),
  ],
}

const vlanTopology: Topology = {
  nodes: [
    host('host1', 'Sales-A\n192.168.10.10', '192.168.10.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 150 }),
    host('host2', 'Sales-B\n192.168.10.20', '192.168.10.20', 'AA:BB:CC:DD:EE:02', { x: 80, y: 300 }),
    sw('sw1', 'SW1\n(VLAN10/20)', { x: 320, y: 220 }),
    host('host3', 'Dev-A\n192.168.20.10', '192.168.20.10', 'CC:DD:EE:FF:00:01', { x: 560, y: 150 }),
    host('host4', 'Dev-B\n192.168.20.20', '192.168.20.20', 'CC:DD:EE:FF:00:02', { x: 560, y: 300 }),
  ],
  links: [
    link('l1', 'host1', 'sw1'), link('l2', 'host2', 'sw1'),
    link('l3', 'sw1', 'host3'), link('l4', 'sw1', 'host4'),
  ],
}

const vlanTrunkTopology: Topology = {
  nodes: [
    host('host1', 'VLAN10', '192.168.10.10', 'AA:BB:CC:DD:EE:01', { x: 60, y: 150 }),
    sw('sw1', 'SW1', { x: 220, y: 220 }),
    sw('sw2', 'SW2', { x: 420, y: 220 }),
    host('host2', 'VLAN10', '192.168.10.20', 'CC:DD:EE:FF:00:01', { x: 580, y: 150 }),
    host('host3', 'VLAN20', '192.168.20.10', 'CC:DD:EE:FF:00:02', { x: 580, y: 300 }),
  ],
  links: [
    link('l1', 'host1', 'sw1'),
    link('trunk', 'sw1', 'sw2', '1Gbps'),
    link('l2', 'sw2', 'host2'),
    link('l3', 'sw2', 'host3'),
  ],
}

const stpTopology: Topology = {
  nodes: [
    sw('sw1', 'SW1\nPri=8000', { x: 320, y: 80 }),
    sw('sw2', 'SW2\nPri=9000', { x: 120, y: 300 }),
    sw('sw3', 'SW3\nPri=9000', { x: 520, y: 300 }),
  ],
  links: [
    link('l1', 'sw1', 'sw2'), link('l2', 'sw1', 'sw3'), link('l3', 'sw2', 'sw3'),
  ],
}

// ルーティング系
const defaultGwTopology: Topology = {
  nodes: [
    host('host1', 'PC-A\n192.168.1.10', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 220 }),
    router('router1', 'Gateway\n192.168.1.1', '192.168.1.1', 'AA:BB:CC:00:00:01', { x: 320, y: 220 }),
    internet('internet', 'Internet\n8.8.8.8', '8.8.8.8', { x: 560, y: 220 }),
  ],
  links: [link('l1', 'host1', 'router1'), link('l2', 'router1', 'internet')],
}

const ripTopology: Topology = {
  nodes: [
    router('r1', 'R1\n10.1.0.1', '10.1.0.1', 'AA:00:00:00:00:01', { x: 100, y: 220 }),
    router('r2', 'R2\n10.2.0.1', '10.2.0.1', 'AA:00:00:00:00:02', { x: 320, y: 220 }),
    router('r3', 'R3\n10.3.0.1', '10.3.0.1', 'AA:00:00:00:00:03', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'r1', 'r2'), link('l2', 'r2', 'r3')],
}

const ospfDrBdrTopology: Topology = {
  nodes: [
    router('r1', 'R1\nPri=1', '1.1.1.1', 'AA:00:00:00:00:01', { x: 200, y: 150 }),
    router('r2', 'R2\nPri=2\n(DR)', '2.2.2.2', 'AA:00:00:00:00:02', { x: 430, y: 150 }),
    router('r3', 'R3\nPri=1', '3.3.3.3', 'AA:00:00:00:00:03', { x: 320, y: 340 }),
  ],
  links: [link('l1', 'r1', 'r2'), link('l2', 'r2', 'r3'), link('l3', 'r1', 'r3')],
}

const bgpTopology: Topology = {
  nodes: [
    router('r1', 'AS65001\n1.1.1.1', '1.1.1.1', 'AA:00:00:00:00:01', { x: 120, y: 220 }),
    router('r2', 'AS65002\n2.2.2.2', '2.2.2.2', 'AA:00:00:00:00:02', { x: 520, y: 220 }),
  ],
  links: [link('l1', 'r1', 'r2', '1Gbps')],
}

// トランスポート系
const tcpWindowTopology: Topology = {
  nodes: [
    host('client', 'Client', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 100, y: 220 }),
    host('server', 'Server', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'client', 'server', '100Mbps')],
}

// アプリケーション系
const httpTopology: Topology = {
  nodes: [
    host('client', 'Browser', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 100, y: 220 }),
    host('server', 'Web Server\n:80/:443', '192.168.1.100', 'AA:BB:CC:DD:EE:FF', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'client', 'server')],
}

const smtpTopology: Topology = {
  nodes: [
    host('client', 'Mail Client', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 220 }),
    host('mail', 'SMTP Server\nsmtp.example.com', '192.168.1.25', 'AA:BB:CC:00:00:25', { x: 310, y: 220 }),
    internet('relay', 'MX Server\nrecipient.com', '203.0.113.25', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'client', 'mail'), link('l2', 'mail', 'relay')],
}

const ftpTopology: Topology = {
  nodes: [
    host('client', 'FTP Client', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 120, y: 220 }),
    host('server', 'FTP Server', '192.168.1.50', 'AA:BB:CC:00:00:50', { x: 520, y: 220 }),
  ],
  links: [link('l1', 'client', 'server')],
}

// セキュリティ系
const firewallTopology: Topology = {
  nodes: [
    internet('outside', 'Internet\n203.0.113.5', '203.0.113.5', { x: 60, y: 220 }),
    firewall('fw', 'Firewall', '192.168.0.1', { x: 240, y: 220 }),
    host('web', 'Web Server\n10.0.0.10', '10.0.0.10', 'AA:BB:CC:00:00:10', { x: 440, y: 140 }),
    host('db', 'DB Server\n10.0.0.20', '10.0.0.20', 'AA:BB:CC:00:00:20', { x: 440, y: 310 }),
  ],
  links: [
    link('l1', 'outside', 'fw'), link('l2', 'fw', 'web'), link('l3', 'fw', 'db'),
  ],
}

const tlsTopology: Topology = {
  nodes: [
    host('client', 'Browser', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 100, y: 220 }),
    host('server', 'HTTPS Server\nexample.com', '203.0.113.100', 'AA:BB:CC:00:FF:00', { x: 540, y: 220 }),
  ],
  links: [link('l1', 'client', 'server')],
}

const arpSpoofTopology: Topology = {
  nodes: [
    host('victim', 'Victim\n192.168.1.10', '192.168.1.10', 'AA:AA:AA:AA:AA:AA', { x: 100, y: 220 }),
    host('attacker', 'Attacker\n192.168.1.30', '192.168.1.30', 'CC:CC:CC:CC:CC:CC', { x: 320, y: 100 }),
    router('gw', 'Gateway\n192.168.1.1', '192.168.1.1', 'BB:BB:BB:BB:BB:BB', { x: 540, y: 220 }),
  ],
  links: [
    link('l1', 'victim', 'attacker'), link('l2', 'attacker', 'gw'), link('l3', 'victim', 'gw'),
  ],
}

const synFloodTopology: Topology = {
  nodes: [
    host('attacker', 'Attacker\n(Spoofed IPs)', '10.99.0.1', 'CC:CC:CC:CC:CC:CC', { x: 80, y: 220 }),
    host('client', 'Legitimate\nClient', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 80, y: 360 }),
    host('server', 'Server\n10.0.0.10', '10.0.0.10', 'AA:BB:CC:00:00:10', { x: 540, y: 280 }),
  ],
  links: [link('l1', 'attacker', 'server'), link('l2', 'client', 'server')],
}

// キャンパス系
const campusTopology: Topology = {
  nodes: [
    router('core', 'Core L3 SW\n10.0.0.1', '10.0.0.1', 'AA:00:01:00:00:01', { x: 320, y: 80 }),
    sw('dist1', 'Dist SW1\n(Floor 1)', { x: 150, y: 250 }),
    sw('dist2', 'Dist SW2\n(Floor 2)', { x: 490, y: 250 }),
    host('host1', 'PC Floor1', '192.168.10.10', 'AA:BB:CC:DD:01:01', { x: 60, y: 390 }),
    host('host2', 'IP Phone', '192.168.50.10', 'AA:BB:CC:DD:50:01', { x: 240, y: 390 }),
    host('host3', 'PC Floor2', '192.168.20.10', 'CC:DD:EE:FF:02:01', { x: 580, y: 390 }),
  ],
  links: [
    link('l1', 'core', 'dist1', '10GbE'), link('l2', 'core', 'dist2', '10GbE'),
    link('l3', 'dist1', 'host1'), link('l4', 'dist1', 'host2'), link('l5', 'dist2', 'host3'),
  ],
}

const interVlanTopology: Topology = {
  nodes: [
    router('l3sw', 'L3 Switch\n(SVI)', '192.168.10.1', 'AA:00:00:01:00:00', { x: 320, y: 100 }),
    host('host1', 'Sales\n192.168.10.10', '192.168.10.10', 'AA:BB:CC:DD:EE:01', { x: 120, y: 320 }),
    host('host2', 'Dev\n192.168.20.20', '192.168.20.20', 'CC:DD:EE:FF:00:02', { x: 520, y: 320 }),
  ],
  links: [link('l1', 'l3sw', 'host1'), link('l2', 'l3sw', 'host2')],
}

const hsrpTopology: Topology = {
  nodes: [
    router('r1', 'R1 (Active)\nPri=110', '192.168.1.2', 'AA:00:00:00:00:01', { x: 180, y: 150 }),
    router('r2', 'R2 (Standby)\nPri=100', '192.168.1.3', 'AA:00:00:00:00:02', { x: 460, y: 150 }),
    host('host1', 'PC\n192.168.1.10', '192.168.1.10', 'AA:BB:CC:DD:EE:01', { x: 220, y: 340 }),
    host('host2', 'PC\n192.168.1.20', '192.168.1.20', 'AA:BB:CC:DD:EE:02', { x: 420, y: 340 }),
  ],
  links: [
    link('l1', 'r1', 'r2'), link('l2', 'r1', 'host1'), link('l3', 'r1', 'host2'),
    link('l4', 'r2', 'host1'), link('l5', 'r2', 'host2'),
  ],
}

const multicastTopology: Topology = {
  nodes: [
    host('source', 'Video Server\n10.0.0.100', '10.0.0.100', 'AA:BB:CC:00:00:FF', { x: 60, y: 220 }),
    router('router1', 'PIM Router\n10.0.0.1', '10.0.0.1', 'AA:00:00:00:00:01', { x: 280, y: 220 }),
    host('host1', 'Receiver-A\n10.0.1.10', '10.0.1.10', 'AA:BB:CC:DD:EE:01', { x: 520, y: 120 }),
    host('host2', 'Receiver-B\n10.0.2.10', '10.0.2.10', 'AA:BB:CC:DD:EE:02', { x: 520, y: 320 }),
  ],
  links: [
    link('l1', 'source', 'router1'),
    link('l2', 'router1', 'host1'), link('l3', 'router1', 'host2'),
  ],
}

// 高度なルーティング系
const ospfMultiAreaTopology: Topology = {
  nodes: [
    router('core', 'Core R\nArea 0', '10.0.0.1', 'AA:00:00:00:00:01', { x: 320, y: 120 }),
    router('abr', 'ABR\nArea 0+1', '10.0.0.2', 'AA:00:00:00:00:02', { x: 180, y: 280 }),
    router('edge', 'Edge R\nArea 1', '10.1.0.1', 'AA:00:00:00:00:03', { x: 60, y: 380 }),
    router('asbr', 'ASBR\n(BGP/ISP)', '10.0.0.3', 'AA:00:00:00:00:04', { x: 460, y: 280 }),
  ],
  links: [
    link('l1', 'core', 'abr'), link('l2', 'abr', 'edge'),
    link('l3', 'core', 'asbr'),
  ],
}

const bgpPathTopology: Topology = {
  nodes: [
    router('r1', 'My AS\n65001', '1.1.1.1', 'AA:00:00:00:00:01', { x: 100, y: 220 }),
    router('isp1', 'ISP-1\nAS65100-200', '10.1.0.1', 'AA:00:00:00:00:02', { x: 350, y: 120 }),
    router('isp2', 'ISP-2\nAS65300', '10.2.0.1', 'AA:00:00:00:00:03', { x: 350, y: 320 }),
    internet('goog', 'Google\n8.8.8.0/24', '8.8.8.1', { x: 560, y: 220 }),
  ],
  links: [
    link('l1', 'r1', 'isp1'), link('l2', 'r1', 'isp2'),
    link('l3', 'isp1', 'goog'), link('l4', 'isp2', 'goog'),
  ],
}

const dijkstraTopology: Topology = {
  nodes: [
    router('r1', 'R1\n(Source)', '10.0.1.1', 'AA:00:00:00:00:01', { x: 80, y: 220 }),
    router('r2', 'R2\ncost=10', '10.0.2.1', 'AA:00:00:00:00:02', { x: 260, y: 110 }),
    router('r3', 'R3\ncost=20', '10.0.3.1', 'AA:00:00:00:00:03', { x: 260, y: 330 }),
    router('r4', 'R4\n(Dest)', '10.0.4.1', 'AA:00:00:00:00:04', { x: 520, y: 220 }),
  ],
  links: [
    link('l1', 'r1', 'r2', 'cost=10'), link('l2', 'r1', 'r3', 'cost=20'),
    link('l3', 'r2', 'r4', 'cost=15'), link('l4', 'r3', 'r4', 'cost=3'),
  ],
}

// 設計演習用トポロジー
const designSmallTopology: Topology = {
  nodes: [
    internet('isp', 'ISP / Internet', '203.0.113.1', { x: 60, y: 220 }),
    router('gw', 'Broadband\nRouter (NAPT)', '192.168.1.1', 'AA:BB:CC:00:00:01', { x: 240, y: 220 }),
    sw('sw1', 'L2 Switch\n(24-port)', { x: 420, y: 220 }),
    host('pc1', 'PC×15\n(DHCP)', '192.168.1.100', 'AA:BB:CC:DD:EE:01', { x: 560, y: 120 }),
    host('nas', 'NAS / Printer', '192.168.1.10', 'AA:BB:CC:00:00:10', { x: 560, y: 320 }),
  ],
  links: [
    link('l1', 'isp', 'gw'), link('l2', 'gw', 'sw1'),
    link('l3', 'sw1', 'pc1'), link('l4', 'sw1', 'nas'),
  ],
}

const designEnterpriseTopology: Topology = {
  nodes: [
    internet('isp', 'Dual ISP', '203.0.113.1', { x: 60, y: 220 }),
    firewall('fw', 'Firewall\n(HA Cluster)', '10.0.0.1', { x: 220, y: 220 }),
    sw('core', 'Core L3 SW\n(HSRP)', { x: 400, y: 130 }),
    host('web', 'Web/Mail\n(DMZ)', '10.10.0.10', 'AA:BB:CC:00:FF:10', { x: 400, y: 330 }),
    host('internal', 'Internal\nLAN', '10.20.0.0', 'AA:BB:CC:00:00:FF', { x: 570, y: 220 }),
  ],
  links: [
    link('l1', 'isp', 'fw'), link('l2', 'fw', 'core'),
    link('l3', 'fw', 'web'), link('l4', 'core', 'internal'),
  ],
}

// ---- シナリオ一覧 ----

export const NETWORK_SCENARIOS: NetworkScenario[] = [
  // === model ===
  {
    id: 'osi_model',
    category: 'model',
    title:       { ja: 'OSIモデルとカプセル化', en: 'OSI Model & Encapsulation' },
    description: { ja: 'HTTPリクエストが7層のOSI参照モデルを通過する様子を可視化します。各層でヘッダーが付加（カプセル化）され、受信側では逆順に取り除かれます（デカプセル化）。', en: 'Visualize how an HTTP request traverses the 7-layer OSI reference model. Headers are added (encapsulation) at each layer, and removed in reverse order at the receiver (decapsulation).' },
    rfcNumbers:  [],
    useCases:    { ja: 'ネットワークトラブルシューティング、プロトコル設計、試験学習', en: 'Network troubleshooting, protocol design, certification study' },
    visualGuide: { ja: '左パネル（送信側）でヘッダーが積み重なり（カプセル化↓）、パケットが伝送されたあと右パネル（受信側）でヘッダーが取り除かれる（デカプセル化↑）様子を確認してください。', en: 'Watch headers accumulate on the left (sender encapsulation ↓), then the packet travels to the right (receiver decapsulation ↑) where headers are stripped layer by layer.' },
    topology: osiTopology,
    simulate: osiModelSimulator,
  },
  {
    id: 'tcp_ip_model',
    category: 'model',
    title:       { ja: 'TCP/IPモデル（4層）', en: 'TCP/IP Model (4 Layers)' },
    description: { ja: 'インターネットの実装基盤であるTCP/IPモデルの4層構造（アプリケーション・トランスポート・インターネット・リンク）とOSI参照モデルとの対応を学びます。', en: 'Learn the 4-layer TCP/IP model (Application, Transport, Internet, Link) that underlies the internet, and how it maps to the OSI reference model.' },
    rfcNumbers:  ['RFC 1122'],
    useCases:    { ja: 'インターネットプロトコルの理解、試験学習（CCNA/応用情報）', en: 'Understanding internet protocols, certification study (CCNA/CompTIA)' },
    visualGuide: { ja: '各ステップでどの層のプロトコルが動いているかを確認してください。', en: 'Follow which layer\'s protocol is active at each step.' },
    topology: osiTopology,
    simulate: tcpIpModelSimulator,
  },

  // === addressing ===
  {
    id: 'ip_classful',
    category: 'addressing',
    title:       { ja: 'IPクラスフルアドレッシング', en: 'IP Classful Addressing' },
    description: { ja: 'クラスA・B・C・D・Eの範囲と用途、プライベートアドレス（RFC 1918）を学びます。CIDRが登場する前の歴史的な分類方式です。', en: 'Learn Class A/B/C/D/E ranges and usage, plus RFC 1918 private addresses. Historical classification before CIDR.' },
    rfcNumbers:  ['RFC 791', 'RFC 1918'],
    useCases:    { ja: 'ネットワーク設計の基礎知識、試験対策', en: 'Basic networking knowledge, certification prep' },
    visualGuide: { ja: '各ステップでクラスの先頭ビットパターンとアドレス範囲を確認してください。', en: 'Check leading bit patterns and address ranges for each class at each step.' },
    topology: simpleHostRouterTopology,
    simulate: ipClassfulSimulator,
  },
  {
    id: 'subnetting',
    category: 'addressing',
    title:       { ja: 'サブネッティングとCIDR', en: 'Subnetting & CIDR' },
    description: { ja: '192.168.1.0/24 を /25・/26 に分割するサブネット計算を可視化します。ホスト数・ネットワークアドレス・ブロードキャストアドレスの算出方法を学びます。', en: 'Visualize splitting 192.168.1.0/24 into /25 and /26 subnets. Learn to compute host count, network address, and broadcast address.' },
    rfcNumbers:  ['RFC 4632'],
    useCases:    { ja: 'ネットワーク設計、IPアドレス管理（IPAM）、試験対策', en: 'Network design, IP address management (IPAM), certification prep' },
    visualGuide: { ja: '右パネルのサブネット情報で各ステップのネットワーク/ブロードキャストアドレスを確認。', en: 'Check subnet info panel on the right for network/broadcast addresses at each step.' },
    topology: simpleHostRouterTopology,
    simulate: subnettingSimulator,
  },
  {
    id: 'vlsm',
    category: 'addressing',
    title:       { ja: 'VLSM（可変長サブネットマスク）', en: 'VLSM (Variable Length Subnet Masking)' },
    description: { ja: '部署ごとに異なるサイズのサブネットを割り当てるVLSMを学びます。10.0.0.0/24 を 100台・50台・25台・2台の4つのサブネットに無駄なく分割します。', en: 'Learn VLSM by allocating different-sized subnets per department. Split 10.0.0.0/24 efficiently for 100, 50, 25, and 2 hosts.' },
    rfcNumbers:  ['RFC 1009', 'RFC 4632'],
    useCases:    { ja: 'IPアドレス節約、効率的なルーティング集約、エンタープライズ設計', en: 'IP address conservation, efficient route aggregation, enterprise design' },
    visualGuide: { ja: '大きなサブネットから順に割り付ける（ベストフィット法）ことに注目してください。', en: 'Notice that subnets are allocated from largest to smallest (best-fit allocation).' },
    topology: simpleHostRouterTopology,
    simulate: vlsmSimulator,
  },
  {
    id: 'nat_napt',
    category: 'addressing',
    title:       { ja: 'NAT/NAPTの動作', en: 'NAT/NAPT Operation' },
    description: { ja: 'NAPTがプライベートIPとポートをグローバルIPにマッピングする様子をパケットアニメーションで可視化します。複数の端末が1つのグローバルIPを共有できる理由を学びます。', en: 'Animate how NAPT maps private IPs and ports to a global IP. Learn why multiple hosts can share one global IP.' },
    rfcNumbers:  ['RFC 3022', 'RFC 2993'],
    useCases:    { ja: '家庭・企業でのインターネット接続、IPv4アドレス節約', en: 'Internet access in home/enterprise, IPv4 address conservation' },
    visualGuide: { ja: 'パケットがNATルーターを通過するたびにIPとポートが変換されることをパケット詳細で確認。', en: 'Check packet details to see IP and port rewritten each time the packet passes through the NAT router.' },
    topology: natTopology,
    simulate: natNaptSimulator,
  },
  {
    id: 'ipv6_intro',
    category: 'addressing',
    title:       { ja: 'IPv6入門', en: 'IPv6 Introduction' },
    description: { ja: 'IPv6の128ビットアドレス表記・省略規則・特殊アドレス（リンクローカル・グローバルユニキャスト）・SLAAC・移行技術（デュアルスタック・NAT64）を学びます。', en: 'Learn IPv6 128-bit addressing, compression rules, special addresses (link-local, global unicast), SLAAC, and transition technologies (dual stack, NAT64).' },
    rfcNumbers:  ['RFC 8200', 'RFC 4862', 'RFC 6146'],
    useCases:    { ja: 'IPv4枯渇対応、ISP・データセンター・モバイル網', en: 'IPv4 exhaustion response, ISP/datacenter/mobile networks' },
    visualGuide: { ja: '各ステップでIPv6アドレスの構造と省略ルールに注目してください。', en: 'Focus on IPv6 address structure and compression rules at each step.' },
    topology: simpleHostRouterTopology,
    simulate: ipv6Simulator,
  },

  // === switching ===
  {
    id: 'arp',
    category: 'switching',
    title:       { ja: 'ARPの仕組み', en: 'How ARP Works' },
    description: { ja: 'Address Resolution Protocol (ARP) は、IPアドレスからMACアドレスを解決するプロトコルです。ブロードキャストで問い合わせ、対象ホストのみが返答します。', en: 'Address Resolution Protocol (ARP) resolves IP addresses to MAC addresses. A broadcast query is sent, and only the target host replies.' },
    rfcNumbers:  ['RFC 826'],
    useCases:    { ja: '同一L2セグメント内の通信開始時、NIC換装後のテーブル更新、ARP詐称(ARP Spoofing)攻撃の理解', en: 'Starting communication within the same L2 segment, updating tables after NIC replacement, understanding ARP Spoofing attacks' },
    visualGuide: { ja: 'ブロードキャストパケット（黄）が全ノードに届き、ユニキャストの Reply（緑）が返ることに注目。ARPテーブルが右パネルに表示されます。', en: 'Watch the broadcast packet (yellow) reach all nodes, and a unicast Reply (green) return. ARP table is shown in the right panel.' },
    topology: arpTopology,
    simulate: arpSimulator,
  },
  {
    id: 'csma_cd',
    category: 'switching',
    title:       { ja: 'CSMA/CD（衝突検知）', en: 'CSMA/CD (Collision Detection)' },
    description: { ja: '初期のイーサネット（半二重）で使われたCSMA/CDアクセス制御方式を学びます。衝突発生→ジャム信号→指数バックオフ→再送の流れをステップで確認します。', en: 'Learn CSMA/CD used in early (half-duplex) Ethernet. Follow collision → jam signal → exponential backoff → retransmit steps.' },
    rfcNumbers:  ['IEEE 802.3'],
    useCases:    { ja: 'イーサネットの歴史理解、試験対策（CCNA/応用情報）', en: 'Understanding Ethernet history, certification prep' },
    visualGuide: { ja: 'ケーブル上で2つのフレームが衝突するシナリオを追ってください。', en: 'Follow the scenario where two frames collide on the cable.' },
    topology: csmaCdTopology,
    simulate: csmaCdSimulator,
  },
  {
    id: 'mac_learning',
    category: 'switching',
    title:       { ja: 'スイッチのMACアドレス学習', en: 'Switch MAC Address Learning' },
    description: { ja: 'スイッチがフレーム受信時に送信元MACアドレスを学習し、宛先不明時にフラッディング、既知時に直接転送に切り替わる仕組みをアニメーションで確認します。', en: 'Animate how a switch learns source MAC addresses, floods for unknown destinations, and then forwards directly once the destination is learned.' },
    rfcNumbers:  ['IEEE 802.1D'],
    useCases:    { ja: 'スイッチングの基礎理解、L2フォワーディングのトラブルシューティング', en: 'Understanding L2 switching, troubleshooting L2 forwarding' },
    visualGuide: { ja: 'フラッディングからダイレクト転送に変わる瞬間と、右パネルのMACテーブルが増えていく様子に注目。', en: 'Watch the moment switching changes from flooding to direct forwarding, and the MAC table growing in the right panel.' },
    topology: macLearningTopology,
    simulate: macLearningSimulator,
  },
  {
    id: 'vlan_concept',
    category: 'switching',
    title:       { ja: 'VLANの概念', en: 'VLAN Concept' },
    description: { ja: 'IEEE 802.1Qで標準化されたVLANによるL2ブロードキャストドメインの分割を学びます。アクセスポートとトランクポートの役割、VLAN間通信にはルーターが必要な理由を確認します。', en: 'Learn VLAN (IEEE 802.1Q) L2 broadcast domain segmentation. Understand access vs trunk ports, and why inter-VLAN routing needs a router.' },
    rfcNumbers:  ['IEEE 802.1Q'],
    useCases:    { ja: 'セキュリティ分離、帯域管理、VoIPと業務トラフィックの分離', en: 'Security isolation, bandwidth management, VoIP/data separation' },
    visualGuide: { ja: 'VLAN10（青）とVLAN20（橙）のノードが色分けされます。別VLANのノード間にはパケットが届きません。', en: 'VLAN10 (blue) and VLAN20 (orange) nodes are color-coded. Packets cannot reach nodes in different VLANs.' },
    topology: vlanTopology,
    simulate: vlanConceptSimulator,
  },
  {
    id: 'vlan_trunk',
    category: 'switching',
    title:       { ja: '802.1Qトランキング', en: '802.1Q VLAN Trunking' },
    description: { ja: 'スイッチ間リンクで複数のVLANフレームを伝送する802.1Qトランキングを学びます。4バイトのVLANタグ（TPID+VID）のフォーマット、ネイティブVLANの注意点を確認します。', en: 'Learn 802.1Q trunking for carrying multiple VLAN frames on a single link. Examine the 4-byte VLAN tag format (TPID+VID) and native VLAN pitfalls.' },
    rfcNumbers:  ['IEEE 802.1Q'],
    useCases:    { ja: 'スイッチ間接続、ルーターへのトランク接続、VLANの拡張', en: 'Switch-to-switch, router connection, VLAN extension across devices' },
    visualGuide: { ja: 'トランクリンク上のパケットにVLANタグが挿入される様子をパケット詳細で確認。', en: 'Check packet details to see VLAN tags inserted on the trunk link.' },
    topology: vlanTrunkTopology,
    simulate: vlanTrunkSimulator,
  },
  {
    id: 'stp_phases',
    category: 'switching',
    title:       { ja: 'STPフェーズと役割', en: 'STP Phases & Roles' },
    description: { ja: 'スパニングツリープロトコル（IEEE 802.1D）のルートブリッジ選出、ポート役割（ルート/指定/非指定）、ポート状態遷移（Blocking→Listening→Learning→Forwarding）を学びます。', en: 'Learn STP (802.1D) root bridge election, port roles (Root/Designated/Non-designated), and port state transitions (Blocking→Listening→Learning→Forwarding).' },
    rfcNumbers:  ['IEEE 802.1D', 'IEEE 802.1w'],
    useCases:    { ja: 'ループフリーなL2設計、冗長リンク構成、RSTP/PVSTの理解', en: 'Loop-free L2 design, redundant link topology, understanding RSTP/PVST' },
    visualGuide: { ja: 'SW2-SW3間のリンクが「Blocking」になってループが防止される様子を確認してください。', en: 'Watch the SW2-SW3 link enter "Blocking" state to prevent loops.' },
    topology: stpTopology,
    simulate: stpPhasesSimulator,
  },
  {
    id: 'stp_reconverge',
    category: 'switching',
    title:       { ja: 'STP再コンバージェンス', en: 'STP Reconvergence' },
    description: { ja: 'ルートブリッジへの接続リンクが切断されたとき、ブロッキングポートがForwardingに遷移してトポロジーが再収束する過程を学びます。RSTPによる改善も解説します。', en: 'Learn how a blocking port transitions to Forwarding when the root bridge link fails, reconverging the topology. Also covers RSTP improvements.' },
    rfcNumbers:  ['IEEE 802.1D', 'IEEE 802.1w'],
    useCases:    { ja: 'ネットワーク障害時の自動回復、STP収束時間の最適化', en: 'Automatic recovery after network failure, STP convergence time optimization' },
    visualGuide: { ja: 'リンク障害後に TCN が送出され、ブロッキングポートが開放されていく様子を追ってください。', en: 'Follow TCN propagation after link failure and watch the blocking port open up.' },
    topology: stpTopology,
    simulate: stpReconvergeSimulator,
  },

  // === routing ===
  {
    id: 'icmp_ping',
    category: 'routing',
    title:       { ja: 'pingとTTL減算', en: 'ping & TTL Decrement' },
    description: { ja: 'ICMP Echo Request/Reply でホスト間の疎通を確認します。ルーターを経由するたびにTTLが1減算され、0になると「Time Exceeded」が返ります。これがtracerouteの仕組みです。', en: 'ICMP Echo Request/Reply tests host connectivity. TTL decrements by 1 at each router; when it reaches 0, a Time Exceeded message is returned. This is the basis of traceroute.' },
    rfcNumbers:  ['RFC 792'],
    useCases:    { ja: '疎通確認、ネットワーク遅延測定、traceroute による経路探索', en: 'Connectivity testing, latency measurement, path discovery with traceroute' },
    visualGuide: { ja: 'ルーターでTTL値が変化する様子をパケット詳細で確認してください。最後のTTL=1シナリオでTime Exceededが返る仕組みに注目。', en: 'Check packet details to see TTL changing at the router. In the last TTL=1 scenario, watch how Time Exceeded is returned.' },
    topology: icmpTopology,
    simulate: icmpSimulator,
  },
  {
    id: 'default_gateway',
    category: 'routing',
    title:       { ja: 'デフォルトゲートウェイとルーティング', en: 'Default Gateway & Routing' },
    description: { ja: 'ホストが自サブネット外の宛先へパケットを送る際の「デフォルトゲートウェイへ転送」の動作を学びます。最長一致優先ルールと0.0.0.0/0のデフォルトルートを確認します。', en: 'Learn how hosts forward packets to the default gateway for out-of-subnet destinations. Examine longest prefix match and the 0.0.0.0/0 default route.' },
    rfcNumbers:  ['RFC 1122'],
    useCases:    { ja: 'ネットワーク基礎、デフォルトルート設計、ホストの通信フロー理解', en: 'Networking basics, default route design, understanding host traffic flow' },
    visualGuide: { ja: 'パケットが宛先サブネット外なためゲートウェイへ転送されるフローを確認。', en: 'Watch the packet forwarded to gateway because destination is outside subnet.' },
    topology: defaultGwTopology,
    simulate: defaultGatewaySimulator,
  },
  {
    id: 'rip',
    category: 'routing',
    title:       { ja: 'RIP（距離ベクトル型ルーティング）', en: 'RIP (Distance Vector Routing)' },
    description: { ja: 'RIP v2の距離ベクトルアルゴリズムによるルーティングテーブルの更新過程を学びます。ホップ数メトリック・30秒周期のアップデート・収束の仕組みと限界を確認します。', en: 'Learn RIP v2 routing table updates via distance vector algorithm. Hop count metric, 30s periodic updates, convergence and limitations.' },
    rfcNumbers:  ['RFC 1058', 'RFC 2453'],
    useCases:    { ja: '小規模ネットワーク（15ホップ以下）、ルーティングの基礎学習', en: 'Small networks (≤15 hops), foundational routing study' },
    visualGuide: { ja: 'RIP Update パケット（黄緑）が広がるにつれてルーティングテーブルが収束する様子を確認。', en: 'Watch routing tables converge as RIP Update packets (yellow-green) propagate.' },
    topology: ripTopology,
    simulate: ripSimulator,
  },
  {
    id: 'ospf',
    category: 'routing',
    title:       { ja: 'OSPFルーティングプロトコル', en: 'OSPF Routing Protocol' },
    description: { ja: 'OSPFのHello→ネイバー確立→LSAフラッディング→SPF計算の流れを可視化します。リンク状態データベース（LSDB）が全ルーターで同期される様子を確認してください。', en: 'Visualize OSPF: Hello → neighbor establishment → LSA flooding → SPF computation. Watch the Link State Database (LSDB) synchronize across all routers.' },
    rfcNumbers:  ['RFC 2328'],
    useCases:    { ja: '企業内ネットワーク・データセンター内のダイナミックルーティング、障害時の自動経路切り替え', en: 'Dynamic routing in enterprise networks and data centers, automatic failover on link failure' },
    visualGuide: { ja: 'LSAフラッディングで全ルーターに情報が広がる様子と、最終的にSPFで計算されたコストに注目してください。', en: 'Watch LSA flooding spread information to all routers, and note the costs computed by SPF.' },
    topology: ospfTopology,
    simulate: ospfSimulator,
  },
  {
    id: 'ospf_dr_bdr',
    category: 'routing',
    title:       { ja: 'OSPF DR/BDR選出', en: 'OSPF DR/BDR Election' },
    description: { ja: 'マルチアクセスネットワークでのOSPF DR（Designated Router）とBDR（Backup DR）の選出メカニズムを学びます。Priority・Router IDによる選出ルールと役割分担を確認します。', en: 'Learn OSPF DR/BDR election on multi-access networks. Examine election rules using Priority and Router ID, and the roles of DR, BDR, and DROthers.' },
    rfcNumbers:  ['RFC 2328'],
    useCases:    { ja: 'マルチアクセスネットワークでのOSPFスケーラビリティ、Cisco CCNA/CCNP試験対策', en: 'OSPF scalability on multi-access segments, CCNA/CCNP exam prep' },
    visualGuide: { ja: 'Router IDとPriorityでどのルーターがDRになるかを確認してください。', en: 'Watch how Router ID and Priority determine which router becomes DR.' },
    topology: ospfDrBdrTopology,
    simulate: ospfDrBdrSimulator,
  },
  {
    id: 'bgp_basics',
    category: 'routing',
    title:       { ja: 'BGP基礎（AS間ルーティング）', en: 'BGP Basics (Inter-AS Routing)' },
    description: { ja: 'インターネットのAS間ルーティングを担うBGP4の基礎を学びます。OPEN→KEEPALIVE→UPDATEのセッション確立と、パスアトリビュート（AS_PATH・NEXT_HOP・LOCAL_PREF）を確認します。', en: 'Learn BGP4 fundamentals for inter-AS routing. Follow session establishment (OPEN→KEEPALIVE→UPDATE) and path attributes (AS_PATH, NEXT_HOP, LOCAL_PREF).' },
    rfcNumbers:  ['RFC 4271'],
    useCases:    { ja: 'ISP・大規模企業のインターネット接続、マルチホーミング設計', en: 'ISP and large enterprise internet connectivity, multihoming design' },
    visualGuide: { ja: 'BGPセッション確立のフェーズと、UPDATEで経路情報が交換される様子を確認。', en: 'Follow BGP session establishment phases and route exchange via UPDATE messages.' },
    topology: bgpTopology,
    simulate: bgpBasicsSimulator,
  },

  // === transport ===
  {
    id: 'tcp_handshake',
    category: 'transport',
    title:       { ja: 'TCPスリーウェイハンドシェイク', en: 'TCP Three-Way Handshake' },
    description: { ja: 'TCP接続確立の3ステップ（SYN→SYN-ACK→ACK）とデータ転送、接続終了（FIN）の流れを可視化します。シーケンス番号と確認応答番号の関係に注目してください。', en: 'Visualize the 3 steps of TCP connection establishment (SYN→SYN-ACK→ACK), data transfer, and connection termination (FIN). Focus on the relationship between sequence and acknowledgment numbers.' },
    rfcNumbers:  ['RFC 793', 'RFC 9293'],
    useCases:    { ja: 'Web通信・API通信・ファイル転送など、信頼性が必要なすべてのTCPアプリケーション', en: 'All TCP-based applications requiring reliability: web, API, file transfer, etc.' },
    visualGuide: { ja: 'パケットをクリックしてヘッダーを確認してください。SEQ/ACK番号がどのようにインクリメントされるかに注目。', en: 'Click packets to inspect headers. Watch how SEQ/ACK numbers increment with each exchange.' },
    topology: tcpTopology,
    simulate: tcpSimulator,
  },
  {
    id: 'tcp_sliding_window',
    category: 'transport',
    title:       { ja: 'TCPスライディングウィンドウ', en: 'TCP Sliding Window' },
    description: { ja: 'TCPのフロー制御メカニズムであるスライディングウィンドウを学びます。複数セグメントを一度に送り、ACK受信でウィンドウをスライドさせる仕組みと受信ウィンドウ（RWND）の役割を確認します。', en: 'Learn TCP sliding window flow control. Send multiple segments at once, slide window on ACK. Examine RWND and zero-window scenarios.' },
    rfcNumbers:  ['RFC 793', 'RFC 9293'],
    useCases:    { ja: '高スループットを必要とするファイル転送・ストリーミング・API通信', en: 'High-throughput file transfer, streaming, API communication' },
    visualGuide: { ja: '複数セグメントが同時に飛ぶ様子と、ACK後にウィンドウがスライドする動きを確認。', en: 'Watch multiple segments in flight simultaneously, and window sliding after ACK.' },
    topology: tcpWindowTopology,
    simulate: tcpSlidingWindowSimulator,
  },
  {
    id: 'tcp_congestion',
    category: 'transport',
    title:       { ja: 'TCP輻輳制御', en: 'TCP Congestion Control' },
    description: { ja: 'スロースタート→輻輳回避→輻輳検出のサイクルを学びます。cwnd（輻輳ウィンドウ）の増加パターン、タイムアウト/高速再送での振る舞い、TCP Reno・CUBIC・BBRの違いも解説します。', en: 'Learn the slow-start → congestion avoidance → congestion detection cycle. Examine cwnd growth patterns, timeout/fast retransmit behavior, and Reno/CUBIC/BBR differences.' },
    rfcNumbers:  ['RFC 5681', 'RFC 8312'],
    useCases:    { ja: 'ネットワーク性能分析、輻輳の原因調査、TCP チューニング', en: 'Network performance analysis, congestion root cause, TCP tuning' },
    visualGuide: { ja: 'cwndの増加グラフと、輻輳発生でリセットされる様子に注目してください。', en: 'Focus on cwnd growth and the reset after congestion is detected.' },
    topology: tcpWindowTopology,
    simulate: tcpCongestionSimulator,
  },
  {
    id: 'tcp_4way_close',
    category: 'transport',
    title:       { ja: 'TCP 4ウェイFIN（接続終了）', en: 'TCP 4-Way FIN (Connection Close)' },
    description: { ja: 'TCPの接続終了シーケンス（FIN→ACK→FIN→ACK）を学びます。半二重クローズ（Half-close）の仕組みとTIME_WAIT状態の意味、SO_REUSEADDRの役割を確認します。', en: 'Learn TCP connection close (FIN→ACK→FIN→ACK). Understand half-close, TIME_WAIT state, and SO_REUSEADDR.' },
    rfcNumbers:  ['RFC 793', 'RFC 9293'],
    useCases:    { ja: 'TCP接続の完全な理解、サーバーアプリのポート再使用設定', en: 'Full TCP understanding, server port reuse configuration' },
    visualGuide: { ja: '4ステップのFINシーケンスと最後のTIME_WAIT状態に注目。', en: 'Follow the 4-step FIN sequence and the final TIME_WAIT state.' },
    topology: tcpWindowTopology,
    simulate: tcp4WayCloseSimulator,
  },
  {
    id: 'udp_vs_tcp',
    category: 'transport',
    title:       { ja: 'UDP vs TCP比較', en: 'UDP vs TCP Comparison' },
    description: { ja: 'UDPの8バイトヘッダーとコネクションレス動作をTCPと比較します。DNS・NTP・DHCP・動画ストリーミング・ゲームでUDPが選ばれる理由、QUICの登場背景も解説します。', en: 'Compare UDP\'s 8-byte header and connectionless operation with TCP. Learn why DNS, NTP, DHCP, streaming, and games choose UDP. Also covers QUIC.' },
    rfcNumbers:  ['RFC 768', 'RFC 9000'],
    useCases:    { ja: '低遅延アプリケーション設計、プロトコル選択の判断基準', en: 'Low-latency application design, protocol selection criteria' },
    visualGuide: { ja: 'UDPパケットのシンプルさとハンドシェイクなしの送信を確認してください。', en: 'Note UDP packet simplicity and fire-and-forget transmission without handshake.' },
    topology: tcpWindowTopology,
    simulate: udpVsTcpSimulator,
  },

  // === application ===
  {
    id: 'dns_resolution',
    category: 'application',
    title:       { ja: 'DNS名前解決', en: 'DNS Name Resolution' },
    description: { ja: 'ブラウザが www.example.com を開く際の再帰的DNSクエリを可視化します。クライアント→リゾルバ→ルートDNS→TLD→権威DNSの順に問い合わせが進みます。', en: 'Visualize the recursive DNS query when a browser opens www.example.com. The query chain goes: Client → Resolver → Root DNS → TLD → Authoritative DNS.' },
    rfcNumbers:  ['RFC 1034', 'RFC 1035'],
    useCases:    { ja: 'ウェブブラウジング、メール配送、サービスディスカバリ、CDN', en: 'Web browsing, email delivery, service discovery, CDN' },
    visualGuide: { ja: 'クエリが段階的に「委任」されていく様子に注目。最後のステップでリゾルバがキャッシュする点も確認してください。', en: 'Watch queries being "referred" step by step. Note how the resolver caches the result at the last step.' },
    topology: dnsTopology,
    simulate: dnsSimulator,
  },
  {
    id: 'dhcp',
    category: 'application',
    title:       { ja: 'DHCPアドレス払い出し', en: 'DHCP Address Assignment' },
    description: { ja: 'DHCPのDORAプロセス（Discover→Offer→Request→Ack）でIPアドレスが動的に割り当てられる仕組みを可視化します。', en: 'Visualize the DHCP DORA process (Discover→Offer→Request→Ack) for dynamic IP address assignment.' },
    rfcNumbers:  ['RFC 2131'],
    useCases:    { ja: '家庭/企業ネットワークでのIP自動割り当て、Wi-Fi接続時のアドレス取得', en: 'Automatic IP assignment in home/enterprise networks, address acquisition when connecting to Wi-Fi' },
    visualGuide: { ja: 'DISCOVERとREQUESTはブロードキャスト（全ノード到達）、OFFERとACKはユニキャストであることに注目。', en: 'Note that DISCOVER and REQUEST are broadcast (reach all nodes), while OFFER and ACK are unicast.' },
    topology: dhcpTopology,
    simulate: dhcpSimulator,
  },
  {
    id: 'http_request_response',
    category: 'application',
    title:       { ja: 'HTTPリクエスト・レスポンス', en: 'HTTP Request & Response' },
    description: { ja: 'GET /index.html のHTTPリクエストとレスポンスの構造（ステータスライン・ヘッダー・ボディ）を学びます。HTTPステータスコード（200/301/404/500）とHTTP/2・HTTP/3の改善点も解説します。', en: 'Learn HTTP GET request and response structure (status line, headers, body). HTTP status codes and HTTP/2/3 improvements.' },
    rfcNumbers:  ['RFC 9110', 'RFC 9113', 'RFC 9114'],
    useCases:    { ja: 'Webアプリ開発、API設計、Webパフォーマンス最適化', en: 'Web app development, API design, web performance optimization' },
    visualGuide: { ja: 'パケット詳細でHTTPリクエスト/レスポンスのヘッダーフィールドを確認してください。', en: 'Check packet details for HTTP request/response header fields.' },
    topology: httpTopology,
    simulate: httpRequestResponseSimulator,
  },
  {
    id: 'smtp_delivery',
    category: 'application',
    title:       { ja: 'SMTPメール配送', en: 'SMTP Mail Delivery' },
    description: { ja: 'SMTPのコマンド（EHLO・MAIL FROM・RCPT TO・DATA）によるメール送信フローを学びます。MTA中継・MXレコード参照・SPF/DKIM/DMARCによるスパム対策も解説します。', en: 'Learn SMTP commands (EHLO, MAIL FROM, RCPT TO, DATA) for mail delivery. MTA relay, MX record lookup, and SPF/DKIM/DMARC anti-spam.' },
    rfcNumbers:  ['RFC 5321', 'RFC 7208', 'RFC 6376'],
    useCases:    { ja: 'メールサーバー運用、スパム対策設定、メール配送のトラブルシューティング', en: 'Mail server operation, anti-spam configuration, mail delivery troubleshooting' },
    visualGuide: { ja: 'クライアントからSMTPサーバー、そしてMXへの中継フローを追ってください。', en: 'Follow the relay flow from client to SMTP server to MX server.' },
    topology: smtpTopology,
    simulate: smtpSimulator,
  },
  {
    id: 'ftp_modes',
    category: 'application',
    title:       { ja: 'FTPアクティブ/パッシブモード', en: 'FTP Active & Passive Modes' },
    description: { ja: 'FTPの制御接続（TCP 21）とデータ接続の分離を学びます。アクティブモード（サーバーがデータ接続を開始）とパッシブモード（クライアントが開始）の違いとNAT環境での問題点を確認します。', en: 'Learn FTP control (TCP 21) and data connection separation. Understand active vs passive mode and NAT compatibility.' },
    rfcNumbers:  ['RFC 959', 'RFC 4217'],
    useCases:    { ja: 'ファイルサーバー運用、FWルール設計、FTP→SFTP移行', en: 'File server operation, firewall rule design, FTP to SFTP migration' },
    visualGuide: { ja: 'アクティブ/パッシブの接続方向の違いに注目してください。', en: 'Notice the direction of data connection initiation in active vs passive mode.' },
    topology: ftpTopology,
    simulate: ftpModesSimulator,
  },
  {
    id: 'dns_record_types',
    category: 'application',
    title:       { ja: 'DNSリソースレコードの種類', en: 'DNS Resource Record Types' },
    description: { ja: 'A・AAAA・MX・CNAME・NS・SOA・TXT・SRVレコードの役割と書式を学びます。SPF/DKIM認証やサービス検出（SRV）での活用方法も解説します。', en: 'Learn A, AAAA, MX, CNAME, NS, SOA, TXT, SRV records: roles and formats. SPF/DKIM usage and service discovery via SRV.' },
    rfcNumbers:  ['RFC 1034', 'RFC 1035', 'RFC 2782'],
    useCases:    { ja: 'ドメイン設定、メール認証設定、サービスディスカバリ', en: 'Domain configuration, mail authentication, service discovery' },
    visualGuide: { ja: '各レコードタイプのDNSクエリを確認してください。', en: 'Follow DNS queries for each record type.' },
    topology: dnsTopology,
    simulate: dnsRecordTypesSimulator,
  },

  // === advanced_routing ===
  {
    id: 'ospf_multiarea',
    category: 'advanced_routing',
    title:       { ja: 'OSPF多エリア設計', en: 'OSPF Multi-Area Design' },
    description: { ja: 'OSPF多エリア設計でLSDBサイズを制御する方法を学びます。ABR（エリア境界ルーター）・ASBR（AS境界）・サマリーLSA（Type 3/5）・スタブエリアの役割と設計方針を確認します。', en: 'Learn OSPF multi-area design to control LSDB size. ABR, ASBR, Summary LSA (Type 3/5), stub area roles and design guidelines.' },
    rfcNumbers:  ['RFC 2328'],
    useCases:    { ja: '大規模エンタープライズ、ISPバックボーン、スケーラブルなIGP設計', en: 'Large enterprise, ISP backbone, scalable IGP design' },
    visualGuide: { ja: 'ABRがエリア1の詳細LSAをArea 0にサマリーとして広告する様子を確認。', en: 'Watch ABR advertise Area 1 details as summary LSAs into Area 0.' },
    topology: ospfMultiAreaTopology,
    simulate: ospfMultiAreaSimulator,
  },
  {
    id: 'bgp_path_selection',
    category: 'advanced_routing',
    title:       { ja: 'BGPベストパス選択', en: 'BGP Best Path Selection' },
    description: { ja: 'BGPの経路選択アルゴリズムを学びます。Weight→LOCAL_PREF→AS_PATH→Origin→MED の優先順位でベストパスが決まる過程を追います。iBGP/eBGPの違いも解説します。', en: 'Learn BGP best path selection algorithm. Follow how Weight→LOCAL_PREF→AS_PATH→Origin→MED determines the best path. iBGP/eBGP differences explained.' },
    rfcNumbers:  ['RFC 4271'],
    useCases:    { ja: 'マルチホーミング設計、トラフィックエンジニアリング、ISP接続', en: 'Multihoming design, traffic engineering, ISP connectivity' },
    visualGuide: { ja: '2つの経路がどの属性でベストパスとして選択されるかを確認してください。', en: 'Watch which attribute determines the best path between two alternatives.' },
    topology: bgpPathTopology,
    simulate: bgpPathSelectionSimulator,
  },
  {
    id: 'napt_detail',
    category: 'advanced_routing',
    title:       { ja: 'NAPTテーブル詳細', en: 'NAPT Table Deep Dive' },
    description: { ja: '複数クライアントが同一グローバルIPを共有するNAPTテーブルの管理を詳しく学びます。ポートフォワーディング・ヘアピンNAT・ALG・VPN対応も解説します。', en: 'Deep dive into NAPT table management for multiple clients sharing one global IP. Port forwarding, hairpin NAT, ALG, and VPN compatibility.' },
    rfcNumbers:  ['RFC 3022', 'RFC 4787'],
    useCases:    { ja: 'ホームルーター設計、ゲーム・VoIPのNAT越え、エンタープライズNAT', en: 'Home router design, game/VoIP NAT traversal, enterprise NAT' },
    visualGuide: { ja: '複数クライアントのNATテーブルエントリがどう管理されるかを確認。', en: 'Examine how NAPT table entries are managed for multiple clients.' },
    topology: twoClientNatTopology,
    simulate: naptDetailSimulator,
  },
  {
    id: 'dijkstra_demo',
    category: 'advanced_routing',
    title:       { ja: 'ダイクストラ最短経路アルゴリズム', en: 'Dijkstra Shortest Path Algorithm' },
    description: { ja: 'OSPFのSPF計算に使われるダイクストラアルゴリズムをネットワークトポロジー上で可視化します。コスト確定の手順と最短経路木の構築を追ってください。', en: 'Visualize Dijkstra\'s algorithm on a network topology as used in OSPF SPF. Follow cost-settling steps and shortest path tree construction.' },
    rfcNumbers:  ['RFC 2328'],
    useCases:    { ja: 'OSPFの動作理解、ネットワークアルゴリズムの学習、試験対策', en: 'Understanding OSPF internals, networking algorithms, exam prep' },
    visualGuide: { ja: '各ステップで確定されるノードと更新されるコストに注目してください。', en: 'Watch nodes being settled and costs updated at each step.' },
    topology: dijkstraTopology,
    simulate: dijkstraDemoSimulator,
  },

  // === campus_network ===
  {
    id: 'campus_3tier',
    category: 'campus_network',
    title:       { ja: 'キャンパス3階層アーキテクチャ', en: 'Campus 3-Tier Architecture' },
    description: { ja: 'Cisco推奨のアクセス層・ディストリビューション層・コア層の役割分担を学びます。各層の機器選択・帯域設計・役割の明確化によるスケーラビリティと管理性の向上を確認します。', en: 'Learn Cisco\'s access, distribution, and core layer roles. Device selection, bandwidth design, and how clear separation improves scalability and manageability.' },
    rfcNumbers:  [],
    useCases:    { ja: 'エンタープライズキャンパス設計、大学・病院・工場のネットワーク計画', en: 'Enterprise campus design, university/hospital/factory network planning' },
    visualGuide: { ja: '3層の階層構造とそれぞれのノード種別（L3スイッチ/L2スイッチ/エンドデバイス）を確認。', en: 'Observe the 3-tier hierarchy and node types (L3 switch/L2 switch/end devices).' },
    topology: campusTopology,
    simulate: campus3TierSimulator,
  },
  {
    id: 'inter_vlan_routing',
    category: 'campus_network',
    title:       { ja: 'VLAN間ルーティング', en: 'Inter-VLAN Routing' },
    description: { ja: 'Router-on-a-Stick とL3スイッチSVI（Switched Virtual Interface）の2つのVLAN間ルーティング方式を学びます。ワイヤスピードでルーティングできるL3スイッチSVIが現代の標準です。', en: 'Learn two inter-VLAN routing methods: Router-on-a-Stick and L3 switch SVI. L3 switch SVI achieves wire-speed routing and is the modern standard.' },
    rfcNumbers:  ['IEEE 802.1Q'],
    useCases:    { ja: 'VLAN環境での部門間通信、キャンパスネットワーク設計', en: 'Inter-department communication in VLAN environments, campus network design' },
    visualGuide: { ja: 'パケットがL3スイッチで異なるVLANへルーティングされる様子を確認。', en: 'Watch packets routed between different VLANs at the L3 switch.' },
    topology: interVlanTopology,
    simulate: interVlanRoutingSimulator,
  },
  {
    id: 'hsrp_failover',
    category: 'campus_network',
    title:       { ja: 'HSRP障害切り替え', en: 'HSRP Failover' },
    description: { ja: 'Cisco独自のFHRP（First Hop Redundancy Protocol）であるHSRPを学びます。アクティブ/スタンバイルーターが仮想IPを共有し、障害時に自動で切り替わる仕組みをアニメーションで確認します。', en: 'Learn HSRP (Cisco FHRP). Active/standby routers share a virtual IP and automatically failover. Animate the transition.' },
    rfcNumbers:  ['RFC 2281'],
    useCases:    { ja: 'デフォルトゲートウェイ冗長化、高可用性ネットワーク設計', en: 'Default gateway redundancy, high availability network design' },
    visualGuide: { ja: 'アクティブルーターの障害後にスタンバイが昇格する切り替えの様子を確認。', en: 'Watch standby router promote to active after the active router fails.' },
    topology: hsrpTopology,
    simulate: hsrpFailoverSimulator,
  },
  {
    id: 'multicast_igmp',
    category: 'campus_network',
    title:       { ja: 'マルチキャストとIGMP', en: 'Multicast & IGMP' },
    description: { ja: 'IP マルチキャストの仕組みと、ホストがグループに参加するIGMP（v1/v2/v3）、ルーター間でツリーを構築するPIM-SM（Rendezvous Point）を学びます。', en: 'Learn IP multicast fundamentals, IGMP (v1/v2/v3) group membership, and PIM-SM (Rendezvous Point) tree building between routers.' },
    rfcNumbers:  ['RFC 3376', 'RFC 4601'],
    useCases:    { ja: 'IPTVシステム、株価配信、動画会議インフラ、マルチキャストルーティング', en: 'IPTV systems, financial data feeds, video conferencing, multicast routing' },
    visualGuide: { ja: 'IGMP Join後にマルチキャストストリームが受信者のみに届くことを確認。', en: 'After IGMP Join, verify multicast stream reaches only subscribed receivers.' },
    topology: multicastTopology,
    simulate: multicastIgmpSimulator,
  },

  // === security ===
  {
    id: 'firewall_acl',
    category: 'security',
    title:       { ja: 'ファイアウォール ACL', en: 'Firewall ACL' },
    description: { ja: 'ファイアウォールのACL（アクセスコントロールリスト）によるパケットフィルタリングを学びます。送信元IP・宛先IP・プロトコル・ポート番号による permit/deny と暗黙のdeny allを確認します。', en: 'Learn firewall ACL packet filtering by src IP, dst IP, protocol, port. Follow permit/deny rules and the implicit deny all.' },
    rfcNumbers:  [],
    useCases:    { ja: '境界防御、DMZ設計、クラウドセキュリティグループ設計', en: 'Perimeter defense, DMZ design, cloud security group design' },
    visualGuide: { ja: 'パケットがACLルールに照合されるシーケンスと、最初にマッチしたルールが適用される様子を確認。', en: 'Watch packets matched against ACL rules in sequence; the first match is applied.' },
    topology: firewallTopology,
    simulate: firewallAclSimulator,
  },
  {
    id: 'tls_handshake',
    category: 'security',
    title:       { ja: 'TLS 1.3ハンドシェイク', en: 'TLS 1.3 Handshake' },
    description: { ja: 'HTTPS・メール・VPNで使われるTLS 1.3の1-RTTハンドシェイクを学びます。ECDHE鍵交換・証明書検証・HKDF鍵導出・AES-GCM暗号化の流れをステップで確認します。', en: 'Learn TLS 1.3\'s 1-RTT handshake used in HTTPS, email, and VPN. ECDHE key exchange, certificate validation, HKDF derivation, AES-GCM encryption.' },
    rfcNumbers:  ['RFC 8446'],
    useCases:    { ja: 'HTTPS設定、証明書管理、TLS終端設計、セキュリティ監査', en: 'HTTPS configuration, certificate management, TLS termination, security audit' },
    visualGuide: { ja: 'ClientHello→ServerHello→Finishedの1-RTTフローと、暗号化データ開始のタイミングを確認。', en: 'Follow the 1-RTT flow (ClientHello→ServerHello→Finished) and when encrypted data begins.' },
    topology: tlsTopology,
    simulate: tlsHandshakeSimulator,
  },
  {
    id: 'arp_spoofing',
    category: 'security',
    title:       { ja: 'ARP詐称（MITM攻撃）', en: 'ARP Spoofing (MITM Attack)' },
    description: { ja: '攻撃者が偽のARP Replyでターゲットのゲートウェイ解決を乗っ取り、通信を傍受・改ざんするMan-in-the-Middle攻撃を学びます。Dynamic ARP InspectionやTLSによる対策も確認します。', en: 'Learn ARP Spoofing: attacker sends forged ARP Replies to intercept/modify traffic (MITM). Defenses: Dynamic ARP Inspection and TLS.' },
    rfcNumbers:  ['RFC 826'],
    useCases:    { ja: 'セキュリティ意識向上、ペネトレーションテスト、ネットワーク防御設計', en: 'Security awareness, penetration testing, network defense design' },
    visualGuide: { ja: 'ARPテーブルが汚染された後、全トラフィックが攻撃者を経由する様子を確認。', en: 'Watch all traffic route through the attacker after ARP table is poisoned.' },
    topology: arpSpoofTopology,
    simulate: arpSpoofingSimulator,
  },
  {
    id: 'syn_flood',
    category: 'security',
    title:       { ja: 'SYNフラッド攻撃', en: 'SYN Flood Attack' },
    description: { ja: 'TCP半開き接続を大量生成するDoS攻撃・SYNフラッドを学びます。サーバーのバックログキュー枯渇のメカニズムと、SYN Cookie・レート制限・DDoS緩和サービスによる防御を確認します。', en: 'Learn SYN flood DoS: mass half-open connections exhaust server backlog. Defenses: SYN Cookie, rate limiting, DDoS mitigation services.' },
    rfcNumbers:  ['RFC 4987'],
    useCases:    { ja: 'セキュリティ意識向上、DDoS対策設計、インシデント対応', en: 'Security awareness, DDoS defense design, incident response' },
    visualGuide: { ja: 'SYNパケットが大量に送信され、サーバーの接続キューが枯渇する様子を確認。', en: 'Watch the flood of SYN packets exhaust the server\'s connection queue.' },
    topology: synFloodTopology,
    simulate: synFloodSimulator,
  },

  // === design ===
  {
    id: 'design_small_office',
    category: 'design',
    title:       { ja: 'D-01：小規模オフィス設計', en: 'D-01: Small Office Design' },
    description: { ja: '20台・1フロアの小規模オフィスネットワークを設計します。インターネット接続・Wi-Fi・NAS・ゲストVLANのセキュリティ分離・コスト効率の良い機器選択を学びます。', en: 'Design a small office network (20 hosts, 1 floor). Internet, Wi-Fi, NAS, guest VLAN security separation, cost-effective device selection.' },
    rfcNumbers:  [],
    useCases:    { ja: '中小企業ネットワーク設計、ITエンジニアの基礎スキル', en: 'SMB network design, fundamental IT engineering skill' },
    visualGuide: { ja: '各ステップで設計の意図（セキュリティ/コスト/スケーラビリティ）を確認してください。', en: 'At each step, understand the design intent (security/cost/scalability).' },
    topology: designSmallTopology,
    simulate: designSmallOfficeSimulator,
  },
  {
    id: 'design_enterprise_dmz',
    category: 'design',
    title:       { ja: 'D-02：エンタープライズDMZ設計', en: 'D-02: Enterprise DMZ Design' },
    description: { ja: '300台・3フロアの中規模企業ネットワーク設計。公開サーバーのDMZ配置・ファイアウォール二重化・HSRP冗長化・3階層キャンパス設計・IPsec VPNを統合した設計演習です。', en: 'Design a mid-size enterprise network (300 clients, 3 floors). DMZ, dual firewall, HSRP redundancy, 3-tier campus, IPsec VPN integrated design.' },
    rfcNumbers:  [],
    useCases:    { ja: 'エンタープライズネットワーク設計、CCNA/CCNP試験の実践的理解', en: 'Enterprise network design, practical CCNA/CCNP understanding' },
    visualGuide: { ja: 'DMZ・内部LAN・インターネットの3ゾーン分離とファイアウォールポリシーを確認。', en: 'Observe 3-zone separation (DMZ, internal LAN, internet) and firewall policies.' },
    topology: designEnterpriseTopology,
    simulate: designEnterpriseDmzSimulator,
  },
]

export const NETWORK_CATEGORIES: NetworkCategory[] = [
  'model', 'addressing', 'switching', 'routing', 'transport', 'application',
  'advanced_routing', 'campus_network', 'security', 'design',
]

export const NETWORK_BY_CATEGORY: Record<NetworkCategory, NetworkScenario[]> = {
  model:            NETWORK_SCENARIOS.filter(s => s.category === 'model'),
  addressing:       NETWORK_SCENARIOS.filter(s => s.category === 'addressing'),
  switching:        NETWORK_SCENARIOS.filter(s => s.category === 'switching'),
  routing:          NETWORK_SCENARIOS.filter(s => s.category === 'routing'),
  transport:        NETWORK_SCENARIOS.filter(s => s.category === 'transport'),
  application:      NETWORK_SCENARIOS.filter(s => s.category === 'application'),
  advanced_routing: NETWORK_SCENARIOS.filter(s => s.category === 'advanced_routing'),
  wan:              NETWORK_SCENARIOS.filter(s => s.category === 'wan'),
  campus_network:   NETWORK_SCENARIOS.filter(s => s.category === 'campus_network'),
  security:         NETWORK_SCENARIOS.filter(s => s.category === 'security'),
  design:           NETWORK_SCENARIOS.filter(s => s.category === 'design'),
}

export const NETWORK_SCENARIO_BY_ID: Record<string, NetworkScenario> = Object.fromEntries(
  NETWORK_SCENARIOS.map(s => [s.id, s])
)

export const MAX_NETWORK_STEPS = 200
