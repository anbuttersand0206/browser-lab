import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import TopPage from './pages/Top/TopPage'
import ProgrammingPage from './pages/Programming/ProgrammingPage'
import DatabasePage from './pages/Database/DatabasePage'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<TopPage />} />
          {/* :scenarioId? を末尾に付けてシナリオへの直接リンクを可能にする */}
          <Route path="/programming/:scenarioId?" element={<ProgrammingPage />} />
          <Route path="/database/:scenarioId?" element={<DatabasePage />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
