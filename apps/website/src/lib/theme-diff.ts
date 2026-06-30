/**
 * Pure diff helper for comparing two theme snapshots — safe for client
 * components. No database imports here (unlike store-themes.ts, which
 * pulls in `pg` via lib/db and breaks client bundling if imported by value).
 */
import type { StoreThemeSnapshot } from '@/lib/store-themes'

export interface ThemeDiffEntry {
  type: 'added' | 'removed' | 'changed'
  sectionType: string
  template: string
  detail: string
}

export function computeThemeDiff(live: StoreThemeSnapshot, draft: StoreThemeSnapshot): ThemeDiffEntry[] {
  const diff: ThemeDiffEntry[] = []
  const liveMap = new Map(live.sections.map((s, i) => [`${s.template || 'index'}-${s.type}-${i}`, s]))
  const draftMap = new Map<string, typeof draft.sections[number]>()

  draft.sections.forEach((s, i) => {
    const key = `${s.template || 'index'}-${s.type}-${i}`
    draftMap.set(key, s)
  })

  // Find removed and changed
  for (const [key, liveSec] of liveMap) {
    const draftSec = draftMap.get(key)
    if (!draftSec) {
      diff.push({ type: 'removed', sectionType: liveSec.type, template: liveSec.template || 'index', detail: `Position ${liveSec.position}` })
    } else if (JSON.stringify(liveSec.config) !== JSON.stringify(draftSec.config)) {
      diff.push({ type: 'changed', sectionType: liveSec.type, template: liveSec.template || 'index', detail: 'Config modified' })
    }
  }

  // Find added
  for (const [key, draftSec] of draftMap) {
    if (!liveMap.has(key)) {
      diff.push({ type: 'added', sectionType: draftSec.type, template: draftSec.template || 'index', detail: `Position ${draftSec.position}` })
    }
  }

  return diff
}
