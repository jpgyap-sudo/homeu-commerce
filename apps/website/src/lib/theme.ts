/**
 * Theme data layer — fetches homepage sections from the database.
 * Does NOT import into client components. Import lib/theme-types.ts instead.
 */

import { query } from '@/lib/db'
import type { HomepageSection } from '@/lib/theme-types'

export type { SectionType, HomepageSection } from '@/lib/theme-types'
export { SECTION_META, SECTION_TYPES } from '@/lib/theme-types'

const FOOTER_TYPES = ['footer_brand', 'footer_quick_links', 'footer_newsletter', 'footer_social']

/**
 * Fetch homepage BODY sections in display order (enabled only by default).
 * Footer-type sections live in the same table but are excluded here so they
 * render only in the footer, never in the page body.
 */
export async function getPreviewDraft(): Promise<{
  template?: string
  sections?: any[]
  header?: any
  css?: string
  palette?: any
} | null> {
  try {
    const res = await query(`SELECT data FROM "DaVinciOS_kv" WHERE key = 'theme_preview_draft' LIMIT 1`, [])
    return res.rows[0]?.data || null
  } catch {
    return null
  }
}

/**
 * Fetch sections for a specific page template (e.g. 'index', 'product', 'collection')
 * in display order (enabled only by default).
 */
export async function getTemplateSections(template: string, includeDisabled = false): Promise<HomepageSection[]> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    isPreview = headers().get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.template === template && Array.isArray(draft.sections)) {
      return draft.sections
        .filter((s: any) => !FOOTER_TYPES.includes(s.type))
        .filter((s: any) => includeDisabled || s.enabled)
    }
  }

  try {
    const res = await query(
      `SELECT id, type, position, enabled, config
       FROM homepage_sections
       WHERE template = $1 AND type <> ALL($2::text[]) ${includeDisabled ? '' : 'AND enabled = true'}
       ORDER BY position ASC, id ASC`,
      [template, FOOTER_TYPES]
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

/**
 * Fetch homepage BODY sections in display order (enabled only by default).
 */
export async function getHomepageSections(includeDisabled = false): Promise<HomepageSection[]> {
  return getTemplateSections('index', includeDisabled)
}

/** Fetch footer sections from homepage_sections (filtered by footer types). */
export async function getFooterSections(): Promise<HomepageSection[]> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    isPreview = headers().get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.template === 'index' && Array.isArray(draft.sections)) {
      return draft.sections
        .filter((s: any) => FOOTER_TYPES.includes(s.type))
        .filter((s: any) => s.enabled)
    }
  }

  try {
    const res = await query(
      `SELECT id, type, position, enabled, config
       FROM homepage_sections
       WHERE template = 'index' AND type = ANY($1::text[]) AND enabled = true
       ORDER BY position ASC, id ASC`,
      [FOOTER_TYPES]
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
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    isPreview = headers().get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && typeof draft.css === 'string') {
      return draft.css
    }
  }

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
  fontFamily: string   // CSS font-family stack for the header
  navFontSize: number  // px size of the nav links
  iconsPosition: 'right' | 'left' | 'top-bar'
  layout: 'logo-center' | 'logo-left'
  announcement: { enabled: boolean; text: string; link: string; bgColor: string; textColor: string }
}

const DEFAULT_HEADER: HeaderSettings = {
  logoUrl: '', logoMaxWidth: 200, bgColor: '#ffffff', textColor: '#3a3a3a', sticky: true,
  fontFamily: '', navFontSize: 13, iconsPosition: 'right', layout: 'logo-center',
  announcement: { enabled: false, text: '', link: '', bgColor: '#151a17', textColor: '#ffffff' },
}

/**
 * Curated header fonts. `google` is the Google-Fonts family query (added as a
 * <link> on the storefront when chosen); blank google = system/web-safe.
 */
export const HEADER_FONTS: { label: string; stack: string; google?: string }[] = [
  { label: 'Default (theme)', stack: '' },
  { label: 'Inter', stack: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700' },
  { label: 'Playfair Display', stack: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;500;600;700' },
  { label: 'Poppins', stack: "'Poppins', sans-serif", google: 'Poppins:wght@400;500;600;700' },
  { label: 'Montserrat', stack: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;500;600;700' },
  { label: 'Cormorant Garamond', stack: "'Cormorant Garamond', serif", google: 'Cormorant+Garamond:wght@400;500;600;700' },
  { label: 'Georgia (web-safe)', stack: 'Georgia, serif' },
  { label: 'Helvetica (web-safe)', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
]

/** Google Fonts query for a chosen header font stack, or null. */
export function headerFontGoogleQuery(stack: string): string | null {
  return HEADER_FONTS.find(f => f.stack === stack)?.google || null
}

/** Header appearance settings, editable in Theme → Header. */
export async function getHeaderSettings(): Promise<HeaderSettings> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    isPreview = headers().get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.header) {
      return { ...DEFAULT_HEADER, ...draft.header }
    }
  }

  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'header_settings'`, [])
    const v = res.rows[0]?.value
    if (v && typeof v === 'object') return { ...DEFAULT_HEADER, ...v }
  } catch { /* fall through */ }
  return DEFAULT_HEADER
}

export interface ThemePalette {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headingFont: string
  bodyFont: string
  buttonRadius: number
}

/** Fetch the theme palette from site_settings (editable in Theme → Palette). */
export async function getThemePalette(): Promise<ThemePalette> {
  const defaults: ThemePalette = {
    primaryColor: '#1a6d3e',
    secondaryColor: '#d4a853',
    accentColor: '#151a17',
    headingFont: 'Playfair Display, serif',
    bodyFont: 'Inter, sans-serif',
    buttonRadius: 6,
  }

  let isPreview = false
  try {
    const { headers } = require('next/headers')
    isPreview = headers().get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.palette) {
      return { ...defaults, ...draft.palette }
    }
  }

  try {
    const res = await query(
      `SELECT key, value FROM site_settings WHERE key LIKE 'theme_%'`,
      []
    )
    for (const r of res.rows) {
      const k = r.key.replace('theme_', '')
      if (k in defaults && r.value != null) {
        ;(defaults as any)[k] = k === 'buttonRadius' ? Number(r.value) : String(r.value)
      }
    }
  } catch { /* fall through */ }
  return defaults
}
