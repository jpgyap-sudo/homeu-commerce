/**
 * GET /api/navigation        — both menus (public)
 * PUT /api/navigation        — save a menu { menu: 'main'|'footer', items: NavItem[] } (auth)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getMainNav, getFooterNav } from '@/lib/navigation'

export async function GET() {
  try {
    const [main, footer] = await Promise.all([getMainNav(), getFooterNav()])
    return NextResponse.json({ main, footer })
  } catch (err) {
    console.error('[api/navigation] GET error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { menu, items } = await request.json()
    if (menu !== 'main' && menu !== 'footer') {
      return NextResponse.json({ error: 'menu must be main|footer' }, { status: 400 })
    }
    if (!Array.isArray(items)) return NextResponse.json({ error: 'items array required' }, { status: 400 })

    const key = menu === 'main' ? 'nav_main' : 'nav_footer'
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [key, JSON.stringify(items)]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/navigation] PUT error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
