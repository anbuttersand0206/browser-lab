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
    },
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
    },
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
