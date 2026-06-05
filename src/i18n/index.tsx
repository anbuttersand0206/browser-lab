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
    algorithmCourse: {
      scenarios: readonly string[]
    }
    infraCourse: {
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

  // アルゴリズム可視化コース
  algorithm: AlgorithmTranslations

  // インフラ学習コース
  infra: InfraTranslations
}

// ----------------------------------------------------------------
// InfraTranslations
// ----------------------------------------------------------------
interface InfraTranslations {
  pageTitle: string
  pageSubtitle: string
  nav: { backToTop: string; infraCourse: string }
  categories: {
    filesystem: string
    permissions: string
    text: string
    process: string
    shell: string
  }
  ui: {
    statusIdle: string
    statusBooting: string
    statusReady: string
    statusError: string
    progressLabel: string
    fileTreeLabel: string
    resetProgressButton: string
    confirmReset: string
    missionLabel: string
    backgroundLabel: string
    hintsLabel: string
    answerLabel: string
    commandsLabel: string
    showHintButton: (revealed: number, total: number) => string
    allHintsShown: string
    showAnswerButton: string
    hideAnswerButton: string
    answerWarning: string
    clearBanner: string
    nextMissionButton: string
    leaveWarningTitle: string
    leaveWarningMessage: string
    leaveCancel: string
    leaveConfirm: string
  }
  resources: {
    webcontainer: {
      name: string
      description: string
      estimatedMemoryRange: string | null
      estimatedDownloadSize: string | null
      cautions: readonly string[]
    }
  }
  recommendations: readonly string[]
}

interface AlgoContent {
  name: string
  description: string
  best: string
  average: string
  worst: string
  space: string
  useCases: string
  visualGuide: string
}

interface AlgorithmTranslations {
  pageTitle: string
  pageSubtitle: string
  selectPrompt: string
  categories: {
    sort: string
    search: string
    classic: string
    ml: string
  }
  controls: {
    play: string
    pause: string
    step: string
    reset: string
    speed: string
    speedLabels: readonly string[]
    arraySize: string
    randomize: string
    targetValue: string
    numDisks: string
    nValue: string
    useMemo: string
    inputA: string
    inputB: string
    numPoints: string
    numClusters: string
    learningRate: string
    poolType: string
    poolSize: string
    max: string
    avg: string
    clickToToggleWall: string
    clearWalls: string
    kernelType: string
    dataType: string
    wallMode: string
    startMode: string
    goalMode: string
  }
  stepLog: {
    title: string
    empty: string
    step: (n: number) => string
  }
  info: {
    description: string
    timeComplexity: string
    bestCase: string
    averageCase: string
    worstCase: string
    spaceComplexity: string
    useCases: string
    visualGuide: string
  }
  algorithms: Record<string, AlgoContent>
  nav: {
    backToTop: string
    algorithmCourse: string
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
    algorithmCourse: {
      scenarios: ['ソート・探索アルゴリズム', 'ハノイの塔・フィボナッチ', '畳み込み・K-Means'],
    },
    infraCourse: {
      title: 'インフラ学習',
      description: 'WebContainersで動く本物のLinuxシェル。コマンドを打つたびにファイルツリーが変化する。「なぜそう動くのか」を体感するインフラ入門。',
      scenarios: ['ファイルシステム操作', 'パーミッションと権限管理', 'テキスト処理とログ解析'],
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
  algorithm: {
    pageTitle: 'アルゴリズム可視化',
    pageSubtitle: 'アルゴリズムの動きを目で見て、肌で感じる',
    selectPrompt: '左のリストからアルゴリズムを選んでください',
    categories: { sort: 'ソートアルゴリズム', search: '探索アルゴリズム', classic: 'クラシック', ml: '機械学習の基礎' },
    controls: {
      play: '再生', pause: '一時停止', step: 'ステップ実行', reset: 'リセット',
      speed: '速度', speedLabels: ['最低速', '遅い', '標準', '速い', '最高速'],
      arraySize: '配列サイズ', randomize: 'ランダム生成', targetValue: '探索値',
      numDisks: '円盤の枚数', nValue: 'n の値', useMemo: 'メモ化を使う',
      inputA: '値 A', inputB: '値 B', numPoints: '点の数',
      numClusters: 'クラスター数 (k)', learningRate: '学習率',
      poolType: 'プーリング種別', poolSize: 'ウィンドウサイズ',
      max: '最大値', avg: '平均値',
      clickToToggleWall: 'クリックで壁を切り替え', clearWalls: '壁をクリア',
      kernelType: 'カーネル', dataType: '学習データ',
      wallMode: '壁', startMode: 'スタート', goalMode: 'ゴール',
    },
    stepLog: {
      title: 'ステップログ',
      empty: '「再生」または「ステップ実行」を押すとログがここに表示されます',
      step: (n) => `[Step ${n}]`,
    },
    info: {
      description: '概要',
      timeComplexity: '時間計算量',
      bestCase: '最良', averageCase: '平均', worstCase: '最悪',
      spaceComplexity: '空間計算量',
      useCases: '実務でのユースケース',
      visualGuide: 'どこを見るべきか',
    },
    nav: { backToTop: 'トップへ戻る', algorithmCourse: 'アルゴリズム可視化' },
    algorithms: {
      bubble: {
        name: 'バブルソート',
        description: '隣り合う要素を繰り返し比較・交換してソートする最もシンプルなアルゴリズム。バブルのように大きな値が末尾へ浮き上がる様子からこの名がついた。',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: '教育目的・ほぼソート済みの小さな配列に有効。本番環境では使われない。',
        visualGuide: '黄色のバーが比較中、赤がスワップ中、緑が確定済み。右端から順に緑が増えていく様子に注目。',
      },
      selection: {
        name: '選択ソート',
        description: '未ソート部分から最小値を選んで先頭と交換する。スワップ回数が O(n) で少ない点が特徴。',
        best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: '書き込みコストが高いメモリ（フラッシュ等）でスワップ回数を抑えたいとき。',
        visualGuide: '紫のバーが「現在の最小候補」を表す。左から順に緑（確定）が増えていく。',
      },
      insertion: {
        name: '挿入ソート',
        description: '手元のカードを整列するように、未ソート部分の先頭を取り出して適切な位置に挿入する。ほぼソート済みのデータに対してO(n)で動く。',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: '小さな配列や、ほぼソート済みのデータ。TimeSortの内部でも使われる。',
        visualGuide: '紫が挿入対象の要素。比較しながら左へ移動していく様子を観察。',
      },
      merge: {
        name: 'マージソート',
        description: '配列を半分に分割し、再帰的にソートして統合（マージ）する分割統治法。安定ソートで、最悪計算量も O(n log n) を保証する。',
        best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)',
        useCases: '大規模データの外部ソート、安定ソートが必要な場面。',
        visualGuide: 'アクティブな範囲（オレンジ枠）が分割・統合の対象。シアン色のバーがマージ中の要素。',
      },
      quick: {
        name: 'クイックソート',
        description: 'ピボット要素を基準に配列を分割し再帰的にソートする。平均 O(n log n) で実用上最速クラスだが、最悪ケースは O(n²)。',
        best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)',
        useCases: '汎用ソート（多くの標準ライブラリで採用）。ランダムデータに強い。',
        visualGuide: '紫のバーがピボット。ピボット以下が左側へ集まっていく分割の様子を観察。',
      },
      heap: {
        name: 'ヒープソート',
        description: '最大ヒープ（親が子より常に大きい木構造）を構築し、最大値を順に取り出してソートする。',
        best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)',
        useCases: '最悪計算量を O(n log n) に保証したい場合。インプレースで空間効率が良い。',
        visualGuide: '前半でヒープ構築、後半で最大値を末尾へ移動する2フェーズの動きに注目。',
      },
      linear: {
        name: '線形探索',
        description: '先頭から末尾まで順に比較する最もシンプルな探索。ソート不要で汎用性が高い。',
        best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)',
        useCases: '未ソートの小さなデータ、1回だけ探索する場合。',
        visualGuide: 'スキャン中の要素が黄色。目標値が見つかると緑に変わる。',
      },
      binary: {
        name: '二分探索',
        description: 'ソート済み配列を半分ずつ絞り込む探索。毎ステップで探索範囲が半減するため O(log n) を実現する。',
        best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
        useCases: '大規模なソート済みデータの検索。辞書・電話帳の二分探索が典型例。',
        visualGuide: '青い範囲が現在の探索対象。中央（紫）が評価され、範囲が半減していく様子に注目。',
      },
      bfs: {
        name: '幅優先探索（BFS）',
        description: '始点から近い順に展開する探索。最短経路を保証する。キューを使って実装する。',
        best: 'O(1)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)',
        useCases: '最短経路の発見、SNSの「n次のつながり」探索、レベル順ツリー走査。',
        visualGuide: '水色のセルが「キュー（探索待ち）」、青が「訪問済み」。波紋のように広がる様子を観察。',
      },
      dfs: {
        name: '深さ優先探索（DFS）',
        description: '行き止まりまで深く進んでからバックトラックする探索。スタックまたは再帰で実装する。',
        best: 'O(1)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)',
        useCases: '迷路解法・トポロジカルソート・連結成分の検出・バックトラッキング問題。',
        visualGuide: '一方向へ深く掘り進み、行き詰まると戻る様子を観察。BFSと比べると探索パスが長い。',
      },
      astar: {
        name: 'A*アルゴリズム',
        description: 'g値（始点からのコスト）とh値（ゴールまでの推定コスト）の和を最小化して最短経路を効率よく探索する。',
        best: 'O(1)', average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)',
        useCases: 'ゲームAI・カーナビ・ロボット経路計画など、最短経路を効率的に求める場面。',
        visualGuide: 'セル内の数値がfスコア（g+h）。最小fスコアのセルから展開するBFSとの違いに注目。',
      },
      hanoi: {
        name: 'ハノイの塔',
        description: '3本のポールと複数の円盤を使うパズル。小さい円盤を大きい円盤の上に置かないルールで全円盤を移動する再帰の古典。',
        best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)', space: 'O(n)',
        useCases: '再帰・分割統治の教材。n枚の移動には必ず 2ⁿ-1 手かかる。',
        visualGuide: 'ポールA→C へ移動するため、補助ポールBを活用する分割統治を観察。円盤の色でサイズを識別。',
      },
      fibonacci: {
        name: 'フィボナッチ数列',
        description: 'F(n) = F(n-1) + F(n-2) で定義される数列。メモ化なしでは指数時間、メモ化（DP）で線形時間になる。',
        best: 'O(n)', average: 'O(n)', worst: 'O(2ⁿ)※', space: 'O(n)',
        useCases: '自然界のフラクタル・黄金比。動的計画法の入門例題として最適。',
        visualGuide: 'テーブルが左から右へ埋まっていく。どの値を足し合わせているかの矢印に注目。',
      },
      euclidean: {
        name: 'ユークリッド互除法',
        description: '2つの整数の最大公約数（GCD）を「余りが0になるまで割り続ける」操作で求める。',
        best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
        useCases: '分数の約分・暗号理論（RSA）・最小公倍数の計算。',
        visualGuide: '矩形が正方形に分割される視覚化。余りの矩形が次のステップの対象になる様子を観察。',
      },
      montecarlo: {
        name: 'モンテカルロ法（π推定）',
        description: '単位正方形内にランダムな点を打ち、円内に入る割合からπを推定する確率的アルゴリズム。',
        best: '—', average: 'O(n)', worst: 'O(n)', space: 'O(n)',
        useCases: '数値積分・リスク計算・物理シミュレーション・機械学習のドロップアウト。',
        visualGuide: '点が増えるにつれてπの推定値が収束していく。青が円内（π算定に使用）、赤が円外。',
      },
      convolution: {
        name: '畳み込み（Convolution）',
        description: 'カーネル（フィルター）を入力画像上でスライドさせながら要素積の和を計算する演算。CNNの中核。',
        best: 'O(n²k²)', average: 'O(n²k²)', worst: 'O(n²k²)', space: 'O(n²)',
        useCases: '画像フィルタリング・CNNの特徴抽出・音声信号処理。',
        visualGuide: 'カーネル（中央グリッド）が入力画像（左）上をスライドし、出力（右）が確定する様子に注目。',
      },
      pooling: {
        name: 'プーリング（Pooling）',
        description: '特徴マップを縮小する操作。Max Poolingはウィンドウ内の最大値、Avg Poolingは平均値を出力する。',
        best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(n²)',
        useCases: 'CNN内で特徴マップのサイズ削減・位置不変性の向上。',
        visualGuide: 'ウィンドウ（黄色枠）が入力上を移動し、Max/Avgを出力に書き込む様子を観察。',
      },
      kmeans: {
        name: 'k-means クラスタリング',
        description: 'k個のセントロイド（重心）を反復更新してデータを k クラスターに分類する教師なし学習アルゴリズム。',
        best: 'O(nki)', average: 'O(nki)', worst: 'O(nki)', space: 'O(n+k)',
        useCases: '顧客セグメンテーション・画像の色量子化・異常検知の前処理。',
        visualGuide: 'セントロイド（×マーク）が移動するたびにポイントの色（クラスター割り当て）が変わる様子を観察。',
      },
      perceptron: {
        name: 'パーセプトロン',
        description: '入力に重みをかけて合計し、閾値関数で0/1を出力するニューラルネットワークの最小単位。誤差があれば重みを更新する。',
        best: 'O(n)', average: 'O(n·e)', worst: 'O(n·e)', space: 'O(w)',
        useCases: '線形分離可能な二値分類の基礎。多層化するとディープラーニングの出発点になる。',
        visualGuide: '重み（エッジの太さ）が更新されるアニメーションに注目。誤差が0になると学習完了。',
      },
      bogo: {
        name: 'ボゴソート',
        description: '配列をランダムにシャッフルしてソート済みか確認する。運が良ければ一発で成功するが、最悪の場合は無限ループする「最悪のソート」。',
        best: 'O(n)', average: 'O((n+1)!)', worst: '∞', space: 'O(1)',
        useCases: '教育目的のみ。「無計画なアルゴリズムがいかに非効率か」を体感するための例。',
        visualGuide: 'シャッフルのたびに配列が変化する様子に注目。ソート済みになる瞬間を観察。',
      },
      shell: {
        name: 'シェルソート',
        description: '挿入ソートを「大きなギャップ」から始めて段階的にギャップを縮小する。Knuth 列を使うと実用的な速度が出る。',
        best: 'O(n log n)', average: 'O(n^(4/3))', worst: 'O(n²)', space: 'O(1)',
        useCases: '挿入ソートの改良版として組み込みシステム・メモリ制約環境で使われる。',
        visualGuide: 'ギャップが大きいうちは遠く離れた要素が入れ替わる様子を観察。徐々に細かくなる。',
      },
      radix: {
        name: 'ラディックスソート',
        description: '数値を下位桁から上位桁へ順にカウンティングソートする。比較を使わないため O(dn) を実現する（d = 桁数）。',
        best: 'O(dn)', average: 'O(dn)', worst: 'O(dn)', space: 'O(n+k)',
        useCases: '大量の整数・文字列の高速ソート。電話帳のソート、基数変換処理など。',
        visualGuide: '1の位→10の位→…と桁ごとにソートが進む様子に注目。各パスで配列が少しずつ整列する。',
      },
      cocktail: {
        name: 'カクテルソート',
        description: 'バブルソートを左→右と右→左で交互に行う双方向バブルソート。「亀問題」（小さな値が右端に来る遅さ）を緩和する。',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: 'バブルソートの改良版。ほぼソート済みのデータで少し速くなる場合がある。',
        visualGuide: '往復する比較の向きに注目。左端と右端から同時に緑（確定済み）が増えていく。',
      },
      dijkstra: {
        name: 'ダイクストラ法',
        description: '非負重み付きグラフで始点から全ノードへの最短距離を求める。未確定ノードの中で最小距離のものを順に確定する。',
        best: 'O(V²)', average: 'O(E log V)', worst: 'O(V²)', space: 'O(V)',
        useCases: 'カーナビ・ネットワークルーティング・ゲームのパス探索。',
        visualGuide: 'ノード上の数値が暫定距離。緑＝確定済み。数値が更新（減少）される瞬間が「緩和」。',
      },
      bellmanFord: {
        name: 'ベルマン・フォード法',
        description: '全辺を V-1 回繰り返し緩和する。ダイクストラより遅いが負の重みも扱える。負のサイクル検出も可能。',
        best: 'O(E)', average: 'O(VE)', worst: 'O(VE)', space: 'O(V)',
        useCases: '負の重みがある経路問題。通貨アービトラージ検出。ネットワーク遅延の最悪ケース解析。',
        visualGuide: '全辺を何度も緩和する反復の様子を観察。ダイクストラとのアプローチの違いに注目。',
      },
      kruskal: {
        name: 'クラスカル法',
        description: '辺を重みの昇順にソートし、サイクルを形成しない辺を貪欲に選んで最小全域木（MST）を構築する。Union-Find でサイクル判定。',
        best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)', space: 'O(V)',
        useCases: '電力網・通信網の最小コスト設計。クラスタリングの前処理（MST を切断）。',
        visualGuide: '辺が軽い順に採用（緑）・棄却（赤）される様子に注目。棄却されるのはサイクルができるとき。',
      },
      prim: {
        name: 'プリム法',
        description: '始点から始め、MST に隣接する最小重みの辺を貪欲に選んでツリーを成長させる最小全域木アルゴリズム。',
        best: 'O(E log V)', average: 'O(E log V)', worst: 'O(V²)', space: 'O(V)',
        useCases: 'クラスカル法と同じ用途。密グラフでは優先度キュー実装でクラスカルより速い場合がある。',
        visualGuide: '緑のツリーが一つのノードから成長していく様子に注目。クラスカルとの成長の違いを比較。',
      },
      rsa: {
        name: 'RSA暗号',
        description: '大きな数の素因数分解が困難という性質を利用した公開鍵暗号。公開鍵(n,e)で暗号化、秘密鍵(n,d)で復号する。',
        best: 'O(log²n)', average: 'O(log²n)', worst: 'O(log²n)', space: 'O(1)',
        useCases: 'HTTPS/TLS・SSH認証・デジタル署名・電子メール暗号化。',
        visualGuide: '鍵生成→暗号化→復号の3フェーズを順に追う。各ステップの数式と計算結果を確認。',
      },
      diffieHellman: {
        name: 'ディフィー・ヘルマン鍵共有',
        description: '盗聴者がいる通信路でも安全に共通秘密鍵を共有できる。g^ab mod p を共通鍵とすることで秘密鍵を交換せずに合意できる。',
        best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
        useCases: 'TLS/SSL鍵交換・SSH・VPN・暗号化メッセージングアプリ（Signal等）。',
        visualGuide: 'AliceとBobが公開値を交換するだけで同じ秘密鍵に到達する流れを観察。',
      },
      kmp: {
        name: 'KMP法（クヌース・モリス・プラット）',
        description: 'パターンの「失敗関数テーブル」を事前計算し、不一致時に無駄なバックトラックを省く文字列検索アルゴリズム。最悪 O(n+m) を保証。',
        best: 'O(n)', average: 'O(n+m)', worst: 'O(n+m)', space: 'O(m)',
        useCases: 'テキストエディタの検索・バイオインフォマティクス（DNA配列検索）・ネットワークパケット検査。',
        visualGuide: '失敗関数テーブルの値が不一致時のスキップ量を決める。ナイーブ法との比較でスキップの威力を確認。',
      },
      boyerMoore: {
        name: 'ボイヤー・ムーア法',
        description: 'パターンを右端から照合し、「悪い文字規則」で大きくスキップする。平均的に最速の文字列検索アルゴリズム（最良 O(n/m)）。',
        best: 'O(n/m)', average: 'O(n)', worst: 'O(nm)', space: 'O(m+Σ)',
        useCases: 'grep・テキストエディタ・ウイルス検知・大規模テキスト検索。',
        visualGuide: '右端から照合し、不一致文字のパターン内位置でスキップ量が決まる様子を観察。',
      },
      knapsack: {
        name: 'ナップサック問題（0-1DP）',
        description: '重量制限内で価値の合計を最大化するアイテムを選ぶ組合せ最適化問題。DP テーブルで O(nW) に解く。',
        best: 'O(nW)', average: 'O(nW)', worst: 'O(nW)', space: 'O(nW)',
        useCases: '資源配分・投資ポートフォリオ・荷物の積載最適化・計算生物学。',
        visualGuide: 'テーブルが左から右・上から下へ埋まる様子に注目。黄色が現在セル、シアンが参照元セル。',
      },
      levenshtein: {
        name: 'レーベンシュタイン距離',
        description: '2つの文字列間の最小編集距離（挿入・削除・置換の最小回数）を DP で求める。スペルチェックや diff の基礎。',
        best: 'O(nm)', average: 'O(nm)', worst: 'O(nm)', space: 'O(nm)',
        useCases: 'スペルチェッカー・git diff・DNA配列比較・翻訳メモリ・ファジー検索。',
        visualGuide: 'DP テーブルが埋まるにつれて右下の値が編集距離に近づく。最終的に右下セルが答え。',
      },
      mazeGeneration: {
        name: '迷路生成（再帰バックトラッキング）',
        description: 'DFS で壁を「掘り進む」ことで完全迷路を生成する。すべてのセル間に一意のパスを持つ木構造になる。',
        best: 'O(rc)', average: 'O(rc)', worst: 'O(rc)', space: 'O(rc)',
        useCases: 'ゲームの迷路生成・パズル設計・回路基板設計・スパニングツリーの視覚化。',
        visualGuide: '現在の掘削位置（オレンジ）が行き止まりに達するとバックトラックする様子を観察。',
      },
      svm: {
        name: 'SVM（サポートベクターマシン）',
        description: '最大マージン超平面でデータを分類する。サポートベクター（境界に最も近い点）だけが決定境界を決定する。',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n³)', space: 'O(n)',
        useCases: '画像分類・テキスト分類・バイオインフォマティクス・金融詐欺検出。',
        visualGuide: '決定境界（紫線）とマージン帯の幅に注目。黄色枠の点がサポートベクター。',
      },
      pca: {
        name: 'PCA（主成分分析）',
        description: '分散が最大になる方向（主成分）を求め、データを低次元に射影する次元削減アルゴリズム。固有値分解で実現する。',
        best: 'O(nd²)', average: 'O(nd²)', worst: 'O(nd²)', space: 'O(d²)',
        useCases: '次元削減・ノイズ除去・顔認識（Eigenface）・データ可視化・特徴抽出。',
        visualGuide: '矢印が主成分の方向と大きさを示す。長い矢印（PC1）がデータの最大分散方向。',
      },
      decisionTree: {
        name: '決定木',
        description: 'ジニ不純度を最小化する分割を貪欲に繰り返し、木構造の分類器を構築する。人間に解釈しやすいモデル。',
        best: 'O(n log n)', average: 'O(n² log n)', worst: 'O(n²)', space: 'O(n)',
        useCases: '医療診断・信用スコアリング・顧客分類・特徴重要度の解釈・アンサンブル学習（Random Forest）の基礎。',
        visualGuide: '各ノードの分割条件（x ≤ 閾値）と不純度の変化に注目。葉ノードが最終的な予測クラス。',
      },
    },
  },
  infra: {
    pageTitle: 'インフラ学習コース',
    pageSubtitle: 'ブラウザだけで動く本物のLinuxシェル',
    nav: { backToTop: 'トップへ戻る', infraCourse: 'インフラ学習' },
    categories: {
      filesystem: 'ファイルシステム',
      permissions: 'パーミッション',
      text: 'テキスト処理',
      process: 'プロセス管理',
      shell: 'シェルスクリプト',
    },
    ui: {
      statusIdle:          '起動待機中',
      statusBooting:       'WebContainer 起動中...',
      statusReady:         '準備完了',
      statusError:         'エラー',
      progressLabel:       '進捗',
      fileTreeLabel:       'ファイルツリー',
      resetProgressButton: '進捗をリセット',
      confirmReset:        'クリア状態をすべてリセットします。よろしいですか？',
      missionLabel:        'ミッション',
      backgroundLabel:     '背景・実務コンテキスト',
      hintsLabel:          'ヒント',
      answerLabel:         '解答例',
      commandsLabel:       'コマンド早見表',
      showHintButton:      (revealed, total) => `ヒント ${revealed + 1} を見る (${revealed + 1}/${total})`,
      allHintsShown:       'すべてのヒントを表示しました',
      showAnswerButton:    '解答例を表示する',
      hideAnswerButton:    '非表示にする',
      answerWarning:       '本当に解答例を見ますか？まずヒントをすべて確認してみましょう。',
      clearBanner:         'ミッションクリア！お疲れ様でした 🎉',
      nextMissionButton:   '次のミッションへ',
      leaveWarningTitle:   'セッションを終了しますか？',
      leaveWarningMessage: 'WebContainerのファイルシステムはページを離れると失われます。作業内容を保存する場合は、ターミナルでファイルをダウンロードしてください。',
      leaveCancel:         'この画面に留まる',
      leaveConfirm:        '離れる',
    },
    resources: {
      webcontainer: {
        name: 'Linux シェル環境（WebContainers）',
        description: 'ブラウザ内で完全な Linux シェル環境が動作します。インストール不要でコマンドを実際に実行できます。',
        estimatedMemoryRange: '200〜500 MB',
        estimatedDownloadSize: null,
        cautions: [
          'ページをリロードするとファイルシステムの内容は消去されます',
          'セッションごとにミッションのセットアップが実行されます',
          'sudo は使用できません',
        ],
      },
    },
    recommendations: [
      '空きメモリ 4 GB 以上を推奨します',
      '他のブラウザタブを閉じると動作が安定します',
      'Chrome / Edge での利用を推奨します（Safari は一部機能が制限される場合があります）',
    ],
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
    algorithmCourse: {
      scenarios: ['Sort & Search Algorithms', 'Tower of Hanoi & Fibonacci', 'Convolution & K-Means'],
    },
    infraCourse: {
      title: 'Infra Learning',
      description: 'A real Linux shell in the browser powered by WebContainers. Watch the file tree change as you type commands.',
      scenarios: ['Filesystem Operations', 'Permissions & Ownership', 'Text Processing & Logs'],
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
  algorithm: {
    pageTitle: 'Algorithm Visualizer',
    pageSubtitle: 'See and feel how algorithms work',
    selectPrompt: 'Select an algorithm from the list on the left',
    categories: { sort: 'Sorting', search: 'Searching', classic: 'Classics', ml: 'ML Basics' },
    controls: {
      play: 'Play', pause: 'Pause', step: 'Step', reset: 'Reset',
      speed: 'Speed', speedLabels: ['Slowest', 'Slow', 'Normal', 'Fast', 'Fastest'],
      arraySize: 'Array Size', randomize: 'Randomize', targetValue: 'Search Target',
      numDisks: 'Number of Disks', nValue: 'n value', useMemo: 'Use Memoization',
      inputA: 'Value A', inputB: 'Value B', numPoints: 'Number of Points',
      numClusters: 'Clusters (k)', learningRate: 'Learning Rate',
      poolType: 'Pool Type', poolSize: 'Window Size',
      max: 'Max', avg: 'Average',
      clickToToggleWall: 'Click to toggle wall', clearWalls: 'Clear Walls',
      kernelType: 'Kernel', dataType: 'Training Data',
      wallMode: 'Wall', startMode: 'Start', goalMode: 'Goal',
    },
    stepLog: {
      title: 'Step Log',
      empty: 'Press Play or Step to see the log here',
      step: (n) => `[Step ${n}]`,
    },
    info: {
      description: 'Description',
      timeComplexity: 'Time Complexity',
      bestCase: 'Best', averageCase: 'Average', worstCase: 'Worst',
      spaceComplexity: 'Space Complexity',
      useCases: 'Use Cases',
      visualGuide: 'What to Watch',
    },
    nav: { backToTop: 'Back to Top', algorithmCourse: 'Algorithm Visualizer' },
    algorithms: {
      bubble: {
        name: 'Bubble Sort',
        description: 'Repeatedly compares adjacent elements and swaps them if out of order. The largest values "bubble up" to the end in each pass.',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: 'Educational purposes and nearly-sorted small arrays. Rarely used in production.',
        visualGuide: 'Yellow = comparing, Red = swapping, Green = sorted. Watch green grow from the right.',
      },
      selection: {
        name: 'Selection Sort',
        description: 'Finds the minimum of the unsorted portion and places it at the front. Simple but always O(n²) regardless of input.',
        best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: 'When write/swap cost is high (e.g., flash memory), minimizing swaps matters.',
        visualGuide: 'Purple = current minimum candidate. Watch it scan and then snap into place.',
      },
      insertion: {
        name: 'Insertion Sort',
        description: 'Like sorting playing cards: pick one from the unsorted portion and insert it into the correct position in the sorted portion.',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: 'Small arrays and nearly-sorted data. Used inside TimSort for small subarrays.',
        visualGuide: 'Watch the purple element shift left until it finds its correct position.',
      },
      merge: {
        name: 'Merge Sort',
        description: 'Divides the array in half, recursively sorts each half, then merges them. Stable and guarantees O(n log n) in all cases.',
        best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)',
        useCases: 'External sorting of large data, stable sort requirements.',
        visualGuide: 'Orange border = active merge range. Cyan bars are being merged into place.',
      },
      quick: {
        name: 'Quick Sort',
        description: 'Picks a pivot element and partitions the array around it, then recursively sorts each partition. Fastest in practice on average.',
        best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)',
        useCases: 'General-purpose sorting — used in many standard libraries.',
        visualGuide: 'Purple = pivot. Watch elements smaller than pivot move to its left.',
      },
      heap: {
        name: 'Heap Sort',
        description: 'Builds a max-heap, then repeatedly extracts the maximum to produce a sorted array. In-place with guaranteed O(n log n).',
        best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)',
        useCases: 'When worst-case O(n log n) and O(1) space are both required.',
        visualGuide: 'Two phases: heap build (first half), then extraction (second half). Watch max move to end.',
      },
      linear: {
        name: 'Linear Search',
        description: 'Scans from start to end, checking each element. Works on unsorted data but slow for large arrays.',
        best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)',
        useCases: 'Unsorted or small collections, one-time searches.',
        visualGuide: 'Yellow = currently scanning. Green = found. Gray = already checked.',
      },
      binary: {
        name: 'Binary Search',
        description: 'Repeatedly halves the search range on a sorted array. Each step eliminates half the remaining candidates.',
        best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
        useCases: 'Fast lookups in large sorted datasets — dictionaries, phone books, sorted databases.',
        visualGuide: 'Blue range = current search window. Purple = mid point. Watch the window shrink.',
      },
      bfs: {
        name: 'Breadth-First Search (BFS)',
        description: 'Explores all neighbors at distance d before going to distance d+1. Uses a queue. Guarantees the shortest path.',
        best: 'O(1)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)',
        useCases: 'Shortest path, social network connections, level-order tree traversal.',
        visualGuide: 'Cyan = frontier (in queue). Blue = visited. Watch the wave expand outward.',
      },
      dfs: {
        name: 'Depth-First Search (DFS)',
        description: 'Dives as deep as possible before backtracking. Uses a stack or recursion. Does NOT guarantee shortest path.',
        best: 'O(1)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)',
        useCases: 'Maze solving, topological sort, connected components, backtracking problems.',
        visualGuide: 'Watch it dive deep in one direction, then backtrack when stuck. Compare with BFS.',
      },
      astar: {
        name: 'A* Algorithm',
        description: 'Combines g (cost from start) and h (heuristic to goal) to guide search. Finds shortest path more efficiently than BFS.',
        best: 'O(1)', average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)',
        useCases: 'Game AI pathfinding, GPS navigation, robot motion planning.',
        visualGuide: 'f = g + h score shown per cell. A* expands the cell with minimum f first.',
      },
      hanoi: {
        name: 'Tower of Hanoi',
        description: 'Move n disks from pole A to pole C using pole B as auxiliary, never placing a larger disk on a smaller one. A classic recursion puzzle.',
        best: 'O(2ⁿ)', average: 'O(2ⁿ)', worst: 'O(2ⁿ)', space: 'O(n)',
        useCases: 'Teaching recursion and divide-and-conquer. Exactly 2ⁿ-1 moves are required.',
        visualGuide: 'Each disk has a unique color. Watch the recursive sub-problems: move n-1, then 1, then n-1.',
      },
      fibonacci: {
        name: 'Fibonacci Sequence',
        description: 'F(n) = F(n-1) + F(n-2). Without memoization: O(2ⁿ). With memoization (DP): O(n). A perfect intro to dynamic programming.',
        best: 'O(n)', average: 'O(n)', worst: 'O(2ⁿ)※', space: 'O(n)',
        useCases: 'Dynamic programming intro, nature (spirals, ratios), algorithm design teaching.',
        visualGuide: 'Watch the table fill left to right. Arrows show which two values are being summed.',
      },
      euclidean: {
        name: 'Euclidean Algorithm',
        description: 'Finds the Greatest Common Divisor (GCD) by repeatedly replacing (a, b) with (b, a mod b) until the remainder is 0.',
        best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
        useCases: 'Fraction simplification, RSA cryptography, LCM computation.',
        visualGuide: 'Watch the rectangle get subdivided into squares. The final square size is the GCD.',
      },
      montecarlo: {
        name: 'Monte Carlo (π Estimation)',
        description: 'Randomly plots points in a unit square and counts those inside the inscribed circle. The ratio approximates π/4.',
        best: '—', average: 'O(n)', worst: 'O(n)', space: 'O(n)',
        useCases: 'Numerical integration, risk simulation, physics modeling, ML dropout.',
        visualGuide: 'Blue = inside circle (used for π), Red = outside. Watch π estimate converge as points increase.',
      },
      convolution: {
        name: 'Convolution',
        description: 'Slides a kernel over the input, computing element-wise dot products. The core operation in Convolutional Neural Networks.',
        best: 'O(n²k²)', average: 'O(n²k²)', worst: 'O(n²k²)', space: 'O(n²)',
        useCases: 'Image filtering, CNN feature extraction, audio signal processing.',
        visualGuide: 'Center = kernel sliding over input (left). Watch the output (right) build up pixel by pixel.',
      },
      pooling: {
        name: 'Pooling',
        description: 'Downsamples a feature map by taking the max or average in each window. Reduces size while retaining key features.',
        best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(n²)',
        useCases: 'CNN dimensionality reduction, translation invariance.',
        visualGuide: 'Yellow window slides over the input. The max/average of highlighted cells is written to output.',
      },
      kmeans: {
        name: 'k-Means Clustering',
        description: 'Partitions data into k clusters by iterating between assigning points to nearest centroids and updating centroid positions.',
        best: 'O(nki)', average: 'O(nki)', worst: 'O(nki)', space: 'O(n+k)',
        useCases: 'Customer segmentation, image color quantization, anomaly detection preprocessing.',
        visualGuide: 'Watch centroids (×) shift each iteration and point colors change as clusters reassign.',
      },
      perceptron: {
        name: 'Perceptron',
        description: 'The simplest neural network: weighted sum of inputs, threshold activation, weight update on error. Foundation of deep learning.',
        best: 'O(n)', average: 'O(n·e)', worst: 'O(n·e)', space: 'O(w)',
        useCases: 'Linearly separable binary classification. Basis of multi-layer neural networks.',
        visualGuide: 'Edge thickness shows weight magnitude. Watch weights update when output ≠ target.',
      },
      bogo: {
        name: 'Bogo Sort',
        description: 'Randomly shuffles the array and checks if it is sorted. Repeats until lucky. The "worst sort" for teaching that unplanned algorithms can be astronomically slow.',
        best: 'O(n)', average: 'O((n+1)!)', worst: '∞', space: 'O(1)',
        useCases: 'Education only. Demonstrates why random trial-and-error is not a strategy.',
        visualGuide: 'Watch the array scramble on each shuffle. Observe when it accidentally becomes sorted.',
      },
      shell: {
        name: 'Shell Sort',
        description: 'Starts with a large gap and shrinks it (Knuth sequence). By pre-sorting far-apart elements, insertion sort at gap=1 runs much faster than on random data.',
        best: 'O(n log n)', average: 'O(n^(4/3))', worst: 'O(n²)', space: 'O(1)',
        useCases: 'Embedded systems, memory-constrained environments. Faster than O(n²) sorts without extra memory.',
        visualGuide: 'At large gaps, distant elements swap. Gap shrinks each pass. Watch it converge to sorted.',
      },
      radix: {
        name: 'Radix Sort',
        description: 'Sorts integers digit by digit from least significant to most significant using counting sort. No comparisons → O(dn) time (d = number of digits).',
        best: 'O(dn)', average: 'O(dn)', worst: 'O(dn)', space: 'O(n+k)',
        useCases: 'Sorting large sets of integers or fixed-length strings. Faster than O(n log n) for large n with bounded keys.',
        visualGuide: 'Watch the array partially sort by each digit (units, tens, ...). One pass per digit place.',
      },
      cocktail: {
        name: 'Cocktail Sort',
        description: 'Bidirectional bubble sort: alternates left→right and right→left passes. Addresses the "turtle problem" where small values at the right end take long to bubble left.',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)',
        useCases: 'Slight improvement over bubble sort for nearly-sorted data with small values near the end.',
        visualGuide: 'Watch green grow from both ends simultaneously as the sort converges from both sides.',
      },
      dijkstra: {
        name: "Dijkstra's Algorithm",
        description: 'Finds shortest paths from a source to all nodes in a non-negative weighted graph. Greedily confirms the closest unvisited node at each step.',
        best: 'O(V²)', average: 'O(E log V)', worst: 'O(V²)', space: 'O(V)',
        useCases: 'GPS navigation, network routing (OSPF), game AI pathfinding.',
        visualGuide: 'Numbers on nodes = current best distance. Green = confirmed. Watch distances shrink as edges relax.',
      },
      bellmanFord: {
        name: 'Bellman-Ford Algorithm',
        description: 'Relaxes all edges V-1 times. Slower than Dijkstra but handles negative edge weights and can detect negative cycles.',
        best: 'O(E)', average: 'O(VE)', worst: 'O(VE)', space: 'O(V)',
        useCases: 'Routing with negative costs, currency arbitrage detection, worst-case network analysis.',
        visualGuide: 'Watch all edges being relaxed repeatedly. Compare the relaxation pattern with Dijkstra\'s greedy approach.',
      },
      kruskal: {
        name: "Kruskal's Algorithm (MST)",
        description: 'Sorts edges by weight and greedily adds the cheapest edge that does not create a cycle. Uses Union-Find for O(α(V)) cycle detection.',
        best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)', space: 'O(V)',
        useCases: 'Minimum cost network design (power grids, pipelines). MST-based clustering.',
        visualGuide: 'Edges are considered lightest-first. Green = added to MST. Red = rejected (would create cycle).',
      },
      prim: {
        name: "Prim's Algorithm (MST)",
        description: 'Grows the MST from a start node by always adding the cheapest edge connecting the tree to a new node.',
        best: 'O(E log V)', average: 'O(E log V)', worst: 'O(V²)', space: 'O(V)',
        useCases: 'Same as Kruskal. Faster on dense graphs with priority queue. Used in game terrain generation.',
        visualGuide: 'Watch the green tree grow from the source, one edge at a time. Compare growth pattern with Kruskal.',
      },
      rsa: {
        name: 'RSA Encryption',
        description: 'Public-key cryptosystem based on the difficulty of factoring large numbers. Public key (n,e) encrypts; private key (n,d) decrypts.',
        best: 'O(log²n)', average: 'O(log²n)', worst: 'O(log²n)', space: 'O(1)',
        useCases: 'HTTPS/TLS, SSH authentication, digital signatures, email encryption (PGP).',
        visualGuide: 'Follow three phases: key generation → encryption → decryption. Check each formula and result.',
      },
      diffieHellman: {
        name: 'Diffie-Hellman Key Exchange',
        description: 'Allows two parties to establish a shared secret over a public channel. Security relies on the difficulty of the discrete logarithm problem.',
        best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)',
        useCases: 'TLS/SSL key exchange, SSH, VPN, encrypted messaging apps (Signal, WhatsApp).',
        visualGuide: 'Watch Alice and Bob exchange public values and independently compute the same secret K.',
      },
      kmp: {
        name: 'KMP (Knuth-Morris-Pratt)',
        description: 'Precomputes a failure function table from the pattern to avoid redundant backtracking. Guarantees O(n+m) in the worst case.',
        best: 'O(n)', average: 'O(n+m)', worst: 'O(n+m)', space: 'O(m)',
        useCases: 'Text editors, bioinformatics (DNA search), network packet inspection.',
        visualGuide: 'The failure table value tells how far to shift on mismatch. Watch it skip comparisons naive search would repeat.',
      },
      boyerMoore: {
        name: 'Boyer-Moore',
        description: 'Matches from the right end of the pattern, skipping by the "bad character rule." Typically sub-linear in practice (best O(n/m)).',
        best: 'O(n/m)', average: 'O(n)', worst: 'O(nm)', space: 'O(m+Σ)',
        useCases: 'grep, text editors, virus scanners, large-scale text search.',
        visualGuide: 'Watch large skips when the mismatched character does not appear in the pattern at all.',
      },
      knapsack: {
        name: '0-1 Knapsack (DP)',
        description: 'Select items to maximize value within a weight limit. DP table dp[i][w] = max value using first i items with capacity w.',
        best: 'O(nW)', average: 'O(nW)', worst: 'O(nW)', space: 'O(nW)',
        useCases: 'Resource allocation, investment portfolio optimization, cargo loading, computational biology.',
        visualGuide: 'Table fills left→right, top→bottom. Yellow = current cell. Cyan = cells referenced for the recurrence.',
      },
      levenshtein: {
        name: 'Levenshtein Distance',
        description: 'Minimum edit distance between two strings (insertions, deletions, substitutions). Classic DP problem used in spell checkers and diff tools.',
        best: 'O(nm)', average: 'O(nm)', worst: 'O(nm)', space: 'O(nm)',
        useCases: 'Spell checkers, git diff, DNA sequence alignment, fuzzy search, translation memory.',
        visualGuide: 'As the table fills, the bottom-right value converges to the edit distance. Watch the reconstruction path.',
      },
      mazeGeneration: {
        name: 'Maze Generation (Recursive Backtracking)',
        description: 'Initializes all cells as walls, then DFS "carves" passages. Result is a perfect maze — a spanning tree where every pair of cells has exactly one path.',
        best: 'O(rc)', average: 'O(rc)', worst: 'O(rc)', space: 'O(rc)',
        useCases: 'Game level generation, puzzle design, circuit board routing, spanning tree visualization.',
        visualGuide: 'Orange = current position carving through walls. Watch it backtrack when reaching a dead end.',
      },
      svm: {
        name: 'SVM (Support Vector Machine)',
        description: 'Finds the maximum-margin hyperplane separating two classes. Only the support vectors (points closest to the boundary) determine the decision boundary.',
        best: 'O(n)', average: 'O(n²)', worst: 'O(n³)', space: 'O(n)',
        useCases: 'Image classification, text categorization, bioinformatics, financial fraud detection.',
        visualGuide: 'Purple line = decision boundary. Yellow-outlined points are support vectors. Watch the margin widen during training.',
      },
      pca: {
        name: 'PCA (Principal Component Analysis)',
        description: 'Finds the directions of maximum variance (principal components) via eigenvalue decomposition. Projects data onto these axes for dimensionality reduction.',
        best: 'O(nd²)', average: 'O(nd²)', worst: 'O(nd²)', space: 'O(d²)',
        useCases: 'Dimensionality reduction, noise removal, face recognition (Eigenfaces), data visualization, feature extraction.',
        visualGuide: 'Arrows = principal component directions. Longer arrow (PC1) captures the most variance in the data.',
      },
      decisionTree: {
        name: 'Decision Tree',
        description: 'Greedily splits data by the feature and threshold that minimizes Gini impurity, building an interpretable tree classifier.',
        best: 'O(n log n)', average: 'O(n² log n)', worst: 'O(n²)', space: 'O(n)',
        useCases: 'Medical diagnosis, credit scoring, customer segmentation, feature importance, Random Forest base learner.',
        visualGuide: 'Each node shows its split condition and Gini impurity. Leaf nodes show the predicted class.',
      },
    },
  },
  infra: {
    pageTitle: 'Infra Learning Course',
    pageSubtitle: 'A real Linux shell, right in your browser',
    nav: { backToTop: 'Back to Top', infraCourse: 'Infra Learning' },
    categories: {
      filesystem: 'Filesystem',
      permissions: 'Permissions',
      text: 'Text Processing',
      process: 'Process Management',
      shell: 'Shell Scripting',
    },
    ui: {
      statusIdle:          'Waiting to Start',
      statusBooting:       'Starting WebContainer...',
      statusReady:         'Ready',
      statusError:         'Error',
      progressLabel:       'Progress',
      fileTreeLabel:       'File Tree',
      resetProgressButton: 'Reset Progress',
      confirmReset:        'Reset all cleared mission states?',
      missionLabel:        'Mission',
      backgroundLabel:     'Background & Real-World Context',
      hintsLabel:          'Hints',
      answerLabel:         'Solution',
      commandsLabel:       'Command Reference',
      showHintButton:      (revealed, total) => `Show Hint ${revealed + 1} (${revealed + 1}/${total})`,
      allHintsShown:       'All hints revealed',
      showAnswerButton:    'Show Solution',
      hideAnswerButton:    'Hide',
      answerWarning:       'Are you sure? Try all the hints first — they might be enough.',
      clearBanner:         'Mission Complete! Well done 🎉',
      nextMissionButton:   'Next Mission',
      leaveWarningTitle:   'Leave this session?',
      leaveWarningMessage: 'The WebContainer filesystem will be lost when you leave. Download any files you want to keep before leaving.',
      leaveCancel:         'Stay here',
      leaveConfirm:        'Leave',
    },
    resources: {
      webcontainer: {
        name: 'Linux Shell Environment (WebContainers)',
        description: 'A complete Linux shell runs inside your browser. No installation required — execute real commands instantly.',
        estimatedMemoryRange: '200–500 MB',
        estimatedDownloadSize: null,
        cautions: [
          'Filesystem contents are cleared on page reload',
          'Mission setup runs fresh each session',
          'sudo is not available',
        ],
      },
    },
    recommendations: [
      'At least 4 GB of free memory recommended',
      'Closing other browser tabs improves stability',
      'Chrome or Edge recommended (Safari may have limitations)',
    ],
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
