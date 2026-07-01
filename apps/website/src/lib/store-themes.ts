import { query, transaction } from '@/lib/db'
import { normalizeCustomerAccountTheme } from '@/lib/customer-account-theme'
import { SECTION_TYPES } from '@/lib/theme-types'

export const THEME_SETTING_KEYS = [
  'custom_css',
  'header_settings',
  'theme_primaryColor',
  'theme_secondaryColor',
  'theme_accentColor',
  'theme_headingFont',
  'theme_bodyFont',
  'theme_buttonRadius',
  'customer_account_theme',
  'favicon',
  'nav_main',
  'nav_footer',
] as const

export interface StoreThemeSnapshot {
  capturedAt: string
  sections: Array<{
    type: string
    position: number
    enabled: boolean
    config: Record<string, any>
    template: string
  }>
  settings: Record<string, any>
}

export interface StoreTheme {
  id: number
  name: string
  role: 'live' | 'mobile_live' | 'unpublished'
  device_scope: 'desktop' | 'mobile'
  version: string
  source_theme_id: number | null
  snapshot: StoreThemeSnapshot
  performance_metrics: Record<string, any>
  notes: string | null
  is_system: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  duplicated_at: string | null
}

function assertSnapshot(input: any): StoreThemeSnapshot {
  if (!input || typeof input !== 'object') throw new Error('Theme snapshot is required')
  if (!Array.isArray(input.sections)) throw new Error('Theme snapshot sections are required')

  const sections = input.sections.map((section: any, index: number) => {
    if (!section || typeof section !== 'object') throw new Error(`Section ${index + 1} is invalid`)
    if (typeof section.type !== 'string' || !section.type.trim()) throw new Error(`Section ${index + 1} is missing a type`)
    if (!SECTION_TYPES.includes(section.type.trim() as any)) throw new Error(`Section ${index + 1}: unknown type "${section.type}"`)
    const position = Number(section.position)
    return {
      type: section.type.trim(),
      position: Number.isFinite(position) ? position : (index + 1) * 10,
      enabled: section.enabled !== false,
      config: section.config && typeof section.config === 'object' && !Array.isArray(section.config) ? section.config : {},
      template: typeof section.template === 'string' && section.template.trim() ? section.template.trim() : 'index',
    }
  })

  const settings = input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings)
    ? input.settings
    : {}

  return {
    capturedAt: typeof input.capturedAt === 'string' ? input.capturedAt : new Date().toISOString(),
    sections,
    settings: {
      ...settings,
      customer_account_theme: normalizeCustomerAccountTheme(settings.customer_account_theme),
    },
  }
}

function normalizeTheme(row: any): StoreTheme {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    published_at: row.published_at instanceof Date ? row.published_at.toISOString() : row.published_at,
    duplicated_at: row.duplicated_at instanceof Date ? row.duplicated_at.toISOString() : row.duplicated_at,
    device_scope: row.device_scope || 'desktop',
    performance_metrics: row.performance_metrics || {},
  } as StoreTheme
}

export async function captureCurrentThemeSnapshot(): Promise<StoreThemeSnapshot> {
  const [sectionsRes, settingsRes] = await Promise.all([
    query(
      `SELECT type, position, enabled, config, template
       FROM homepage_sections
       ORDER BY template ASC, position ASC, id ASC`,
      []
    ),
    query(`SELECT key, value FROM site_settings WHERE key = ANY($1)`, [[...THEME_SETTING_KEYS]]),
  ])

  const settings: Record<string, any> = {}
  for (const row of settingsRes.rows) settings[row.key] = row.value
  settings.customer_account_theme = normalizeCustomerAccountTheme(settings.customer_account_theme)

  return {
    capturedAt: new Date().toISOString(),
    sections: sectionsRes.rows.map((row: any) => ({
      type: row.type,
      position: Number(row.position || 0),
      enabled: Boolean(row.enabled),
      config: row.config || {},
      template: row.template || 'index',
    })),
    settings,
  }
}

export async function ensureStoreThemes(): Promise<void> {
  const existing = await query(`SELECT id FROM store_themes LIMIT 1`, []).catch(() => ({ rows: [] as any[] }))
  if (existing.rows.length > 0) return

  const snapshot = await captureCurrentThemeSnapshot()
  await query(
    `INSERT INTO store_themes (name, role, device_scope, version, snapshot, notes, is_system, published_at)
     VALUES ($1, 'live', 'desktop', '1.0.0', $2::jsonb, $3, true, NOW())`,
    ['Current HomeU Theme', JSON.stringify(snapshot), 'Initial live theme captured from the current storefront.']
  )
}

export async function ensureMobileLiveTheme(): Promise<void> {
  await ensureStoreThemes()
  const existing = await query(`SELECT id FROM store_themes WHERE role = 'mobile_live' LIMIT 1`, [])
  if (existing.rows.length > 0) return

  const live = await query(`SELECT id, snapshot, version, performance_metrics FROM store_themes WHERE role = 'live' ORDER BY id DESC LIMIT 1`, [])
  const snapshot = live.rows[0]?.snapshot || await captureCurrentThemeSnapshot()
  await query(
    `INSERT INTO store_themes (name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system, published_at)
     VALUES ($1, 'mobile_live', 'mobile', $2, $3, $4::jsonb, $5::jsonb, $6, true, NOW())`,
    [
      'Current live mobile theme',
      live.rows[0]?.version || '1.0.0',
      live.rows[0]?.id || null,
      JSON.stringify(snapshot),
      JSON.stringify(live.rows[0]?.performance_metrics || {}),
      'Active mobile storefront theme, initially copied from the desktop live theme.',
    ]
  )
}

export async function syncLiveStoreThemeSnapshot(): Promise<void> {
  const live = await query(`SELECT id FROM store_themes WHERE role = 'live' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1`, [])
  if (!live.rows[0]?.id) return

  const snapshot = await captureCurrentThemeSnapshot()
  await query(
    `UPDATE store_themes SET snapshot = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(snapshot), live.rows[0].id]
  )
}

export async function listStoreThemes(): Promise<StoreTheme[]> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  await syncLiveStoreThemeSnapshot()

  const res = await query(
    `SELECT id, name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system,
            created_at, updated_at, published_at, duplicated_at
     FROM store_themes
     ORDER BY CASE WHEN role = 'live' THEN 0 WHEN role = 'mobile_live' THEN 1 ELSE 2 END,
              CASE WHEN device_scope = 'desktop' THEN 0 ELSE 1 END,
              updated_at DESC,
              id DESC`,
    []
  )
  return res.rows.map(normalizeTheme)
}

export async function duplicateStoreTheme(id: number, name?: string): Promise<StoreTheme> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  const sourceRes = await query(`SELECT * FROM store_themes WHERE id = $1`, [id])
  const source = sourceRes.rows[0]
  if (!source) throw new Error('Theme not found')

  const duplicateName = name?.trim() || `${source.name} backup`
  const res = await query(
    `INSERT INTO store_themes (name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, duplicated_at)
     VALUES ($1, 'unpublished', $2, $3, $4, $5::jsonb, $6::jsonb, $7, NOW())
     RETURNING id, name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system,
               created_at, updated_at, published_at, duplicated_at`,
    [
      duplicateName,
      source.device_scope || 'desktop',
      source.version || '1.0.0',
      source.id,
      JSON.stringify(source.snapshot || {}),
      JSON.stringify(source.performance_metrics || {}),
      `Duplicated from ${source.name}.`,
    ]
  )
  return normalizeTheme(res.rows[0])
}

export async function createStoreTheme(
  name?: string,
  deviceScope: 'desktop' | 'mobile' = 'desktop'
): Promise<StoreTheme> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  const snapshot = await captureCurrentThemeSnapshot()
  const defaultName = deviceScope === 'mobile' ? 'Mobile theme draft' : 'New theme draft'

  const res = await query(
    `INSERT INTO store_themes (name, role, device_scope, version, snapshot, notes)
     VALUES ($1, 'unpublished', $2, '1.0.0', $3::jsonb, $4)
     RETURNING id, name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system,
               created_at, updated_at, published_at, duplicated_at`,
    [
      name?.trim() || defaultName,
      deviceScope,
      JSON.stringify(snapshot),
      deviceScope === 'mobile'
        ? 'Mobile-scoped draft. Use the mobile customizer before publishing desktop changes.'
        : 'Draft captured from the current live storefront.',
    ]
  )
  return normalizeTheme(res.rows[0])
}

export async function importStoreTheme(payload: any): Promise<StoreTheme> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()

  const incoming = payload?.theme && typeof payload.theme === 'object' ? payload.theme : payload
  const snapshot = assertSnapshot(incoming?.snapshot || incoming)
  const rawScope = incoming?.device_scope || incoming?.deviceScope || payload?.deviceScope
  const deviceScope: 'desktop' | 'mobile' = rawScope === 'mobile' ? 'mobile' : 'desktop'
  const name = String(payload?.name || incoming?.name || (deviceScope === 'mobile' ? 'Imported mobile theme' : 'Imported theme')).trim()
  const version = String(incoming?.version || '1.0.0').trim() || '1.0.0'

  const res = await query(
    `INSERT INTO store_themes (name, role, device_scope, version, snapshot, performance_metrics, notes)
     VALUES ($1, 'unpublished', $2, $3, $4::jsonb, $5::jsonb, $6)
     RETURNING id, name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system,
               created_at, updated_at, published_at, duplicated_at`,
    [
      name,
      deviceScope,
      version,
      JSON.stringify(snapshot),
      JSON.stringify(incoming?.performance_metrics || {}),
      'Imported from Online Store theme JSON.',
    ]
  )
  return normalizeTheme(res.rows[0])
}

export async function renameStoreTheme(id: number, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Theme name is required')
  const res = await query(
    `UPDATE store_themes SET name = $1, updated_at = NOW() WHERE id = $2`,
    [trimmed, id]
  )
  if (res.rowCount === 0) throw new Error('Theme not found')
}

export async function deleteStoreTheme(id: number): Promise<void> {
  const res = await query(
    `DELETE FROM store_themes WHERE id = $1 AND role NOT IN ('live', 'mobile_live')`,
    [id]
  )
  if (res.rowCount === 0) throw new Error('Only unpublished themes can be deleted')
}

export async function publishStoreTheme(id: number): Promise<void> {
  await ensureStoreThemes()
  const themeRes = await query(`SELECT id, snapshot, device_scope FROM store_themes WHERE id = $1`, [id])
  const theme = themeRes.rows[0]
  if (!theme) throw new Error('Theme not found')
  if ((theme.device_scope || 'desktop') !== 'desktop') {
    throw new Error('Mobile themes are saved as independent drafts and cannot replace the desktop live theme yet')
  }

  const snapshot = theme.snapshot as StoreThemeSnapshot
  if (!snapshot || !Array.isArray(snapshot.sections)) throw new Error('Theme snapshot is invalid')

  await transaction(async (client) => {
    await client.query(`DELETE FROM homepage_sections`, [])
    for (const section of snapshot.sections) {
      await client.query(
        `INSERT INTO homepage_sections (type, position, enabled, config, template)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [
          section.type,
          section.position,
          section.enabled,
          JSON.stringify(section.config || {}),
          section.template || 'index',
        ]
      )
    }

    for (const key of THEME_SETTING_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(snapshot.settings || {}, key)) continue
      await client.query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify((snapshot.settings || {})[key])]
      )
    }

    await client.query(`UPDATE store_themes SET role = 'unpublished' WHERE role = 'live'`, [])
    await client.query(
      `UPDATE store_themes
       SET role = 'live', published_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
  })
}

export async function publishMobileStoreTheme(id: number): Promise<void> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  const themeRes = await query(`SELECT id, snapshot, device_scope FROM store_themes WHERE id = $1`, [id])
  const theme = themeRes.rows[0]
  if (!theme) throw new Error('Theme not found')
  if ((theme.device_scope || 'desktop') !== 'mobile') throw new Error('Only mobile themes can replace the live mobile theme')
  const snapshot = assertSnapshot(theme.snapshot)

  await transaction(async (client) => {
    await client.query(`UPDATE store_themes SET role = 'unpublished' WHERE role = 'mobile_live'`, [])
    await client.query(
      `UPDATE store_themes
       SET role = 'mobile_live', device_scope = 'mobile', snapshot = $1::jsonb, published_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(snapshot), id]
    )
  })
}

export async function getStoreThemeById(id: number): Promise<StoreTheme | null> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  const res = await query(
    `SELECT id, name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system,
            created_at, updated_at, published_at, duplicated_at
     FROM store_themes WHERE id = $1 LIMIT 1`,
    [id]
  )
  return res.rows[0] ? normalizeTheme(res.rows[0]) : null
}

export async function updateStoreThemeSnapshot(
  id: number,
  patch: { name?: string; snapshot?: any; performanceMetrics?: Record<string, any> }
): Promise<StoreTheme> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  const current = await getStoreThemeById(id)
  if (!current) throw new Error('Theme not found')
  const nextName = patch.name !== undefined ? String(patch.name).trim() : current.name
  if (!nextName) throw new Error('Theme name is required')
  const snapshot = patch.snapshot !== undefined ? assertSnapshot(patch.snapshot) : current.snapshot
  const performanceMetrics = patch.performanceMetrics !== undefined ? patch.performanceMetrics : current.performance_metrics

  const res = await query(
    `UPDATE store_themes
     SET name = $1, snapshot = $2::jsonb, performance_metrics = $3::jsonb, updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, role, device_scope, version, source_theme_id, snapshot, performance_metrics, notes, is_system,
               created_at, updated_at, published_at, duplicated_at`,
    [nextName, JSON.stringify(snapshot), JSON.stringify(performanceMetrics || {}), id]
  )
  return normalizeTheme(res.rows[0])
}

// Moved to lib/theme-diff.ts (pure, no `pg`/db import) so client components can
// import it without pulling the database client into the browser bundle.
export type { ThemeDiffEntry } from '@/lib/theme-diff'
export { computeThemeDiff } from '@/lib/theme-diff'

export async function getMobileLiveThemeSnapshot(): Promise<StoreThemeSnapshot | null> {
  await ensureStoreThemes()
  await ensureMobileLiveTheme()
  const res = await query(`SELECT snapshot FROM store_themes WHERE role = 'mobile_live' LIMIT 1`, [])
  return res.rows[0]?.snapshot || null
}
