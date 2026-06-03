import { useState, useEffect } from 'react'
import { useI18n } from '../../i18n'

interface ConsoleProps {
  output: string[]
  onClear: () => void
  // WebContainer の server-ready で取得したサーバー URL。
  // null はサーバー未起動を意味し、プレビュータブを表示しない。
  serverUrl: string | null
}

// アクティブなタブの union 型。
// boolean フラグ管理ではなく、取りうる状態を型で列挙することで不正な状態を型レベルで排除する。
type ConsoleTab = 'console' | 'preview'

// システムが付与するプレフィックスで行の種別を判定して色分けする。
// ユーザーコードの出力（プレフィックスなし）は通常色で表示する。
function getLineColor(line: string): string {
  if (line.startsWith('[Error]'))  return 'text-red-400'
  if (line.startsWith('[サーバー]')) return 'text-green-400'
  if (line.startsWith('[npm]') || line.startsWith('[実行]') || line.startsWith('[完了]')) {
    return 'text-yellow-400'
  }
  return 'text-dark-text dark:text-dark-text light:text-light-text'
}

export function Console({ output, onClear, serverUrl }: ConsoleProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<ConsoleTab>('console')

  // serverUrl が設定されたらプレビュータブに自動切り替えする。
  // サーバー起動直後にユーザーがプレビューをすぐ確認できるようにするため。
  // null になった（サーバー停止）場合はコンソールに戻る。
  useEffect(() => {
    if (serverUrl) {
      setActiveTab('preview')
    } else {
      setActiveTab('console')
    }
  }, [serverUrl])

  return (
    <div className="flex h-full flex-col bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      <div className="flex h-7 flex-shrink-0 items-center border-b border-dark-border px-3 dark:border-dark-border light:border-light-border">
        <div className="flex">
          <button
            role="tab"
            aria-selected={activeTab === 'console'}
            onClick={() => setActiveTab('console')}
            className={`px-3 text-xs font-medium transition-colors ${
              activeTab === 'console'
                ? 'border-b-2 border-blue-500 text-dark-text dark:text-dark-text light:text-light-text'
                : 'text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text'
            }`}
          >
            {t.console.consoleTab}
          </button>
          {serverUrl && (
            <button
              role="tab"
              aria-selected={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-3 text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'border-b-2 border-blue-500 text-dark-text dark:text-dark-text light:text-light-text'
                  : 'text-dark-textDim hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text'
              }`}
            >
              {/* サーバーが起動中であることをインジケーターで示す */}
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              {t.console.previewTab}
            </button>
          )}
        </div>

        <div className="flex-1" />

        {activeTab === 'console' && (
          <button
            onClick={onClear}
            aria-label={t.console.clearAriaLabel}
            className="text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
          >
            {t.console.clearButton}
          </button>
        )}
      </div>

      {activeTab === 'console' && (
        <div className="flex-1 overflow-auto p-2 font-mono text-xs">
          {output.length === 0 ? (
            <div className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {t.console.emptyMessage}
            </div>
          ) : (
            output.map((line, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap leading-5 ${getLineColor(line)}`}
              >
                {line}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'preview' && serverUrl && (
        // WebContainer がフォワードしたポートの URL を iframe で表示する。
        // allow="*" は WebContainer の iframe に必要な権限（SharedArrayBuffer 等）を付与するため。
        // sandbox 属性を付けるとスクリプト実行が制限されて React 等のアプリが動かなくなる。
        <iframe
          src={serverUrl}
          className="flex-1 w-full border-0 bg-white"
          title={t.console.previewTab}
          allow="cross-origin-isolated"
        />
      )}
    </div>
  )
}
