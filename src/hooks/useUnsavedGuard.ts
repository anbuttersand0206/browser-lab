import { useEffect, useRef, useState, useCallback } from 'react'

interface UnsavedGuardOptions {
  isDirty: boolean
  onSave: () => void
}

interface PendingNavigation {
  action: () => void
  label: string
}

export function useUnsavedGuard({ isDirty, onSave }: UnsavedGuardOptions) {
  const [pendingNav, setPendingNav] = useState<PendingNavigation | null>(null)
  // isDirty を ref でも持つ理由：beforeunload ハンドラは登録時のクロージャを参照するため、
  // state の最新値が取れない。ref 経由なら常に最新値を参照できる。
  const isDirtyRef = useRef(isDirty)

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // ブラウザの閉じる・リロード時に未保存データを失わないよう警告する
  // ブラウザ仕様でカスタムメッセージは表示されず、ブラウザ固定文言になる
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // アプリ内遷移（シナリオ切り替え・ページ移動）で未保存確認モーダルを挟む
  // React Router の navigate と混同しないよう guardNavigate という名前にしている
  const guardNavigate = useCallback(
    (action: () => void, label = '移動') => {
      if (isDirtyRef.current) {
        setPendingNav({ action, label })
      } else {
        action()
      }
    },
    []
  )

  const confirmSaveAndGo = useCallback(() => {
    if (!pendingNav) return
    onSave()
    pendingNav.action()
    setPendingNav(null)
  }, [pendingNav, onSave])

  const confirmDiscardAndGo = useCallback(() => {
    if (!pendingNav) return
    pendingNav.action()
    setPendingNav(null)
  }, [pendingNav])

  const cancelNavigation = useCallback(() => {
    setPendingNav(null)
  }, [])

  return {
    pendingNav,
    guardNavigate,
    confirmSaveAndGo,
    confirmDiscardAndGo,
    cancelNavigation,
  }
}
