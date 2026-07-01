import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const SETTINGS_KEY = 'theme_quotation'

const DEFAULT_SETTINGS = {
  template: 'modern',
  brandColor: '#1a6d3e',
  accentColor: '#b88935',
  fontFamily: 'Inter, sans-serif',
  headerLogo: '',
  showHeaderLogo: true,
  showCompanyName: true,
  showAddress: true,
  showTerms: true,
  termsText: 'This quotation is valid for 15 days from the date of issue. Prices are subject to change without prior notice.',
  footerText: 'Thank you for choosing Home Atelier',
  showPageNumbers: true,
  showWatermark: false,
  watermarkText: 'DRAFT',
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
