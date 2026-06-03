import { AlertTriangle, Download, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'

interface UnsavedModalProps {
  isOpen: boolean
  onSaveAndGo: () => void
  onDiscardAndGo: () => void
  onCancel: () => void
}

export function UnsavedModal({ isOpen, onSaveAndGo, onDiscardAndGo, onCancel }: UnsavedModalProps) {
  const { t } = useI18n()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-dark-border bg-dark-sidebar p-6 shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle size={22} className="flex-shrink-0 text-yellow-500" />
          <h2 className="text-lg font-semibold text-dark-text dark:text-dark-text light:text-light-text">
            {t.unsavedModal.title}
          </h2>
        </div>
        <p className="mb-6 text-sm text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          {t.unsavedModal.message}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onSaveAndGo}
            className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Download size={15} />
            {t.unsavedModal.saveAndGo}
          </button>
          <button
            onClick={onDiscardAndGo}
            className="flex items-center justify-center gap-2 rounded-md border border-dark-border bg-transparent px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 dark:border-dark-border light:border-light-border"
          >
            <Trash2 size={15} />
            {t.unsavedModal.discardAndGo}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 rounded-md border border-dark-border bg-transparent px-4 py-2.5 text-sm font-medium text-dark-text transition-colors hover:bg-dark-hover dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-hover light:border-light-border light:text-light-text light:hover:bg-light-hover"
          >
            {t.unsavedModal.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
