import { query, transaction } from '@/lib/db'

export const THEME_SETTING_KEYS = [
  'custom_css',
  'header_settings',
  'theme_primaryColor',
  'theme_secondaryColor',
  'theme_accentColor',
  'theme_headingFont',
  'theme_bodyFont',
  'theme_buttonRadius',
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
  role: 'live' | 'unpublished'
  version: string
  source_theme_id: number | null
  snapshot: StoreThemeSnapshot
  notes: string | null
  is_system: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  duplicated_at: string | null
}

function normalizeTheme(row: any): StoreTheme {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    published_at: row.published_at instanceof Date ? row.published_at.toISOString() : row.published_at,
    duplicated_at: row.duplicated_at instanceof Date ? row.duplicated_at.toISOString() : row.duplicated_at,
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
    `INSERT INTO store_themes (name, role, version, snapshot, notes, is_system, published_at)
     VALUES ($1, 'live', '1.0.0', $2::jsonb, $3, true, NOW())`,
    ['Current HomeU Theme', JSON.stringify(snapshot), 'Initial live theme captured from the current storefront.']
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
  await syncLiveStoreThemeSnapshot()

  const res = await query(
    `SELECT id, name, role, version, source_theme_id, snapshot, notes, is_system,
            created_at, updated_at, published_at, duplicated_at
     FROM store_themes
     ORDER BY CASE WHEN role = 'live' THEN 0 ELSE 1 END,
              updated_at DESC,
              id DESC`,
    []
  )
  return res.rows.map(normalizeTheme)
}

export async function duplicateStoreTheme(id: number, name?: string): Promise<StoreTheme> {
  await ensureStoreThemes()
  const sourceRes = await query(`SELECT * FROM store_themes WHERE id = $1`, [id])
  const source = sourceRes.rows[0]
  if (!source) throw new Error('Theme not found')

  const duplicateName = name?.trim() || `${source.name} backup`
  const res = await query(
    `INSERT INTO store_themes (name, role, version, source_theme_id, snapshot, notes, duplicated_at)
     VALUES ($1, 'unpublished', $2, $3, $4::jsonb, $5, NOW())
     RETURNING id, name, role, version, source_theme_id, snapshot, notes, is_system,
               created_at, updated_at, published_at, duplicated_at`,
    [
      duplicateName,
      source.version || '1.0.0',
      source.id,
      JSON.stringify(source.snapshot || {}),
      `Duplicated from ${source.name}.`,
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
    `DELETE FROM store_themes WHERE id = $1 AND role <> 'live'`,
    [id]
  )
  if (res.rowCount === 0) throw new Error('Only unpublished themes can be deleted')
}

export async function publishStoreTheme(id: number): Promise<void> {
  await ensureStoreThemes()
  const themeRes = await query(`SELECT id, snapshot FROM store_themes WHERE id = $1`, [id])
  const theme = themeRes.rows[0]
  if (!theme) throw new Error('Theme not found')

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
