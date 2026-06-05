import { Folder, FolderOpen, File, Link } from 'lucide-react'
import { type FileEntry, modeToPermString, formatFileSize } from '../../../hooks/useInfraContainer'

interface Props {
  entries: FileEntry[]
  /** 現在の作業ディレクトリ（ハイライト表示に使う） */
  currentDir?: string
  titleLabel: string
}

/**
 * WebContainerのファイルシステム状態をツリー形式で表示するコンポーネント。
 *
 * ls -la 相当の情報（パーミッション・サイズ・更新日時・ファイル種別アイコン）を
 * ターミナルのコマンド実行後にリアルタイム更新して表示する。
 */
export function FileTreeVisualizer({ entries, currentDir, titleLabel }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex-shrink-0 border-b border-dark-border px-3 py-1.5 dark:border-dark-border light:border-light-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {titleLabel}
        </span>
      </div>

      {/* ファイルツリー本体 */}
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {entries.length === 0 ? (
          <div className="py-4 text-center text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            —
          </div>
        ) : (
          <FileTreeNodes entries={entries} depth={0} currentDir={currentDir} />
        )}
      </div>
    </div>
  )
}

interface NodesProps {
  entries: FileEntry[]
  depth: number
  currentDir?: string
}

function FileTreeNodes({ entries, depth, currentDir }: NodesProps) {
  return (
    <>
      {entries.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} depth={depth} currentDir={currentDir} />
      ))}
    </>
  )
}

interface NodeProps {
  entry: FileEntry
  depth: number
  currentDir?: string
}

function FileTreeNode({ entry, depth, currentDir }: NodeProps) {
  const isCurrent = entry.path === currentDir
  const permStr = modeToPermString(entry.mode)
  const typeChar = entry.isDirectory ? 'd' : entry.isSymlink ? 'l' : '-'

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 rounded px-1 py-0.5 leading-5 ${
          isCurrent
            ? 'bg-blue-500/20 text-dark-text dark:text-dark-text light:text-light-text'
            : 'text-dark-textDim dark:text-dark-textDim light:text-light-textDim'
        }`}
        style={{ paddingLeft: `${4 + depth * 12}px` }}
      >
        {/* パーミッション文字列（typechar + rwx×3） */}
        <span className="w-[7ch] shrink-0 text-green-500 dark:text-green-400 light:text-green-700">
          {typeChar}{permStr}
        </span>

        {/* サイズ */}
        <span className="w-[5ch] shrink-0 text-right text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {entry.isDirectory ? '' : formatFileSize(entry.size)}
        </span>

        {/* ファイル種別アイコン + 名前 */}
        <FileIcon entry={entry} isCurrent={isCurrent} />
        <span
          className={`truncate ${
            entry.isDirectory
              ? 'font-medium text-blue-400 dark:text-blue-400 light:text-blue-600'
              : entry.isSymlink
              ? 'text-cyan-400 dark:text-cyan-400 light:text-cyan-600'
              : 'text-dark-text dark:text-dark-text light:text-light-text'
          }`}
        >
          {entry.name}
          {entry.isDirectory && '/'}
        </span>
      </div>

      {/* ディレクトリの子エントリを再帰表示する */}
      {entry.children && entry.children.length > 0 && (
        <FileTreeNodes entries={entry.children} depth={depth + 1} currentDir={currentDir} />
      )}
    </div>
  )
}

function FileIcon({ entry, isCurrent }: { entry: FileEntry; isCurrent: boolean }) {
  const baseClass = 'shrink-0'
  if (entry.isSymlink) {
    return <Link size={11} className={`${baseClass} text-cyan-400 dark:text-cyan-400 light:text-cyan-600`} />
  }
  if (entry.isDirectory) {
    return isCurrent
      ? <FolderOpen size={11} className={`${baseClass} text-blue-400 dark:text-blue-400 light:text-blue-600`} />
      : <Folder size={11} className={`${baseClass} text-blue-400 dark:text-blue-400 light:text-blue-600`} />
  }
  return <File size={11} className={`${baseClass} text-dark-textDim dark:text-dark-textDim light:text-light-textDim`} />
}
