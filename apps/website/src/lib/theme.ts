/**
 * Theme data layer — fetches homepage sections from the database.
 * Does NOT import into client components. Import lib/theme-types.ts instead.
 */

import { query } from '@/lib/db'
import { getMobileLiveThemeSnapshot, type StoreThemeSnapshot } from '@/lib/store-themes'
import type { HomepageSection } from '@/lib/theme-types'

export type { SectionType, HomepageSection } from '@/lib/theme-types'
export { SECTION_META, SECTION_TYPES } from '@/lib/theme-types'

const FOOTER_TYPES = ['footer_brand', 'footer_quick_links', 'footer_newsletter', 'footer_social']

async function isMobileRequest(): Promise<boolean> {
  try {
    const { headers } = require('next/headers')
    const h = await headers()
    if (h.get('x-theme-preview') === '1') return false
    const ua = String(h.get('user-agent') || '').toLowerCase()
    return /mobile|iphone|android|ipod|blackberry|iemobile|opera mini/.test(ua)
  } catch {
    return false
  }
}

async function getMobileSnapshotIfNeeded(): Promise<StoreThemeSnapshot | null> {
  if (!(await isMobileRequest())) return null
  return getMobileLiveThemeSnapshot().catch(() => null)
}

function sectionsFromSnapshot(snapshot: StoreThemeSnapshot, template: string, includeDisabled = false): HomepageSection[] {
  return (snapshot.sections || [])
    .filter((s: any) => (s.template || 'index') === template)
    .filter((s: any) => includeDisabled || s.enabled !== false)
    .map((s: any, index: number) => ({
      id: index + 1,
      type: s.type,
      position: s.position || (index + 1) * 10,
      enabled: s.enabled !== false,
      config: s.config || {},
    }))
}

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
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.template === template && Array.isArray(draft.sections)) {
      return draft.sections
        .filter((s: any) => !FOOTER_TYPES.includes(s.type))
        .filter((s: any) => includeDisabled || s.enabled)
    }
  }

  const mobileSnapshot = await getMobileSnapshotIfNeeded()
  if (mobileSnapshot) {
    return sectionsFromSnapshot(mobileSnapshot, template, includeDisabled)
      .filter((s: any) => !FOOTER_TYPES.includes(s.type))
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
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.template === 'index' && Array.isArray(draft.sections)) {
      return draft.sections
        .filter((s: any) => FOOTER_TYPES.includes(s.type))
        .filter((s: any) => s.enabled)
    }
  }

  const mobileSnapshot = await getMobileSnapshotIfNeeded()
  if (mobileSnapshot) {
    return sectionsFromSnapshot(mobileSnapshot, 'index', false)
      .filter((s: any) => FOOTER_TYPES.includes(s.type))
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
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && typeof draft.css === 'string') {
      return draft.css
    }
  }

  const mobileSnapshot = await getMobileSnapshotIfNeeded()
  if (mobileSnapshot && typeof mobileSnapshot.settings?.custom_css === 'string') {
    return mobileSnapshot.settings.custom_css
  }

  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'custom_css'`, [])
    const v = res.rows[0]?.value
    return typeof v === 'string' ? v : ''
  } catch {
    return ''
  }
}

/**
 * Fetch the site favicon URL from site_settings (editable via Theme → SEO).
 * Falls back to the hardcoded site-config.json value if not yet set in DB.
 */
export async function getSiteFavicon(): Promise<string> {
  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'favicon'`, [])
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

/**
 * Mobile homepage style, editable per mobile-theme draft in Mobile Theme
 * Studio ("Mobile navigation" select). Only takes effect for actual mobile
 * UAs — desktop visitors are unaffected.
 * - 'tabs'  = today's custom mobile UX: "Modern Interior" welcome hero + quick-action
 *             pills + category chips (MobileHomepageEnhancer) layered above the real
 *             homepage sections, plus the bottom 5-tab bar (Home/Products/RFQ/Account/Menu)
 * - 'debut' = 1:1 clone of homeu.ph's Shopify Debut mobile experience: real homepage
 *             sections only (slideshow, brand text, collection grid, etc. — same
 *             content as the live theme snapshot), hamburger -> drawer nav, no
 *             bottom bar and no synthetic welcome/quick-actions overlay
 */
export async function getMobileNavStyle(): Promise<'tabs' | 'debut'> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && typeof (draft as any).mobileNavStyle === 'string') {
      return (draft as any).mobileNavStyle === 'debut' ? 'debut' : 'tabs'
    }
  }

  const mobileSnapshot = await getMobileSnapshotIfNeeded()
  const value = mobileSnapshot?.settings?.mobile_nav_style
  return value === 'debut' ? 'debut' : 'tabs'
}

/** Header appearance settings, editable in Theme → Header. */
export async function getHeaderSettings(): Promise<HeaderSettings> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.header) {
      return { ...DEFAULT_HEADER, ...draft.header }
    }
  }

  const mobileSnapshot = await getMobileSnapshotIfNeeded()
  if (mobileSnapshot?.settings?.header_settings && typeof mobileSnapshot.settings.header_settings === 'object') {
    return { ...DEFAULT_HEADER, ...mobileSnapshot.settings.header_settings }
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
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && draft.palette) {
      return { ...defaults, ...draft.palette }
    }
  }

  const mobileSnapshot = await getMobileSnapshotIfNeeded()
  if (mobileSnapshot?.settings) {
    const mobileDefaults = { ...defaults }
    for (const [key, value] of Object.entries(mobileSnapshot.settings)) {
      if (!key.startsWith('theme_')) continue
      const k = key.replace('theme_', '')
      if (k in mobileDefaults && value != null) {
        ;(mobileDefaults as any)[k] = k === 'buttonRadius' ? Number(value) : String(value)
      }
    }
    return mobileDefaults
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
