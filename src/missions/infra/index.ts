import { filesystemMissions } from './filesystem'
import { permissionsMissions } from './permissions'
import { textMissions } from './text'
import { processMissions } from './process'
import { shellMissions } from './shell'
import { networkMissions } from './network'
import type { InfraCategory, InfraMission } from './types'

export type { InfraCategory, InfraMission, MissionLocale, ValidationRule } from './types'

// カテゴリ順に全ミッションを結合する。
// 新しいカテゴリを追加するときはここに追記するだけで済むよう集約している。
export const infraMissions: InfraMission[] = [
  ...filesystemMissions,
  ...permissionsMissions,
  ...textMissions,
  ...processMissions,
  ...shellMissions,
  ...networkMissions,
]

// カテゴリ名のリスト（サイドバーのセクション順を制御する）
export const INFRA_CATEGORIES: InfraCategory[] = [
  'filesystem',
  'permissions',
  'text',
  'process',
  'shell',
  'network',
]

export function getMissionsByCategory(category: InfraCategory): InfraMission[] {
  return infraMissions.filter((m) => m.category === category)
}
