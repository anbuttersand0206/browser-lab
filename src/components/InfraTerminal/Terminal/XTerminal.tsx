import { useEffect, useRef } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

// xterm.js のCSSはInfraPage側でimportする（コンポーネントの副作用を最小化するため）

// ダークテーマ：VSCode のダークテーマ配色を踏襲する
const DARK_THEME = {
  background:   '#1e1e1e',
  foreground:   '#cccccc',
  cursor:       '#cccccc',
  cursorAccent: '#1e1e1e',
  black:        '#1e1e1e',
  red:          '#f44747',
  green:        '#4ec9b0',
  yellow:       '#dcdcaa',
  blue:         '#569cd6',
  magenta:      '#c586c0',
  cyan:         '#9cdcfe',
  white:        '#cccccc',
  brightBlack:  '#858585',
  brightRed:    '#f44747',
  brightGreen:  '#73c991',
  brightYellow: '#dcdcaa',
  brightBlue:   '#569cd6',
  brightMagenta:'#c586c0',
  brightCyan:   '#9cdcfe',
  brightWhite:  '#ffffff',
}

// ライトテーマ：視認性を確保しながら光テーマに合わせる
const LIGHT_THEME = {
  background:   '#f5f5f5',
  foreground:   '#1e1e1e',
  cursor:       '#1e1e1e',
  cursorAccent: '#f5f5f5',
  black:        '#1e1e1e',
  red:          '#cd3131',
  green:        '#007700',
  yellow:       '#867e00',
  blue:         '#0070c1',
  magenta:      '#af00db',
  cyan:         '#008080',
  white:        '#717171',
  brightBlack:  '#717171',
  brightRed:    '#cd3131',
  brightGreen:  '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue:   '#0070c1',
  brightMagenta:'#af00db',
  brightCyan:   '#008080',
  brightWhite:  '#1e1e1e',
}

interface Props {
  /** ダーク / ライト テーマ切り替え */
  isDark: boolean
  /** ターミナルとFitAddonが初期化されたときに呼ばれるコールバック */
  onMount: (terminal: Terminal, fitAddon: FitAddon) => void
  /** ターミナル上部に表示するミッション名（省略可） */
  missionLabel?: string
}

/**
 * xterm.js のターミナルUIコンポーネント。
 *
 * - DOMへの接続・リサイズ・テーマ切り替えをカプセル化する
 * - WebContainerのシェルとの接続は親（InfraPage）から onMount を通して行う
 *
 * レイアウト設計：
 * - containerRef は "absolute inset-0" で親要素（relative）に完全追従させる
 * - こうすることで FitAddon が parentElement.getBoundingClientRect() を測定したとき、
 *   flex の再計算タイミングに左右されず正確なピクセルサイズを得られる
 * - flex-1 単体だと fit() 呼び出し時点でまだ高さが確定していない場合があり、
 *   最終行が overflow-hidden にクリップされる問題が発生する
 */
export function XTerminal({ isDark, onMount, missionLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // テーマ変更時にdisposeせずにoptions更新だけで済むようインスタンスをrefで保持する
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  // 初回マウント時のみターミナルを生成してDOMに接続する
  useEffect(() => {
    if (!containerRef.current) return

    let terminal: Terminal | null = null
    let fitAddon: FitAddon | null = null
    let observer: ResizeObserver | null = null
    let onMountCleanup: (() => void) | void = undefined
    let isMounted = true

    ;(async () => {
      // xterm.js は動的importにしてバンドルサイズをトップページに影響させない
      const [{ Terminal: XTerm }, { FitAddon: XTermFitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ])

      // コンポーネントがアンマウント済みなら何もしない
      if (!isMounted || !containerRef.current) return

      // 万が一既存の要素が残っている場合に備えてコンテナを空にする
      containerRef.current.innerHTML = ''

      terminal = new XTerm({
        theme: isDark ? DARK_THEME : LIGHT_THEME,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        scrollback: 5000,
      })

      fitAddon = new XTermFitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(containerRef.current)

      // 1回目: 動的import の遅延でレイアウトはほぼ確定しているが、念のため即時 fit
      fitAddon.fit()

      // 2回目: ブラウザが次フレームを描画した後に再 fit して
      //         flex の高さ計算が完全に確定した状態で正確なサイズに合わせる
      requestAnimationFrame(() => {
        if (isMounted && fitAddon) fitAddon.fit()
      })

      terminalRef.current = terminal
      fitAddonRef.current = fitAddon

      // 親コンポーネントにインスタンスを渡してシェルと繋いでもらう
      onMountCleanup = onMount(terminal, fitAddon)

      // コンテナサイズが変わったら fit() を再実行してシェルのウィンドウサイズを同期する
      // absolute inset-0 のため、親要素リサイズ時に containerRef も連動してリサイズされる
      observer = new ResizeObserver(() => {
        if (isMounted && fitAddon) fitAddon.fit()
      })
      observer.observe(containerRef.current)
    })()

    return () => {
      isMounted = false
      observer?.disconnect()
      onMountCleanup?.()
      
      // ref 経由とローカル変数経由の両方で確実に dispose を試みる
      terminal?.dispose()
      if (terminalRef.current && terminalRef.current !== terminal) {
        terminalRef.current.dispose()
      }
      
      terminalRef.current = null
      fitAddonRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 初回マウント時のみ実行（onMountはrefで最新値を使う）

  // テーマ切り替え時はインスタンスを再作成せずにoptions更新だけで済ます
  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.options.theme = isDark ? DARK_THEME : LIGHT_THEME
  }, [isDark])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {missionLabel && (
        <div
          className="flex-shrink-0 border-b border-dark-border px-3 py-0.5 text-xs text-dark-textDim
            dark:border-dark-border dark:text-dark-textDim
            light:border-light-border light:text-light-textDim"
          style={{ background: isDark ? '#2d2d2d' : '#ececec' }}
        >
          {missionLabel}
        </div>
      )}
      {/*
        relative ラッパーを挟み、containerRef を absolute inset-0 にする理由：
        - flex-1 単体では FitAddon の getBoundingClientRect() 呼び出し時点で
          ブラウザのレイアウト計算が完了していない場合がある
        - absolute inset-0 は常に親要素と同じサイズに確定されるため、
          fit() が正確なセル数を計算でき最終行がクリップされない
      */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
