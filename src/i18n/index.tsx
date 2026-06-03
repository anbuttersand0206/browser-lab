// i18n（国際化）基盤
// 外部ライブラリを使わず Context + Hook のパターンで実装する。
// バンドルサイズへの影響を最小化しつつ、翻訳漏れをコンパイル時に型で検出できる。

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ShortcutGroup } from '../types/shortcut'

export type Locale = 'ja' | 'en'

// LocalStorage へのロケール保存キー（他の設定と衝突しないようプレフィックスを揃える）
const LS_KEY = 'browser-lab:locale'

// ResourceConsentModal が要求するリソース仕様の形状（循環 import を避けるため再定義）
interface ResourceSpec {
  name: string
  description: string
  estimatedMemoryRange: string | null
  estimatedDownloadSize: string | null
  cautions: readonly string[]
}

// ----------------------------------------------------------------
// 翻訳辞書の型定義
// すべての翻訳キーを型で定義することで、翻訳漏れをコンパイル時に検出できる。
// ----------------------------------------------------------------
export interface Translations {
  // ロケール表示名（言語切り替えボタン用）
  locale: {
    ja: string
    en: string
    switchLabel: string
  }

  // テーマ切り替え
  theme: {
    light: string
    dark: string
  }

  // トップページ
  top: {
    subtitle: string
    programmingCourse: {
      title: string
      description: string
      scenarios: readonly string[]
    }
    dbCourse: {
      title: string
      description: string
      scenarios: readonly string[]
    }
    includedScenarios: string
    startCourse: string
  }

  // ナビゲーションバー
  nav: {
    dbCourse: string
    programmingCourse: string
  }

  // ステータスバー表示
  status: {
    idle: string
    pgRunning: string
    pgInit: string
    pgError: string
    wcBooting: string
    wcRunning: string
    wcReady: string
    wcError: string
    waitingForPostgres: string
    initializingPostgres: string
  }

  // ツールバーボタン・ラベル
  toolbar: {
    save: string
    saveTooltip: string
    load: string
    loadTooltip: string
    reset: string
    resetTooltip: string
    resetAriaLabel: string
    unsaved: string
    unsavedTooltip: string
    format: string
    formatTooltip: string
    execute: string
    executing: string
    run: string
    stop: string
  }

  // コンソールパネル
  console: {
    consoleTab: string
    previewTab: string
    clearButton: string
    clearAriaLabel: string
    emptyMessage: string
  }

  // サイドバー
  sidebar: {
    scenarios: string
    files: string
    addFileAriaLabel: string
    addFileTitle: string
    newFilePlaceholder: string
    createFileAriaLabel: string
    cancelAriaLabel: string
  }

  // シナリオパネル
  scenarioPanel: {
    ariaLabel: string
    tabProblem: string
    tabHints: (total: number) => string
    tabSolution: string
    tabDiff: string

    // ヒントタブ
    hintsPrompt: string
    hintLabel: (index: number) => string
    hintRevealButton: (current: number, total: number) => string
    allHintsRevealed: string

    // 解答タブ
    solutionLock: string
    solutionLockedMessage: string
    showSolutionButton: string
    solutionConfirmIcon: string
    solutionConfirmTitle: string
    solutionConfirmMessage: string
    solutionCancelButton: string
    solutionShowButton: string
    solutionLabel: string
    solutionHideButton: string

    // 差分タブ
    diffVsLabel: string
    diffTooLong: string
    diffError: string
    diffMatches: string
    diffMatchesMessage: string
    diffAdded: (n: number) => string
    diffRemoved: (n: number) => string
    diffEqual: (n: number) => string
  }

  // 未保存モーダル
  unsavedModal: {
    title: string
    message: string
    saveAndGo: string
    discardAndGo: string
    cancel: string
  }

  // ヘルプモーダル
  helpModal: {
    title: string
    closeAriaLabel: string
    dismissHint: string
  }

  // ショートカット定義（HelpModal に渡す ShortcutGroup 配列）
  shortcuts: {
    editorCommon: ShortcutGroup
    db: ShortcutGroup
  }

  // 同意確認モーダル
  consentModal: {
    title: string
    body: string
    recommendedEnv: string
    backButton: string
    acceptButton: string
    memoryLabel: string
  }

  // リソース仕様（ResourceConsentModal に渡すデータ）
  resources: {
    pglite: ResourceSpec
    webcontainer: ResourceSpec
  }

  // 動作推奨事項
  recommendations: {
    database: readonly string[]
    programming: readonly string[]
  }

  // クリア通知バナー
  clearNotification: string

  // confirm / alert のメッセージ
  confirm: {
    resetDb: (title: string) => string
    resetProg: (title: string) => string
    applySnapshot: string
    snapshotApplied: string
    snapshotAdded: string
    importError: (reason: string) => string
  }
}

// ----------------------------------------------------------------
// 日本語翻訳
// ----------------------------------------------------------------
const ja: Translations = {
  locale: {
    ja: '日本語',
    en: 'English',
    switchLabel: '言語切り替え',
  },
  theme: {
    light: 'ライト',
    dark: 'ダーク',
  },
  top: {
    subtitle: 'インストール不要。ブラウザだけで動く学習プラットフォーム。',
    programmingCourse: {
      title: 'プログラミング学習',
      description: 'WebContainersを使ったNode.js / TypeScriptのリアルな実行環境。ブラウザ内でnpm installから実行まで。',
      scenarios: ['はじめてのTypeScript', '非同期処理をマスターする', 'ORMでDBを操作する'],
    },
    dbCourse: {
      title: 'DB学習コース',
      description: 'PGLiteを使ったブラウザ内PostgreSQL環境。本物のSQLを書いて、インデックスやJOINを体験する。',
      scenarios: ['はじめてのCRUD', 'インデックスの効果を見る', 'JOINを使いこなす'],
    },
    includedScenarios: '収録シナリオ',
    startCourse: 'コースを開始',
  },
  nav: {
    dbCourse: 'DB学習コース',
    programmingCourse: 'プログラミング学習',
  },
  status: {
    idle: '起動待機中',
    pgRunning: 'PostgreSQL 稼働中',
    pgInit: 'PGLite 初期化中...',
    pgError: 'エラー',
    wcBooting: 'WebContainer 起動中...',
    wcRunning: '実行中',
    wcReady: '準備完了',
    wcError: 'エラー',
    waitingForPostgres: '同意後に PostgreSQL を起動します',
    initializingPostgres: 'PostgreSQLを初期化しています...',
  },
  toolbar: {
    save: '保存',
    saveTooltip: 'JSONとしてエクスポート（Ctrl+S）',
    load: '読み込む',
    loadTooltip: 'JSONからインポート',
    reset: 'リセット',
    resetTooltip: 'シナリオの初期コードに戻す',
    resetAriaLabel: '初期コードにリセット',
    unsaved: '未保存',
    unsavedTooltip: '未保存の変更があります',
    format: '整形',
    formatTooltip: 'SQLを整形する（キーワード大文字化・主要節ごとに改行）',
    execute: '実行 (Ctrl+Enter)',
    executing: '実行中...',
    run: '実行',
    stop: '停止',
  },
  console: {
    consoleTab: 'コンソール',
    previewTab: 'プレビュー',
    clearButton: 'クリア',
    clearAriaLabel: 'コンソール出力をクリア',
    emptyMessage: '実行ボタンを押すと出力がここに表示されます',
  },
  sidebar: {
    scenarios: 'シナリオ',
    files: 'ファイル',
    addFileAriaLabel: '新しいファイルを追加',
    addFileTitle: '新しいファイルを追加',
    newFilePlaceholder: 'filename.ts',
    createFileAriaLabel: 'ファイルを作成',
    cancelAriaLabel: 'キャンセル',
  },
  scenarioPanel: {
    ariaLabel: 'シナリオパネル',
    tabProblem: '問題文',
    tabHints: (n) => `ヒント (${n})`,
    tabSolution: '解答例',
    tabDiff: '差分',
    hintsPrompt: 'まず自分で考えてみましょう。行き詰まったらヒントを少しずつ開きましょう。',
    hintLabel: (i) => `ヒント ${i + 1}`,
    hintRevealButton: (c, t) => `ヒント ${c + 1} を見る (${c + 1}/${t})`,
    allHintsRevealed: 'すべてのヒントを表示しました',
    solutionLock: '🔒',
    solutionLockedMessage: 'まず自分で解いてみましょう！\n解答例を見る前にヒントを参考にしてください。',
    showSolutionButton: '解答例を表示する',
    solutionConfirmIcon: '⚠️',
    solutionConfirmTitle: '本当に解答例を見ますか？',
    solutionConfirmMessage: '自力で解けそうならヒントをもう一度確認してみましょう。',
    solutionCancelButton: 'やはりやめる',
    solutionShowButton: 'はい、表示する',
    solutionLabel: '解答例',
    solutionHideButton: '非表示にする',
    diffVsLabel: 'エディタの内容 vs 解答',
    diffTooLong: 'ファイルが長すぎるため差分を計算できません。',
    diffError: '差分を計算できませんでした。',
    diffMatches: '解答と一致 ✓',
    diffMatchesMessage: 'このファイルは解答と完全に一致しています。',
    diffAdded: (n) => `+${n}行`,
    diffRemoved: (n) => `−${n}行`,
    diffEqual: (n) => `(${n}行一致)`,
  },
  unsavedModal: {
    title: '未保存の変更があります',
    message: '現在の編集内容はまだ保存されていません。このまま移動すると、変更内容が失われます。',
    saveAndGo: 'JSONで保存してから移動',
    discardAndGo: '保存せずに移動',
    cancel: 'キャンセル（この画面に留まる）',
  },
  helpModal: {
    title: 'キーボードショートカット',
    closeAriaLabel: 'ショートカット一覧を閉じる',
    dismissHint: 'Esc またはオーバーレイクリックで閉じます',
  },
  shortcuts: {
    editorCommon: {
      label: 'エディタ共通',
      shortcuts: [
        { description: 'JSONで保存',        mac: 'Cmd + S',         other: 'Ctrl + S' },
        { description: 'テキスト検索',      mac: 'Cmd + F',         other: 'Ctrl + F' },
        { description: '元に戻す',          mac: 'Cmd + Z',         other: 'Ctrl + Z' },
        { description: 'やり直す',          mac: 'Cmd + Shift + Z', other: 'Ctrl + Y' },
        { description: '選択行をインデント', mac: 'Tab',             other: 'Tab' },
        { description: 'インデント解除',    mac: 'Shift + Tab',     other: 'Shift + Tab' },
        { description: '全選択',            mac: 'Cmd + A',         other: 'Ctrl + A' },
      ],
    },
    db: {
      label: 'DB コース',
      shortcuts: [
        { description: 'SQL を実行する', mac: 'Cmd + Enter', other: 'Ctrl + Enter' },
      ],
    },
  },
  consentModal: {
    title: '起動前の確認',
    body: 'このコースを起動すると、以下のリソースがブラウザのメモリにロードされます。ご利用の端末のメモリが少ない場合、ブラウザの動作が重くなることがあります。',
    recommendedEnv: '推奨環境',
    backButton: 'トップページに戻る',
    acceptButton: '同意してコースを開始',
    memoryLabel: 'メモリ',
  },
  resources: {
    pglite: {
      name: 'ブラウザ内 PostgreSQL（PGLite）',
      description: 'PostgreSQL を WebAssembly でブラウザ内で動作させます。インストール不要で本物の SQL を実行できます。',
      estimatedMemoryRange: '50〜150 MB',
      estimatedDownloadSize: '約 13 MB（WASM + データファイル）',
      cautions: [
        'ページをリロードするとデータベースの内容は消去されます',
        'JSON エクスポートでクエリ履歴を手元に保存できます',
      ],
    },
    webcontainer: {
      name: 'Node.js 実行環境（WebContainers）',
      description: 'ブラウザ内で完全な Node.js が動作します。npm install から実行まで、すべてブラウザ内で完結します。',
      estimatedMemoryRange: '200〜500 MB',
      estimatedDownloadSize: null,
      cautions: [
        '初回 npm install に数秒〜数十秒かかります',
        'npm パッケージのダウンロードにネットワーク接続が必要です',
        'シナリオを切り替えるたびに npm install が走ります',
      ],
    },
  },
  recommendations: {
    database: [
      '空きメモリ 2 GB 以上を推奨します',
      '他のブラウザタブを閉じると動作が安定します',
      'ページリロード前にクエリを JSON エクスポートしてください',
    ],
    programming: [
      '空きメモリ 4 GB 以上を推奨します',
      '安定したネットワーク接続を推奨します（npm install に使用）',
      '他のブラウザタブを閉じると動作が安定します',
    ],
  },
  clearNotification: 'シナリオクリア！お疲れ様でした 🎉',
  confirm: {
    resetDb: (title) =>
      `シナリオ「${title}」の初期 SQL に戻します。\n現在の編集内容は失われます。よろしいですか？`,
    resetProg: (title) =>
      `シナリオ「${title}」の初期コードに戻します。\n現在の編集内容は失われます。よろしいですか？`,
    applySnapshot:
      'DBスナップショットが見つかりました。\n現在の DB に適用しますか？\n\n（CREATE TABLE IF NOT EXISTS で実行するため既存テーブルは上書きされません）',
    snapshotApplied: 'スナップショットを適用しました。',
    snapshotAdded:
      'DBスナップショットを seed.sql として追加しました。\n「実行」するとDBが復元された状態でコードが動きます。',
    importError: (reason) => `読み込みエラー: ${reason}`,
  },
}

// ----------------------------------------------------------------
// 英語翻訳
// ----------------------------------------------------------------
const en: Translations = {
  locale: {
    ja: '日本語',
    en: 'English',
    switchLabel: 'Switch Language',
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
  },
  top: {
    subtitle: 'No installation needed. A learning platform that runs entirely in your browser.',
    programmingCourse: {
      title: 'Programming',
      description: 'Real Node.js / TypeScript execution powered by WebContainers. Run npm install and execute code — all inside the browser.',
      scenarios: ['TypeScript Basics', 'Mastering Async/Await', 'Database with ORM'],
    },
    dbCourse: {
      title: 'Database Course',
      description: 'In-browser PostgreSQL powered by PGLite. Write real SQL and experience indexes, JOINs, and more.',
      scenarios: ['First CRUD', 'See Index Effects', 'Mastering JOINs'],
    },
    includedScenarios: 'Included Scenarios',
    startCourse: 'Start Course',
  },
  nav: {
    dbCourse: 'Database Course',
    programmingCourse: 'Programming',
  },
  status: {
    idle: 'Waiting to Start',
    pgRunning: 'PostgreSQL Running',
    pgInit: 'Initializing PGLite...',
    pgError: 'Error',
    wcBooting: 'Starting WebContainer...',
    wcRunning: 'Running',
    wcReady: 'Ready',
    wcError: 'Error',
    waitingForPostgres: 'PostgreSQL will start after you agree',
    initializingPostgres: 'Initializing PostgreSQL...',
  },
  toolbar: {
    save: 'Save',
    saveTooltip: 'Export as JSON (Ctrl+S)',
    load: 'Load',
    loadTooltip: 'Import from JSON',
    reset: 'Reset',
    resetTooltip: 'Reset to initial code',
    resetAriaLabel: 'Reset to initial code',
    unsaved: 'Unsaved',
    unsavedTooltip: 'You have unsaved changes',
    format: 'Format',
    formatTooltip: 'Format SQL (uppercase keywords, newlines before major clauses)',
    execute: 'Run (Ctrl+Enter)',
    executing: 'Running...',
    run: 'Run',
    stop: 'Stop',
  },
  console: {
    consoleTab: 'Console',
    previewTab: 'Preview',
    clearButton: 'Clear',
    clearAriaLabel: 'Clear console output',
    emptyMessage: 'Press Run to see output here',
  },
  sidebar: {
    scenarios: 'Scenarios',
    files: 'Files',
    addFileAriaLabel: 'Add new file',
    addFileTitle: 'Add new file',
    newFilePlaceholder: 'filename.ts',
    createFileAriaLabel: 'Create file',
    cancelAriaLabel: 'Cancel',
  },
  scenarioPanel: {
    ariaLabel: 'Scenario panel',
    tabProblem: 'Problem',
    tabHints: (n) => `Hints (${n})`,
    tabSolution: 'Solution',
    tabDiff: 'Diff',
    hintsPrompt: 'Try solving it on your own first. If you get stuck, reveal hints one at a time.',
    hintLabel: (i) => `Hint ${i + 1}`,
    hintRevealButton: (c, t) => `Show Hint ${c + 1} (${c + 1}/${t})`,
    allHintsRevealed: 'All hints revealed',
    solutionLock: '🔒',
    solutionLockedMessage: "Give it a try first!\nCheck the hints before looking at the solution.",
    showSolutionButton: 'Show Solution',
    solutionConfirmIcon: '⚠️',
    solutionConfirmTitle: 'Are you sure you want to see the solution?',
    solutionConfirmMessage: 'If you think you can solve it, try the hints one more time.',
    solutionCancelButton: 'Never mind',
    solutionShowButton: 'Yes, show it',
    solutionLabel: 'Solution',
    solutionHideButton: 'Hide',
    diffVsLabel: 'Your code vs Solution',
    diffTooLong: 'File is too long to compute diff.',
    diffError: 'Could not compute diff.',
    diffMatches: 'Matches solution ✓',
    diffMatchesMessage: 'This file matches the solution exactly.',
    diffAdded: (n) => `+${n}`,
    diffRemoved: (n) => `−${n}`,
    diffEqual: (n) => `(${n} equal)`,
  },
  unsavedModal: {
    title: 'Unsaved Changes',
    message: 'Your changes have not been saved yet. If you leave, they will be lost.',
    saveAndGo: 'Save as JSON and Continue',
    discardAndGo: 'Discard and Continue',
    cancel: 'Cancel (Stay here)',
  },
  helpModal: {
    title: 'Keyboard Shortcuts',
    closeAriaLabel: 'Close shortcuts',
    dismissHint: 'Press Esc or click overlay to close',
  },
  shortcuts: {
    editorCommon: {
      label: 'Editor',
      shortcuts: [
        { description: 'Save as JSON',      mac: 'Cmd + S',         other: 'Ctrl + S' },
        { description: 'Find text',          mac: 'Cmd + F',         other: 'Ctrl + F' },
        { description: 'Undo',              mac: 'Cmd + Z',         other: 'Ctrl + Z' },
        { description: 'Redo',              mac: 'Cmd + Shift + Z', other: 'Ctrl + Y' },
        { description: 'Indent selection',  mac: 'Tab',             other: 'Tab' },
        { description: 'Dedent',            mac: 'Shift + Tab',     other: 'Shift + Tab' },
        { description: 'Select all',        mac: 'Cmd + A',         other: 'Ctrl + A' },
      ],
    },
    db: {
      label: 'DB Course',
      shortcuts: [
        { description: 'Execute SQL', mac: 'Cmd + Enter', other: 'Ctrl + Enter' },
      ],
    },
  },
  consentModal: {
    title: 'Before You Start',
    body: 'Launching this course will load the following resources into your browser memory. On devices with limited memory, this may slow down the browser.',
    recommendedEnv: 'Recommended Environment',
    backButton: 'Back to Top',
    acceptButton: 'Agree and Start',
    memoryLabel: 'Memory',
  },
  resources: {
    pglite: {
      name: 'In-browser PostgreSQL (PGLite)',
      description: 'Runs PostgreSQL via WebAssembly inside the browser. No installation needed — execute real SQL instantly.',
      estimatedMemoryRange: '50–150 MB',
      estimatedDownloadSize: '~13 MB (WASM + data files)',
      cautions: [
        'Database contents are cleared on page reload',
        'Use JSON export to save your query history locally',
      ],
    },
    webcontainer: {
      name: 'Node.js Runtime (WebContainers)',
      description: 'Runs a full Node.js environment inside the browser. npm install and code execution all happen locally.',
      estimatedMemoryRange: '200–500 MB',
      estimatedDownloadSize: null,
      cautions: [
        'First npm install may take several seconds to a minute',
        'Network connection required for downloading npm packages',
        'npm install runs again each time you switch scenarios',
      ],
    },
  },
  recommendations: {
    database: [
      'At least 2 GB of free memory recommended',
      'Closing other browser tabs improves stability',
      'Export queries as JSON before reloading the page',
    ],
    programming: [
      'At least 4 GB of free memory recommended',
      'Stable network connection recommended (for npm install)',
      'Closing other browser tabs improves stability',
    ],
  },
  clearNotification: 'Scenario complete! Well done 🎉',
  confirm: {
    resetDb: (title) =>
      `Reset scenario "${title}" to its initial SQL?\nYour current edits will be lost.`,
    resetProg: (title) =>
      `Reset scenario "${title}" to its initial code?\nYour current edits will be lost.`,
    applySnapshot:
      'A DB snapshot was found.\nApply it to the current database?\n\n(Uses CREATE TABLE IF NOT EXISTS, so existing tables will not be overwritten.)',
    snapshotApplied: 'Snapshot applied successfully.',
    snapshotAdded:
      'Added the DB snapshot as seed.sql.\nPress Run to start with the restored database.',
    importError: (reason) => `Import error: ${reason}`,
  },
}

// ----------------------------------------------------------------
// Context
// ----------------------------------------------------------------

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const I18nContext = createContext<I18nContextValue | null>(null)

// ブラウザの言語設定とLocalStorageを参照して初期ロケールを決定する。
// 日本語設定のブラウザには日本語で起動し、それ以外は英語にフォールバックする。
function detectInitialLocale(): Locale {
  const saved = localStorage.getItem(LS_KEY)
  if (saved === 'ja' || saved === 'en') return saved
  return navigator.language.startsWith('ja') ? 'ja' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(LS_KEY, next)
  }

  const t = locale === 'ja' ? ja : en

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// useI18n フックは Provider の外で呼ばれたときにわかりやすいエラーを出す。
// null チェックをフック内に閉じ込めることで、呼び出し元が毎回 null チェックしなくて済む。
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n は I18nProvider の内側で呼んでください')
  return ctx
}
