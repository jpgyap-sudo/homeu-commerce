/**
 * GET  /api/theme/sections — all homepage sections (admin, incl. disabled)
 * POST /api/theme/sections — add a section { type, config? }
 * PUT  /api/theme/sections — reorder { order: number[] } (section ids)
 *
 * Uses mergeWithDefaults from theme-builder-settings so every new section
 * always has a complete config with all default keys.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SECTION_TYPES } from '@/lib/theme'
import { mergeWithDefaults } from '@/lib/theme-builder-settings'

export async function GET() {
  try {
    const res = await query(
      `SELECT id, type, position, enabled, config FROM homepage_sections ORDER BY position ASC, id ASC`,
      []
    )
    // Return sections with merged defaults so the admin always sees all fields
    const sections = res.rows.map((r: any) => ({
      ...r,
      config: mergeWithDefaults(r.type, r.config || {}),
    }))
    return NextResponse.json({ sections })
  } catch (err) {
    console.error('[api/theme/sections] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { type, config } = await request.json()
    if (!SECTION_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid section type' }, { status: 400 })
    }
    // Merge the incoming config with full defaults
    const fullConfig = mergeWithDefaults(type, config || {})
    const posRes = await query(`SELECT COALESCE(MAX(position), 0) + 10 AS pos FROM homepage_sections`, [])
    const pos = posRes.rows[0].pos
    const res = await query(
      `INSERT INTO homepage_sections (type, position, enabled, config)
       VALUES ($1, $2, true, $3::jsonb) RETURNING id`,
      [type, pos, JSON.stringify(fullConfig)]
    )
    return NextResponse.json({ id: res.rows[0].id }, { status: 201 })
  } catch (err) {
    console.error('[api/theme/sections] POST error:', err)
    return NextResponse.json({ error: 'Failed to add section' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { order } = await request.json()
    if (!Array.isArray(order)) return NextResponse.json({ error: 'order array required' }, { status: 400 })
    for (let i = 0; i < order.length; i++) {
      await query(`UPDATE homepage_sections SET position = $1, updated_at = NOW() WHERE id = $2`, [(i + 1) * 10, order[i]])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/theme/sections] PUT error:', err)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}
