// InfraミッションのTypeScriptドメイン型定義
// union型でバリデーションルールの不正状態を型レベルで防ぐ（Make Illegal States Unrepresentable）

export type InfraCategory = 'filesystem' | 'permissions' | 'text' | 'process' | 'shell' | 'network'

export interface MissionLocale {
  title: string
  description: string
  background: string
  hints: readonly string[]
  answer: string
  commands: ReadonlyArray<{ cmd: string; desc: string }>
}

// バリデーション条件の判別共用体。typeフィールドで分岐するため、
// 各caseで必要なフィールドだけが存在することをコンパイル時に保証できる。
export type ValidationRule =
  | { type: 'file_exists';    target: string }
  | { type: 'dir_exists';     target: string }
  | { type: 'file_content';   target: string; expected: string }
  | { type: 'permission';     target: string; expected: string }  // 8進数文字列 e.g. "755"
  | { type: 'symlink_exists'; target: string }
  | { type: 'command_output'; cmd: string;    expected: string }

export interface InfraMission {
  id: string
  category: InfraCategory
  locale: { ja: MissionLocale; en: MissionLocale }
  // ミッション開始時にwc.fs APIで作成するファイル群（path→contents）
  setupFiles?: Record<string, string>
  // ミッション開始時に作成するディレクトリ群（recursive: true）
  setupDirs?: string[]
  validation: ValidationRule
}
