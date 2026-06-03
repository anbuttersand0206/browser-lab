import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { I18nProvider } from './i18n'
import TopPage from './pages/Top/TopPage'

// ProgrammingPage と DatabasePage は重い依存（WebContainers / PGLite）を持つため
// 動的 import で遅延読み込みする。トップページの初期バンドルサイズを抑えるのが目的。
const ProgrammingPage = lazy(() => import('./pages/Programming/ProgrammingPage'))
const DatabasePage = lazy(() => import('./pages/Database/DatabasePage'))

// ルーティング遷移中のフォールバック表示。
// ページ全体を暗くして、コンテンツ描画前の白いフラッシュを防ぐ。
function PageLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
    <ThemeProvider>
      <HashRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<TopPage />} />
            {/* :scenarioId? を末尾に付けてシナリオへの直接リンクを可能にする */}
            <Route path="/programming/:scenarioId?" element={<ProgrammingPage />} />
            <Route path="/database/:scenarioId?" element={<DatabasePage />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ThemeProvider>
    </I18nProvider>
  )
}
