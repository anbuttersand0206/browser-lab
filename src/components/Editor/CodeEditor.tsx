import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useTheme } from '../../hooks/useTheme'

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
})

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: 'typescript' | 'sql'
  onCtrlEnter?: () => void
}

export function CodeEditor({ value, onChange, language, onCtrlEnter }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { resolvedTheme } = useTheme()

  // language または theme が変わるたびに EditorView を再生成する。
  // value は別の effect で同期するため、ここでは依存配列に含めない。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!containerRef.current) return

    const ctrlEnterKeymap = onCtrlEnter
      ? [keymap.of([
          {
            key: 'Ctrl-Enter',
            mac: 'Cmd-Enter',
            run: () => {
              onCtrlEnter()
              return true
            },
          },
        ])]
      : []

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      foldGutter(),
      indentOnInput(),
      bracketMatching(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      ...ctrlEnterKeymap,
      language === 'typescript'
        ? javascript({ typescript: true })
        : sql(),
      ...(resolvedTheme === 'dark'
        ? [oneDark]
        : [lightTheme, syntaxHighlighting(defaultHighlightStyle)]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
        }
      }),
    ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, resolvedTheme])

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

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />
}
