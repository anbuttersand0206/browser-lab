// アプリケーション層拡張シミュレーター
// HTTP・SMTP・FTP・DNSレコード詳細 の動作をステップで表現する

import type {
  NetworkStepGenerator, NetworkState, Topology, PacketOnLink, Packet,
} from '../types'

function empty(topology: Topology, packets: PacketOnLink[] = [], phase = 'info'): NetworkState {
  return {
    topology, packets,
    arpTables: {}, routingTables: {}, macTables: {},
    activeOsiLayer: null, capsuleLayers: [], phase,
  }
}

function pkt(
  id: string,
  type: 'http_request' | 'http_response' | 'smtp' | 'ftp_control' | 'ftp_data' | 'dns_query' | 'dns_response' | 'generic',
  from: string,
  to: string,
  progress: number,
  extras?: Record<string, string>,
): PacketOnLink {
  const packet: Packet = { id, type, header: { extras } }
  return { id: `${id}-link`, packet, fromNodeId: from, toNodeId: to, progress, broadcast: false }
}

// ---- HTTPリクエスト・レスポンス ----

export function* httpRequestResponseSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes.find(n => n.type !== 'host') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'tcp_establish'),
    log: {
      ja: 'HTTPはTCPの上で動作（HTTP/1.1・2=TCP、HTTP/3=QUIC）。まず3ウェイハンドシェイクでTCPコネクションを確立（ポート80 / 443）してからリクエスト送信。',
      en: 'HTTP runs over TCP (HTTP/1.1, 2=TCP; HTTP/3=QUIC). First establish TCP connection (port 80/443) with 3-way handshake, then send request.',
    },
  }

  const req1 = pkt('http-req', 'http_request', client.id, server.id, 0, {
    'Method': 'GET', 'Path': '/index.html', 'Protocol': 'HTTP/1.1',
    'Host': 'example.com', 'User-Agent': 'Mozilla/5.0',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
  })
  yield {
    state: empty(topology, [req1], 'request'),
    log: {
      ja: `${client.label} が GET /index.html HTTP/1.1 を送信。リクエストラインに続き、ヘッダーフィールド（Host・User-Agent・Accept 等）がCRLF区切りで続く。`,
      en: `${client.label} sends GET /index.html HTTP/1.1. Request line followed by header fields (Host, User-Agent, Accept etc.) separated by CRLF.`,
    },
    highlightPacketId: 'http-req',
  }

  yield {
    state: empty(topology, [], 'server_process'),
    log: {
      ja: `${server.label} がリクエストを受信し処理: ファイル読み取り・キャッシュ確認・認証チェック・レスポンス生成。Webサーバー（Apache/Nginx）が担当。`,
      en: `${server.label} receives and processes: file read, cache check, auth check, response generation. Web server (Apache/Nginx) handles this.`,
    },
  }

  const res1 = pkt('http-res', 'http_response', server.id, client.id, 0, {
    'Status': '200 OK', 'Protocol': 'HTTP/1.1',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': '4096', 'Cache-Control': 'max-age=3600',
    'ETag': '"abc123"', 'Transfer-Encoding': 'chunked',
  })
  yield {
    state: empty(topology, [res1], 'response'),
    log: {
      ja: `${server.label} が 200 OK レスポンスを返送。ステータスライン + レスポンスヘッダー + 空行 + ボディ（HTML）。Content-Length か Transfer-Encoding でボディ終端を通知。`,
      en: `${server.label} replies 200 OK. Status line + response headers + blank line + body (HTML). Content-Length or Transfer-Encoding indicates body end.`,
    },
    highlightPacketId: 'http-res',
  }

  yield {
    state: empty(topology, [], 'status_codes'),
    log: {
      ja: 'HTTPステータスコード: 1xx=情報(100 Continue)、2xx=成功(200 OK, 201 Created, 204 No Content)、3xx=リダイレクト(301, 302, 304 Not Modified)、4xx=クライアントエラー(400, 401, 403, 404)、5xx=サーバーエラー(500, 502, 503)。',
      en: 'HTTP status codes: 1xx=info (100 Continue), 2xx=success (200 OK, 201, 204), 3xx=redirect (301, 302, 304), 4xx=client error (400, 401, 403, 404), 5xx=server error (500, 502, 503).',
    },
  }

  yield {
    state: empty(topology, [], 'http2_3'),
    log: {
      ja: 'HTTP/2 の改善: バイナリフレーム・ストリーム多重化（1コネクションで並列リクエスト）・ヘッダー圧縮(HPACK)・サーバープッシュ。HTTP/3(QUIC): UDPベース・接続確立0-RTT・HOLブロッキング解消。',
      en: 'HTTP/2: Binary frames, stream multiplexing (parallel requests in one connection), HPACK header compression, server push. HTTP/3 (QUIC): UDP-based, 0-RTT, eliminates HOL blocking.',
    },
  }
}

// ---- SMTP ----

export function* smtpSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const mailServer = topology.nodes.find(n => n.id === 'mail') ?? topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!
  const relay = topology.nodes.find(n => n.id === 'relay')

  yield {
    state: empty(topology, [], 'concept'),
    log: {
      ja: 'SMTP（Simple Mail Transfer Protocol, RFC 5321）: メール送信プロトコル。TCPポート25（サーバー間）・587（クライアント投稿）・465（SSL）。コマンドはASCIIテキスト。',
      en: 'SMTP (RFC 5321): Mail transfer protocol. TCP port 25 (server-to-server), 587 (client submission), 465 (SSL). Commands in ASCII text.',
    },
  }

  const connect = pkt('smtp-1', 'smtp', client.id, mailServer.id, 0, {
    'Phase': 'TCP Connect', 'Port': '587',
  })
  yield {
    state: empty(topology, [connect], 'connect'),
    log: {
      ja: `メールクライアントがSMTP送信サーバーに接続（TCP 587）。サーバーが「220 smtp.example.com ESMTP」と応答。`,
      en: `Mail client connects to SMTP submission server (TCP 587). Server responds "220 smtp.example.com ESMTP".`,
    },
    highlightPacketId: 'smtp-1',
  }

  const ehlo = pkt('smtp-2', 'smtp', client.id, mailServer.id, 0, {
    'Command': 'EHLO client.example.com', 'Response': '250 server.example.com Hello',
  })
  yield {
    state: empty(topology, [ehlo], 'ehlo'),
    log: {
      ja: 'EHLO コマンドで拡張SMTP機能を確認（AUTH・STARTTLS・SIZE 等）。認証後（AUTH LOGIN / PLAIN）にメール送信が許可される。',
      en: 'EHLO command negotiates ESMTP extensions (AUTH, STARTTLS, SIZE, etc.). After AUTH, mail sending is permitted.',
    },
    highlightPacketId: 'smtp-2',
  }

  const mailfrom = pkt('smtp-3', 'smtp', client.id, mailServer.id, 0, {
    'Command': 'MAIL FROM: <alice@example.com>', 'Response': '250 OK',
  })
  yield {
    state: empty(topology, [mailfrom], 'mail_from'),
    log: {
      ja: 'MAIL FROM → RCPT TO → DATA の順でメール転送。DATA後に「.」のみの行でメール本文終了を通知。',
      en: 'MAIL FROM → RCPT TO → DATA sequence. Single "." line ends message body.',
    },
    highlightPacketId: 'smtp-3',
  }

  const delivery = pkt('smtp-4', 'smtp', mailServer.id, relay?.id ?? mailServer.id, 0, {
    'Phase': 'MTA Relay', 'MX Record': '10 mail.recipient.com',
    'Port': '25',
  })
  yield {
    state: empty(topology, [delivery], 'relay'),
    log: {
      ja: '送信サーバー（MTA）が宛先ドメインの MX レコードを DNS で取得し、宛先SMTPサーバーへポート25で転送。受信者はPOP3/IMAPで取得。',
      en: 'MTA looks up MX record of recipient domain via DNS. Forwards to destination SMTP server on port 25. Recipient retrieves via POP3/IMAP.',
    },
    highlightPacketId: 'smtp-4',
  }

  yield {
    state: empty(topology, [], 'spam_prevention'),
    log: {
      ja: 'スパム対策: SPF（IPの正当性）・DKIM（署名による送信者認証）・DMARC（SPF/DKIMポリシー強制）。現代のメール配送では3つを全て設定することが標準。',
      en: 'Spam prevention: SPF (IP authorization), DKIM (sender signature), DMARC (policy enforcement for SPF/DKIM). All three are modern standards.',
    },
  }
}

// ---- FTP（アクティブ/パッシブ） ----

export function* ftpModesSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const server = topology.nodes.find(n => n.id === 'server') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'overview'),
    log: {
      ja: 'FTP（File Transfer Protocol, RFC 959）: 制御接続（TCP 21）とデータ接続（別ポート）を分離した古典的ファイル転送プロトコル。平文通信なのでFTPS（TLS）やSFTP（SSH）を推奨。',
      en: 'FTP (RFC 959): Separates control (TCP 21) and data connections. Plaintext — FTPS (TLS) or SFTP (SSH) recommended in modern systems.',
    },
  }

  const ctrl = pkt('ftp-ctrl', 'ftp_control', client.id, server.id, 0, {
    'Connection': 'Control', 'Port': '21', 'Command': 'USER anonymous',
  })
  yield {
    state: empty(topology, [ctrl], 'control'),
    log: {
      ja: 'クライアントがサーバーの TCP 21 に接続（制御接続）。USER・PASS・LIST・RETR・STOR などのコマンドをここで送受信。データはこれとは別のポートで転送。',
      en: 'Client connects to server TCP 21 (control connection). Commands (USER, PASS, LIST, RETR, STOR) sent here. Data uses a separate port.',
    },
    highlightPacketId: 'ftp-ctrl',
  }

  yield {
    state: empty(topology, [], 'active_mode'),
    log: {
      ja: 'アクティブモード（PORT）: クライアントがポート番号を通知（PORT 192,168,1,10,195,211）→ サーバーがクライアントのそのポートへデータ接続（TCP 20 発）。NATやFWでブロックされやすい。',
      en: 'Active mode (PORT): Client specifies its port (PORT 192,168,1,10,195,211). Server initiates data connection from TCP 20 to that port. Blocked by NAT/FW easily.',
    },
  }

  const passData = pkt('ftp-data', 'ftp_data', client.id, server.id, 0, {
    'Mode': 'Passive', 'Command': 'PASV', 'Response': '227 Entering Passive Mode (192,168,1,20,200,50)',
    'Data Port': '51250',
  })
  yield {
    state: empty(topology, [passData], 'passive_mode'),
    log: {
      ja: 'パッシブモード（PASV）: クライアントがPASVコマンド送信 → サーバーがデータ接続用ポート（例:51250）を通知 → クライアントがそのポートへ接続。NATフレンドリー。',
      en: 'Passive mode (PASV): Client sends PASV → server replies with its data port (e.g. 51250) → client connects to that port. NAT-friendly.',
    },
    highlightPacketId: 'ftp-data',
  }

  yield {
    state: empty(topology, [], 'alternatives'),
    log: {
      ja: 'セキュアな代替: FTPS（FTP over TLS、RFC 4217）- 制御・データ接続を暗号化。SFTP（SSH File Transfer Protocol）- SSH上で完全に異なるプロトコル。SCP（SSH Copy）も同様。',
      en: 'Secure alternatives: FTPS (FTP over TLS, RFC 4217) — encrypts control+data. SFTP (over SSH) — completely different protocol. SCP (SSH Copy) similar.',
    },
  }
}

// ---- DNSレコード詳細 ----

export function* dnsRecordTypesSimulator(topology: Topology): NetworkStepGenerator {
  const client = topology.nodes.find(n => n.id === 'client') ?? topology.nodes[0]!
  const dns = topology.nodes.find(n => n.type === 'dns') ?? topology.nodes[1]!

  yield {
    state: empty(topology, [], 'overview'),
    log: {
      ja: 'DNS リソースレコード（RR）: ドメイン名に紐付く情報の種類を定義したもの。各レコードは「名前・TTL・クラス(IN)・タイプ・RDATA」で構成される。',
      en: 'DNS Resource Records (RR): Define information associated with domain names. Each RR: name, TTL, class (IN), type, RDATA.',
    },
  }

  const q1 = pkt('dns-q1', 'dns_query', client.id, dns.id, 0, {
    'Query': 'example.com', 'Type': 'A (IPv4 address)',
  })
  yield {
    state: empty(topology, [q1], 'a_record'),
    log: {
      ja: 'A レコード: ドメイン名→IPv4アドレス。最も基本的なレコード。example.com. IN A 93.184.216.34。TTL（Time To Live）でキャッシュ保持時間を制御。',
      en: 'A record: Domain name → IPv4 address. Most basic. e.g. example.com. IN A 93.184.216.34. TTL controls cache duration.',
    },
    highlightPacketId: 'dns-q1',
  }

  const q2 = pkt('dns-q2', 'dns_query', client.id, dns.id, 0, {
    'Query': 'example.com', 'Type': 'MX (Mail Exchanger)',
  })
  yield {
    state: empty(topology, [q2], 'mx_record'),
    log: {
      ja: 'MX レコード: メール配送先サーバーを指定。優先度付き。example.com. IN MX 10 mail.example.com. 優先度が小さいほど高優先。複数設定でフェイルオーバー可。',
      en: 'MX record: Specifies mail server(s) with priority. e.g. example.com. IN MX 10 mail.example.com. Lower priority number = higher priority. Multiple for failover.',
    },
    highlightPacketId: 'dns-q2',
  }

  yield {
    state: empty(topology, [], 'cname_ns'),
    log: {
      ja: 'CNAME レコード: ドメインの別名。www.example.com. IN CNAME example.com. — www → apex ドメインへのエイリアス。NS レコード: ゾーンの権威DNSサーバー名を指定。',
      en: 'CNAME record: Alias. www.example.com. IN CNAME example.com. — www points to apex. NS record: Specifies authoritative DNS servers for a zone.',
    },
  }

  yield {
    state: empty(topology, [], 'aaaa_ptr_soa'),
    log: {
      ja: 'AAAA レコード: ドメイン名→IPv6アドレス。PTR レコード: 逆引き（IPアドレス→ドメイン名）。SOA レコード: ゾーンのマスター情報（プライマリNS・管理者メール・シリアル番号・リフレッシュ間隔）。',
      en: 'AAAA: Domain → IPv6. PTR: Reverse lookup (IP → domain). SOA: Zone master info (primary NS, admin email, serial, refresh interval).',
    },
  }

  yield {
    state: empty(topology, [], 'txt_srv'),
    log: {
      ja: 'TXT レコード: 任意テキスト情報。SPF・DKIM・Google確認などに使用。SRV レコード: サービスの場所指定（ホスト・ポート・優先度・重み）。_sip._tcp.example.com. IN SRV 10 20 5060 sip.example.com.',
      en: 'TXT: Arbitrary text. Used for SPF, DKIM, domain verification. SRV: Service location (host, port, priority, weight). e.g. _sip._tcp.example.com. SRV 10 20 5060 sip.example.com.',
    },
  }
}
