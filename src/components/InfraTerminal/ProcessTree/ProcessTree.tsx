// WebContainerの実行中プロセスをツリー形式で可視化するコンポーネント。
// `ps -eo pid,ppid,comm` の出力をパースしてPPIDでツリーを構築する。

import { useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface ProcessEntry {
  pid: number
  ppid: number
  comm: string
  children: ProcessEntry[]
}

interface ProcessTreeProps {
  // WebContainerでシェルコマンドを実行する関数
  runCommand: (cmd: string) => Promise<string>
}

// ps出力を ParsedProcess のリストにパースする。
// 行フォーマット: "  PID  PPID COMMAND"（数値はスペース区切り）
function parseProcessList(raw: string): ProcessEntry[] {
  const lines = raw.trim().split('\n')
  const entries: ProcessEntry[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    // 最低 3 フィールド（pid, ppid, comm）が必要。ヘッダー行や空行は弾く。
    if (parts.length < 3) continue
    const pid = parseInt(parts[0], 10)
    const ppid = parseInt(parts[1], 10)
    const comm = parts.slice(2).join(' ')
    // 数値変換できない行（ヘッダー等）は除外する
    if (isNaN(pid) || isNaN(ppid)) continue
    entries.push({ pid, ppid, comm, children: [] })
  }

  return entries
}

// フラットなリストからPPIDを使ってツリーを構築する。
// PID 1 や不明な PPID を持つプロセスは仮想ルートの子として扱う。
function buildProcessTree(entries: ProcessEntry[]): ProcessEntry[] {
  const byPid = new Map<number, ProcessEntry>()
  for (const e of entries) {
    byPid.set(e.pid, e)
  }

  const roots: ProcessEntry[] = []
  for (const e of entries) {
    const parent = byPid.get(e.ppid)
    if (parent && parent !== e) {
      parent.children.push(e)
    } else {
      roots.push(e)
    }
  }
  return roots
}

interface TreeNodeProps {
  node: ProcessEntry
  depth: number
}

function TreeNode({ node, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const indentPx = depth * 16

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 text-xs hover:bg-dark-hover dark:hover:bg-dark-hover light:hover:bg-light-hover"
        style={{ paddingLeft: indentPx + 4 }}
      >
        {/* 展開/折りたたみボタン。子がない場合はスペーサーで揃える */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="h-3 w-3 flex-shrink-0 text-dark-textDim dark:text-dark-textDim light:text-light-textDim"
            aria-label={expanded ? '折りたたむ' : '展開する'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="h-3 w-3 flex-shrink-0" />
        )}

        {/* PID */}
        <span className="w-10 flex-shrink-0 text-right font-mono text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {node.pid}
        </span>

        {/* コマンド名 */}
        <span className="flex-1 font-mono text-dark-text dark:text-dark-text light:text-light-text">
          {node.comm}
        </span>
      </div>

      {/* 子ノードは expanded のときのみ表示する */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.pid} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProcessTree({ runCommand }: ProcessTreeProps) {
  const [roots, setRoots] = useState<ProcessEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // 初回は未ロード状態を区別するため null を使う
  const [hasLoaded, setHasLoaded] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    // --no-headers がないと列名行がパースエラーになる。
    // jsh は ps の一部オプションしか実装していないため、PID/PPID/COMM のみを指定する。
    const raw = await runCommand('ps -eo pid,ppid,comm')
    const entries = parseProcessList(raw)
    const tree = buildProcessTree(entries)
    setRoots(tree)
    setHasLoaded(true)
    setIsLoading(false)
  }, [runCommand])

  return (
    <div className="flex h-full flex-col">
      {/* ヘッダー */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-dark-border px-3 py-2 dark:border-dark-border light:border-light-border">
        <div className="flex items-center gap-3 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          <span className="w-10 text-right font-mono">PID</span>
          <span>コマンド</span>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          title="プロセス一覧を更新"
          aria-label="プロセス一覧を更新"
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text disabled:opacity-50 dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          更新
        </button>
      </div>

      {/* プロセスツリー本体 */}
      <div className="flex-1 overflow-auto py-1">
        {!hasLoaded && (
          <div className="flex h-full items-center justify-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            「更新」ボタンでプロセス一覧を取得します
          </div>
        )}
        {hasLoaded && roots.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            プロセスが見つかりませんでした
          </div>
        )}
        {roots.map((root) => (
          <TreeNode key={root.pid} node={root} depth={0} />
        ))}
      </div>
    </div>
  )
}
