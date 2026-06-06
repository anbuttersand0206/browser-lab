// カスタムシナリオの読み込み・保存ユーティリティ。
// ユーザーが自作した JSON ファイルをアプリにインポートし、
// 組み込みシナリオと同じ UI でプログラミング学習できるようにする。

import type { ProgrammingScenario } from '../scenarios/programming'

const LS_KEY = 'browser-lab:custom-scenarios'

// ユーザーが作成する JSON ファイルの形式。
// ProgrammingScenario と互換性を持ちつつ、
// type フィールドで通常の export JSON と区別できるようにする。
export interface CustomScenarioJson {
  type: 'browser-lab-custom-scenario'
  version: 1
  id: string
  title: string
  description: string
  files: Record<string, string>
  hints?: string[]
  solution?: Record<string, string>
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  return Object.values(v as object).every((x) => typeof x === 'string')
}

export type CustomScenarioValidationResult =
  | { ok: true; data: ProgrammingScenario }
  | { ok: false; reason: string }

// アップロードされた JSON を型安全に検証し、ProgrammingScenario に変換する。
// 不正フィールドはエラーメッセージ付きで棄却する。
export function validateCustomScenarioJson(raw: unknown): CustomScenarioValidationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'JSONの形式が正しくありません' }
  }
  const v = raw as Record<string, unknown>

  // type フィールドで通常の export JSON（バックアップ用）との区別を明確にする
  if (v.type !== 'browser-lab-custom-scenario') {
    return { ok: false, reason: '"type" フィールドが "browser-lab-custom-scenario" である必要があります' }
  }
  if (typeof v.id !== 'string' || !v.id.trim()) {
    return { ok: false, reason: '"id" は空でない文字列である必要があります' }
  }
  if (typeof v.title !== 'string' || !v.title.trim()) {
    return { ok: false, reason: '"title" は空でない文字列である必要があります' }
  }
  if (typeof v.description !== 'string') {
    return { ok: false, reason: '"description" は文字列である必要があります' }
  }
  if (!isStringRecord(v.files)) {
    return { ok: false, reason: '"files" は { ファイル名: コード } 形式のオブジェクトである必要があります' }
  }
  if (Object.keys(v.files as object).length === 0) {
    return { ok: false, reason: '"files" に少なくとも1つのファイルが必要です' }
  }

  const scenario: ProgrammingScenario = {
    id: `custom:${(v.id as string).trim()}`,
    title: (v.title as string).trim(),
    description: v.description as string,
    files: v.files as Record<string, string>,
    hints: Array.isArray(v.hints) && v.hints.every((h) => typeof h === 'string')
      ? (v.hints as string[])
      : [],
    solution: isStringRecord(v.solution) ? (v.solution as Record<string, string>) : {},
  }

  return { ok: true, data: scenario }
}

// localStorage に保存されたカスタムシナリオ一覧を読み込む。
// JSON 破損・型不一致のエントリは除外してフォールバックする。
export function loadCustomScenarios(): ProgrammingScenario[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const result = validateCustomScenarioJson(item)
      return result.ok ? [result.data] : []
    })
  } catch {
    return []
  }
}

export function saveCustomScenarios(scenarios: ProgrammingScenario[]): void {
  try {
    // カスタムシナリオを保存するとき、id の "custom:" プレフィックスを除いて
    // JSON を生成することで、読み込み時に再度プレフィックスを付与できるようにする
    const toSave = scenarios.map((s) => ({
      type: 'browser-lab-custom-scenario',
      version: 1,
      id: s.id.replace(/^custom:/, ''),
      title: s.title,
      description: s.description,
      files: s.files,
      hints: s.hints,
      solution: s.solution,
    }))
    localStorage.setItem(LS_KEY, JSON.stringify(toSave))
  } catch { /* ストレージ容量超過時は無視する */ }
}
