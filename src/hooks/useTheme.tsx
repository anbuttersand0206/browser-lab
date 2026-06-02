import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

// 許可する Theme 値の集合。localStorage から読んだ値を検証するために使う。
// 型アサーションの代わりにこのセットで実際の値を確認し、
// XSS や localStorage 汚染で不正な値が入っても安全にフォールバックする。
const ALLOWED_THEMES = new Set<string>(['dark', 'light', 'system'])

function readStoredTheme(): Theme {
  const stored = localStorage.getItem('theme')
  // ALLOWED_THEMES に含まれない値（未設定・改ざん・誤入力）は 'system' として扱う
  return ALLOWED_THEMES.has(stored ?? '') ? (stored as Theme) : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR 環境での安全性より、このアプリはブラウザ専用のため localStorage を直接読む
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  const [isSystemDark, setIsSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // システムのカラースキーム変更をリアルタイムに追従する
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => setIsSystemDark(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme: 'dark' | 'light' =
    theme === 'system' ? (isSystemDark ? 'dark' : 'light') : theme

  // Tailwind の `dark:` クラスを切り替えるために <html> の class を更新する
  useEffect(() => {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [resolvedTheme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
