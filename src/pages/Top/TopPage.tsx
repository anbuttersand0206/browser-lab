import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Zap, Database, Sun, Moon, ArrowRight } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

export default function TopPage() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      {/* テーマ切り替え */}
      <div className="absolute right-4 top-4">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 rounded-md border border-dark-border bg-dark-sidebar px-3 py-1.5 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-dark-text dark:border-dark-border dark:bg-dark-sidebar dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:border-light-border light:bg-light-sidebar light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text"
        >
          {resolvedTheme === 'dark'
            ? <><Sun size={13} /> ライト</>
            : <><Moon size={13} /> ダーク</>
          }
        </button>
      </div>

      {/* ヘッダー */}
      <div className="mb-12 text-center">
        <div className="mb-4 flex justify-center text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          <FlaskConical size={56} />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-dark-text dark:text-dark-text light:text-light-text">
          Browser Lab
        </h1>
        <p className="text-base text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          インストール不要。ブラウザだけで動く学習プラットフォーム。
        </p>
      </div>

      {/* コースカード */}
      <div className="flex gap-6 px-6">
        <CourseCard
          icon={<Zap size={28} />}
          title="プログラミング学習"
          description="WebContainersを使ったNode.js / TypeScriptのリアルな実行環境。ブラウザ内でnpm installから実行まで。"
          badges={['TypeScript', 'Node.js', 'WebContainers']}
          scenarios={['はじめてのTypeScript', '非同期処理をマスターする', 'ORMでDBを操作する']}
          onClick={() => navigate('/programming')}
          color="blue"
        />

        <CourseCard
          icon={<Database size={28} />}
          title="DB学習コース"
          description="PGLiteを使ったブラウザ内PostgreSQL環境。本物のSQLを書いて、インデックスやJOINを体験する。"
          badges={['PostgreSQL', 'SQL', 'PGLite']}
          scenarios={['はじめてのCRUD', 'インデックスの効果を見る', 'JOINを使いこなす']}
          onClick={() => navigate('/database')}
          color="green"
        />
      </div>

    </div>
  )
}

interface CourseCardProps {
  icon: ReactNode
  title: string
  description: string
  badges: string[]
  scenarios: string[]
  onClick: () => void
  color: 'blue' | 'green'
}

function CourseCard({ icon, title, description, badges, scenarios, onClick, color }: CourseCardProps) {
  const accent = color === 'blue' ? 'border-blue-500/40 hover:border-blue-500' : 'border-green-500/40 hover:border-green-500'
  const iconBg = color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
  const badgeBg = color === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'

  return (
    <button
      onClick={onClick}
      className={`group flex w-80 flex-col rounded-xl border-2 bg-dark-sidebar p-6 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl dark:bg-dark-sidebar light:bg-light-sidebar ${accent}`}
    >
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>

      <h2 className="mb-2 text-lg font-bold text-dark-text dark:text-dark-text light:text-light-text">
        {title}
      </h2>

      <p className="mb-4 text-sm leading-relaxed text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
        {description}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <span key={b} className={`rounded-md px-2 py-0.5 text-xs font-medium ${badgeBg}`}>
            {b}
          </span>
        ))}
      </div>

      <div className="border-t border-dark-border pt-4 dark:border-dark-border light:border-light-border">
        <div className="mb-1.5 text-xs font-medium text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          収録シナリオ
        </div>
        {scenarios.map((s, i) => (
          <div key={s} className="flex items-center gap-2 py-0.5 text-xs text-dark-text dark:text-dark-text light:text-light-text">
            <span className="text-dark-textDim">{i + 1}.</span>
            {s}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 text-xs font-medium text-dark-textDim transition-colors group-hover:text-dark-text dark:text-dark-textDim dark:group-hover:text-dark-text light:text-light-textDim light:group-hover:text-light-text">
        コースを開始
        <ArrowRight size={13} />
      </div>
    </button>
  )
}
