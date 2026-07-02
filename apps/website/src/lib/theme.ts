/**
 * Theme data layer — fetches homepage sections from the database.
 * Does NOT import into client components. Import lib/theme-types.ts instead.
 */

import { query } from '@/lib/db'
import {
  getMobileLiveThemeSnapshot,
  type StoreThemeSnapshot,
} from '@/lib/store-themes'
import {
  DEFAULT_CUSTOMER_ACCOUNT_THEME,
  normalizeCustomerAccountTheme,
  type CustomerAccountTheme,
} from '@/lib/customer-account-theme'
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

/** Customer account theme, editable from Online Store theme snapshots. */
export async function getCustomerAccountTheme(): Promise<CustomerAccountTheme> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    const accountTheme = (draft as any)?.customerAccountTheme
    if (accountTheme) return normalizeCustomerAccountTheme(accountTheme)
  }

  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'customer_account_theme'`, [])
    return normalizeCustomerAccountTheme(res.rows[0]?.value)
  } catch {
    return DEFAULT_CUSTOMER_ACCOUNT_THEME
  }
}

export function customerAccountThemeCss(theme: CustomerAccountTheme): string {
  const safe = normalizeCustomerAccountTheme(theme)
  const shadow = safe.layout === 'classic' || safe.cardStyle === 'flat' ? 'none' : '0 12px 34px rgba(21, 26, 23, 0.07)'
  const sectionPadding = safe.density === 'compact' ? '16px' : '22px'
  const fieldPadding = safe.density === 'compact' ? '9px 11px' : '11px 13px'
  const gridColumns = safe.navStyle === 'tabs' ? '1fr' : '220px 1fr'
  return `:root{`
    + `--account-surface:${safe.surfaceColor};`
    + `--account-panel:${safe.panelColor};`
    + `--account-text:${safe.textColor};`
    + `--account-muted:${safe.mutedColor};`
    + `--account-accent:${safe.accentColor};`
    + `--account-secondary:${safe.secondaryAccentColor};`
    + `--account-border:${safe.borderColor};`
    + `--account-radius:${safe.radius}px;`
    + `--account-card-shadow:${shadow};`
    + `--account-section-padding:${sectionPadding};`
    + `--account-field-padding:${fieldPadding};`
    + `--account-grid-columns:${gridColumns};`
    + `--account-nav-display:${safe.navStyle === 'tabs' ? 'row' : 'column'};`
    + `--account-nav-position:${safe.navStyle === 'tabs' ? 'static' : 'sticky'};`
    + `--account-welcome-label:"${safe.welcomeLabel.replace(/["\\]/g, '')}";`
    + `}`
    + `.dashboard-shell,.account-page{--debut-text:var(--account-text);--debut-borders:var(--account-border);}`
    + `.dashboard-shell[data-account-layout="classic"],.account-page[data-account-layout="classic"]{--account-card-shadow:none;}`
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
 * Mobile experience settings, edited in the admin Mobile Theme Builder
 * (/admin/theme/mobile → site_settings.theme_mobile). This is the single
 * source of truth — an older, separate "Mobile navigation" control used to
 * live in the Online Store Theme Snapshot editor (store_themes.mobile_live
 * snapshot's settings.mobile_nav_style); that control has been retired in
 * favor of this one so there's no longer two places claiming to set it.
 *
 * `mobileNavStyle`:
 * - 'tabs'  = custom mobile UX: "Modern Interior" welcome hero + quick-action
 *             pills + category chips (MobileHomepageEnhancer) layered above the real
 *             homepage sections, plus the bottom 5-tab bar (Home/Products/RFQ/Account/Menu)
 * - 'debut' = 1:1 clone of homeu.ph's Shopify Debut mobile experience: real homepage
 *             sections only (slideshow, brand text, collection grid, etc. — same
 *             content as the live theme snapshot), hamburger -> drawer nav, no
 *             bottom bar and no synthetic welcome/quick-actions overlay. This is the
 *             default/recommended mode since the site must match homeu.ph's mobile view.
 */
const DEFAULT_MOBILE_THEME = {
  mobileNavStyle: 'debut' as 'tabs' | 'debut',
  showBottomBar: true,
  bottomBarStyle: 'modern' as 'modern' | 'classic',
  showSearch: true,
  heroStyle: 'default' as 'default' | 'minimal',
  quickActionPills: true,
  categoryChips: true,
  stickyHeader: true,
}

export type MobileThemeSettings = typeof DEFAULT_MOBILE_THEME

export async function getMobileThemeSettings(): Promise<MobileThemeSettings> {
  let isPreview = false
  try {
    const { headers } = require('next/headers')
    const h = await headers()
    isPreview = h.get('x-theme-preview') === '1'
  } catch {}

  if (isPreview) {
    const draft = await getPreviewDraft()
    if (draft && (draft as any).mobileTheme && typeof (draft as any).mobileTheme === 'object') {
      return { ...DEFAULT_MOBILE_THEME, ...(draft as any).mobileTheme }
    }
    // Backward-compat: the desktop Theme Editor's own autosave still posts a
    // bare mobileNavStyle string (no full mobileTheme object) to the same
    // shared draft row — honor at least the nav style in that case.
    if (draft && typeof (draft as any).mobileNavStyle === 'string') {
      return { ...DEFAULT_MOBILE_THEME, mobileNavStyle: (draft as any).mobileNavStyle === 'debut' ? 'debut' : 'tabs' }
    }
  }

  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = 'theme_mobile' LIMIT 1`)
    return { ...DEFAULT_MOBILE_THEME, ...(res.rows[0]?.value || {}) }
  } catch {
    return DEFAULT_MOBILE_THEME
  }
}

export async function getMobileNavStyle(): Promise<'tabs' | 'debut'> {
  return (await getMobileThemeSettings()).mobileNavStyle
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
  bodyBg: string
  textColor: string
  mutedColor: string
  borderColor: string
  buttonStyle: string
  buttonUppercase: boolean
  layoutMaxWidth: number
  sectionGap: number
}

function parseThemeValue(key: string, val: any): any {
  if (val == null) return val
  if (['buttonRadius', 'layoutMaxWidth', 'sectionGap'].includes(key)) {
    return Number(val)
  }
  if (key === 'buttonUppercase') {
    return val === 'true' || val === true
  }
  return String(val)
}

/** Fetch the theme palette from site_settings (editable in Theme → Palette). */
export async function getThemePalette(): Promise<ThemePalette> {
  const defaults: ThemePalette = {
    primaryColor: '#1a6d3e',
    secondaryColor: '#151a17',
    accentColor: '#b88935',
    headingFont: 'Crimson Text, Georgia, serif',
    bodyFont: 'Inter, sans-serif',
    buttonRadius: 8,
    bodyBg: '#f7f4ee',
    textColor: '#151a17',
    mutedColor: '#667168',
    borderColor: '#d9e0d7',
    buttonStyle: 'filled',
    buttonUppercase: false,
    layoutMaxWidth: 1200,
    sectionGap: 48,
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
        ;(mobileDefaults as any)[k] = parseThemeValue(k, value)
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
        ;(defaults as any)[k] = parseThemeValue(k, r.value)
      }
    }
  } catch { /* fall through */ }
  return defaults
}

/** Map of theme font-family stacks to their Google Fonts query format. */
export const THEME_FONTS: Record<string, string> = {
  "'Crimson Text', Georgia, serif": 'Crimson+Text:ital,wght@0,400;0,600;1,400',
  "Crimson Text, Georgia, serif": 'Crimson+Text:ital,wght@0,400;0,600;1,400',
  "'Playfair Display', serif": 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400',
  "Playfair Display, serif": 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400',
  "'Inter', sans-serif": 'Inter:wght@400;500;600;700',
  "Inter, sans-serif": 'Inter:wght@400;500;600;700',
  "'Poppins', sans-serif": 'Poppins:wght@400;500;600;700',
  "Poppins, sans-serif": 'Poppins:wght@400;500;600;700',
  "'Montserrat', sans-serif": 'Montserrat:wght@400;500;600;700',
  "Montserrat, sans-serif": 'Montserrat:wght@400;500;600;700',
  "'Cardo', Georgia, serif": 'Cardo:ital,wght@0,400;0,700;1,400',
  "Cardo, Georgia, serif": 'Cardo:ital,wght@0,400;0,700;1,400',
}

/** Get the Google Fonts family query parameter for a given theme font stack. */
export function themeFontGoogleQuery(stack: string): string | null {
  if (!stack) return null
  const key = stack.trim()
  return THEME_FONTS[key] || null
}

