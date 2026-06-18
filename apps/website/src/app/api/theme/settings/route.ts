/**
 * GET /api/theme/settings — returns theme-level settings (custom_css, …)
 * PUT /api/theme/settings — save { key, value } into site_settings (auth)
 *
 * Used by the Theme editor's "custom CSS" code panel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

const ALLOWED = new Set(['custom_css'])

export async function GET() {
  try {
    const res = await query(`SELECT key, value FROM site_settings WHERE key = ANY($1)`, [[...ALLOWED]])
    const out: Record<string, any> = {}
    for (const r of res.rows) out[r.key] = r.value
    return NextResponse.json({ settings: out })
  } catch (err) {
    console.error('[api/theme/settings] GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { key, value } = await request.json()
    if (!ALLOWED.has(key)) return NextResponse.json({ error: 'Unknown setting' }, { status: 400 })
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/theme/settings] PUT error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
