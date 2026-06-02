import { useCallback } from 'react'
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../lib/importValidator'

export function useJsonIO() {
  const exportJson = useCallback((data: unknown, filename: string) => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    // DOM に一時的に <a> を追加してクリックすることでファイルダウンロードを発火させる
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [])

  // ファイル選択ダイアログを開き、選択された JSON を解析して返す。
  // バリデーション（スキーマ検証・パス安全性確認）は呼び出し側で行う。
  // キャンセル・読み込み失敗・サイズ超過時は reject になるため、呼び出し側で catch する。
  const importJson = useCallback((): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          reject(new Error('ファイルが選択されませんでした'))
          return
        }
        // file.size はバイト数。text() で文字列化する前に上限を確認し、
        // 巨大なファイルによるメモリ枯渇（DoS）を防ぐ
        if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
          const limitMB = MAX_IMPORT_FILE_SIZE_BYTES / (1024 * 1024)
          reject(new Error(`ファイルサイズが上限 (${limitMB} MB) を超えています`))
          return
        }
        try {
          const text = await file.text()
          resolve(JSON.parse(text))
        } catch {
          reject(new Error('JSON の解析に失敗しました。ファイルの形式を確認してください'))
        }
      }
      input.oncancel = () => reject(new Error('キャンセルされました'))
      input.click()
    })
  }, [])

  return { exportJson, importJson }
}
