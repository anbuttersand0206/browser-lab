// ショートカットグループの型定義。
// HelpModal と i18n の両方が参照するため共通型として分離し、循環 import を防ぐ。

export interface ShortcutEntry {
  description: string
  // Mac と非 Mac でキー表記が異なるため両方を保持する
  mac: string
  other: string
}

export interface ShortcutGroup {
  label: string
  shortcuts: ShortcutEntry[]
}
