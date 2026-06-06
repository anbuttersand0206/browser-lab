import { useEffect, useRef, useState, useCallback } from 'react'
import type { WebContainer } from '@webcontainer/api'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import type { InfraMission, ValidationRule } from '../missions/infra'

export type InfraContainerStatus = 'idle' | 'booting' | 'ready' | 'error'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  // @webcontainer/api v1 の FileSystemAPI には stat がないためデフォルト値を使う
  mode: number
  size: number
  children?: FileEntry[]
}

// バイト数を人が読みやすい表現に変換する（4KB, 2.3MB など）
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0B'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ファイルモードの数値をrwxr-xr-x形式の文字列に変換する
export function modeToPermString(mode: number): string {
  const bits = mode & 0o777
  let result = ''
  for (let shift = 6; shift >= 0; shift -= 3) {
    const group = (bits >> shift) & 7
    result += group & 4 ? 'r' : '-'
    result += group & 2 ? 'w' : '-'
    result += group & 1 ? 'x' : '-'
  }
  return result
}

const INITIAL_BASHRC = 'export PS1="[user@browser-lab \\w]$ "\n'

/**
 * インフラコース用のWebContainerを管理するフック。
 *
 * プログラミングコースの useWebContainer とは責務が異なる：
 * - npm install は不要
 * - jsh シェルをinteractiveに起動してxtermと接続する
 * - バリデーションは wc.fs API と Node.js spawn の組み合わせで行う
 */
export function useInfraContainer(isEnabled: boolean) {
  // WebContainer インスタンスの保持
  const wcRef = useRef<WebContainer | null>(null)
  // 実行中のシェルプロセスの制御（kill, resize）用
  const shellProcessRef = useRef<{ kill: () => void; resize: (cols: number, rows: number) => void } | null>(null)
  // シェルの標準入力への書き込み用
  const shellInputWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null)
  // xterm.js の onData リスナーの解除用。プロセス再起動時に古いリスナーが残るのを防ぐ。
  const terminalOnDataDisposableRef = useRef<{ dispose: () => void } | null>(null)

  const [status, setStatus] = useState<InfraContainerStatus>('idle')
  const [fileTree, setFileTree] = useState<FileEntry[]>([])

  // WebContainerを起動してホームディレクトリを初期化する
  useEffect(() => {
    // ユーザーがリソース使用に同意（isEnabled = true）するまで起動を待機する。
    // 無用なメモリ消費とCPU負荷を避けるため。
    if (!isEnabled) return

    let isCancelled = false
    setStatus('booting')

    ;(async () => {
      try {
        const { WebContainer } = await import('@webcontainer/api')
        const wc = await WebContainer.boot()

        if (isCancelled) {
          await wc.teardown()
          return
        }

        // wc.fs.mkdir() で必要なディレクトリ構造を確実に作成する。
        // recursive: true を使うことで中間ディレクトリも含めて作成される。
        await wc.fs.mkdir('/home/user', { recursive: true })
        
        // 初期ファイルの作成
        await wc.fs.writeFile('/home/user/.bashrc', INITIAL_BASHRC)
        await wc.fs.writeFile('/home/user/README.txt', 'Welcome to browser-lab infra course!\nType ls to see files.\n')

        wcRef.current = wc
        setStatus('ready')

        // 初回のファイルツリー取得
        const tree = await readDirRecursive(wc, '/home/user')
        setFileTree(tree)
      } catch (error) {
        // ネットワークエラーやWebContainerの起動失敗に対応
        if (!isCancelled) {
          console.error('Failed to boot WebContainer:', error)
          setStatus('error')
        }
      }
    })()

    return () => {
      isCancelled = true
      // コンポーネント破棄時にリソースを確実に解放する
      shellProcessRef.current?.kill()
      terminalOnDataDisposableRef.current?.dispose()
      wcRef.current?.teardown()
    }
  }, [isEnabled])

  /**
   * jsh シェルを起動して xterm.js に接続する。
   * 古いシェルプロセスが残っている場合はクリーンアップした上で新規起動する。
   */
  const spawnShell = useCallback(async (terminal: Terminal, fitAddon: FitAddon) => {
    const wc = wcRef.current
    if (!wc) return

    // 二重起動防止：既存のプロセスとリスナーを破棄する
    shellProcessRef.current?.kill()
    shellInputWriterRef.current = null
    terminalOnDataDisposableRef.current?.dispose()

    // ターミナルの現在のサイズを取得。FitAddon を使って正確なセル数を計算する。
    const dimensions = fitAddon.proposeDimensions()
    const cols = dimensions?.cols ?? 80
    const rows = dimensions?.rows ?? 24

    // wc.fs.mkdir で作成したディレクトリが jsh から見えないケースがあるため、
    // プロセス側から mkdir -p で作成してプロセス名前空間に確実に存在させる。
    const mkdirProc = await wc.spawn('sh', ['-c', 'mkdir -p /home/user'])
    await mkdirProc.exit

    // jsh は WebContainers が提供するインタラクティブな Unix ライクシェル。
    // terminal オプションを渡すことで、擬似端末（PTY）として振る舞うようになる。
    // cwd を指定することで jsh の初期ディレクトリを /home/user に固定する。
    const shellProcess = await wc.spawn('jsh', [], {
      terminal: { cols, rows },
      cwd: '/home/user',
    })

    // WebContainer → xterm.js: シェルの標準出力を画面に表示する
    shellProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data)
        },
      })
    )

    // xterm.js → WebContainer: ユーザーのキー入力をシェルの標準入力に送る
    const writer = shellProcess.input.getWriter()
    shellInputWriterRef.current = writer

    // 重要な修正: プロセスごとにリスナーを管理し、古いプロセスへの書き込みによるエラーを防ぐ
    const disposable = terminal.onData((data) => {
      // 以前の writer が残っていても、現在のプロセスの writer にのみ書き込む
      writer.write(data).catch((err) => {
        // 書き込み失敗（ストリームが閉じている場合など）はログ出力して握り潰す
        console.warn('Failed to write to shell input:', err)
      })
    })
    terminalOnDataDisposableRef.current = disposable

    shellProcessRef.current = {
      kill: () => shellProcess.kill(),
      resize: (c, r) => shellProcess.resize({ cols: c, rows: r }),
    }
    // 初期 cd は行わない。setupMission が /home/user を作成した後に cd && clear を送るため、
    // ここで cd すると setupMission の rm() との競合でディレクトリが存在しない状態になる。
  }, [])

  // ターミナルリサイズ時にシェル側のウィンドウサイズを同期する
  const resizeShell = useCallback((cols: number, rows: number) => {
    // ユーザーがペイン境界をドラッグした際などに、シェルの折り返し位置を追従させる
    shellProcessRef.current?.resize(cols, rows)
  }, [])

  /**
   * ミッション選択時にファイルシステムをクリーンな状態にリセットして初期化する。
   */
  const setupMission = useCallback(async (mission: InfraMission) => {
    const wc = wcRef.current
    if (!wc) return

    // 以前のミッションでの変更が残らないよう、/home/user 内をクリーンアップする。
    // ディレクトリ自体を削除するとシェル（CWD）が不安定になる可能性があるため、中身だけ消す。
    try {
      const entries = await wc.fs.readdir('/home/user')
      for (const entry of entries) {
        // .bashrc は維持する
        if (entry === '.bashrc') continue
        await wc.fs.rm(`/home/user/${entry}`, { recursive: true })
      }
    } catch {
      // ディレクトリがない場合は作成する
      await wc.fs.mkdir('/home/user', { recursive: true })
    }

    // .bashrc がない場合は再作成
    try {
      await wc.fs.readFile('/home/user/.bashrc')
    } catch {
      await wc.fs.writeFile('/home/user/.bashrc', INITIAL_BASHRC)
    }

    // ミッションで定義された初期ディレクトリの作成
    for (const dir of mission.setupDirs ?? []) {
      await wc.fs.mkdir(`/home/user/${dir}`, { recursive: true })
    }

    // ミッションで定義された初期ファイルの作成
    for (const [filePath, content] of Object.entries(mission.setupFiles ?? {})) {
      const fullPath = `/home/user/${filePath}`
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      if (dir) await wc.fs.mkdir(dir, { recursive: true })
      await wc.fs.writeFile(fullPath, content)
    }

    // シェルのカレントディレクトリをリセットし、画面をクリアする。
    // これにより、新しいミッションの開始地点が明確になる。
    await shellInputWriterRef.current?.write('cd /home/user && clear\n')

    // 視覚的なファイルツリーを更新
    const tree = await readDirRecursive(wc, '/home/user')
    setFileTree(tree)
  }, [])

  // ファイルシステムの現在状態を再読み込みする
  const refreshFileTree = useCallback(async () => {
    const wc = wcRef.current
    if (!wc) return
    const tree = await readDirRecursive(wc, '/home/user')
    setFileTree(tree)
  }, [])

  // バリデーションルールを評価してミッションクリア判定を行う
  // @webcontainer/api v1 に stat がないため：
  // - ファイル存在確認は readFile で代替
  // - ディレクトリ確認は readdir で代替
  // - パーミッション・シンボリックリンク確認は Node.js スポーンで代替
  const validate = useCallback(async (rule: ValidationRule): Promise<boolean> => {
    const wc = wcRef.current
    if (!wc) return false

    switch (rule.type) {
      case 'file_exists': {
        try {
          await wc.fs.readFile(rule.target)
          return true
        } catch {
          return false
        }
      }

      case 'dir_exists': {
        try {
          await wc.fs.readdir(rule.target)
          return true
        } catch {
          return false
        }
      }

      case 'file_content': {
        try {
          const content = await wc.fs.readFile(rule.target, 'utf-8')
          return content.includes(rule.expected)
        } catch {
          return false
        }
      }

      case 'permission': {
        // stat がないため Node.js の fs.statSync を経由してパーミッションを取得する
        try {
          const code =
            `try{const s=require('fs').statSync('${rule.target}');` +
            `process.stdout.write((s.mode&0o777).toString(8))}catch{process.stdout.write('err')}`
          const proc = await wc.spawn('node', ['-e', code])
          let out = ''
          proc.output.pipeTo(new WritableStream({ write(d) { out += d } }))
          await proc.exit
          return out.trim() === rule.expected
        } catch {
          return false
        }
      }

      case 'symlink_exists': {
        // lstat でシンボリックリンク自体の情報を確認する
        try {
          const code =
            `try{const s=require('fs').lstatSync('${rule.target}');` +
            `process.stdout.write(s.isSymbolicLink()?'1':'0')}catch{process.stdout.write('0')}`
          const proc = await wc.spawn('node', ['-e', code])
          let out = ''
          proc.output.pipeTo(new WritableStream({ write(d) { out += d } }))
          await proc.exit
          return out.trim() === '1'
        } catch {
          return false
        }
      }

      case 'command_output': {
        try {
          const proc = await wc.spawn('sh', ['-c', rule.cmd])
          let out = ''
          proc.output.pipeTo(new WritableStream({ write(d) { out += d } }))
          await proc.exit
          return out.includes(rule.expected)
        } catch {
          return false
        }
      }
    }
  }, [])

  // 任意のシェルコマンドを実行して標準出力を文字列として返す。
  // プロセスツリー取得などの読み取り専用操作に使う。
  const runCommand = useCallback(async (cmd: string): Promise<string> => {
    const wc = wcRef.current
    if (!wc) return ''
    try {
      const proc = await wc.spawn('sh', ['-c', cmd])
      let out = ''
      proc.output.pipeTo(new WritableStream({ write(d) { out += d } }))
      await proc.exit
      return out
    } catch {
      return ''
    }
  }, [])

  return {
    status,
    fileTree,
    spawnShell,
    resizeShell,
    setupMission,
    refreshFileTree,
    validate,
    runCommand,
  }
}

// /home/user ツリーを再帰読み込みする（最大2階層まで）
// @webcontainer/api v1 の DirEnt には isFile() と isDirectory() のみ存在する
async function readDirRecursive(
  wc: WebContainer,
  dir: string,
  depth = 0
): Promise<FileEntry[]> {
  if (depth > 2) return []

  try {
    const entries = await wc.fs.readdir(dir, { withFileTypes: true })
    const results = await Promise.all(
      entries.map(async (entry): Promise<FileEntry> => {
        const fullPath = `${dir}/${entry.name}`
        const isDir = entry.isDirectory()

        const fileEntry: FileEntry = {
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          isSymlink: false,  // DirEnt v1 には isSymbolicLink がない
          mode: isDir ? 0o755 : 0o644,  // デフォルト値（実際のパーミッションはls -laで確認）
          size: 0,  // stat がないため取得不可
        }

        if (isDir && depth < 2) {
          fileEntry.children = await readDirRecursive(wc, fullPath, depth + 1)
        }

        return fileEntry
      })
    )

    // ディレクトリを先に、隠しファイル（.で始まる）を後に並べる
    return results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      const aHidden = a.name.startsWith('.')
      const bHidden = b.name.startsWith('.')
      if (aHidden !== bHidden) return aHidden ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}
