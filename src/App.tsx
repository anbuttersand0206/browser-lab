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
          <Route path="/programming" element={<ProgrammingPage />} />
          <Route path="/database" element={<DatabasePage />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
