// CodeMirror 6 用の追加シンタックステーマ。
// EditorView.theme() で UI（背景・ガター・補完ドロップダウン等）を定義し、
// HighlightStyle でトークンごとの配色を定義する。

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

// ── Dracula ──────────────────────────────────────────────────────────────────
// https://draculatheme.com/contribute に準拠した配色
const draculaUi = EditorView.theme(
  {
    '&': { backgroundColor: '#282a36', color: '#f8f8f2' },
    '.cm-content': { caretColor: '#f8f8f2' },
    '.cm-cursor': { borderLeftColor: '#f8f8f2' },
    '.cm-selectionBackground': { backgroundColor: '#44475a' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#44475a' },
    '.cm-activeLine': { backgroundColor: '#44475a33' },
    '.cm-gutters': { backgroundColor: '#21222c', color: '#6272a4', borderRight: '1px solid #44475a' },
    '.cm-activeLineGutter': { backgroundColor: '#44475a33' },
    '.cm-tooltip.cm-tooltip-autocomplete': { backgroundColor: '#21222c', border: '1px solid #44475a' },
    '.cm-completionLabel': { color: '#f8f8f2' },
    '.cm-completionDetail': { color: '#6272a4' },
    '.cm-search': { backgroundColor: '#21222c', borderTop: '1px solid #44475a', padding: '4px 8px' },
    '.cm-search input': { backgroundColor: '#282a36', color: '#f8f8f2', border: '1px solid #44475a', borderRadius: '3px' },
    '.cm-search button': { color: '#f8f8f2' },
    '.cm-search label': { color: '#f8f8f2' },
  },
  { dark: true }
)

const draculaHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#6272a4', fontStyle: 'italic' },
  { tag: t.keyword, color: '#ff79c6' },
  { tag: [t.string, t.special(t.string)], color: '#f1fa8c' },
  { tag: t.number, color: '#bd93f9' },
  { tag: [t.bool, t.null], color: '#bd93f9' },
  { tag: t.operator, color: '#ff79c6' },
  { tag: [t.definitionKeyword, t.modifier], color: '#ff79c6' },
  { tag: [t.className, t.typeName, t.definition(t.typeName)], color: '#8be9fd', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#50fa7b' },
  { tag: t.definition(t.variableName), color: '#50fa7b' },
  { tag: t.variableName, color: '#f8f8f2' },
  { tag: t.propertyName, color: '#66d9e8' },
  { tag: [t.tagName, t.angleBracket], color: '#ff79c6' },
  { tag: t.attributeName, color: '#50fa7b' },
  { tag: t.self, color: '#fd971f' },
  { tag: t.regexp, color: '#f1fa8c' },
  { tag: t.escape, color: '#ff79c6' },
  { tag: t.punctuation, color: '#f8f8f2' },
])

export const draculaTheme: Extension = [draculaUi, syntaxHighlighting(draculaHighlight)]

// ── Solarized Dark ────────────────────────────────────────────────────────────
// https://ethanschoonover.com/solarized/ の配色仕様に準拠
const solarizedDarkUi = EditorView.theme(
  {
    '&': { backgroundColor: '#002b36', color: '#839496' },
    '.cm-content': { caretColor: '#839496' },
    '.cm-cursor': { borderLeftColor: '#839496' },
    '.cm-selectionBackground': { backgroundColor: '#073642' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#073642' },
    '.cm-activeLine': { backgroundColor: '#073642' },
    '.cm-gutters': { backgroundColor: '#073642', color: '#586e75', borderRight: '1px solid #073642' },
    '.cm-activeLineGutter': { backgroundColor: '#002b36' },
    '.cm-tooltip.cm-tooltip-autocomplete': { backgroundColor: '#073642', border: '1px solid #586e75' },
    '.cm-completionLabel': { color: '#839496' },
    '.cm-completionDetail': { color: '#586e75' },
    '.cm-search': { backgroundColor: '#073642', borderTop: '1px solid #586e75', padding: '4px 8px' },
    '.cm-search input': { backgroundColor: '#002b36', color: '#839496', border: '1px solid #586e75', borderRadius: '3px' },
    '.cm-search button': { color: '#839496' },
    '.cm-search label': { color: '#839496' },
  },
  { dark: true }
)

const solarizedDarkHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#586e75', fontStyle: 'italic' },
  { tag: t.keyword, color: '#859900' },
  { tag: [t.string, t.special(t.string)], color: '#2aa198' },
  { tag: t.number, color: '#d33682' },
  { tag: [t.bool, t.null], color: '#268bd2' },
  { tag: t.operator, color: '#859900' },
  { tag: [t.definitionKeyword, t.modifier], color: '#859900' },
  { tag: [t.className, t.typeName, t.definition(t.typeName)], color: '#b58900' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#268bd2' },
  { tag: t.definition(t.variableName), color: '#268bd2' },
  { tag: t.variableName, color: '#839496' },
  { tag: t.propertyName, color: '#839496' },
  { tag: t.tagName, color: '#268bd2' },
  { tag: t.attributeName, color: '#657b83' },
  { tag: t.self, color: '#cb4b16' },
  { tag: t.regexp, color: '#2aa198' },
  { tag: t.escape, color: '#dc322f' },
  { tag: t.punctuation, color: '#839496' },
])

export const solarizedDarkTheme: Extension = [solarizedDarkUi, syntaxHighlighting(solarizedDarkHighlight)]

// ── Solarized Light ───────────────────────────────────────────────────────────
const solarizedLightUi = EditorView.theme({
  '&': { backgroundColor: '#fdf6e3', color: '#657b83' },
  '.cm-content': { caretColor: '#657b83' },
  '.cm-cursor': { borderLeftColor: '#657b83' },
  '.cm-selectionBackground': { backgroundColor: '#eee8d5' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#eee8d5' },
  '.cm-activeLine': { backgroundColor: '#eee8d5' },
  '.cm-gutters': { backgroundColor: '#eee8d5', color: '#93a1a1', borderRight: '1px solid #ddd6c1' },
  '.cm-activeLineGutter': { backgroundColor: '#e5dfcb' },
  '.cm-tooltip.cm-tooltip-autocomplete': { backgroundColor: '#eee8d5', border: '1px solid #ddd6c1' },
  '.cm-completionLabel': { color: '#657b83' },
  '.cm-completionDetail': { color: '#93a1a1' },
  '.cm-search': { backgroundColor: '#eee8d5', borderTop: '1px solid #ddd6c1', padding: '4px 8px' },
  '.cm-search input': { backgroundColor: '#fdf6e3', color: '#657b83', border: '1px solid #ddd6c1', borderRadius: '3px' },
  '.cm-search button': { color: '#657b83' },
  '.cm-search label': { color: '#657b83' },
})

const solarizedLightHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#93a1a1', fontStyle: 'italic' },
  { tag: t.keyword, color: '#859900' },
  { tag: [t.string, t.special(t.string)], color: '#2aa198' },
  { tag: t.number, color: '#d33682' },
  { tag: [t.bool, t.null], color: '#268bd2' },
  { tag: t.operator, color: '#859900' },
  { tag: [t.definitionKeyword, t.modifier], color: '#859900' },
  { tag: [t.className, t.typeName, t.definition(t.typeName)], color: '#b58900' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#268bd2' },
  { tag: t.definition(t.variableName), color: '#268bd2' },
  { tag: t.variableName, color: '#657b83' },
  { tag: t.propertyName, color: '#657b83' },
  { tag: t.tagName, color: '#268bd2' },
  { tag: t.attributeName, color: '#657b83' },
  { tag: t.self, color: '#cb4b16' },
  { tag: t.regexp, color: '#2aa198' },
  { tag: t.escape, color: '#dc322f' },
  { tag: t.punctuation, color: '#657b83' },
])

export const solarizedLightTheme: Extension = [solarizedLightUi, syntaxHighlighting(solarizedLightHighlight)]

// ── テーマ一覧（セレクタ UI 用）────────────────────────────────────────────
// 'system' はダーク/ライト設定に連動するデフォルト動作を表す。
export type CodeThemeId = 'system' | 'dracula' | 'solarized-dark' | 'solarized-light'

export interface CodeThemeMeta {
  id: CodeThemeId
  labelJa: string
  labelEn: string
  extension: Extension | null
}

export const CODE_THEMES: CodeThemeMeta[] = [
  { id: 'system', labelJa: 'システム', labelEn: 'System', extension: null },
  { id: 'dracula', labelJa: 'Dracula', labelEn: 'Dracula', extension: draculaTheme },
  { id: 'solarized-dark', labelJa: 'Solarized Dark', labelEn: 'Solarized Dark', extension: solarizedDarkTheme },
  { id: 'solarized-light', labelJa: 'Solarized Light', labelEn: 'Solarized Light', extension: solarizedLightTheme },
]
