import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, Compartment, type Extension } from '@codemirror/state'
import { javascript, localCompletionSource, typescriptSnippets } from '@codemirror/lang-javascript'
import { sql, PostgreSQL } from '@codemirror/lang-sql'
import { autocompletion, completionKeymap, completeFromList, type Completion } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { search, searchKeymap } from '@codemirror/search'
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useTheme } from '../../hooks/useTheme'
import { TS_GLOBAL_COMPLETIONS } from '../../lib/tsCompletions'

// ライトテーマ定義
const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#1e1e1e' },
  '.cm-content': { caretColor: '#1e1e1e' },
  '.cm-cursor': { borderLeftColor: '#1e1e1e' },
  '.cm-selectionBackground': { backgroundColor: '#add6ff' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#add6ff' },
  '.cm-activeLine': { backgroundColor: '#f0f0f0' },
  '.cm-gutters': { backgroundColor: '#f5f5f5', color: '#999', borderRight: '1px solid #e4e4e4' },
  '.cm-activeLineGutter': { backgroundColor: '#e8e8e8' },
  // 補完ドロップダウンのライトテーマ
  '.cm-tooltip.cm-tooltip-autocomplete': { backgroundColor: '#f8f8f8', border: '1px solid #ddd' },
  '.cm-completionLabel': { color: '#1e1e1e' },
  '.cm-completionDetail': { color: '#795e26' },
  // 検索パネルのライトテーマ（デフォルトはダーク色なのでライト用に上書きする）
  '.cm-search': { backgroundColor: '#f5f5f5', borderTop: '1px solid #e4e4e4', padding: '4px 8px' },
  '.cm-search input': { backgroundColor: '#ffffff', color: '#1e1e1e', border: '1px solid #ddd', borderRadius: '3px' },
  '.cm-search button': { color: '#333' },
  '.cm-search label': { color: '#333' },
})

// SQL モード用スキーマ。テーブル名とカラム名を補完候補に使う。
// TableInfo を直接参照せずシンプルな形にすることで usePGLite への依存を切る。
export interface SqlTableSchema {
  name: string
  columns: string[]
}

// TableInfo[] を @codemirror/lang-sql の schema 形式に変換する
function buildSqlSchema(tables: SqlTableSchema[]): Record<string, string[]> {
  return Object.fromEntries(tables.map((t) => [t.name, t.columns]))
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: 'typescript' | 'sql'
  onCtrlEnter?: () => void
  // TypeScript モード用: package.json を解析して得たパッケージ固有の補完候補。
  // シナリオ切り替え時に更新され、インストール済みパッケージ（express 等）の API を補完する。
  extraTsCompletions?: Completion[]
  // SQL モード用: 現在 PGLite に存在するテーブルとカラム名。
  // Compartment で動的に更新するため、テーブルを CREATE するたびに補完候補が増える。
  sqlTables?: SqlTableSchema[]
  // 追加テーマの Extension。指定すると oneDark/lightTheme を上書きする。
  // null または undefined の場合は resolvedTheme に従うデフォルト動作を使う。
  themeExtension?: Extension | null
}

export function CodeEditor({
  value,
  onChange,
  language,
  onCtrlEnter,
  extraTsCompletions,
  sqlTables,
  themeExtension,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { resolvedTheme } = useTheme()

  // 最新の prop 値を ref に保持し、effect 内で stale closure を防ぐ。
  // これらは effect の依存配列に含めず、常に最新値を読み取るために使う。
  const extraTsCompletionsRef = useRef<Completion[]>(extraTsCompletions ?? [])
  extraTsCompletionsRef.current = extraTsCompletions ?? []

  const sqlTablesRef = useRef<SqlTableSchema[]>(sqlTables ?? [])
  sqlTablesRef.current = sqlTables ?? []

  // SQL スキーマを動的に差し替えるための Compartment。
  // テーブルが CREATE されるたびに再生成するのではなく、
  // この Compartment だけを reconfigure することでエディタ状態を保持したまま更新できる。
  const sqlSchemaCompartmentRef = useRef<Compartment | null>(null)

  // language / resolvedTheme / themeExtension が変わるたびに EditorView を再生成する。
  // value・extraTsCompletions・sqlTables は別 effect または ref で管理するためここに含めない。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!containerRef.current) return

    const ctrlEnterKeymap = onCtrlEnter
      ? [keymap.of([{
          key: 'Ctrl-Enter',
          mac: 'Cmd-Enter',
          run: () => { onCtrlEnter(); return true },
        }])]
      : []

    // 共通 extension（言語によらず使う）
    const commonExtensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      foldGutter(),
      indentOnInput(),
      bracketMatching(),
      // completionKeymap・searchKeymap は defaultKeymap より前に置き、
      // 補完表示中の Tab/Enter・検索中の Enter などを優先させる
      keymap.of([...completionKeymap, ...searchKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
      // Ctrl+F / Cmd+F でエディタ内検索パネルを開く
      search({ top: true }),
      ...ctrlEnterKeymap,
      // themeExtension が指定されていればそれを優先する。
      // 未指定の場合はシステムのダーク/ライト設定に従う。
      ...(themeExtension != null
        ? [themeExtension]
        : resolvedTheme === 'dark'
          ? [oneDark]
          : [lightTheme, syntaxHighlighting(defaultHighlightStyle)]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString())
      }),
    ]

    let langExtensions: Extension[] = []

    if (language === 'typescript') {
      // autocompletion の override で補完ソースをまとめて指定する。
      // - localCompletionSource: 現在のドキュメント内の変数・関数名
      // - completeFromList: TypeScript グローバル + パッケージ固有 + snippets
      // override を使うことで補完ソースの優先順を明示的に制御できる。
      const tsCompletion = autocompletion({
        maxRenderedOptions: 12,
        override: [
          localCompletionSource,
          completeFromList([
            ...TS_GLOBAL_COMPLETIONS,
            ...extraTsCompletionsRef.current,
            ...typescriptSnippets,
          ]),
        ],
      })
      langExtensions = [javascript({ typescript: true }), tsCompletion]
    } else {
      // SQL モード: PostgreSQL 方言でキーワード補完を有効化する。
      // テーブル・カラム補完は Compartment 経由で動的に更新する。
      const sqlSchemaCompartment = new Compartment()
      sqlSchemaCompartmentRef.current = sqlSchemaCompartment

      const initialSchema = buildSqlSchema(sqlTablesRef.current)
      langExtensions = [
        autocompletion({ maxRenderedOptions: 12 }),
        sqlSchemaCompartment.of(
          sql({ dialect: PostgreSQL, schema: initialSchema })
        ),
      ]
    }

    const state = EditorState.create({
      doc: value,
      extensions: [...commonExtensions, ...langExtensions],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
      sqlSchemaCompartmentRef.current = null
    }
  }, [language, resolvedTheme, themeExtension])

  // シナリオ切り替えなどで value prop が外部から変わった場合に CodeMirror ドキュメントを同期する。
  // onChange 経由の更新は current と一致するためスキップされ、無限ループを防ぐ。
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentContent = view.state.doc.toString()
    if (currentContent !== value) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: value },
      })
    }
  }, [value])

  // SQL テーブルが増減したときに補完スキーマを動的に更新する。
  // Compartment を使うことでエディタを再生成せずスキーマだけを差し替えられる。
  // これによりカーソル位置・undo 履歴・フォーカスを保持したままテーブル補完を更新できる。
  useEffect(() => {
    const view = viewRef.current
    const compartment = sqlSchemaCompartmentRef.current
    if (!view || !compartment || language !== 'sql') return

    const newSchema = buildSqlSchema(sqlTables ?? [])
    view.dispatch({
      effects: compartment.reconfigure(
        sql({ dialect: PostgreSQL, schema: newSchema })
      ),
    })
  }, [sqlTables, language])

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />
}
