/**
 * GET /api/redirects/[id]    — Single redirect detail
 * PATCH /api/redirects/[id]  — Update redirect
 * DELETE /api/redirects/[id] — Delete redirect
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const result = await query(
      'SELECT * FROM redirects WHERE id = $1 LIMIT 1',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[api/redirects/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch redirect' }, { status: 500 })
  }
}

// ── PATCH ────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()

    const allowedFields = new Set([
      'source', 'target', 'type',
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
      `UPDATE redirects SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Redirect updated successfully',
      redirect: result.rows[0],
    })
  } catch (err) {
    console.error('[api/redirects/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update redirect' }, { status: 500 })
  }
}

// ── DELETE ───────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const existing = await query('SELECT id FROM redirects WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
    }

    await query('DELETE FROM redirects WHERE id = $1', [id])

    return NextResponse.json({ message: 'Redirect deleted successfully' })
  } catch (err) {
    console.error('[api/redirects/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete redirect' }, { status: 500 })
  }
}
