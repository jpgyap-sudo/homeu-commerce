/**
 * Theme data layer — fetches homepage sections from the database.
 * Does NOT import into client components. Import lib/theme-types.ts instead.
 */

import { query } from '@/lib/db'
import type { HomepageSection } from '@/lib/theme-types'

export type { SectionType, HomepageSection } from '@/lib/theme-types'
export { SECTION_META, SECTION_TYPES } from '@/lib/theme-types'

/** Fetch all homepage sections in display order (enabled only by default). */
export async function getHomepageSections(includeDisabled = false): Promise<HomepageSection[]> {
  try {
    const res = await query(
      `SELECT id, type, position, enabled, config
       FROM homepage_sections
       ${includeDisabled ? '' : 'WHERE enabled = true'}
       ORDER BY position ASC, id ASC`,
      []
    )
    return res.rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      position: r.position,
      enabled: r.enabled,
      config: r.config || {},
    }))
  } catch {
    return []
  }
}

/** Custom CSS the admin can edit in the Theme editor (injected into <head>). */
export async function getCustomCss(): Promise<string> {
  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'custom_css'`, [])
    const v = res.rows[0]?.value
    return typeof v === 'string' ? v : ''
  } catch {
    return ''
  }
}

export interface HeaderSettings {
  logoUrl: string
  logoMaxWidth: number
  bgColor: string
  textColor: string
  sticky: boolean
}

const DEFAULT_HEADER: HeaderSettings = {
  logoUrl: '', logoMaxWidth: 200, bgColor: '#ffffff', textColor: '#3a3a3a', sticky: true,
}

/** Header appearance settings, editable in Theme → Header. */
export async function getHeaderSettings(): Promise<HeaderSettings> {
  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'header_settings'`, [])
    const v = res.rows[0]?.value
    if (v && typeof v === 'object') return { ...DEFAULT_HEADER, ...v }
  } catch { /* fall through */ }
  return DEFAULT_HEADER
}
