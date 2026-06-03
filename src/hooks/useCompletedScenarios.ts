import { useState } from 'react'

// "course:scenarioId" 形式の文字列の配列として保存する。
// Set のまま JSON.stringify すると [] になるため配列に変換してから保存する。
const LS_KEY = 'browser-lab:completed'

// コース識別子の union 型。将来コースが増えたときも型レベルで管理できるようにする。
export type CourseId = 'programming' | 'database'

function loadCompletedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    // JSON 破損時は空セットで起動する
    return new Set()
  }
}

function saveCompletedSet(set: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...set]))
  } catch {
    // LocalStorage 容量超過等は無視する（完了マークはUI の補助情報に過ぎないため）
  }
}

// シナリオの完了状態を LocalStorage に永続化するフック。
// 模範解答を表示したシナリオを「完了済み」としてマークし、
// サイドバーでチェックマークを表示するために使う。
export function useCompletedScenarios() {
  const [completedSet, setCompletedSet] = useState<Set<string>>(loadCompletedSet)

  // コース + シナリオ ID を "course:scenarioId" 形式で一元管理する。
  // 両コースを同一キーで扱うことで、コース追加時のコードの変更を最小化する。
  const buildKey = (course: CourseId, scenarioId: string) => `${course}:${scenarioId}`

  const markCompleted = (course: CourseId, scenarioId: string) => {
    const key = buildKey(course, scenarioId)
    // 既に完了済みなら LocalStorage 書き込みを省略する
    if (completedSet.has(key)) return
    const nextSet = new Set(completedSet)
    nextSet.add(key)
    setCompletedSet(nextSet)
    saveCompletedSet(nextSet)
  }

  const isCompleted = (course: CourseId, scenarioId: string): boolean =>
    completedSet.has(buildKey(course, scenarioId))

  return { markCompleted, isCompleted }
}
