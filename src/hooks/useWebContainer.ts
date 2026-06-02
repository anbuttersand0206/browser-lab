import { useEffect, useRef, useState } from 'react'
import type { WebContainer, WebContainerProcess } from '@webcontainer/api'
import { isSafeFilePath } from '../lib/importValidator'

export type ContainerStatus = 'idle' | 'booting' | 'ready' | 'running' | 'error'

// モジュールレベルに置くことで毎レンダリングの正規表現オブジェクト生成を防ぐ。
// \x1b[ から始まる CSI シーケンス（色・カーソル移動等）を対象にしている。
// g フラグ付きでも .replace() 完了後に lastIndex がリセットされるため、
// モジュールレベルで共有しても状態汚染は起きない。
const ANSI_ESCAPE_RE = /\x1b\[[0-9;?]*[A-Za-z]/g

/**
 * WebContainers の起動・実行を管理するフック。
 *
 * @param isEnabled - true になったときに初めて WebContainer を起動する。
 *   false の間は一切リソースをロードしない。
 *   ユーザーがメモリ消費に同意してから true にすることで、
 *   ページロード直後の重いリソース取得を防ぐ。
 */
export function useWebContainer(isEnabled: boolean) {
  const wcRef = useRef<WebContainer | null>(null)
  const [status, setStatus] = useState<ContainerStatus>('idle')
  const [output, setOutput] = useState<string[]>([])
  const processRef = useRef<WebContainerProcess | null>(null)

  // ストリームから届く生のチャンクをコンソール行配列に変換して蓄積する。
  // 文字化けを防ぐため ANSI → CRLF → 単独 CR の順で正規化する。
  // この順序が重要: ANSI コード内に \r が埋め込まれることがあるため、
  // ANSI を先に除去してから \r を扱う必要がある。
  const appendOutput = (rawChunk: string) => {
    const normalized = rawChunk
      .replace(ANSI_ESCAPE_RE, '')  // ANSI エスケープコード（色・カーソル制御）を除去
      .replace(/\r\n/g, '\n')       // Windows CRLF を LF に統一

    setOutput((prev) => {
      // 先頭 \r はスピナーの行上書き制御。末尾行を置き換えることで端末と同じ動作を再現する。
      // --no-progress を指定しているため通常は来ないが、tsx 等他のツールへの備えとして残す。
      if (normalized.startsWith('\r') && prev.length > 0) {
        const overwritten = normalized.slice(1).replace(/\r/g, '')
        return [...prev.slice(0, -1), overwritten]
      }
      // 中間の \r はブラウザ HTML では端末制御として機能しない。除去してから追加する。
      return [...prev, normalized.replace(/\r/g, '')]
    })
  }

  const clearOutput = () => setOutput([])

  useEffect(() => {
    // isEnabled が false の間はリソースをロードしない。
    // ユーザーの同意を得てから true になる想定。
    if (!isEnabled) return

    let isCancelled = false
    setStatus('booting')
    ;(async () => {
      try {
        const { WebContainer } = await import('@webcontainer/api')
        const wc = await WebContainer.boot()
        // コンポーネントがアンマウント済みの場合はコンテナをすぐ破棄して state 更新しない
        if (isCancelled) {
          await wc.teardown()
          return
        }
        wcRef.current = wc
        setStatus('ready')
      } catch (e) {
        if (!isCancelled) {
          setStatus('error')
          appendOutput(`[Error] WebContainer の起動に失敗しました: ${e}`)
        }
      }
    })()
    return () => {
      isCancelled = true
      wcRef.current?.teardown()
    }
  }, [isEnabled])

  const run = async (files: Record<string, string>) => {
    const wc = wcRef.current
    // ガード節: WC が未起動または前の実行が完了していない場合は何もしない
    if (!wc || status !== 'ready') return

    // 前回の実行プロセスが残っている場合は二重起動を防ぐために先に停止する
    processRef.current?.kill()
    clearOutput()
    setStatus('running')

    try {
      const mountFiles: Record<string, { file: { contents: string } }> = {}
      for (const [filePath, contents] of Object.entries(files)) {
        // パストラバーサル攻撃を防ぐ。
        // インポートした JSON のファイルパスに `../` 等が含まれる場合、
        // WebContainer のファイルシステム上の npm パッケージを上書きできてしまうため、
        // ここでも検証する（importValidator 側の検証と二重チェック）。
        if (!isSafeFilePath(filePath)) {
          appendOutput(`[Error] 安全でないファイルパスをスキップしました: "${filePath}"`)
          continue
        }
        mountFiles[filePath] = { file: { contents } }
      }

      if (Object.keys(mountFiles).length === 0) {
        appendOutput('[Error] マウントできる有効なファイルがありません')
        setStatus('ready')
        return
      }

      await wc.mount(mountFiles)

      appendOutput('[npm] パッケージをインストール中...')
      // --no-progress でスピナー文字（\ | / -）の出力を抑制する。
      // スピナーは \r で前のフレームを上書きするが、ブラウザでは行上書きが効かず
      // 各フレームが別行として積まれてしまうため、発生源から断つ。
      const installProc = await wc.spawn('npm', [
        'install',
        '--prefer-offline',
        '--no-audit',
        '--no-fund',
        '--no-progress',
      ])
      installProc.output.pipeTo(
        new WritableStream({ write: (chunk) => appendOutput(chunk) })
      )
      const installExitCode = await installProc.exit
      if (installExitCode !== 0) {
        appendOutput(`[Error] npm install が失敗しました (exit ${installExitCode})`)
        setStatus('ready')
        return
      }

      // index.ts を優先し、なければ最初の .ts ファイル、それもなければ .js にフォールバック
      const entryFile =
        'index.ts' in files
          ? 'index.ts'
          : Object.keys(files).find((f) => f.endsWith('.ts')) ?? 'index.js'

      appendOutput('[実行] スクリプトを実行中...')
      const proc = await wc.spawn('npx', ['tsx', entryFile])
      processRef.current = proc
      proc.output.pipeTo(
        new WritableStream({ write: (chunk) => appendOutput(chunk) })
      )
      const exitCode = await proc.exit
      appendOutput(`\n[完了] プロセス終了 (exit ${exitCode})`)
    } catch (e) {
      appendOutput(`[Error] ${e}`)
    } finally {
      setStatus('ready')
    }
  }

  const killProcess = () => {
    processRef.current?.kill()
    setStatus('ready')
  }

  /**
   * WebContainer の仮想ファイルシステムからファイルを読み取る。
   * コード実行後に生成された db-dump.sql を JSON エクスポートに含めるために使う。
   * ファイルが存在しない・WC が起動していない場合は null を返す。
   */
  const readFileFromContainer = async (filePath: string): Promise<string | null> => {
    const wc = wcRef.current
    if (!wc) return null
    try {
      const content = await wc.fs.readFile(filePath, 'utf-8')
      return content as string
    } catch {
      // ファイルが存在しない場合は null を返して呼び出し側が判断する
      return null
    }
  }

  return { status, output, run, killProcess, clearOutput, readFileFromContainer }
}
