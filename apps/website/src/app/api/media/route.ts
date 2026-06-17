/**
 * GET /api/media       — Media listing with search/pagination
 * POST /api/media      — Create a new media entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 0

    if (search) {
      paramIndex++
      conditions.push(
        `(LOWER(filename) LIKE LOWER($${paramIndex}) OR LOWER(COALESCE(alt,'')) LIKE LOWER($${paramIndex}))`
      )
      values.push(`%${search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM media ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    // Fetch media
    const mediaResult = await query(
      `SELECT * FROM media ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...values, limit, offset]
    )

    return NextResponse.json({
      docs: mediaResult.rows,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/media] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()

    if (!body.url || !body.url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO media (url, alt, filename, mime_type, filesize, width, height, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        body.url.trim(),
        body.alt?.trim() || null,
        body.filename?.trim() || null,
        body.mime_type?.trim() || null,
        body.filesize != null ? parseInt(body.filesize) : null,
        body.width != null ? parseInt(body.width) : null,
        body.height != null ? parseInt(body.height) : null,
      ]
    )

    const media = result.rows[0]

    return NextResponse.json({
      message: 'Media created successfully',
      media: {
        id: media.id,
        url: media.url,
        alt: media.alt,
        filename: media.filename,
        createdAt: media.created_at,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/media] POST error:', err)
    return NextResponse.json({ error: 'Failed to create media' }, { status: 500 })
  }
}
