/**
 * GET /api/media/[id]    — Single media detail
 * PATCH /api/media/[id]  — Update media
 * DELETE /api/media/[id] — Delete media
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
      'SELECT * FROM media WHERE id = $1 LIMIT 1',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[api/media/:id] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
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
      'url', 'alt', 'filename', 'mime_type', 'filesize', 'width', 'height', 'source',
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
      `UPDATE media SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Media updated successfully',
      media: result.rows[0],
    })
  } catch (err) {
    console.error('[api/media/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
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

    const existing = await query('SELECT id FROM media WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    await query('DELETE FROM media WHERE id = $1', [id])

    return NextResponse.json({ message: 'Media deleted successfully' })
  } catch (err) {
    console.error('[api/media/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }
}
