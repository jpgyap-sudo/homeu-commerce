/**
 * PATCH  /api/theme/sections/[id] — update { config?, enabled? }
 * DELETE /api/theme/sections/[id] — remove a section
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await request.json()

    const fields: string[] = []
    const values: any[] = []
    let i = 0
    if (body.config !== undefined) { i++; fields.push(`config = $${i}::jsonb`); values.push(JSON.stringify(body.config)) }
    if (body.enabled !== undefined) { i++; fields.push(`enabled = $${i}`); values.push(!!body.enabled) }
    if (fields.length === 0) return NextResponse.json({ ok: true })

    i++
    await query(`UPDATE homepage_sections SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`, [...values, id])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/theme/sections/[id]] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await query(`DELETE FROM homepage_sections WHERE id = $1`, [id])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/theme/sections/[id]] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 })
  }
}
