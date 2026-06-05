import type { InfraMission } from './types'

export const textMissions: InfraMission[] = [
  {
    id: 'text-1',
    category: 'text',
    locale: {
      ja: {
        title: 'ファイルの中身を見る',
        description:
          'access.log ファイルの最初の3行を first3.txt に保存してください。\n\nhead コマンドを使います。',
        background:
          '数千行のログファイルを全部開くのは非効率です。\n' +
          'head で先頭行、tail で末尾行を確認する習慣をつけると、\n' +
          '問題の早期発見が速くなります。\n' +
          'tail -f はリアルタイムでファイルの末尾を追跡する「ログ監視の定番」です。',
        hints: [
          'head コマンドで先頭行を表示できます。-n 3 で最初の3行を指定します。',
          'head -n 3 access.log で最初の3行が表示されます。',
          '> first3.txt を追加して、結果をファイルに保存します。',
        ],
        answer: 'head -n 3 access.log > first3.txt',
        commands: [
          { cmd: 'cat [file]',      desc: 'ファイル全体を表示する' },
          { cmd: 'head -n [n] [f]', desc: '先頭n行を表示する' },
          { cmd: 'tail -n [n] [f]', desc: '末尾n行を表示する' },
          { cmd: 'tail -f [file]',  desc: 'リアルタイムで末尾を追跡する' },
          { cmd: 'less [file]',     desc: 'スクロールしながら閲覧する' },
        ],
      },
      en: {
        title: 'Viewing File Contents',
        description:
          'Save the first 3 lines of access.log to first3.txt.\n\nUse the head command.',
        background:
          'Opening thousands of lines of logs is inefficient.\n' +
          'head shows the beginning, tail shows the end — useful for quick checks.\n' +
          'tail -f is the go-to for live log monitoring.',
        hints: [
          'head shows the beginning of a file. -n 3 limits output to 3 lines.',
          'head -n 3 access.log shows the first 3 lines.',
          'Add > first3.txt to redirect the output to a file.',
        ],
        answer: 'head -n 3 access.log > first3.txt',
        commands: [
          { cmd: 'cat [file]',      desc: 'Print entire file contents' },
          { cmd: 'head -n [n] [f]', desc: 'Print first n lines' },
          { cmd: 'tail -n [n] [f]', desc: 'Print last n lines' },
          { cmd: 'tail -f [file]',  desc: 'Follow a file in real time' },
          { cmd: 'less [file]',     desc: 'Page through a file' },
        ],
      },
    },
    setupFiles: {
      '/home/user/access.log': [
        '127.0.0.1 - - [01/Jan/2024] "GET / HTTP/1.1" 200 1234',
        '127.0.0.1 - - [01/Jan/2024] "GET /api HTTP/1.1" 200 567',
        '192.168.1.1 - - [01/Jan/2024] "POST /login HTTP/1.1" 302 0',
        '192.168.1.1 - - [01/Jan/2024] "GET /dashboard HTTP/1.1" 200 4567',
        '10.0.0.1 - - [01/Jan/2024] "GET /logout HTTP/1.1" 200 123',
      ].join('\n') + '\n',
    },
    validation: { type: 'file_exists', target: '/home/user/first3.txt' },
  },

  {
    id: 'text-2',
    category: 'text',
    locale: {
      ja: {
        title: 'パターンで検索する',
        description:
          'server.log から "ERROR" を含む行だけを抽出して\nerrors.txt に保存してください。',
        background:
          '本番環境のログは1日で数十万行に達します。\n' +
          'grep でエラーを素早くフィルタリングできることが\n' +
          'インフラエンジニアの基本スキルです。\n' +
          'grep -i で大文字小文字を無視、grep -c で一致行数のカウント、\n' +
          'grep -v で「含まない行」を抽出できます。',
        hints: [
          'grep [パターン] [ファイル] でパターンを含む行を表示できます。',
          'grep "ERROR" server.log で ERROR を含む行だけ表示されます。',
          '> errors.txt を付けて結果をファイルに保存します。',
        ],
        answer: 'grep "ERROR" server.log > errors.txt',
        commands: [
          { cmd: 'grep [pat] [file]',   desc: 'パターンを含む行を表示する' },
          { cmd: 'grep -i [pat] [file]',desc: '大文字小文字を無視して検索する' },
          { cmd: 'grep -r [pat] [dir]', desc: 'ディレクトリを再帰的に検索する' },
          { cmd: 'grep -c [pat] [file]',desc: '一致した行数をカウントする' },
          { cmd: 'grep -v [pat] [file]',desc: 'パターンを含まない行を表示する' },
        ],
      },
      en: {
        title: 'Pattern Search with grep',
        description:
          'Extract all lines containing "ERROR" from server.log\nand save them to errors.txt.',
        background:
          'Production logs can reach hundreds of thousands of lines per day.\n' +
          'Quickly filtering errors with grep is a core infra skill.\n' +
          '· grep -i: case-insensitive\n' +
          '· grep -c: count matching lines\n' +
          '· grep -v: invert match (lines NOT containing the pattern)',
        hints: [
          'grep [pattern] [file] prints lines that contain the pattern.',
          'grep "ERROR" server.log shows only lines with ERROR.',
          'Add > errors.txt to save the results.',
        ],
        answer: 'grep "ERROR" server.log > errors.txt',
        commands: [
          { cmd: 'grep [pat] [file]',   desc: 'Print lines matching pattern' },
          { cmd: 'grep -i [pat] [file]',desc: 'Case-insensitive search' },
          { cmd: 'grep -r [pat] [dir]', desc: 'Search recursively in directory' },
          { cmd: 'grep -c [pat] [file]',desc: 'Count matching lines' },
          { cmd: 'grep -v [pat] [file]',desc: 'Print lines NOT matching' },
        ],
      },
    },
    setupFiles: {
      '/home/user/server.log': [
        '2024-01-01 10:00:01 INFO  Server started on port 8080',
        '2024-01-01 10:01:15 INFO  Request: GET /api/users',
        '2024-01-01 10:01:16 ERROR Database connection failed',
        '2024-01-01 10:01:17 WARN  Retrying connection (1/3)',
        '2024-01-01 10:01:18 ERROR Database connection failed',
        '2024-01-01 10:01:20 INFO  Connected to database',
        '2024-01-01 10:05:00 ERROR Timeout on /api/slow-query',
        '2024-01-01 10:10:00 INFO  Request: GET /health',
      ].join('\n') + '\n',
    },
    validation: { type: 'file_exists', target: '/home/user/errors.txt' },
  },

  {
    id: 'text-3',
    category: 'text',
    locale: {
      ja: {
        title: 'テキストを加工する',
        description:
          'data.csv の2列目（ユーザー名）だけを取り出して\nusernames.txt に保存してください。\n\nCSVの区切り文字はカンマ（,）です。',
        background:
          'awk は「列操作の王様」です。CSVやTSVのデータ処理、\nログの特定フィールド抽出など、実務で毎日使います。\n' +
          'sed は「行単位の置換ツール」で、設定ファイルの一括変更に重宝します。\n' +
          '2つを組み合わせるとテキスト処理の幅が大きく広がります。',
        hints: [
          'awk でフィールドを抽出できます。-F で区切り文字を指定します。',
          'awk -F "," \'{print $2}\' でカンマ区切りの2列目を取り出せます。',
          'awk -F "," \'{print $2}\' data.csv > usernames.txt で保存できます。',
        ],
        answer: 'awk -F "," \'{print $2}\' data.csv > usernames.txt',
        commands: [
          { cmd: 'awk -F [d] \'{print $N}\' [f]', desc: '区切り文字dでN列目を取り出す' },
          { cmd: 'sed \'s/old/new/g\' [file]',    desc: 'oldをnewに全置換する' },
          { cmd: 'cut -d [d] -f [n] [file]',     desc: '区切り文字dでN番目のフィールドを取り出す' },
          { cmd: 'sort [file]',                  desc: '行をソートする' },
          { cmd: 'uniq [file]',                  desc: '重複行を除去する' },
        ],
      },
      en: {
        title: 'Text Processing with awk',
        description:
          'Extract only the 2nd column (username) from data.csv\nand save it to usernames.txt.\n\nThe CSV delimiter is a comma (,).',
        background:
          'awk is the "king of column operations" — CSV/TSV processing and\nlog field extraction are daily tasks for infra engineers.\n' +
          'sed is a line-by-line substitution tool, great for bulk config changes.\n' +
          'Combining them unlocks powerful text transformation pipelines.',
        hints: [
          'awk can extract fields. Use -F to specify the delimiter.',
          'awk -F "," \'{print $2}\' extracts the 2nd comma-separated field.',
          'awk -F "," \'{print $2}\' data.csv > usernames.txt saves the result.',
        ],
        answer: 'awk -F "," \'{print $2}\' data.csv > usernames.txt',
        commands: [
          { cmd: 'awk -F [d] \'{print $N}\' [f]', desc: 'Extract field N with delimiter d' },
          { cmd: 'sed \'s/old/new/g\' [file]',    desc: 'Replace old with new (all occurrences)' },
          { cmd: 'cut -d [d] -f [n] [file]',     desc: 'Cut field N with delimiter d' },
          { cmd: 'sort [file]',                  desc: 'Sort lines' },
          { cmd: 'uniq [file]',                  desc: 'Remove duplicate lines' },
        ],
      },
    },
    setupFiles: {
      '/home/user/data.csv': [
        '1,alice,admin',
        '2,bob,user',
        '3,carol,user',
        '4,dave,admin',
        '5,eve,user',
      ].join('\n') + '\n',
    },
    validation: { type: 'file_exists', target: '/home/user/usernames.txt' },
  },

  {
    id: 'text-4',
    category: 'text',
    locale: {
      ja: {
        title: 'パイプとリダイレクト',
        description:
          'server.log から ERROR を含む行を取り出し、\nそれを行ごとにソートして result.txt に保存してください。\n\nパイプ（|）を使って複数のコマンドを繋いでください。',
        background:
          'Linuxの哲学は「小さなツールをパイプで繋いで大きな仕事をする」です。\n' +
          '| でコマンドの出力を次のコマンドの入力にし、\n' +
          '> で標準出力をファイルに書き出し、\n' +
          '>> で追記、2>&1 でエラーも同じ場所に流します。',
        hints: [
          'grep "ERROR" server.log でエラー行を取り出せます。',
          '| sort を追加するとパイプで sort に渡せます。',
          'grep "ERROR" server.log | sort > result.txt で一発です。',
        ],
        answer: 'grep "ERROR" server.log | sort > result.txt',
        commands: [
          { cmd: '[cmd1] | [cmd2]',   desc: 'cmd1の出力をcmd2の入力にする（パイプ）' },
          { cmd: '[cmd] > [file]',    desc: '標準出力をファイルに書き出す（上書き）' },
          { cmd: '[cmd] >> [file]',   desc: '標準出力をファイルに追記する' },
          { cmd: '[cmd] 2>&1',        desc: '標準エラーを標準出力にマージする' },
          { cmd: '[cmd] 2>/dev/null', desc: 'エラーを捨てる' },
        ],
      },
      en: {
        title: 'Pipes and Redirection',
        description:
          'Extract lines containing ERROR from server.log,\nsort them, and save to result.txt.\n\nUse the pipe (|) to connect multiple commands.',
        background:
          'The Unix philosophy: "small tools connected by pipes to do big things".\n' +
          '| pipes stdout of one command to stdin of the next.\n' +
          '> redirects stdout to a file (overwrites).\n' +
          '>> appends. 2>&1 merges stderr into stdout.',
        hints: [
          'grep "ERROR" server.log extracts error lines.',
          'Add | sort to pass the output through sort.',
          'grep "ERROR" server.log | sort > result.txt does it all in one line.',
        ],
        answer: 'grep "ERROR" server.log | sort > result.txt',
        commands: [
          { cmd: '[cmd1] | [cmd2]',   desc: 'Pipe stdout of cmd1 to stdin of cmd2' },
          { cmd: '[cmd] > [file]',    desc: 'Redirect stdout to file (overwrite)' },
          { cmd: '[cmd] >> [file]',   desc: 'Append stdout to file' },
          { cmd: '[cmd] 2>&1',        desc: 'Merge stderr into stdout' },
          { cmd: '[cmd] 2>/dev/null', desc: 'Discard error output' },
        ],
      },
    },
    setupFiles: {
      '/home/user/server.log': [
        '2024-01-01 10:00:01 INFO  Server started',
        '2024-01-01 10:01:16 ERROR Database connection failed',
        '2024-01-01 10:01:18 ERROR Database connection failed',
        '2024-01-01 10:05:00 ERROR Timeout on /api/slow-query',
        '2024-01-01 10:10:00 INFO  Health check OK',
        '2024-01-01 10:15:30 ERROR Out of memory',
      ].join('\n') + '\n',
    },
    validation: { type: 'file_exists', target: '/home/user/result.txt' },
  },

  {
    id: 'text-5',
    category: 'text',
    locale: {
      ja: {
        title: 'ログファイルを調査する',
        description:
          'app.log の中に何行の ERROR があるかを数えて、\nその数だけを error_count.txt に書き出してください。\n\n例: ファイルの内容が "3" だけの場合がクリア条件です。',
        background:
          'アラート発報の仕組みを作るとき、ログのエラー件数を定期的に監視するのが基本です。\n' +
          'grep -c でパターンに一致する行数を直接カウントできます。\n' +
          'この手法をcronと組み合わせると、定期的なログ監視スクリプトが作れます。',
        hints: [
          'grep -c でパターンにマッチした行数を返せます。',
          'grep -c "ERROR" app.log でエラー行の数が出力されます。',
          '> error_count.txt を追加してファイルに保存します。',
        ],
        answer: 'grep -c "ERROR" app.log > error_count.txt',
        commands: [
          { cmd: 'grep -c [pat] [file]', desc: 'パターンに一致した行数を表示する' },
          { cmd: 'wc -l [file]',         desc: 'ファイルの行数を数える' },
          { cmd: 'tail -f [file]',       desc: 'リアルタイムでログを追跡する' },
        ],
      },
      en: {
        title: 'Log File Investigation',
        description:
          'Count how many ERROR lines are in app.log\nand write just that number to error_count.txt.\n\nThe file should contain only a number (e.g., "3").',
        background:
          'When building alerting systems, counting errors in logs is a standard task.\n' +
          'grep -c counts matching lines directly without a separate wc -l.\n' +
          'Combined with cron, this pattern creates a periodic log monitoring script.',
        hints: [
          'grep -c counts and returns the number of matching lines.',
          'grep -c "ERROR" app.log outputs the error count.',
          'Add > error_count.txt to save it.',
        ],
        answer: 'grep -c "ERROR" app.log > error_count.txt',
        commands: [
          { cmd: 'grep -c [pat] [file]', desc: 'Count lines matching pattern' },
          { cmd: 'wc -l [file]',         desc: 'Count total lines in a file' },
          { cmd: 'tail -f [file]',       desc: 'Follow log output in real time' },
        ],
      },
    },
    setupFiles: {
      '/home/user/app.log': [
        '2024-01-01 INFO  App started',
        '2024-01-01 ERROR Failed to connect to Redis',
        '2024-01-01 INFO  Retrying...',
        '2024-01-01 ERROR Failed to connect to Redis',
        '2024-01-01 ERROR Request timeout',
        '2024-01-01 INFO  Service recovered',
      ].join('\n') + '\n',
    },
    validation: { type: 'file_exists', target: '/home/user/error_count.txt' },
  },
]
