import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ShortcutGroup } from '../../types/shortcut'
import { useI18n } from '../../i18n'

// ShortcutGroup / ShortcutEntry の型定義は src/types/shortcut.ts に集約している。
// i18n と HelpModal の両方が参照するため、循環 import を防ぐために共通型ファイルに分離した。
export type { ShortcutGroup, ShortcutEntry } from '../../types/shortcut'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  groups: ShortcutGroup[]
}

export function HelpModal({ isOpen, onClose, groups }: HelpModalProps) {
  const { t } = useI18n()

  // ESC キーでモーダルを閉じる。
  // ブラウザ標準のダイアログと同等の操作感を提供するため。
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Mac 判定: navigator.platform は非推奨だが GitHub Pages 環境では互換性が高いため使用する。
  // userAgentData.platform は Chromium 系のみ対応で Safari/Firefox が欠ける。
  const isMac = navigator.platform.toUpperCase().includes('MAC')

  return (
    // role="dialog" と aria-modal で支援技術にモーダルの開閉を正確に伝える
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      {/* 背景オーバーレイ：クリックで閉じる。aria-hidden でスクリーンリーダーから隠す */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-lg border border-dark-border bg-dark-sidebar p-6 shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="help-modal-title"
            className="text-sm font-semibold text-dark-text dark:text-dark-text light:text-light-text"
          >
            {t.helpModal.title}
          </h2>
          <button
            onClick={onClose}
            aria-label={t.helpModal.closeAriaLabel}
            className="rounded p-1 text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
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
          {t.helpModal.dismissHint}
        </p>
      </div>
    </div>
  )
}
