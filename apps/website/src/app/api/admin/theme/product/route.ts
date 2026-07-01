import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const SETTINGS_KEY = 'theme_product'

const DEFAULT_SETTINGS = {
  showBreadcrumbs: true,
  showSku: true,
  showMaterials: true,
  showDimensions: true,
  galleryWidth: 50,
  layoutGap: 40,
  enableZoom: true,
  buttonText: 'Request Quote',
  columns: 4,
  pageSize: 24,
  gridGap: 36,
  showFilters: true,
  showSort: true,
  showRating: true,
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await query(`SELECT value FROM site_settings WHERE key = $1 LIMIT 1`, [SETTINGS_KEY])
    return NextResponse.json(res.rows[0]?.value || DEFAULT_SETTINGS)
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const settings = { ...DEFAULT_SETTINGS, ...body }
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(settings)]
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
