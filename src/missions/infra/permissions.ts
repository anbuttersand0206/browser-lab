import type { InfraMission } from './types'

export const permissionsMissions: InfraMission[] = [
  {
    id: 'perm-1',
    category: 'permissions',
    locale: {
      ja: {
        title: 'パーミッションを読む',
        description:
          'ls -la コマンドを実行して、ファイル一覧のパーミッション表示を確認してください。\n\n確認後、今日の日付とともに「パーミッションを理解した」という内容を\nlearned.txt に書き出してください。\n\n例: echo "permissions understood" > learned.txt',
        background:
          'rwxr-xr-x という表示は3つのトリオに分かれています。\n' +
          '・rwx（オーナー権限）: 読み取り・書き込み・実行がすべて可\n' +
          '・r-x（グループ権限）: 読み取りと実行は可、書き込みは不可\n' +
          '・r-x（その他権限）: 読み取りと実行は可、書き込みは不可\n\n' +
          'Webサーバーの設定ファイルは 640（オーナーのみ読み書き）、\n' +
          '公開HTMLは 644 にするといった使い分けが実務の基本です。',
        hints: [
          'ls -la を実行するとパーミッション情報が左端に表示されます。',
          'echo "permissions understood" > learned.txt でファイルに書き出せます。',
          'echo コマンドは文字列を出力し、> でファイルにリダイレクトします。',
        ],
        answer: 'ls -la\necho "permissions understood" > learned.txt',
        commands: [
          { cmd: 'ls -la',            desc: 'パーミッション付きで一覧表示' },
          { cmd: 'echo [text] > [f]', desc: 'テキストをファイルに書き出す' },
          { cmd: 'stat [file]',       desc: 'ファイルの詳細情報を表示する' },
        ],
      },
      en: {
        title: 'Reading Permissions',
        description:
          'Run ls -la to see the permission display.\n\nThen write "permissions understood" to learned.txt:\n\necho "permissions understood" > learned.txt',
        background:
          'The rwxr-xr-x string is split into three groups of three:\n' +
          '· rwx (owner): read, write, execute all allowed\n' +
          '· r-x (group): read and execute allowed, write denied\n' +
          '· r-x (others): read and execute allowed, write denied\n\n' +
          'Real-world examples: 640 for private config files (owner r/w only),\n644 for public HTML files.',
        hints: [
          'Run ls -la — permissions appear on the far left.',
          'echo "permissions understood" > learned.txt writes to a file.',
          'The > operator redirects stdout to a file (overwrites).',
        ],
        answer: 'ls -la\necho "permissions understood" > learned.txt',
        commands: [
          { cmd: 'ls -la',            desc: 'List with permission details' },
          { cmd: 'echo [text] > [f]', desc: 'Write text to a file' },
          { cmd: 'stat [file]',       desc: 'Display detailed file information' },
        ],
      },
    },
    setupFiles: {
      '/home/user/public.html':  '<html><body>Hello</body></html>\n',
      '/home/user/config.conf':  'password=secret\n',
      '/home/user/run.sh':       '#!/bin/sh\necho "running"\n',
    },
    validation: [{ type: 'file_exists', target: '/home/user/learned.txt' }],
  },

  {
    id: 'perm-2',
    category: 'permissions',
    locale: {
      ja: {
        title: 'chmod で権限を変える（数値表記）',
        description:
          'secret.txt のパーミッションを 600 に変更してください。\n\n600 = オーナーのみ読み書き可（グループ・その他は一切不可）',
        background:
          '数値表記は r=4, w=2, x=1 の合計です。\n' +
          '・600: オーナー読み書き（rw-）、他は全拒否（---）\n' +
          '・644: オーナー読み書き（rw-）、他は読み取りのみ（r--）\n' +
          '・755: オーナー全権（rwx）、他は読み取り・実行のみ（r-x）\n\n' +
          'SSHの秘密鍵（~/.ssh/id_rsa）は必ず600にしないとSSH接続が拒否されます。',
        hints: [
          'chmod コマンドを使います。chmod [数値] [ファイル名] という形式です。',
          'chmod 600 secret.txt と実行してみましょう。',
          '設定後、ls -la secret.txt で -rw------- と表示されれば成功です。',
        ],
        answer: 'chmod 600 secret.txt',
        commands: [
          { cmd: 'chmod [mode] [file]', desc: 'パーミッションを変更する' },
          { cmd: 'ls -la [file]',       desc: '変更後の権限を確認する' },
          { cmd: 'stat [file]',         desc: '数値パーミッションも確認できる' },
        ],
      },
      en: {
        title: 'chmod with Numeric Mode',
        description:
          'Change the permissions of secret.txt to 600.\n\n600 = owner read+write only (group and others have no access)',
        background:
          'Numeric mode: r=4, w=2, x=1. Add them up for each group.\n' +
          '· 600: owner rw- , others --- (private file)\n' +
          '· 644: owner rw- , others r-- (public read-only)\n' +
          '· 755: owner rwx , others r-x (executable program)\n\n' +
          'SSH private keys (~/.ssh/id_rsa) must be 600 or SSH will refuse to connect.',
        hints: [
          'Use chmod with the format: chmod [mode] [filename].',
          'Run: chmod 600 secret.txt',
          'Verify with ls -la secret.txt — you should see -rw-------',
        ],
        answer: 'chmod 600 secret.txt',
        commands: [
          { cmd: 'chmod [mode] [file]', desc: 'Change file permissions' },
          { cmd: 'ls -la [file]',       desc: 'Check the updated permissions' },
          { cmd: 'stat [file]',         desc: 'Also shows numeric permissions' },
        ],
      },
    },
    setupFiles: {
      '/home/user/secret.txt': 'DATABASE_PASSWORD=s3cr3t\nAPI_KEY=abc123\n',
    },
    validation: [{ type: 'permission', target: '/home/user/secret.txt', expected: '600' }],
  },

  {
    id: 'perm-3',
    category: 'permissions',
    locale: {
      ja: {
        title: 'chmod で権限を変える（記号表記）',
        description:
          'deploy.sh にグループの実行権限を追加（g+x）し、\nさらに他人の書き込み権限を削除（o-w）してください。',
        background:
          '記号表記は「誰に・何を・追加/削除するか」を直感的に書けます。\n' +
          '・u: user（オーナー）, g: group, o: others, a: all\n' +
          '・+: 追加, -: 削除, =: 設定\n' +
          '・r: 読み取り, w: 書き込み, x: 実行\n\n' +
          '現在の権限を壊さずに1つだけ変更したいときに便利です。',
        hints: [
          'chmod g+x でグループに実行権限を追加できます。',
          'chmod o-w で他人の書き込み権限を削除できます。',
          '2つを一度に: chmod g+x,o-w deploy.sh のようにカンマでつなげます。',
        ],
        answer: 'chmod g+x,o-w deploy.sh',
        commands: [
          { cmd: 'chmod u+x [file]', desc: 'オーナーに実行権限を追加' },
          { cmd: 'chmod g-w [file]', desc: 'グループから書き込み権限を削除' },
          { cmd: 'chmod o=r [file]', desc: '他人の権限を読み取りのみに設定' },
          { cmd: 'chmod a+r [file]', desc: '全員に読み取り権限を追加' },
        ],
      },
      en: {
        title: 'chmod with Symbolic Mode',
        description:
          'Add execute permission for group (g+x) on deploy.sh,\nthen remove write permission for others (o-w).',
        background:
          'Symbolic mode is intuitive: who, operation, what.\n' +
          '· u: user (owner), g: group, o: others, a: all\n' +
          '· +: add, -: remove, =: set exactly\n' +
          '· r: read, w: write, x: execute\n\n' +
          'Use it when you want to change one bit without affecting the rest.',
        hints: [
          'chmod g+x adds execute permission for the group.',
          'chmod o-w removes write permission for others.',
          'Combine both: chmod g+x,o-w deploy.sh',
        ],
        answer: 'chmod g+x,o-w deploy.sh',
        commands: [
          { cmd: 'chmod u+x [file]', desc: 'Add execute for owner' },
          { cmd: 'chmod g-w [file]', desc: 'Remove write for group' },
          { cmd: 'chmod o=r [file]', desc: 'Set others to read-only' },
          { cmd: 'chmod a+r [file]', desc: 'Add read for everyone' },
        ],
      },
    },
    setupFiles: {
      '/home/user/deploy.sh': '#!/bin/sh\necho "Deploying..."\n',
    },
    // g+x: グループの実行ビット(bit3)が立っているか
    // o-w: その他の書き込みビット(bit1)が立っていないか
    // ビット直接検査で umask 差異に影響されない
    validation: [
      {
        type: 'command_output',
        cmd: 'node -e "const m=require(\'fs\').statSync(\'/home/user/deploy.sh\').mode;process.stdout.write((m>>3&1)?\'ok\':\'fail\')"',
        expected: 'ok',
      },
      {
        type: 'command_output',
        cmd: 'node -e "const m=require(\'fs\').statSync(\'/home/user/deploy.sh\').mode;process.stdout.write(!(m>>1&1)?\'ok\':\'fail\')"',
        expected: 'ok',
      },
    ],
  },

  {
    id: 'perm-4',
    category: 'permissions',
    locale: {
      ja: {
        title: '実行可能スクリプトを作る',
        description:
          '以下の内容で hello.sh を作成し、実行可能にしてください。\n\n#!/bin/sh\necho "Hello from shell script!"\n\n作成後、./hello.sh で実行して動作を確認してください。',
        background:
          'Linuxでは「このファイルをプログラムとして実行してよい」という許可が必要です。\n' +
          'shebang行（#!/bin/sh）でインタープリターを指定し、\n' +
          'chmod +x でファイルを実行可能にします。\n\n' +
          'デプロイスクリプト・バックアップスクリプトなど、\n' +
          '自動化の基本となる仕組みです。',
        hints: [
          'echo や cat でファイルを作成し、chmod +x で実行権限を付けます。',
          'printf を使う方法: printf \'#!/bin/sh\\necho "Hello from shell script!"\' > hello.sh',
          'chmod +x hello.sh で実行可能にしてから、./hello.sh で実行できます。',
        ],
        answer:
          'printf \'#!/bin/sh\\necho "Hello from shell script!"\\n\' > hello.sh\nchmod +x hello.sh\n./hello.sh',
        commands: [
          { cmd: 'chmod +x [file]',    desc: 'ファイルに実行権限を追加する' },
          { cmd: './[script]',         desc: 'カレントディレクトリのスクリプトを実行' },
          { cmd: 'printf [fmt] > [f]', desc: 'フォーマット付きでファイルに書き出す' },
          { cmd: 'which [cmd]',        desc: 'コマンドのフルパスを確認する' },
        ],
      },
      en: {
        title: 'Create an Executable Script',
        description:
          'Create hello.sh with the following content and make it executable:\n\n#!/bin/sh\necho "Hello from shell script!"\n\nThen run it with ./hello.sh to verify it works.',
        background:
          'In Linux, a file needs explicit "execute" permission to run as a program.\n' +
          'The shebang line (#!/bin/sh) tells the OS which interpreter to use.\n' +
          'chmod +x marks the file as executable.\n\n' +
          'This is the foundation of deployment scripts, backup scripts, and automation.',
        hints: [
          'Create the file with echo or cat, then use chmod +x to set the execute bit.',
          'printf \'#!/bin/sh\\necho "Hello from shell script!"\' > hello.sh creates the file.',
          'chmod +x hello.sh makes it executable, then ./hello.sh runs it.',
        ],
        answer:
          'printf \'#!/bin/sh\\necho "Hello from shell script!"\\n\' > hello.sh\nchmod +x hello.sh\n./hello.sh',
        commands: [
          { cmd: 'chmod +x [file]',    desc: 'Add execute permission to a file' },
          { cmd: './[script]',         desc: 'Run a script in the current directory' },
          { cmd: 'printf [fmt] > [f]', desc: 'Write formatted text to a file' },
          { cmd: 'which [cmd]',        desc: 'Show the full path of a command' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    // ファイル存在 + 実行ビット（0o111: owner/group/others いずれかに x があればよい）
    validation: [
      { type: 'file_exists', target: '/home/user/hello.sh' },
      {
        type: 'command_output',
        cmd: 'node -e "const m=require(\'fs\').statSync(\'/home/user/hello.sh\').mode;process.stdout.write((m&0o111)?\'ok\':\'fail\')"',
        expected: 'ok',
      },
    ],
  },
]
