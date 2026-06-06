// ネットワークシミュレーションミッション。
// WebContainers は本物の curl/wget を持たないため、
// 事前に用意したログ・レスポンスファイルと Node.js の fetch/URL API を使って
// ネットワークの基礎を「擬似的」に体験させる設計にしている。

import type { InfraMission } from './types'

// nginx 形式の Combined Log Format で作成したサンプルアクセスログ
// 500 エラーが 3 件、404 エラーが 2 件含まれているため、集計の練習に使える
const ACCESS_LOG = `192.168.1.10 - alice [01/Jun/2026:09:00:01 +0000] "GET /index.html HTTP/1.1" 200 2048
192.168.1.20 - bob [01/Jun/2026:09:00:05 +0000] "POST /api/login HTTP/1.1" 200 312
192.168.1.30 - carol [01/Jun/2026:09:00:08 +0000] "GET /api/users HTTP/1.1" 500 89
192.168.1.40 - dave [01/Jun/2026:09:00:12 +0000] "GET /dashboard HTTP/1.1" 200 4096
192.168.1.50 - eve [01/Jun/2026:09:00:15 +0000] "DELETE /api/users/42 HTTP/1.1" 404 0
192.168.1.10 - alice [01/Jun/2026:09:01:00 +0000] "GET /api/orders HTTP/1.1" 500 112
192.168.1.20 - bob [01/Jun/2026:09:01:10 +0000] "GET /favicon.ico HTTP/1.1" 404 0
192.168.1.30 - carol [01/Jun/2026:09:01:20 +0000] "PUT /api/users/7 HTTP/1.1" 500 78
192.168.1.40 - dave [01/Jun/2026:09:01:30 +0000] "GET /api/products HTTP/1.1" 200 1536
192.168.1.50 - eve [01/Jun/2026:09:01:40 +0000] "GET /api/stats HTTP/1.1" 200 256
`

// HTTP レスポンスヘッダーのサンプル（Content-Type の抽出練習用）
const HTTP_RESPONSE = `HTTP/1.1 200 OK
Date: Sat, 01 Jun 2026 09:00:00 GMT
Server: nginx/1.24.0
Content-Type: application/json
Content-Length: 128
Connection: keep-alive
X-Request-Id: a1b2c3d4
Cache-Control: no-cache

{"status":"ok","count":42}
`

// /etc/hosts 形式のサンプル（エントリ追加の練習用）
const HOSTS_FILE = `127.0.0.1   localhost
::1         localhost ip6-localhost
127.0.1.1   browser-lab
`

const networkMissions: InfraMission[] = [
  {
    id: 'net-1',
    category: 'network',
    locale: {
      ja: {
        title: 'アクセスログからエラーを検出する',
        description:
          '`/home/user/access.log` には Web サーバーのアクセスログが入っています。\n`grep` と `wc -l` を組み合わせて **500 エラーが何件あるか** を調べ、その結果を `/home/user/error_count.txt` に保存してください。',
        background:
          'nginx・Apache などの Web サーバーはアクセスログに HTTP ステータスコードを記録します。' +
          '500 番台はサーバー内部エラーを示し、障害調査の最初のステップはこのログ集計です。',
        hints: [
          '`grep " 500 " /home/user/access.log` で 500 エラーの行だけ抽出できます',
          '`| wc -l` をつなぐと行数を数えられます',
          '`> ファイル名` でコマンド出力をファイルに保存できます',
        ],
        answer: 'grep " 500 " /home/user/access.log | wc -l > /home/user/error_count.txt',
        commands: [
          { cmd: 'cat /home/user/access.log', desc: 'ログ全体を確認する' },
          { cmd: 'grep " 500 " /home/user/access.log', desc: '500 エラーの行だけ抽出する' },
          { cmd: 'grep " 500 " /home/user/access.log | wc -l > /home/user/error_count.txt', desc: '件数をファイルに保存する' },
        ],
      },
      en: {
        title: 'Detect Errors in Access Log',
        description:
          '`/home/user/access.log` contains a web server access log.\nUse `grep` and `wc -l` to count **how many 500 errors** exist, then save the result to `/home/user/error_count.txt`.',
        background:
          'Web servers like nginx and Apache record HTTP status codes in access logs. ' +
          '5xx codes indicate server errors, and counting them is the first step in incident response.',
        hints: [
          '`grep " 500 " /home/user/access.log` extracts only 500 error lines',
          'Pipe to `| wc -l` to count lines',
          '`> filename` redirects command output to a file',
        ],
        answer: 'grep " 500 " /home/user/access.log | wc -l > /home/user/error_count.txt',
        commands: [
          { cmd: 'cat /home/user/access.log', desc: 'View the full log' },
          { cmd: 'grep " 500 " /home/user/access.log', desc: 'Extract 500 error lines' },
          { cmd: 'grep " 500 " /home/user/access.log | wc -l > /home/user/error_count.txt', desc: 'Save the count to a file' },
        ],
      },
    },
    setupFiles: { '/home/user/access.log': ACCESS_LOG },
    validation: { type: 'file_content', target: '/home/user/error_count.txt', expected: '3' },
  },

  {
    id: 'net-2',
    category: 'network',
    locale: {
      ja: {
        title: 'hostsファイルにエントリを追加する',
        description:
          '`/home/user/hosts.txt` は `/etc/hosts` と同じ形式のファイルです。\n開発用のローカルドメイン `myapp.local` を `127.0.0.1` に割り当てる行を追記してください。',
        background:
          '`/etc/hosts` はDNSより優先される名前解決ファイルです。' +
          'ローカル開発環境でカスタムドメインを使うときや、' +
          'インフラチームが障害時に特定ホストへのルーティングを強制するために利用されます。',
        hints: [
          '`echo "127.0.0.1  myapp.local" >> /home/user/hosts.txt` で末尾に追記できます',
          '`>>` は既存内容を保持したまま追記し、`>` は上書きします',
        ],
        answer: 'echo "127.0.0.1  myapp.local" >> /home/user/hosts.txt',
        commands: [
          { cmd: 'cat /home/user/hosts.txt', desc: '現在の内容を確認する' },
          { cmd: 'echo "127.0.0.1  myapp.local" >> /home/user/hosts.txt', desc: 'エントリを追記する' },
        ],
      },
      en: {
        title: 'Add Entry to Hosts File',
        description:
          '`/home/user/hosts.txt` uses the same format as `/etc/hosts`.\nAdd a line mapping the local development domain `myapp.local` to `127.0.0.1`.',
        background:
          '`/etc/hosts` is a name resolution file that takes priority over DNS. ' +
          'It\'s used to map custom domains in local dev environments and to force routing during incidents.',
        hints: [
          '`echo "127.0.0.1  myapp.local" >> /home/user/hosts.txt` appends to the end',
          '`>>` appends; `>` overwrites',
        ],
        answer: 'echo "127.0.0.1  myapp.local" >> /home/user/hosts.txt',
        commands: [
          { cmd: 'cat /home/user/hosts.txt', desc: 'View current contents' },
          { cmd: 'echo "127.0.0.1  myapp.local" >> /home/user/hosts.txt', desc: 'Append the new entry' },
        ],
      },
    },
    setupFiles: { '/home/user/hosts.txt': HOSTS_FILE },
    validation: { type: 'file_content', target: '/home/user/hosts.txt', expected: 'myapp.local' },
  },

  {
    id: 'net-3',
    category: 'network',
    locale: {
      ja: {
        title: 'レスポンスヘッダーから値を抽出する',
        description:
          '`/home/user/response.txt` には HTTP レスポンスのヘッダーが入っています。\n`grep` と `awk` を使って `Content-Type` の値（`application/json`）だけを抽出し、' +
          '`/home/user/content_type.txt` に保存してください。',
        background:
          'HTTP ヘッダーの解析は API デバッグの基本スキルです。' +
          '`curl -I` や `curl -v` で実際のヘッダーを取得し、grep/awk でパースする手法は' +
          'インフラエンジニアの日常業務でよく使われます。',
        hints: [
          '`grep "Content-Type" /home/user/response.txt` でヘッダー行を抽出できます',
          '`awk \'{print $2}\'` で2列目（値部分）だけ取り出せます',
          'パイプで連結: `grep ... | awk ...`',
        ],
        answer: 'grep "Content-Type" /home/user/response.txt | awk \'{print $2}\' > /home/user/content_type.txt',
        commands: [
          { cmd: 'cat /home/user/response.txt', desc: 'レスポンス全体を確認する' },
          { cmd: 'grep "Content-Type" /home/user/response.txt', desc: 'Content-Type の行を抽出する' },
          { cmd: "grep 'Content-Type' /home/user/response.txt | awk '{print $2}' > /home/user/content_type.txt", desc: '値のみを保存する' },
        ],
      },
      en: {
        title: 'Extract Value from Response Header',
        description:
          '`/home/user/response.txt` contains an HTTP response with headers.\nUse `grep` and `awk` to extract only the `Content-Type` value (`application/json`) ' +
          'and save it to `/home/user/content_type.txt`.',
        background:
          'Parsing HTTP headers is a fundamental API debugging skill. ' +
          '`curl -I` or `curl -v` retrieves real headers, and the grep/awk parsing technique ' +
          'is widely used by infrastructure engineers.',
        hints: [
          '`grep "Content-Type" /home/user/response.txt` extracts the header line',
          '`awk \'{print $2}\'` prints only the 2nd column (the value)',
          'Chain with pipe: `grep ... | awk ...`',
        ],
        answer: 'grep "Content-Type" /home/user/response.txt | awk \'{print $2}\' > /home/user/content_type.txt',
        commands: [
          { cmd: 'cat /home/user/response.txt', desc: 'View the full response' },
          { cmd: 'grep "Content-Type" /home/user/response.txt', desc: 'Extract the Content-Type line' },
          { cmd: "grep 'Content-Type' /home/user/response.txt | awk '{print $2}' > /home/user/content_type.txt", desc: 'Save only the value' },
        ],
      },
    },
    setupFiles: { '/home/user/response.txt': HTTP_RESPONSE },
    validation: { type: 'file_content', target: '/home/user/content_type.txt', expected: 'application/json' },
  },

  {
    id: 'net-4',
    category: 'network',
    locale: {
      ja: {
        title: 'URLをスクリプトで解析する',
        description:
          'Node.js の URL クラスを使って URL を解析するスクリプト `/home/user/url_parse.sh` を作成してください。\n' +
          'このスクリプトは `https://api.example.com:8080/v1/users?limit=10` のホスト名（`api.example.com`）だけを出力します。',
        background:
          'URL 解析は API クライアントやリバースプロキシの設定でよく必要になります。' +
          'WebContainers 環境では curl の代わりに Node.js の組み込み API（`URL` クラス・`fetch`）で' +
          '同等の HTTP 処理を実装できます。',
        hints: [
          'スクリプト内で `node -e "..."` を使うと Node.js コードを1行で実行できます',
          '`new URL(...)` でURLをパースし、`.hostname` でホスト名を取得できます',
          '`echo \'node -e "console.log(new URL(...).hostname)"\' > /home/user/url_parse.sh` で作成できます',
        ],
        answer: 'echo \'node -e "console.log(new URL(\'\\\'\'https://api.example.com:8080/v1/users?limit=10\'\\\'\'\\).hostname)"\' > /home/user/url_parse.sh',
        commands: [
          { cmd: 'node -e "console.log(new URL(\'https://api.example.com:8080/v1\').hostname)"', desc: 'URL クラスで hostname を取得する' },
          { cmd: 'cat > /home/user/url_parse.sh', desc: 'スクリプトを作成する（Ctrl+D で終了）' },
          { cmd: 'sh /home/user/url_parse.sh', desc: 'スクリプトを実行して確認する' },
        ],
      },
      en: {
        title: 'Parse a URL with a Script',
        description:
          'Create a script `/home/user/url_parse.sh` that uses Node.js\'s URL class to parse a URL.\n' +
          'The script should output only the hostname (`api.example.com`) from `https://api.example.com:8080/v1/users?limit=10`.',
        background:
          'URL parsing is frequently needed when configuring API clients and reverse proxies. ' +
          'In WebContainers, you can use Node.js built-in APIs (the `URL` class, `fetch`) ' +
          'to implement HTTP processing instead of curl.',
        hints: [
          'Use `node -e "..."` in your script to run one-line Node.js code',
          '`new URL(...)` parses a URL; `.hostname` returns the hostname',
          '`echo \'node -e "..."\' > /home/user/url_parse.sh` creates the script',
        ],
        answer: "echo 'node -e \"console.log(new URL(\\\"https://api.example.com:8080/v1/users?limit=10\\\").hostname)\"' > /home/user/url_parse.sh",
        commands: [
          { cmd: "node -e \"console.log(new URL('https://api.example.com:8080/v1').hostname)\"", desc: 'Get hostname using the URL class' },
          { cmd: 'cat > /home/user/url_parse.sh', desc: 'Create the script (Ctrl+D to finish)' },
          { cmd: 'sh /home/user/url_parse.sh', desc: 'Run the script to verify' },
        ],
      },
    },
    validation: { type: 'command_output', cmd: 'sh /home/user/url_parse.sh', expected: 'api.example.com' },
  },
]

export { networkMissions }
