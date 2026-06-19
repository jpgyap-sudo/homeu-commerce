/**
 * GET  /api/theme/sections — all homepage sections (admin, incl. disabled)
 * POST /api/theme/sections — add a section { type, config? }
 * PUT  /api/theme/sections — reorder { order: number[] } (section ids)
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SECTION_TYPES } from '@/lib/theme'

export async function GET() {
  try {
    const res = await query(
      `SELECT id, type, position, enabled, config FROM homepage_sections ORDER BY position ASC, id ASC`,
      []
    )
    return NextResponse.json({ sections: res.rows })
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
    const posRes = await query(`SELECT COALESCE(MAX(position), 0) + 10 AS pos FROM homepage_sections`, [])
    const pos = posRes.rows[0].pos
    const res = await query(
      `INSERT INTO homepage_sections (type, position, enabled, config)
       VALUES ($1, $2, true, $3::jsonb) RETURNING id`,
      [type, pos, JSON.stringify(config || {})]
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
