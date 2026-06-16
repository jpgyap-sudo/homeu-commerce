/**
 * GET /api/pages/[id]    — Single page detail
 * PATCH /api/pages/[id]  — Update page
 * DELETE /api/pages/[id] — Delete page
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await query(
      'SELECT * FROM pages WHERE id = $1 LIMIT 1',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[api/pages/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
  }
}

// ── PATCH ────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const allowedFields = new Set([
      'title', 'slug', 'content', 'status', 'seo_title', 'seo_description',
    ])

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 0

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.has(key)) {
        idx++
        setClauses.push(`"${key}" = $${idx}`)
        values.push(value ?? null)
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    setClauses.push(`updated_at = NOW()`)
    values.push(id)

    const result = await query(
      `UPDATE pages SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Page updated successfully',
      page: result.rows[0],
    })
  } catch (err) {
    console.error('[api/pages/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await query('SELECT id FROM pages WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    await query('DELETE FROM pages WHERE id = $1', [id])

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (err) {
    console.error('[api/pages/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 })
  }
}
