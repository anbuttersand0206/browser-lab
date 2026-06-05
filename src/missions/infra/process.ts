import type { InfraMission } from './types'

export const processMissions: InfraMission[] = [
  {
    id: 'proc-1',
    category: 'process',
    locale: {
      ja: {
        title: '動いているプロセスを確認する',
        description:
          '現在動いているプロセスの一覧を取得して\nprocesses.txt に保存してください。\n\nps コマンドを使います。',
        background:
          'Webサーバーが落ちたとき、まず「プロセスが動いているか」を確認します。\n' +
          'ps aux は全ユーザーのすべてのプロセスを詳細表示します。\n' +
          '· a: すべてのユーザーのプロセス\n' +
          '· u: ユーザー名・CPU・メモリ使用率を表示\n' +
          '· x: ターミナルを持たないプロセスも表示',
        hints: [
          'ps コマンドでプロセス一覧を表示できます。',
          'ps aux で詳細なプロセス情報が表示されます。',
          'ps aux > processes.txt でファイルに保存できます。',
        ],
        answer: 'ps aux > processes.txt\n# または\nps > processes.txt',
        commands: [
          { cmd: 'ps',        desc: '現在のシェルのプロセスを表示' },
          { cmd: 'ps aux',    desc: 'すべてのプロセスを詳細表示（CPU・メモリ付き）' },
          { cmd: 'ps -ef',    desc: 'フル形式でプロセスを表示' },
          { cmd: 'kill [PID]',desc: 'プロセスにSIGTERMシグナルを送る' },
        ],
      },
      en: {
        title: 'Check Running Processes',
        description:
          'Get a list of running processes and save it to processes.txt.\n\nUse the ps command.',
        background:
          'When a web server goes down, the first question is: "Is the process running?"\n' +
          'ps aux shows all processes for all users with full details:\n' +
          '· a: all users\n' +
          '· u: show user, CPU, and memory usage\n' +
          '· x: include processes without a terminal',
        hints: [
          'The ps command lists processes.',
          'ps aux shows detailed process information for all users.',
          'ps aux > processes.txt saves it to a file.',
        ],
        answer: 'ps aux > processes.txt\n# or\nps > processes.txt',
        commands: [
          { cmd: 'ps',        desc: 'Show processes in current shell' },
          { cmd: 'ps aux',    desc: 'Show all processes with CPU/memory' },
          { cmd: 'ps -ef',    desc: 'Show all processes in full format' },
          { cmd: 'kill [PID]',desc: 'Send SIGTERM to a process' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    validation: { type: 'file_exists', target: '/home/user/processes.txt' },
  },

  {
    id: 'proc-2',
    category: 'process',
    locale: {
      ja: {
        title: 'バックグラウンド実行',
        description:
          '以下のコマンドをバックグラウンドで実行してください。\n\nsleep 30 &\n\n実行後、jobs コマンドで実行中のジョブを確認し、\nその出力を jobs_output.txt に保存してください。',
        background:
          '時間のかかる処理をバックグラウンドで動かしながら、\n' +
          'ターミナルで他の操作をするのはインフラ作業の基本です。\n' +
          '· & でバックグラウンド起動\n' +
          '· jobs で一覧確認\n' +
          '· fg でフォアグラウンドに戻す\n' +
          '· bg で一時停止中のジョブをバックグラウンド継続',
        hints: [
          'コマンドの末尾に & を付けるとバックグラウンドで実行できます。',
          'sleep 30 & と入力して実行してください。',
          'jobs コマンドで実行中のジョブ一覧を確認してから > jobs_output.txt で保存します。',
        ],
        answer: 'sleep 30 &\njobs > jobs_output.txt',
        commands: [
          { cmd: '[cmd] &',   desc: 'コマンドをバックグラウンドで実行する' },
          { cmd: 'jobs',      desc: 'バックグラウンドジョブの一覧を表示する' },
          { cmd: 'fg [%n]',   desc: 'ジョブをフォアグラウンドに戻す' },
          { cmd: 'bg [%n]',   desc: '停止中のジョブをバックグラウンドで継続する' },
          { cmd: 'Ctrl+Z',    desc: 'フォアグラウンドジョブを一時停止する' },
        ],
      },
      en: {
        title: 'Background Execution',
        description:
          'Run the following command in the background:\n\nsleep 30 &\n\nThen check jobs with the jobs command\nand save the output to jobs_output.txt.',
        background:
          'Running time-consuming tasks in the background while doing other work\nis a core infra skill.\n' +
          '· &: start in background\n' +
          '· jobs: list background jobs\n' +
          '· fg: bring job to foreground\n' +
          '· bg: continue a stopped job in background',
        hints: [
          'Add & at the end of a command to run it in the background.',
          'Run: sleep 30 &',
          'jobs shows background jobs. Save with: jobs > jobs_output.txt',
        ],
        answer: 'sleep 30 &\njobs > jobs_output.txt',
        commands: [
          { cmd: '[cmd] &',   desc: 'Run command in background' },
          { cmd: 'jobs',      desc: 'List background jobs' },
          { cmd: 'fg [%n]',   desc: 'Bring job to foreground' },
          { cmd: 'bg [%n]',   desc: 'Continue stopped job in background' },
          { cmd: 'Ctrl+Z',    desc: 'Suspend foreground job' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    validation: { type: 'file_exists', target: '/home/user/jobs_output.txt' },
  },

  {
    id: 'proc-3',
    category: 'process',
    locale: {
      ja: {
        title: 'プロセスを止める',
        description:
          '以下の手順でプロセスを停止する練習をしてください。\n\n1. sleep 100 & でバックグラウンドプロセスを起動する\n2. jobs で PID または ジョブ番号を確認する\n3. kill コマンドで停止させる\n4. "killed" という文字を killed.txt に書き出す',
        background:
          'kill コマンドはプロセスにシグナルを送ります。\n' +
          '· SIGTERM (15): 通常終了要求（デフォルト）\n' +
          '· SIGKILL (9): 強制終了。プロセスは無視できない\n' +
          '· SIGINT (2): Ctrl+C と同じ\n\n' +
          '実務では、応答しないWebサーバーや暴走プロセスを kill -9 で強制停止させます。',
        hints: [
          'sleep 100 & でバックグラウンドプロセスを起動します。',
          'kill %1 でジョブ番号1のプロセスを停止できます（または kill [PID]）。',
          'echo "killed" > killed.txt でファイルを作成してクリア条件を満たします。',
        ],
        answer:
          'sleep 100 &\n# ジョブ番号を使う場合:\nkill %1\n# または PID を使う場合:\n# kill [PID]\necho "killed" > killed.txt',
        commands: [
          { cmd: 'kill [PID]',    desc: 'プロセスにSIGTERM(15)を送る' },
          { cmd: 'kill -9 [PID]', desc: 'プロセスにSIGKILL(強制終了)を送る' },
          { cmd: 'kill %[n]',     desc: 'ジョブ番号でkillする' },
          { cmd: 'killall [name]',desc: '名前でまとめてkillする' },
          { cmd: 'jobs -l',       desc: 'PIDも表示したジョブ一覧' },
        ],
      },
      en: {
        title: 'Killing Processes',
        description:
          'Practice stopping processes:\n\n1. Start a background process: sleep 100 &\n2. Check the job number with: jobs\n3. Kill it with the kill command\n4. Write "killed" to killed.txt',
        background:
          'kill sends signals to processes:\n' +
          '· SIGTERM (15): polite termination request (default)\n' +
          '· SIGKILL (9): force kill — process cannot ignore this\n' +
          '· SIGINT (2): same as Ctrl+C\n\n' +
          'In production, kill -9 force-terminates unresponsive web servers or runaway processes.',
        hints: [
          'sleep 100 & starts a background process.',
          'kill %1 stops job number 1. Or use kill [PID].',
          'echo "killed" > killed.txt creates the file to satisfy the clear condition.',
        ],
        answer:
          'sleep 100 &\n# Using job number:\nkill %1\n# Or using PID:\n# kill [PID]\necho "killed" > killed.txt',
        commands: [
          { cmd: 'kill [PID]',    desc: 'Send SIGTERM(15) to a process' },
          { cmd: 'kill -9 [PID]', desc: 'Force kill with SIGKILL(9)' },
          { cmd: 'kill %[n]',     desc: 'Kill by job number' },
          { cmd: 'killall [name]',desc: 'Kill all processes by name' },
          { cmd: 'jobs -l',       desc: 'List jobs including PIDs' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    validation: { type: 'file_exists', target: '/home/user/killed.txt' },
  },

  {
    id: 'proc-4',
    category: 'process',
    locale: {
      ja: {
        title: 'ジョブスケジューリング入門',
        description:
          '以下の crontab エントリを crontab.txt というファイルに書き出してください。\n\n「毎日午前2時にバックアップスクリプトを実行する」設定です：\n\n0 2 * * * /home/user/backup.sh',
        background:
          'crontab は5つのフィールドで実行タイミングを指定します：\n' +
          '  分(0-59)  時(0-23)  日(1-31)  月(1-12)  曜日(0-6)\n\n' +
          '実例：\n' +
          '· 0 2 * * * → 毎日午前2時\n' +
          '· */5 * * * * → 5分おき\n' +
          '· 0 9 * * 1 → 毎週月曜9時\n\n' +
          'このコースではcron daemonが動いていないため、\n' +
          'crontab -e は使えませんが、書き方を覚えることが重要です。',
        hints: [
          'echo コマンドで crontab エントリを crontab.txt に書き出します。',
          'echo "0 2 * * * /home/user/backup.sh" > crontab.txt と実行します。',
          '5つのフィールドと実行コマンドをスペースで区切ります。',
        ],
        answer: 'echo "0 2 * * * /home/user/backup.sh" > crontab.txt',
        commands: [
          { cmd: 'crontab -e',       desc: 'crontabを編集する（要cron daemon）' },
          { cmd: 'crontab -l',       desc: '登録済みのcrontabを表示する' },
          { cmd: 'echo [text] > [f]',desc: 'テキストをファイルに書き出す' },
        ],
      },
      en: {
        title: 'Job Scheduling Introduction',
        description:
          'Write the following crontab entry to a file named crontab.txt.\n\nThis runs a backup script every day at 2 AM:\n\n0 2 * * * /home/user/backup.sh',
        background:
          'crontab uses 5 fields to specify when to run:\n' +
          '  min(0-59)  hour(0-23)  day(1-31)  month(1-12)  weekday(0-6)\n\n' +
          'Examples:\n' +
          '· 0 2 * * * → every day at 2 AM\n' +
          '· */5 * * * * → every 5 minutes\n' +
          '· 0 9 * * 1 → every Monday at 9 AM\n\n' +
          'The cron daemon is not available in this environment,\nbut learning the syntax is the key takeaway.',
        hints: [
          'Use echo to write the crontab entry to crontab.txt.',
          'echo "0 2 * * * /home/user/backup.sh" > crontab.txt',
          'Five fields plus the command, separated by spaces.',
        ],
        answer: 'echo "0 2 * * * /home/user/backup.sh" > crontab.txt',
        commands: [
          { cmd: 'crontab -e',       desc: 'Edit crontab (requires cron daemon)' },
          { cmd: 'crontab -l',       desc: 'List registered crontab entries' },
          { cmd: 'echo [text] > [f]',desc: 'Write text to a file' },
        ],
      },
    },
    setupDirs: ['/home/user'],
    validation: { type: 'file_content', target: '/home/user/crontab.txt', expected: '0 2 * * *' },
  },
]
