import type { InfraMission } from './types'

export const filesystemMissions: InfraMission[] = [
  {
    id: 'fs-1',
    category: 'filesystem',
    locale: {
      ja: {
        title: 'ディレクトリを作って整理する',
        description:
          '/home/user 配下に以下のディレクトリ構成を作ってください。\n\n/home/user/\n├── projects/\n│   ├── web/\n│   └── api/\n└── logs/',
        background:
          '実務では「どこに何を置くか」という構造設計がインフラの基本です。\n' +
          'Webサーバーのログは /var/log、設定ファイルは /etc に置くといった規約がLinuxにはあります。\n' +
          'mkdir -p を使えば、中間ディレクトリをまとめて一発で作れます。',
        hints: [
          'mkdir コマンドを使います。引数にディレクトリ名を指定します。',
          '-p オプションを付けると、親ディレクトリが存在しなくても一緒に作れます。\n例: mkdir -p projects/web',
          'mkdir -p projects/web projects/api logs と実行すると、必要な構造を一度に作れます。',
        ],
        answer:
          'mkdir -p projects/web projects/api\nmkdir logs\n# または一行で:\nmkdir -p projects/web projects/api logs',
        commands: [
          { cmd: 'mkdir [dir]',     desc: 'ディレクトリを作成する' },
          { cmd: 'mkdir -p [path]', desc: '中間ディレクトリも含めて作成する' },
          { cmd: 'ls',             desc: 'カレントディレクトリの中身を一覧表示' },
          { cmd: 'ls -la',         desc: '詳細表示（権限・サイズ・日時）' },
        ],
      },
      en: {
        title: 'Create and Organize Directories',
        description:
          'Create the following directory structure under /home/user:\n\n/home/user/\n├── projects/\n│   ├── web/\n│   └── api/\n└── logs/',
        background:
          'Directory structure design is fundamental to infrastructure work.\n' +
          'Linux has conventions: /var/log for logs, /etc for configs, /home for user data.\n' +
          'mkdir -p creates all intermediate directories in a single command.',
        hints: [
          'Use the mkdir command. Pass the directory name as an argument.',
          'The -p flag creates parent directories too.\nExample: mkdir -p projects/web',
          'mkdir -p projects/web projects/api logs creates the entire structure at once.',
        ],
        answer:
          'mkdir -p projects/web projects/api\nmkdir logs\n# or all at once:\nmkdir -p projects/web projects/api logs',
        commands: [
          { cmd: 'mkdir [dir]',     desc: 'Create a directory' },
          { cmd: 'mkdir -p [path]', desc: 'Create including intermediate directories' },
          { cmd: 'ls',             desc: 'List directory contents' },
          { cmd: 'ls -la',         desc: 'Detailed view (permissions, size, date)' },
        ],
      },
    },
    setupFiles: {
      '/home/user/README.txt': 'Welcome to the filesystem module!\nYour working directory is /home/user.\n',
    },
    setupDirs: ['/home/user'],
    // 3つのディレクトリが揃ってクリア（mkdir -p で全部作ることを促す）
    validation: [
      { type: 'dir_exists', target: '/home/user/projects/web' },
      { type: 'dir_exists', target: '/home/user/projects/api' },
      { type: 'dir_exists', target: '/home/user/logs' },
    ],
  },

  {
    id: 'fs-2',
    category: 'filesystem',
    locale: {
      ja: {
        title: 'ファイルをコピー・移動・削除する',
        description:
          '以下の操作を順番に行ってください。\n\n1. notes.txt を backup/ ディレクトリにコピーする\n2. old.txt を archive/ に移動する\n3. temp.txt を削除する',
        background:
          'cp・mv・rm は「3大ファイル操作コマンド」です。\n' +
          'cp はコピー元を残しながら複製し、mv は移動（リネームにも使える）、rm は削除します。\n' +
          'rm -rf は再帰削除なので、誤操作に注意が必要です。',
        hints: [
          'cp [元ファイル] [コピー先] でコピーできます。',
          'mv [元ファイル] [移動先ディレクトリ/] で移動できます。',
          'rm [ファイル名] で削除できます。削除は取り消せないので注意！',
        ],
        answer:
          'cp notes.txt backup/\nmv old.txt archive/\nrm temp.txt',
        commands: [
          { cmd: 'cp [src] [dst]',  desc: 'ファイルをコピーする' },
          { cmd: 'cp -r [src] [dst]',desc: 'ディレクトリを再帰的にコピー' },
          { cmd: 'mv [src] [dst]',  desc: 'ファイルを移動（リネーム）する' },
          { cmd: 'rm [file]',       desc: 'ファイルを削除する' },
          { cmd: 'rm -rf [dir]',    desc: 'ディレクトリを再帰削除（危険！）' },
        ],
      },
      en: {
        title: 'Copy, Move, and Delete Files',
        description:
          'Perform these operations in order:\n\n1. Copy notes.txt to the backup/ directory\n2. Move old.txt to archive/\n3. Delete temp.txt',
        background:
          'cp, mv, and rm are the three essential file manipulation commands.\n' +
          'cp duplicates (keeping the original), mv moves or renames, rm deletes permanently.\n' +
          'rm -rf is recursive deletion — use it carefully to avoid accidents.',
        hints: [
          'cp [source] [destination] copies a file.',
          'mv [source] [dest-directory/] moves a file.',
          'rm [filename] deletes the file. Deletion is permanent!',
        ],
        answer:
          'cp notes.txt backup/\nmv old.txt archive/\nrm temp.txt',
        commands: [
          { cmd: 'cp [src] [dst]',   desc: 'Copy a file' },
          { cmd: 'cp -r [src] [dst]',desc: 'Recursively copy a directory' },
          { cmd: 'mv [src] [dst]',   desc: 'Move or rename a file' },
          { cmd: 'rm [file]',        desc: 'Delete a file' },
          { cmd: 'rm -rf [dir]',     desc: 'Recursively delete a directory (dangerous!)' },
        ],
      },
    },
    setupFiles: {
      '/home/user/notes.txt': 'Important notes\nLine 2\nLine 3\n',
      '/home/user/old.txt':   'Old content to archive\n',
      '/home/user/temp.txt':  'Temporary file\n',
    },
    setupDirs: ['/home/user/backup', '/home/user/archive'],
    // コピー・移動・削除の3ステップが全て完了したことを確認
    validation: [
      { type: 'file_exists',     target: '/home/user/backup/notes.txt' },
      { type: 'file_exists',     target: '/home/user/archive/old.txt' },
      { type: 'file_not_exists', target: '/home/user/temp.txt' },
    ],
  },

  {
    id: 'fs-3',
    category: 'filesystem',
    locale: {
      ja: {
        title: 'シンボリックリンクを作って使う',
        description:
          'current というシンボリックリンクを作って、v1.0/ ディレクトリを指すようにしてください。\n\n（current → v1.0/）',
        background:
          'シンボリックリンクは「本体への近道（ショートカット）」です。\n' +
          '/etc/alternatives や /usr/local/bin など、Linuxの多くの場所で使われています。\n' +
          'ソフトウェアのバージョン切り替えや設定ファイルの共有に特に有用です。',
        hints: [
          'ln コマンドを使います。-s オプションでシンボリックリンクを作れます。',
          'ln -s [リンク先] [リンク名] という順番です。',
          'ln -s v1.0 current と実行すると current → v1.0 のリンクができます。',
        ],
        answer: 'ln -s v1.0 current',
        commands: [
          { cmd: 'ln -s [target] [link]', desc: 'シンボリックリンクを作成する' },
          { cmd: 'ls -la',               desc: '-> で示されるリンクを確認する' },
          { cmd: 'readlink [link]',       desc: 'リンク先のパスを表示する' },
        ],
      },
      en: {
        title: 'Create and Use Symbolic Links',
        description:
          'Create a symbolic link named current that points to the v1.0/ directory.\n\n(current → v1.0/)',
        background:
          'Symbolic links are "shortcuts to the real target".\n' +
          'Linux uses them extensively: /etc/alternatives, /usr/local/bin, etc.\n' +
          'They are especially useful for version switching and sharing config files.',
        hints: [
          'Use the ln command with the -s flag to create a symbolic link.',
          'The order is: ln -s [target] [link-name].',
          'ln -s v1.0 current creates current → v1.0.',
        ],
        answer: 'ln -s v1.0 current',
        commands: [
          { cmd: 'ln -s [target] [link]', desc: 'Create a symbolic link' },
          { cmd: 'ls -la',               desc: 'See links shown with ->' },
          { cmd: 'readlink [link]',       desc: 'Print the link target path' },
        ],
      },
    },
    setupDirs: ['/home/user/v1.0', '/home/user/v1.0/assets'],
    setupFiles: {
      '/home/user/v1.0/index.html': '<html><body>Version 1.0</body></html>\n',
    },
    validation: [{ type: 'symlink_exists', target: '/home/user/current' }],
  },

  {
    id: 'fs-4',
    category: 'filesystem',
    locale: {
      ja: {
        title: 'ファイルを探す',
        description:
          '/home/user 以下にある .log 拡張子のファイルをすべて検索し、\nそのパス一覧を found.txt に保存してください。',
        background:
          '大規模サーバーでは「あのファイルどこだっけ？」が日常茶飯事です。\n' +
          'find コマンドは条件（名前・種類・日時・サイズ）でファイルを絞り込め、\n' +
          '結果をパイプやリダイレクトで次の処理に渡せます。',
        hints: [
          'find [検索起点] -name "*.log" でファイルを名前検索できます。',
          'find /home/user -name "*.log" で.logファイルが見つかります。',
          '> found.txt を末尾に付けると、結果をファイルに書き出せます。',
        ],
        answer: 'find /home/user -name "*.log" > found.txt',
        commands: [
          { cmd: 'find [dir] -name [pat]', desc: 'ファイル名パターンで検索する' },
          { cmd: 'find [dir] -type f',     desc: '通常ファイルのみ検索する' },
          { cmd: 'find [dir] -type d',     desc: 'ディレクトリのみ検索する' },
          { cmd: 'find [dir] -newer [file]',desc: '指定ファイルより新しいものを検索' },
        ],
      },
      en: {
        title: 'Find Files',
        description:
          'Find all files with a .log extension under /home/user\nand save their paths to found.txt.',
        background:
          'On large servers, locating files is a daily task.\n' +
          'find lets you filter by name, type, date, or size,\n' +
          'and pipe/redirect results to other commands.',
        hints: [
          'find [start-dir] -name "*.log" searches by filename pattern.',
          'find /home/user -name "*.log" will find all .log files.',
          'Add > found.txt at the end to redirect output to a file.',
        ],
        answer: 'find /home/user -name "*.log" > found.txt',
        commands: [
          { cmd: 'find [dir] -name [pat]', desc: 'Search by filename pattern' },
          { cmd: 'find [dir] -type f',     desc: 'Search for regular files only' },
          { cmd: 'find [dir] -type d',     desc: 'Search for directories only' },
          { cmd: 'find [dir] -newer [file]',desc: 'Find files newer than a reference' },
        ],
      },
    },
    setupDirs: ['/home/user/app', '/home/user/app/logs'],
    setupFiles: {
      '/home/user/app/app.log':        '2024-01-01 INFO App started\n',
      '/home/user/app/error.log':      '2024-01-01 ERROR Something failed\n',
      '/home/user/app/logs/access.log':'127.0.0.1 GET /\n',
      '/home/user/config.txt':         'debug=true\n',
    },
    validation: [{ type: 'file_exists', target: '/home/user/found.txt' }],
  },

  {
    id: 'fs-5',
    category: 'filesystem',
    locale: {
      ja: {
        title: 'アーカイブと圧縮',
        description:
          'app/ ディレクトリをまるごと tar.gz アーカイブとして\narchive.tar.gz というファイル名で圧縮保存してください。',
        background:
          'バックアップや転送のため、複数ファイルを1つにまとめる操作は頻繁に行われます。\n' +
          'tar はアーカイブ（まとめる）担当、gzip は圧縮担当で、\n' +
          '-czf フラグで両方を一度に行えます。',
        hints: [
          'tar コマンドを使います。-c で作成、-z で gzip 圧縮、-f で出力ファイル名を指定します。',
          'tar -czf [出力ファイル名] [アーカイブしたいディレクトリ] という形式です。',
          'tar -czf archive.tar.gz app/ と実行します。',
        ],
        answer: 'tar -czf archive.tar.gz app/',
        commands: [
          { cmd: 'tar -czf [out] [src]', desc: '圧縮アーカイブを作成する (.tar.gz)' },
          { cmd: 'tar -xzf [file]',      desc: '圧縮アーカイブを展開する' },
          { cmd: 'tar -tzf [file]',      desc: 'アーカイブの中身を一覧表示する' },
          { cmd: 'gzip [file]',          desc: 'ファイル単体を gzip 圧縮する' },
        ],
      },
      en: {
        title: 'Archive and Compress',
        description:
          'Create a compressed archive of the app/ directory\nand save it as archive.tar.gz.',
        background:
          'Packing multiple files into one archive is common for backups and transfers.\n' +
          'tar handles archiving (bundling), gzip handles compression.\n' +
          'The -czf flags do both operations in a single command.',
        hints: [
          'Use the tar command: -c creates, -z applies gzip compression, -f sets output filename.',
          'The format is: tar -czf [output-filename] [directory-to-archive]',
          'Run: tar -czf archive.tar.gz app/',
        ],
        answer: 'tar -czf archive.tar.gz app/',
        commands: [
          { cmd: 'tar -czf [out] [src]', desc: 'Create a compressed archive (.tar.gz)' },
          { cmd: 'tar -xzf [file]',      desc: 'Extract a compressed archive' },
          { cmd: 'tar -tzf [file]',      desc: 'List contents of an archive' },
          { cmd: 'gzip [file]',          desc: 'Compress a single file with gzip' },
        ],
      },
    },
    setupDirs: ['/home/user/app', '/home/user/app/src'],
    setupFiles: {
      '/home/user/app/package.json': '{"name":"myapp","version":"1.0.0"}\n',
      '/home/user/app/src/index.js': 'console.log("Hello")\n',
      '/home/user/app/README.md':    '# My App\n',
    },
    validation: [{ type: 'file_exists', target: '/home/user/archive.tar.gz' }],
  },
]
