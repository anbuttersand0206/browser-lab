import { useState, useCallback } from 'react'
import type { CodeThemeId } from '../lib/editorThemes'

const LS_KEY = 'browser-lab:code-theme'

// localStorage から保存済みのテーマ ID を読む。不正値はデフォルトに戻す。
function readSavedThemeId(): CodeThemeId {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === 'dracula' || raw === 'solarized-dark' || raw === 'solarized-light') return raw
  } catch { /* localStorage が使えない環境では無視する */ }
  return 'system'
}

// コードエディタのシンタックステーマ選択を管理するフック。
// 全コースで共通のテーマを使えるよう localStorage に永続化する。
export function useCodeTheme() {
  const [codeThemeId, setCodeThemeIdState] = useState<CodeThemeId>(() => readSavedThemeId())

  const setCodeThemeId = useCallback((id: CodeThemeId) => {
    setCodeThemeIdState(id)
    try {
      localStorage.setItem(LS_KEY, id)
    } catch { /* localStorage が使えない環境では状態のみ更新する */ }
  }, [])

  return { codeThemeId, setCodeThemeId }
}
