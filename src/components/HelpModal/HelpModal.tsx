import { X } from 'lucide-react'

export interface ShortcutEntry {
  description: string
  // Mac と非Mac で表記が異なるため分けて保持する
  mac: string
  other: string
}

export interface ShortcutGroup {
  label: string
  shortcuts: ShortcutEntry[]
}

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  groups: ShortcutGroup[]
}

// CodeMirror 6 の defaultKeymap・historyKeymap・indentWithTab から
// 学習者がよく使うものだけを厳選している。全ショートカットは CM6 公式ドキュメントを参照。
export const EDITOR_COMMON_SHORTCUTS: ShortcutGroup = {
  label: 'エディタ共通',
  shortcuts: [
    { description: 'JSONで保存',        mac: 'Cmd + S',         other: 'Ctrl + S' },
    { description: '元に戻す',          mac: 'Cmd + Z',         other: 'Ctrl + Z' },
    { description: 'やり直す',          mac: 'Cmd + Shift + Z', other: 'Ctrl + Y' },
    { description: '選択行をインデント', mac: 'Tab',             other: 'Tab' },
    { description: 'インデント解除',    mac: 'Shift + Tab',     other: 'Shift + Tab' },
    { description: '全選択',            mac: 'Cmd + A',         other: 'Ctrl + A' },
  ],
}

export const DB_SHORTCUTS: ShortcutGroup = {
  label: 'DB コース',
  shortcuts: [
    { description: 'SQL を実行する', mac: 'Cmd + Enter', other: 'Ctrl + Enter' },
  ],
}

export function HelpModal({ isOpen, onClose, groups }: HelpModalProps) {
  if (!isOpen) return null

  // Mac 判定: navigator.platform は非推奨だが GitHub Pages 環境では互換性が高いため使用する。
  // userAgentData.platform は Chromium 系のみ対応で Safari/Firefox が欠ける。
  const isMac = navigator.platform.toUpperCase().includes('MAC')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* クリックがオーバーレイに伝播しないようにする */}
      <div
        className="w-full max-w-md rounded-lg border border-dark-border bg-dark-sidebar p-6 shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dark-text dark:text-dark-text light:text-light-text">
            キーボードショートカット
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-dark-text dark:text-dark-text light:text-light-text">
                      {shortcut.description}
                    </span>
                    <kbd className="rounded border border-dark-border bg-dark-bg px-2 py-0.5 font-mono text-xs text-dark-textDim dark:border-dark-border dark:bg-dark-bg dark:text-dark-textDim light:border-light-border light:bg-gray-100 light:text-light-textDim">
                      {isMac ? shortcut.mac : shortcut.other}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          Esc またはオーバーレイクリックで閉じます
        </p>
      </div>
    </div>
  )
}
