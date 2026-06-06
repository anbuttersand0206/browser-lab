// 学習進捗レポートをMarkdownテキストとして生成し、ファイルダウンロードするユーティリティ。
// localStorage から各コースの進捗を読み取るため、Reactコンポーネント外でも呼び出せる。

import { infraMissions, INFRA_CATEGORIES } from '../missions/infra'
import { programmingScenarios } from '../scenarios/programming'
import { databaseScenarios } from '../scenarios/database'
import type { Locale } from '../i18n'

// インフラコース: クリア済みミッションIDのセット
const INFRA_CLEARED_KEY = 'browser-lab:infra:cleared'
// プログラミング・DBコース: "course:scenarioId" 形式の配列
const COMPLETED_KEY = 'browser-lab:completed'

// カテゴリの表示名（i18nに依存せず自己完結させるため、両言語を持つ）
const CATEGORY_LABELS: Record<string, { ja: string; en: string }> = {
  filesystem:  { ja: 'ファイルシステム', en: 'Filesystem' },
  permissions: { ja: 'パーミッション',   en: 'Permissions' },
  text:        { ja: 'テキスト処理',     en: 'Text Processing' },
  process:     { ja: 'プロセス管理',     en: 'Process Management' },
  shell:       { ja: 'シェルスクリプト', en: 'Shell Scripting' },
  network:     { ja: 'ネットワーク',     en: 'Network' },
}

function loadInfraClearedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(INFRA_CLEARED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function loadCompletedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

// Markdown チェックボックス記号を返す（完了→チェック済み、未完了→空白）
function checkbox(done: boolean): string {
  return done ? '- [x]' : '- [ ]'
}

// 現在日時を "YYYY-MM-DD HH:MM" 形式の文字列に変換する
function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 学習進捗の Markdown レポートを生成する。
 *
 * @param locale - 'ja' | 'en'（レポートの言語）
 * @returns Markdown 文字列
 */
export function generateProgressReport(locale: Locale): string {
  const clearedIds = loadInfraClearedIds()
  const completedSet = loadCompletedSet()
  const now = formatDateTime(new Date())

  const isProgCompleted  = (id: string) => completedSet.has(`programming:${id}`)
  const isDbCompleted    = (id: string) => completedSet.has(`database:${id}`)

  // ─ 集計 ─
  const infraTotal   = infraMissions.length
  const infraCleared = infraMissions.filter((m) => clearedIds.has(m.id)).length
  const progTotal    = programmingScenarios.length
  const progDone     = programmingScenarios.filter((s) => isProgCompleted(s.id)).length
  const dbTotal      = databaseScenarios.length
  const dbDone       = databaseScenarios.filter((s) => isDbCompleted(s.id)).length

  if (locale === 'ja') {
    const lines: string[] = [
      '# Browser Lab 学習レポート',
      '',
      `生成日時: ${now}`,
      '',
      '---',
      '',
      '## 進捗サマリー',
      '',
      `| コース | 進捗 |`,
      `|--------|------|`,
      `| インフラ学習コース | ${infraCleared} / ${infraTotal} ミッション |`,
      `| プログラミングコース | ${progDone} / ${progTotal} シナリオ |`,
      `| DB 学習コース | ${dbDone} / ${dbTotal} シナリオ |`,
      '',
      '---',
      '',
      '## インフラ学習コース',
      '',
    ]

    for (const category of INFRA_CATEGORIES) {
      const label = CATEGORY_LABELS[category]?.ja ?? category
      const missions = infraMissions.filter((m) => m.category === category)
      lines.push(`### ${label}`)
      lines.push('')
      for (const m of missions) {
        const title = m.locale.ja.title
        lines.push(`${checkbox(clearedIds.has(m.id))} ${title}`)
      }
      lines.push('')
    }

    lines.push('---', '', '## プログラミングコース', '')
    for (const s of programmingScenarios) {
      lines.push(`${checkbox(isProgCompleted(s.id))} ${s.title}`)
    }

    lines.push('', '---', '', '## DB 学習コース', '')
    for (const s of databaseScenarios) {
      lines.push(`${checkbox(isDbCompleted(s.id))} ${s.title}`)
    }

    lines.push('', '---', '', '_Browser Lab で生成_')
    return lines.join('\n')
  }

  // 英語レポート
  const lines: string[] = [
    '# Browser Lab Progress Report',
    '',
    `Generated: ${now}`,
    '',
    '---',
    '',
    '## Summary',
    '',
    `| Course | Progress |`,
    `|--------|----------|`,
    `| Infra Learning | ${infraCleared} / ${infraTotal} missions |`,
    `| Programming | ${progDone} / ${progTotal} scenarios |`,
    `| Database | ${dbDone} / ${dbTotal} scenarios |`,
    '',
    '---',
    '',
    '## Infra Learning Course',
    '',
  ]

  for (const category of INFRA_CATEGORIES) {
    const label = CATEGORY_LABELS[category]?.en ?? category
    const missions = infraMissions.filter((m) => m.category === category)
    lines.push(`### ${label}`)
    lines.push('')
    for (const m of missions) {
      const title = m.locale.en.title
      lines.push(`${checkbox(clearedIds.has(m.id))} ${title}`)
    }
    lines.push('')
  }

  lines.push('---', '', '## Programming Course', '')
  for (const s of programmingScenarios) {
    lines.push(`${checkbox(isProgCompleted(s.id))} ${s.title}`)
  }

  lines.push('', '---', '', '## Database Course', '')
  for (const s of databaseScenarios) {
    lines.push(`${checkbox(isDbCompleted(s.id))} ${s.title}`)
  }

  lines.push('', '---', '', '_Generated by Browser Lab_')
  return lines.join('\n')
}

/**
 * Markdown テキストを .md ファイルとしてダウンロードする。
 * <a download> を一時的に DOM に追加してクリックし、即座に削除する。
 */
export function downloadMarkdownReport(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  // DOM に追加せずクリックすると Firefox で動作しない環境があるため一時追加する
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
