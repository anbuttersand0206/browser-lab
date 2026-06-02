import { AlertTriangle, Check, ArrowLeft, ArrowRight } from 'lucide-react'

/** リソース同意モーダルに表示する1つのリソース項目の定義 */
export interface ResourceSpec {
  /** リソース名（例: "WebContainers"） */
  name: string
  /** 機能の簡潔な説明 */
  description: string
  /** 推定メモリ使用量の表示文字列（例: "200〜500 MB"）。null の場合は非表示 */
  estimatedMemoryRange: string | null
  /** ダウンロードが発生する場合のサイズ表示文字列。null の場合は非表示 */
  estimatedDownloadSize: string | null
  /** ユーザーが事前に知っておくべき注意事項のリスト */
  cautions: string[]
}

interface ResourceConsentModalProps {
  /** 起動するコースの名称（例: "プログラミング学習コース"） */
  courseName: string
  /** 起動対象のリソース仕様一覧 */
  resources: ResourceSpec[]
  /** 動作環境の推奨事項リスト */
  recommendations: string[]
  /** 「同意して起動」ボタン押下時のコールバック */
  onAccept: () => void
  /** 「戻る」ボタン押下時のコールバック */
  onCancel: () => void
}

/**
 * コース起動前のリソース消費に関する同意確認モーダル。
 *
 * WebContainers（~200〜500 MB）や PGLite（~50〜150 MB）は
 * ブラウザのメモリを大きく消費するため、事前にユーザーへ告知して同意を得る。
 * 同意なしに重いリソースを勝手にロードすることを防ぐ目的で使用する。
 */
export function ResourceConsentModal({
  courseName,
  resources,
  recommendations,
  onAccept,
  onCancel,
}: ResourceConsentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col rounded-xl border border-dark-border bg-dark-sidebar shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 border-b border-dark-border px-6 py-4 dark:border-dark-border light:border-light-border">
          <AlertTriangle size={22} className="flex-shrink-0 text-yellow-500" />
          <div>
            <h2 className="text-sm font-semibold text-dark-text dark:text-dark-text light:text-light-text">
              起動前の確認
            </h2>
            <p className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {courseName}
            </p>
          </div>
        </div>

        {/* 説明文 */}
        <p className="px-6 pt-4 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          このコースを起動すると、以下のリソースがブラウザのメモリにロードされます。
          ご利用の端末のメモリが少ない場合、ブラウザの動作が重くなることがあります。
        </p>

        {/* リソース一覧 */}
        <div className="mt-3 flex flex-col gap-2 px-6">
          {resources.map((resource) => (
            <ResourceItem key={resource.name} resource={resource} />
          ))}
        </div>

        {/* 推奨環境 */}
        <div className="mt-4 px-6">
          <p className="mb-1.5 text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
            推奨環境
          </p>
          <ul className="space-y-0.5">
            {recommendations.map((rec) => (
              <li key={rec} className="flex items-start gap-2 text-xs text-dark-text dark:text-dark-text light:text-light-text">
                <Check size={12} className="mt-0.5 flex-shrink-0 text-green-400" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* アクションボタン */}
        <div className="mt-4 flex justify-end gap-3 border-t border-dark-border px-6 py-4 dark:border-dark-border light:border-light-border">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 rounded-md border border-dark-border px-4 py-2 text-xs font-medium text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
          >
            <ArrowLeft size={13} />
            トップページに戻る
          </button>
          <button
            onClick={onAccept}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            同意してコースを開始
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** リソース項目1件分の表示コンポーネント */
function ResourceItem({ resource }: { resource: ResourceSpec }) {
  const { name, description, estimatedMemoryRange, estimatedDownloadSize, cautions } = resource

  return (
    <div className="rounded-lg border border-dark-border bg-dark-bg px-4 py-3 dark:border-dark-border dark:bg-dark-bg light:border-light-border light:bg-white">
      <div className="mb-1 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-dark-text dark:text-dark-text light:text-light-text">
          {name}
        </span>
        <div className="flex flex-shrink-0 items-center gap-3">
          {estimatedDownloadSize !== null && (
            <MemoryBadge label="DL" value={estimatedDownloadSize} colorClass="text-blue-400" />
          )}
          {estimatedMemoryRange !== null && (
            <MemoryBadge label="メモリ" value={estimatedMemoryRange} colorClass="text-yellow-400" />
          )}
        </div>
      </div>
      <p className="mb-2 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {description}
      </p>
      {cautions.length > 0 && (
        <ul className="space-y-0.5">
          {cautions.map((caution) => (
            <li key={caution} className="flex items-start gap-1.5 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-yellow-500" />
              <span>{caution}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** メモリ・ダウンロードサイズのバッジ表示 */
function MemoryBadge({
  label,
  value,
  colorClass,
}: {
  label: string
  value: string
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {label}:
      </span>
      <span className={`font-mono font-medium ${colorClass}`}>{value}</span>
    </div>
  )
}
