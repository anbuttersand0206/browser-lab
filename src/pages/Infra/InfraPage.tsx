import '@xterm/xterm/css/xterm.css'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sun, Moon, Languages, CheckCircle2, ChevronDown, ChevronRight, Server, RefreshCw, Trash2, AlertTriangle } from 'lucide-react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

import { useTheme } from '../../hooks/useTheme'
import { useI18n } from '../../i18n'
import { useInfraContainer } from '../../hooks/useInfraContainer'
import { ResourceConsentModal } from '../../components/ResourceConsentModal/ResourceConsentModal'
import { XTerminal } from '../../components/InfraTerminal/Terminal/XTerminal'
import { FileTreeVisualizer } from '../../components/InfraTerminal/FileTreeVisualizer/FileTreeVisualizer'
import { MissionPanel } from '../../components/InfraTerminal/MissionPanel/MissionPanel'
import { infraMissions, INFRA_CATEGORIES, getMissionsByCategory, type InfraMission, type InfraCategory } from '../../missions/infra'

// ─── 永続化 ──────────────────────────────────────────────────────────────────

const LS_KEY_CLEARED = 'browser-lab:infra:cleared'

function loadClearedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY_CLEARED)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function saveClearedIds(ids: Set<string>): void {
  localStorage.setItem(LS_KEY_CLEARED, JSON.stringify([...ids]))
}

// ─── ペインリサイズ ───────────────────────────────────────────────────────────

interface PaneSizes {
  sidebarWidthPx: number
  missionPanelWidthPx: number
  terminalHeightPx: number
}

type DragTarget = 'sidebar' | 'missionPanel' | 'terminal'

interface DragState {
  target: DragTarget
  startX: number
  startY: number
  startSizePx: number
}

// ─── メインページ ────────────────────────────────────────────────────────────

export default function InfraPage() {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const isDark = resolvedTheme === 'dark'

  // ─── 同意・セッション状態 ─────────────────────────────────────────────────

  const [hasConsented, setHasConsented] = useState(false)
  // ユーザーがターミナルに1文字でも入力したらtrue（離脱警告の判定に使う）
  const [hasStarted, setHasStarted] = useState(false)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const pendingNavRef = useRef<(() => void) | null>(null)

  // ─── ミッション状態 ───────────────────────────────────────────────────────

  const [currentMission, setCurrentMission] = useState<InfraMission>(infraMissions[0])
  const [clearedIds, setClearedIds] = useState<Set<string>>(loadClearedIds)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<InfraCategory>>(new Set())
  const isCurrentCleared = clearedIds.has(currentMission.id)

  const nextMission = useMemo(() => {
    const idx = infraMissions.findIndex((m) => m.id === currentMission.id)
    return idx < infraMissions.length - 1 ? infraMissions[idx + 1] : null
  }, [currentMission.id])

  // ─── ペインリサイズ ───────────────────────────────────────────────────────

  const [paneSizes, setPaneSizes] = useState<PaneSizes>(() => {
    // ターミナルにビューポートの約 65% を割り当て、ファイルツリーに残りを確保する。
    // 固定値 320px だとファイルツリーが大きくなりすぎてターミナルが見えにくくなるため
    // ビューポート高さに応じて動的に計算する。
    const terminalH = Math.max(280, Math.min(600, Math.floor((window.innerHeight - 36) * 0.65)))
    return {
      sidebarWidthPx: 220,
      missionPanelWidthPx: 340,
      terminalHeightPx: terminalH,
    }
  })
  const dragStateRef = useRef<DragState | null>(null)

  const startDrag = (target: DragTarget, e: React.MouseEvent) => {
    e.preventDefault()
    const startSizePx =
      target === 'sidebar' ? paneSizes.sidebarWidthPx :
      target === 'missionPanel' ? paneSizes.missionPanelWidthPx :
      paneSizes.terminalHeightPx
    dragStateRef.current = { target, startX: e.clientX, startY: e.clientY, startSizePx }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return
      const { target, startX, startY, startSizePx } = dragStateRef.current
      if (target === 'sidebar') {
        const w = Math.max(160, Math.min(380, startSizePx + e.clientX - startX))
        setPaneSizes((p) => ({ ...p, sidebarWidthPx: w }))
      } else if (target === 'missionPanel') {
        // 右端固定なので符号が逆になる
        const w = Math.max(240, Math.min(520, startSizePx - (e.clientX - startX)))
        setPaneSizes((p) => ({ ...p, missionPanelWidthPx: w }))
      } else {
        // 上限はビューポート高さの 85% にすることで大きい画面でも十分に広げられる
        const maxH = Math.floor((window.innerHeight - 36) * 0.85)
        const h = Math.max(120, Math.min(maxH, startSizePx + e.clientY - startY))
        setPaneSizes((p) => ({ ...p, terminalHeightPx: h }))
      }
    }
    const handleMouseUp = () => { dragStateRef.current = null }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // ─── WebContainer ─────────────────────────────────────────────────────────

  const { status, fileTree, spawnShell, resizeShell, setupMission, refreshFileTree, validate } =
    useInfraContainer(hasConsented)

  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [terminalMounted, setTerminalMounted] = useState(false)
  // ミッション変更中のチラつきを防ぐためのフラグ
  const setupInProgressRef = useRef(false)

  // ターミナルが初期化されたらインスタンスを保持してシェル起動を試みる
  const handleTerminalMount = useCallback((terminal: Terminal, fitAddon: FitAddon) => {
    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // ユーザーがターミナルに何か入力したら、セッションが開始されたとみなす。
    // これにより、不意なページ遷移時に警告を表示できるようになる。
    const { dispose } = terminal.onData(() => setHasStarted(true))

    setTerminalMounted(true)

    // アンマウント時にリスナーを確実に解除し、状態をリセットする
    return () => {
      dispose()
      terminalRef.current = null
      fitAddonRef.current = null
      setTerminalMounted(false)
    }
  }, [])

  // WebContainer の準備が整い、かつターミナル UI もマウントされたらシェルを起動する
  useEffect(() => {
    // ガード節: 必要なリソースが揃うまで待機
    if (status !== 'ready' || !terminalMounted) return
    const terminal = terminalRef.current
    const fitAddon = fitAddonRef.current
    if (!terminal || !fitAddon) return

    // 起動シーケンス
    ;(async () => {
      try {
        // 1. シェルプロセスを起動し、ターミナル入出力と接続
        await spawnShell(terminal, fitAddon)

        // 2. ターミナルにフォーカスを当てる（ユーザーがクリックなしで即入力できるようにするため）
        terminal.focus()

        // 3. 最初のミッションのファイルセットアップを実行
        await setupMission(currentMission)
      } catch (error) {
        console.error('Failed to initialize infra terminal session:', error)
      }
    })()

    // 依存配列に status と terminalMounted を指定し、初回のみ実行されるようにする。
    // currentMission は別の Effect で切り替えをハンドルするためここには含めない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, terminalMounted])

  // ミッション変更時: FS をリセットして新しいミッション環境を構築する
  const prevMissionIdRef = useRef(currentMission.id)
  useEffect(() => {
    // 初回マウント時は上の effect が処理するのでスキップする
    if (prevMissionIdRef.current === currentMission.id) return
    prevMissionIdRef.current = currentMission.id
    if (status !== 'ready' || setupInProgressRef.current) return

    setupInProgressRef.current = true
    setupMission(currentMission).finally(() => {
      setupInProgressRef.current = false
      setHasStarted(false)
    })
  }, [currentMission, status, setupMission])

  // ターミナルリサイズ時にシェルのウィンドウサイズを同期する
  const handleTerminalResize = useCallback((cols: number, rows: number) => {
    resizeShell(cols, rows)
  }, [resizeShell])
  // FitAddon の ResizeObserver が発火したときに resizeShell を呼ぶ
  // XTerminal 内の ResizeObserver が fit() を実行 → terminal の onResize イベントを利用する
  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return
    const { dispose } = terminal.onResize(({ cols, rows }) => handleTerminalResize(cols, rows))
    return dispose
  }, [terminalMounted, handleTerminalResize])

  // ─── バリデーションポーリング（5秒おき） ─────────────────────────────────

  useEffect(() => {
    if (status !== 'ready') return
    const timerId = setInterval(async () => {
      if (clearedIds.has(currentMission.id)) return
      const passed = await validate(currentMission.validation)
      if (!passed) return
      setClearedIds((prev) => {
        const next = new Set([...prev, currentMission.id])
        saveClearedIds(next)
        return next
      })
    }, 5000)
    return () => clearInterval(timerId)
  }, [status, currentMission, clearedIds, validate])

  // ─── ファイルツリーポーリング（3秒おき） ─────────────────────────────────

  useEffect(() => {
    if (status !== 'ready') return
    const timerId = setInterval(refreshFileTree, 3000)
    return () => clearInterval(timerId)
  }, [status, refreshFileTree])

  // ─── ナビゲーション警告 ───────────────────────────────────────────────────

  // ブラウザのタブを閉じたときの警告（ブラウザの仕様でカスタムメッセージは出せない）
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasStarted) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasStarted])

  const guardNavigate = (action: () => void) => {
    if (hasStarted) {
      pendingNavRef.current = action
      setShowLeaveWarning(true)
    } else {
      action()
    }
  }

  // ─── ミッション選択 ───────────────────────────────────────────────────────

  const handleSelectMission = (mission: InfraMission) => {
    if (mission.id === currentMission.id) return
    setCurrentMission(mission)
  }

  const handleNextMission = () => {
    if (nextMission) setCurrentMission(nextMission)
  }

  const handleResetProgress = () => {
    if (!window.confirm(t.infra.ui.confirmReset)) return
    setClearedIds(new Set())
    saveClearedIds(new Set())
  }

  const handleRefreshTree = () => refreshFileTree()

  const toggleCategory = (cat: InfraCategory) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  // ─── ステータス表示 ───────────────────────────────────────────────────────

  const statusLabel =
    !hasConsented ? t.infra.ui.statusIdle :
    status === 'booting' ? t.infra.ui.statusBooting :
    status === 'error' ? t.infra.ui.statusError :
    t.infra.ui.statusReady

  const statusDot =
    status === 'booting' ? 'animate-pulse bg-yellow-400' :
    status === 'ready' ? 'bg-green-400' :
    status === 'error' ? 'bg-red-400' : 'bg-gray-500'

  const clearedCount = infraMissions.filter((m) => clearedIds.has(m.id)).length

  // ─── レンダリング ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-dark-bg dark:bg-dark-bg light:bg-light-bg">
      {/* ─── ナビゲーションバー ─────────────────────────────────────────── */}
      <div className="flex h-9 flex-shrink-0 items-center gap-2 border-b border-dark-border bg-dark-tab px-3 dark:border-dark-border dark:bg-dark-tab light:border-light-border light:bg-light-tab">
        <button
          onClick={() => guardNavigate(() => navigate('/'))}
          className="flex items-center gap-1 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <ArrowLeft size={13} />
          Browser Lab
        </button>
        <span className="text-dark-textDim">/</span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-dark-text dark:text-dark-text light:text-light-text">
          <Server size={13} />
          {t.infra.nav.infraCourse}
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
          {statusLabel}
        </div>

        <button
          onClick={() => setLocale(locale === 'ja' ? 'en' : 'ja')}
          aria-label={t.locale.switchLabel}
          className="rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          <Languages size={14} />
        </button>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="rounded px-2 py-0.5 text-xs text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* ─── 本体3ペイン ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 左サイドバー: ミッション一覧 ── */}
        <div
          style={{ width: paneSizes.sidebarWidthPx }}
          className="flex flex-shrink-0 flex-col overflow-hidden border-r border-dark-border bg-dark-sidebar dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar"
        >
          {/* 進捗サマリー */}
          <div className="flex-shrink-0 border-b border-dark-border px-3 py-2 dark:border-dark-border light:border-light-border">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {t.infra.ui.progressLabel}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full bg-dark-border dark:bg-dark-border light:bg-light-border" style={{ height: 4 }}>
                <div
                  className="h-full rounded-full bg-green-400 transition-all"
                  style={{ width: `${infraMissions.length > 0 ? (clearedCount / infraMissions.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {clearedCount}/{infraMissions.length}
              </span>
            </div>
          </div>

          {/* カテゴリ別ミッションリスト */}
          <div className="flex-1 overflow-auto py-1">
            {INFRA_CATEGORIES.map((cat) => {
              const missions = getMissionsByCategory(cat)
              const isCollapsed = collapsedCategories.has(cat)
              const catCleared = missions.filter((m) => clearedIds.has(m.id)).length

              return (
                <div key={cat}>
                  {/* カテゴリヘッダー */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
                  >
                    {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    <span className="flex-1">{t.infra.categories[cat]}</span>
                    <span className="text-dark-textDim">{catCleared}/{missions.length}</span>
                  </button>

                  {/* ミッション一覧 */}
                  {!isCollapsed && missions.map((m) => {
                    const isActive = m.id === currentMission.id
                    const isCleared = clearedIds.has(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMission(m)}
                        className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? 'bg-dark-active text-dark-text dark:bg-dark-active dark:text-dark-text light:bg-light-active light:text-light-text'
                            : 'text-dark-textDim hover:bg-dark-hover hover:text-dark-text dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-dark-text light:text-light-textDim light:hover:bg-light-hover light:hover:text-light-text'
                        }`}
                      >
                        <ChevronRight size={11} className="mt-0.5 shrink-0 text-orange-400" />
                        <span className="flex-1 leading-relaxed">{m.locale[locale].title}</span>
                        {isCleared && (
                          <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-green-400" aria-label="クリア済み" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* 進捗リセットボタン */}
          <div className="flex-shrink-0 border-t border-dark-border p-2 dark:border-dark-border light:border-light-border">
            <button
              onClick={handleResetProgress}
              className="flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-xs text-dark-textDim transition-colors hover:bg-dark-hover hover:text-red-400 dark:text-dark-textDim dark:hover:bg-dark-hover dark:hover:text-red-400 light:text-light-textDim light:hover:bg-light-hover light:hover:text-red-500"
            >
              <Trash2 size={11} />
              {t.infra.ui.resetProgressButton}
            </button>
          </div>
        </div>

        {/* ドラッグハンドル: サイドバー | 中央 */}
        <div className="resize-handle" onMouseDown={(e) => startDrag('sidebar', e)} />

        {/* ── 中央: ターミナル + ファイルツリー ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ターミナルエリア */}
          <div style={{ height: paneSizes.terminalHeightPx }} className="flex-shrink-0 overflow-hidden">
            <XTerminal
              isDark={isDark}
              onMount={handleTerminalMount}
              missionLabel={`${t.infra.nav.infraCourse} > ${currentMission.locale[locale].title}`}
            />
          </div>

          {/* ドラッグハンドル: ターミナル | ファイルツリー */}
          <div className="resize-handle-horizontal" onMouseDown={(e) => startDrag('terminal', e)} />

          {/* ファイルツリーエリア */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-1 border-b border-dark-border dark:border-dark-border light:border-light-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
                {t.infra.ui.fileTreeLabel}
              </span>
              <button
                onClick={handleRefreshTree}
                title="Refresh"
                className="rounded p-0.5 text-dark-textDim transition-colors hover:text-dark-text dark:text-dark-textDim dark:hover:text-dark-text light:text-light-textDim light:hover:text-light-text"
              >
                <RefreshCw size={11} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileTreeVisualizer
                entries={fileTree}
                titleLabel=""
              />
            </div>
          </div>
        </div>

        {/* ドラッグハンドル: 中央 | 右パネル */}
        <div className="resize-handle" onMouseDown={(e) => startDrag('missionPanel', e)} />

        {/* ── 右パネル: ミッション説明 ── */}
        <div
          style={{ width: paneSizes.missionPanelWidthPx }}
          className="flex-shrink-0 overflow-hidden border-l border-dark-border dark:border-dark-border light:border-light-border"
        >
          {/* ミッションが変わるたびに再マウントしてヒント開示数・解答状態をリセットする */}
          <MissionPanel
            key={currentMission.id}
            mission={currentMission}
            locale={locale}
            isCleared={isCurrentCleared}
            onNextMission={handleNextMission}
            ui={{
              missionLabel:      t.infra.ui.missionLabel,
              backgroundLabel:   t.infra.ui.backgroundLabel,
              hintsLabel:        t.infra.ui.hintsLabel,
              answerLabel:       t.infra.ui.answerLabel,
              commandsLabel:     t.infra.ui.commandsLabel,
              showHintButton:    t.infra.ui.showHintButton,
              allHintsShown:     t.infra.ui.allHintsShown,
              showAnswerButton:  t.infra.ui.showAnswerButton,
              hideAnswerButton:  t.infra.ui.hideAnswerButton,
              answerWarning:     t.infra.ui.answerWarning,
              clearBanner:       t.infra.ui.clearBanner,
              nextMissionButton: t.infra.ui.nextMissionButton,
            }}
          />
        </div>
      </div>

      {/* ─── WebContainer 同意モーダル ───────────────────────────────────── */}
      {!hasConsented && (
        <ResourceConsentModal
          courseName={t.infra.nav.infraCourse}
          resources={[t.infra.resources.webcontainer]}
          recommendations={t.infra.recommendations}
          onAccept={() => setHasConsented(true)}
          onCancel={() => navigate('/')}
        />
      )}

      {/* ─── ページ離脱警告モーダル ──────────────────────────────────────── */}
      {showLeaveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[360px] rounded-xl border border-dark-border bg-dark-sidebar p-6 shadow-2xl dark:border-dark-border dark:bg-dark-sidebar light:border-light-border light:bg-light-sidebar">
            <div className="mb-4 flex items-center gap-2 text-yellow-400">
              <AlertTriangle size={18} />
              <span className="font-semibold">{t.infra.ui.leaveWarningTitle}</span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-dark-textDim dark:text-dark-textDim light:text-light-textDim">
              {t.infra.ui.leaveWarningMessage}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="rounded-lg border border-dark-border px-4 py-2 text-sm text-dark-textDim transition-colors hover:text-dark-text dark:border-dark-border dark:text-dark-textDim dark:hover:text-dark-text light:border-light-border light:text-light-textDim light:hover:text-light-text"
              >
                {t.infra.ui.leaveCancel}
              </button>
              <button
                onClick={() => {
                  setShowLeaveWarning(false)
                  pendingNavRef.current?.()
                  pendingNavRef.current = null
                }}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                {t.infra.ui.leaveConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ミッションクリアバナー ──────────────────────────────────────── */}
      {isCurrentCleared && (
        <div
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-lg border border-green-500/50 bg-green-500/15 px-4 py-3 text-sm font-medium text-green-400 shadow-lg"
          aria-live="polite"
        >
          <CheckCircle2 size={16} />
          {t.infra.ui.clearBanner}
        </div>
      )}
    </div>
  )
}
