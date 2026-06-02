interface ConsoleProps {
  output: string[]
  onClear: () => void
}

// システムが付与するプレフィックスで行の種別を判定して色分けする。
// ユーザーコードの出力（プレフィックスなし）は通常色で表示する。
function getLineColor(line: string): string {
  if (line.startsWith('[Error]')) return 'text-red-400'
  if (line.startsWith('[npm]') || line.startsWith('[実行]') || line.startsWith('[完了]')) {
    return 'text-yellow-400'
  }
  return 'text-dark-text dark:text-dark-text light:text-light-text'
}

export function Console({ output, onClear }: ConsoleProps) {
  return (
    <div className="flex h-full flex-col bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      <div className="flex h-7 flex-shrink-0 items-center justify-between border-b border-dark-border px-3 dark:border-dark-border light:border-light-border">
        <span className="text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          コンソール
        </span>
        <button
          onClick={onClear}
          className="text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          クリア
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {output.length === 0 ? (
          <div className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            実行ボタンを押すと出力がここに表示されます
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
    </div>
  )
}
