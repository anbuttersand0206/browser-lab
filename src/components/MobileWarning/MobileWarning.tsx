// モバイル端末でのターミナル系ページ利用時に、キーボードやリサイズ操作が
// 制限される旨を知らせるバナー。sm ブレークポイント以上では CSS で非表示になる。

import { useState } from 'react'
import { MonitorSmartphone, X } from 'lucide-react'
import { useI18n } from '../../i18n'

export function MobileWarning() {
  const [dismissed, setDismissed] = useState(false)
  const { t } = useI18n()

  // 一度閉じたら再表示しない
  if (dismissed) return null

  return (
    <div className="flex items-start gap-2 border-b border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400 sm:hidden">
      <MonitorSmartphone size={14} className="mt-0.5 flex-shrink-0" />
      <span className="flex-1">{t.mobile.desktopRecommended}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t.mobile.dismissWarning}
        className="flex-shrink-0 text-yellow-400/60 transition-colors hover:text-yellow-400"
      >
        <X size={14} />
      </button>
    </div>
  )
}
