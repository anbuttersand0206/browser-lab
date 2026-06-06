import type { InfraMission } from './types'

export const shellMissions: InfraMission[] = [
  {
    id: 'shell-1',
    category: 'shell',
    locale: {
      ja: {
        title: '変数と環境変数',
        description:
          '$PATH 環境変数の内容を path.txt に書き出してください。\n\necho $PATH > path.txt',
        background:
          '$PATH は「コマンドを探すディレクトリのリスト」です。\n' +
          ':（コロン）で区切られた複数のパスから、コマンドの実体を見つけます。\n\n' +
          '変数の使い方：\n' +
          '· VAR=value で変数を定義（スペース不可）\n' +
          '· $VAR または ${VAR} で参照する\n' +
          '· export VAR で子プロセスに引き継ぐ（環境変数化）\n' +
          '· env で全環境変数を一覧表示できます',
        hints: [
          '$PATH は現在の PATH 環境変数の内容を展開します。',
          'echo $PATH で PATH の中身が表示されます。',
          'echo $PATH > path.txt でファイルに保存できます。',
        ],
        answer: 'echo $PATH > path.txt',
        commands: [
          { cmd: 'echo $VAR',       desc: '変数の内容を表示する' },
          { cmd: 'VAR=value',       desc: 'シェル変数を定義する' },
          { cmd: 'export VAR',      desc: '環境変数として子プロセスに引き継ぐ' },
          { cmd: 'env',             desc: '全環境変数を一覧表示する' },
          { cmd: 'printenv [VAR]',  desc: '指定した環境変数を表示する' },
        ],
      },
      en: {
        title: 'Variables and Environment Variables',
        description:
          'Write the contents of the $PATH environment variable to path.txt.\n\necho $PATH > path.txt',
        background:
          '$PATH is a colon-separated list of directories where the shell looks for commands.\n\n' +
          'Variable basics:\n' +
          '· VAR=value defines a variable (no spaces around =)\n' +
          '· $VAR or ${VAR} expands it\n' +
          '· export VAR promotes it to an environment variable (inherited by child processes)\n' +
          '· env lists all environment variables',
        hints: [
          '$PATH expands to the current PATH variable content.',
          'echo $PATH displays PATH contents.',
          'echo $PATH > path.txt saves it to a file.',
        ],
        answer: 'echo $PATH > path.txt',
        commands: [
          { cmd: 'echo $VAR',       desc: 'Print a variable\'s value' },
          { cmd: 'VAR=value',       desc: 'Define a shell variable' },
          { cmd: 'export VAR',      desc: 'Export as environment variable' },
          { cmd: 'env',             desc: 'List all environment variables' },
          { cmd: 'printenv [VAR]',  desc: 'Print a specific environment variable' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    validation: [{ type: 'file_exists', target: '/home/user/path.txt' }],
  },

  {
    id: 'shell-2',
    category: 'shell',
    locale: {
      ja: {
        title: '条件分岐',
        description:
          'check.sh というスクリプトを作成してください。\n\n' +
          '内容: data.txt が存在すれば "found" を、\n存在しなければ "not found" を表示するスクリプト。\n\n' +
          '作成後、chmod +x して ./check.sh で実行し、\n実行結果を result.txt に保存してください（./check.sh > result.txt）。',
        background:
          'if 文と test コマンド（[ ] で表記）の組み合わせは、\nシェルスクリプトの制御フローの核心です。\n\n' +
          '主なテスト条件：\n' +
          '· [ -f file ] ファイルが存在する\n' +
          '· [ -d dir ]  ディレクトリが存在する\n' +
          '· [ -z str ]  文字列が空\n' +
          '· [ -n str ]  文字列が空でない\n' +
          '· [ n1 -eq n2 ] 数値が等しい',
        hints: [
          'if [ -f data.txt ]; then echo "found"; else echo "not found"; fi が基本構文です。',
          'この内容を check.sh ファイルに書き出してから chmod +x check.sh します。',
          'printf や echo で shebang 行（#!/bin/sh）から始まるスクリプトを作成します。',
        ],
        answer:
          'printf \'#!/bin/sh\\nif [ -f data.txt ]; then\\n  echo "found"\\nelse\\n  echo "not found"\\nfi\\n\' > check.sh\n' +
          'chmod +x check.sh\n./check.sh > result.txt',
        commands: [
          { cmd: 'if [ cond ]; then ... fi', desc: '条件分岐の基本構文' },
          { cmd: '[ -f file ]',              desc: 'ファイルの存在チェック' },
          { cmd: '[ -d dir ]',               desc: 'ディレクトリの存在チェック' },
          { cmd: '[ -z "$VAR" ]',            desc: '変数が空かチェック' },
          { cmd: 'test [condition]',         desc: '[ ] と同義のテストコマンド' },
        ],
      },
      en: {
        title: 'Conditionals',
        description:
          'Create a script named check.sh that:\n\n' +
          'Prints "found" if data.txt exists, or "not found" if it doesn\'t.\n\n' +
          'After creating it, make it executable and run:\n./check.sh > result.txt',
        background:
          'The combination of if statements and the test command (written as [ ]) is\nthe heart of shell script control flow.\n\n' +
          'Common test conditions:\n' +
          '· [ -f file ] file exists\n' +
          '· [ -d dir ]  directory exists\n' +
          '· [ -z str ]  string is empty\n' +
          '· [ -n str ]  string is not empty\n' +
          '· [ n1 -eq n2 ] numbers are equal',
        hints: [
          'if [ -f data.txt ]; then echo "found"; else echo "not found"; fi is the basic syntax.',
          'Write this to check.sh, then chmod +x check.sh.',
          'Use printf or echo to create the script starting with #!/bin/sh.',
        ],
        answer:
          'printf \'#!/bin/sh\\nif [ -f data.txt ]; then\\n  echo "found"\\nelse\\n  echo "not found"\\nfi\\n\' > check.sh\n' +
          'chmod +x check.sh\n./check.sh > result.txt',
        commands: [
          { cmd: 'if [ cond ]; then ... fi', desc: 'Basic conditional syntax' },
          { cmd: '[ -f file ]',              desc: 'Test file existence' },
          { cmd: '[ -d dir ]',               desc: 'Test directory existence' },
          { cmd: '[ -z "$VAR" ]',            desc: 'Test if variable is empty' },
          { cmd: 'test [condition]',         desc: 'Same as [ ], explicit form' },
        ],
      },
    },
    setupFiles: {
      '/home/user/data.txt': 'some content\n',
    },
    validation: [{ type: 'file_exists', target: '/home/user/result.txt' }],
  },

  {
    id: 'shell-3',
    category: 'shell',
    locale: {
      ja: {
        title: 'ループ処理',
        description:
          '1 から 5 までの数字を1行ずつ numbers.txt に書き出してください。\n\nfor ループを使います。',
        background:
          'for ループは「一定回数繰り返す」処理の基本です。\n' +
          'seq コマンドで数列を生成して for の入力にする方法と、\n' +
          'while read でファイルを1行ずつ処理する方法が特に実務で多用されます。\n\n' +
          '例: for i in $(seq 1 10); do ... done',
        hints: [
          'for i in 1 2 3 4 5; do echo $i; done で数字を1行ずつ表示できます。',
          '> numbers.txt を付けてリダイレクトします。',
          'for i in $(seq 1 5); do echo $i; done >> numbers.txt でも同じです。',
        ],
        answer:
          'for i in 1 2 3 4 5; do echo $i; done > numbers.txt\n# または:\n# for i in $(seq 1 5); do echo $i; done > numbers.txt',
        commands: [
          { cmd: 'for i in ...; do ... done', desc: 'for ループの基本構文' },
          { cmd: 'while read line; do ... done < [f]', desc: 'ファイルを1行ずつ処理する' },
          { cmd: 'seq [from] [to]',           desc: '数列を生成する' },
          { cmd: 'break',                     desc: 'ループを抜ける' },
          { cmd: 'continue',                  desc: '次のイテレーションへスキップ' },
        ],
      },
      en: {
        title: 'Loop Processing',
        description:
          'Write the numbers 1 through 5 to numbers.txt, one per line.\n\nUse a for loop.',
        background:
          'for loops are the foundation of "repeat N times" logic.\n' +
          'Two common patterns:\n' +
          '· seq generates number sequences for use in for loops\n' +
          '· while read processes a file line by line\n\n' +
          'Example: for i in $(seq 1 10); do ... done',
        hints: [
          'for i in 1 2 3 4 5; do echo $i; done prints numbers one per line.',
          'Add > numbers.txt to redirect output to a file.',
          'for i in $(seq 1 5); do echo $i; done > numbers.txt also works.',
        ],
        answer:
          'for i in 1 2 3 4 5; do echo $i; done > numbers.txt\n# or:\n# for i in $(seq 1 5); do echo $i; done > numbers.txt',
        commands: [
          { cmd: 'for i in ...; do ... done', desc: 'Basic for loop syntax' },
          { cmd: 'while read line; do ... done < [f]', desc: 'Process file line by line' },
          { cmd: 'seq [from] [to]',           desc: 'Generate a number sequence' },
          { cmd: 'break',                     desc: 'Exit the loop' },
          { cmd: 'continue',                  desc: 'Skip to next iteration' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    // 1〜5 が揃って書かれていることを確認（1だけでなく5も含むかチェック）
    validation: [
      { type: 'file_content', target: '/home/user/numbers.txt', expected: '1' },
      { type: 'file_content', target: '/home/user/numbers.txt', expected: '5' },
    ],
  },

  {
    id: 'shell-4',
    category: 'shell',
    locale: {
      ja: {
        title: '実用スクリプトを書く',
        description:
          'rename.sh というスクリプトを作成してください。\n\n' +
          '動作: /home/user/files/ にある .txt ファイルをすべて .bak にリネームする\n\n' +
          'スクリプト作成後、chmod +x して ./rename.sh を実行してください。',
        background:
          'ファイルの一括リネームは実務でよく出てくるタスクです。\n' +
          'for ループと mv コマンドを組み合わせることで、\n' +
          '数十・数百ファイルを一瞬で処理できます。\n\n' +
          'シェル変数展開 ${var%.ext} で拡張子を取り除けるのがポイントです：\n' +
          '  for f in *.txt; do mv "$f" "${f%.txt}.bak"; done',
        hints: [
          'for f in /home/user/files/*.txt; do ... done でtxtファイルを列挙できます。',
          '${f%.txt} で変数fから末尾の.txtを取り除けます。',
          'mv "$f" "${f%.txt}.bak" でリネームします。これをスクリプトにまとめます。',
        ],
        answer:
          'printf \'#!/bin/sh\\nfor f in /home/user/files/*.txt; do\\n  mv "$f" "${f%.txt}.bak"\\ndone\\n\' > rename.sh\n' +
          'chmod +x rename.sh\n./rename.sh',
        commands: [
          { cmd: 'for f in *.txt; do ... done', desc: '拡張子でファイルを列挙する' },
          { cmd: '${var%.ext}',                 desc: '変数から末尾の文字列を取り除く' },
          { cmd: 'mv "$f" "${f%.ext}.new"',     desc: '拡張子を変えてリネームする' },
          { cmd: 'basename [path]',             desc: 'パスからファイル名だけを取り出す' },
          { cmd: 'dirname [path]',              desc: 'パスからディレクトリ部分を取り出す' },
        ],
      },
      en: {
        title: 'Write a Practical Script',
        description:
          'Create a script named rename.sh that:\n\n' +
          'Renames all .txt files in /home/user/files/ to .bak\n\n' +
          'After creating it, chmod +x and run ./rename.sh.',
        background:
          'Bulk file renaming is a common real-world task.\n' +
          'Combining a for loop with mv processes dozens or hundreds of files instantly.\n\n' +
          'Key trick: shell parameter expansion ${var%.ext} removes a suffix:\n' +
          '  for f in *.txt; do mv "$f" "${f%.txt}.bak"; done',
        hints: [
          'for f in /home/user/files/*.txt; do ... done iterates over .txt files.',
          '${f%.txt} removes the .txt suffix from variable f.',
          'mv "$f" "${f%.txt}.bak" renames the file. Put this in a script.',
        ],
        answer:
          'printf \'#!/bin/sh\\nfor f in /home/user/files/*.txt; do\\n  mv "$f" "${f%.txt}.bak"\\ndone\\n\' > rename.sh\n' +
          'chmod +x rename.sh\n./rename.sh',
        commands: [
          { cmd: 'for f in *.txt; do ... done', desc: 'Iterate over files by extension' },
          { cmd: '${var%.ext}',                 desc: 'Remove a suffix from a variable' },
          { cmd: 'mv "$f" "${f%.ext}.new"',     desc: 'Rename file with new extension' },
          { cmd: 'basename [path]',             desc: 'Extract filename from path' },
          { cmd: 'dirname [path]',              desc: 'Extract directory from path' },
        ],
      },
    },
    setupDirs: ['/home/user/files'],
    setupFiles: {
      '/home/user/files/report.txt':  'Monthly report content\n',
      '/home/user/files/config.txt':  'key=value\n',
      '/home/user/files/notes.txt':   'Meeting notes\n',
    },
    // スクリプト作成 + 実際にリネームが実行されたことを確認
    validation: [
      { type: 'file_exists',     target: '/home/user/rename.sh' },
      { type: 'file_exists',     target: '/home/user/files/report.bak' },
      { type: 'file_not_exists', target: '/home/user/files/report.txt' },
    ],
  },

  {
    id: 'shell-5',
    category: 'shell',
    locale: {
      ja: {
        title: '引数を受け取るスクリプト',
        description:
          'hello.sh というスクリプトを作成してください。\n\n' +
          '動作: 第1引数として受け取った名前を使い、\n"Hello, NAME!" と表示する。\n\n' +
          '作成後、sh hello.sh Alice で動作確認してください。',
        background:
          'シェルスクリプトは $1, $2 ... で位置引数を参照します。\n' +
          '同じスクリプトをさまざまな入力で再利用でき、\n' +
          '引数の数を $# で、全引数を $@ でまとめて参照できます。\n\n' +
          '主な特殊変数:\n' +
          '· $0   スクリプトファイル名\n' +
          '· $1〜$9  位置引数（スクリプトへの入力）\n' +
          '· $@   全引数をスペース区切りで展開\n' +
          '· $#   引数の個数\n' +
          '· $?   直前コマンドの終了コード（0=成功）',
        hints: [
          'echo "Hello, $1!" が引数展開の基本構文です。',
          'printf \'#!/bin/sh\\necho "Hello, $1!"\\n\' > hello.sh でスクリプトファイルを作成できます。',
          'chmod +x は不要です。sh hello.sh Alice のように sh コマンドで直接実行できます。',
        ],
        answer:
          'printf \'#!/bin/sh\\necho "Hello, $1!"\\n\' > hello.sh\n' +
          'sh hello.sh Alice',
        commands: [
          { cmd: '$1, $2, ...',     desc: '位置引数（スクリプトへの入力値）' },
          { cmd: '$@',              desc: '全引数をまとめて参照する' },
          { cmd: '$#',              desc: '引数の個数を取得する' },
          { cmd: '$0',              desc: 'スクリプト自身のファイル名' },
          { cmd: '$?',              desc: '直前コマンドの終了コード（0=成功）' },
        ],
      },
      en: {
        title: 'Scripts with Arguments',
        description:
          'Create a script named hello.sh that:\n\n' +
          'Takes a name as the first argument ($1) and prints\n"Hello, NAME!"\n\n' +
          'After creating it, test with: sh hello.sh Alice',
        background:
          'Shell scripts accept arguments via positional parameters $1, $2, etc.\n' +
          'This lets you reuse the same script with different inputs.\n\n' +
          'Special variables:\n' +
          '· $0  script name itself\n' +
          '· $1–$9 positional arguments\n' +
          '· $@  all arguments (space-separated)\n' +
          '· $#  argument count\n' +
          '· $?  exit code of the last command (0 = success)',
        hints: [
          'echo "Hello, $1!" expands the first argument into the string.',
          'printf \'#!/bin/sh\\necho "Hello, $1!"\\n\' > hello.sh creates the script file.',
          'No chmod needed — run with: sh hello.sh Alice',
        ],
        answer:
          'printf \'#!/bin/sh\\necho "Hello, $1!"\\n\' > hello.sh\n' +
          'sh hello.sh Alice',
        commands: [
          { cmd: '$1, $2, ...', desc: 'Positional parameters (inputs to the script)' },
          { cmd: '$@',          desc: 'All arguments at once' },
          { cmd: '$#',          desc: 'Number of arguments' },
          { cmd: '$0',          desc: 'Script filename itself' },
          { cmd: '$?',          desc: 'Exit code of the last command' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    // hello.sh に "Alice" を渡して実行し、出力に "Hello" が含まれることで動作を確認する
    validation: [{ type: 'command_output', cmd: 'sh /home/user/hello.sh Alice', expected: 'Hello' }],
  },

  {
    id: 'shell-6',
    category: 'shell',
    locale: {
      ja: {
        title: '数値計算スクリプト',
        description:
          'sum.sh というスクリプトを作成してください。\n\n' +
          '動作: 2つの整数を引数として受け取り、その合計を表示する。\n\n' +
          '例: sh sum.sh 7 3 → 10 と表示されること。',
        background:
          'シェルスクリプトで整数演算を行うには $(( )) 構文（算術展開）を使います。\n' +
          'expr コマンドより高速で、シンプルに書けます。\n\n' +
          '算術展開の例:\n' +
          '· echo $(( 3 + 5 ))     → 8\n' +
          '· echo $(( $1 + $2 ))  → 引数の合計\n' +
          '· $(( $1 * $2 ))       → 掛け算\n' +
          '· $(( $1 / $2 ))       → 整数除算（切り捨て）\n' +
          '· $(( $1 % $2 ))       → 余り',
        hints: [
          '$(( $1 + $2 )) が整数加算の基本構文です。',
          'echo $(( $1 + $2 )) でそのまま合計を出力できます。',
          'printf \'#!/bin/sh\\necho $(( $1 + $2 ))\\n\' > sum.sh でスクリプトを作成します。',
        ],
        answer:
          'printf \'#!/bin/sh\\necho $(( $1 + $2 ))\\n\' > sum.sh\n' +
          'sh sum.sh 7 3',
        commands: [
          { cmd: '$(( expr ))',       desc: '整数演算（算術展開）' },
          { cmd: '$(( $1 + $2 ))',    desc: '引数の合計を計算する' },
          { cmd: '$(( $1 * $2 ))',    desc: '引数の積を計算する' },
          { cmd: '$(( $1 % $2 ))',    desc: '余りを計算する' },
          { cmd: 'bc <<< "1.5+2.5"', desc: '小数計算（bc コマンド）' },
        ],
      },
      en: {
        title: 'Numeric Calculation Script',
        description:
          'Create a script named sum.sh that:\n\n' +
          'Takes two integers as arguments and prints their sum.\n\n' +
          'Example: sh sum.sh 7 3 should print 10',
        background:
          'Use $(( )) (arithmetic expansion) for integer arithmetic in shell scripts.\n' +
          'It\'s faster than the expr command and easier to read.\n\n' +
          'Examples:\n' +
          '· echo $(( 3 + 5 ))    → 8\n' +
          '· echo $(( $1 + $2 )) → sum of arguments\n' +
          '· $(( $1 * $2 ))      → multiplication\n' +
          '· $(( $1 / $2 ))      → integer division (truncated)\n' +
          '· $(( $1 % $2 ))      → remainder',
        hints: [
          '$(( $1 + $2 )) is the arithmetic expansion syntax for addition.',
          'echo $(( $1 + $2 )) prints the sum directly.',
          'printf \'#!/bin/sh\\necho $(( $1 + $2 ))\\n\' > sum.sh creates the script.',
        ],
        answer:
          'printf \'#!/bin/sh\\necho $(( $1 + $2 ))\\n\' > sum.sh\n' +
          'sh sum.sh 7 3',
        commands: [
          { cmd: '$(( expr ))',       desc: 'Integer arithmetic (arithmetic expansion)' },
          { cmd: '$(( $1 + $2 ))',    desc: 'Sum of two arguments' },
          { cmd: '$(( $1 * $2 ))',    desc: 'Product of two arguments' },
          { cmd: '$(( $1 % $2 ))',    desc: 'Remainder (modulo)' },
          { cmd: 'bc <<< "1.5+2.5"', desc: 'Decimal arithmetic with bc' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    // sum.sh に 7 と 3 を渡して実行し、出力に "10" が含まれることで算術機能を確認する
    validation: [{ type: 'command_output', cmd: 'sh /home/user/sum.sh 7 3', expected: '10' }],
  },
]
