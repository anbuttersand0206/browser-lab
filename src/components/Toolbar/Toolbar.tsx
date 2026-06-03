import { Play, Square, Download, FolderOpen, RotateCcw } from 'lucide-react'
import { useI18n } from '../../i18n'

interface ToolbarProps {
  isDirty: boolean
  onRun?: () => void
  onStop?: () => void
  isRunning?: boolean
  onSave: () => void
  onLoad: () => void
  // 指定されているとき、初期状態に戻す「リセット」ボタンを表示する。
  // 確認ダイアログの表示は呼び出し側が責任を持つ（ツールバー自体は UI のみ）。
  onReset?: () => void
  extra?: React.ReactNode
}

export function Toolbar({ isDirty, onRun, onStop, isRunning, onSave, onLoad, onReset, extra }: ToolbarProps) {
  const { t } = useI18n()

  return (
    <div className="flex h-9 flex-shrink-0 items-center gap-1 border-b border-dark-border bg-dark-tab px-3 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
      {onRun && (
        <button
          onClick={isRunning ? onStop : onRun}
          className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
            isRunning
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isRunning ? (
            <>
              <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t.toolbar.stop}
            </>
          ) : (
            <>
              <Play size={12} />
              {t.toolbar.run}
            </>
          )}
        </button>
      )}

      {extra}

      <div className="flex-1" />

      {isDirty && (
        <span className="mr-2 flex items-center gap-1.5 text-xs text-yellow-400" title={t.toolbar.unsavedTooltip}>
          <Square size={8} className="fill-yellow-400" />
          {t.toolbar.unsaved}
        </span>
      )}

      {onReset && (
        <button
          onClick={onReset}
          title={t.toolbar.resetTooltip}
          aria-label={t.toolbar.resetAriaLabel}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-orange-400 dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-orange-400 light:text-light-textDim light:hover:bg-light-hover light:hover:text-orange-500"
        >
          <RotateCcw size={13} />
          {t.toolbar.reset}
        </button>
      )}

      <button
        onClick={onSave}
        title={t.toolbar.saveTooltip}
        aria-label={t.toolbar.saveTooltip}
        className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
      >
        <Download size={13} />
        {t.toolbar.save}
      </button>
      <button
        onClick={onLoad}
        title={t.toolbar.loadTooltip}
        aria-label={t.toolbar.loadTooltip}
        className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
      >
        <FolderOpen size={13} />
        {t.toolbar.load}
      </button>
    </div>
  )
}
