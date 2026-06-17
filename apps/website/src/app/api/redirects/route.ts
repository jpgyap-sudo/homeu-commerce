/**
 * GET /api/redirects       — Redirects listing with search/pagination
 * POST /api/redirects      — Create a new redirect
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
        `(LOWER(source) LIKE LOWER($${paramIndex}) OR LOWER(target) LIKE LOWER($${paramIndex}))`
      )
      values.push(`%${search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM redirects ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    // Fetch redirects
    const redirectsResult = await query(
      `SELECT * FROM redirects ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...values, limit, offset]
    )

    return NextResponse.json({
      docs: redirectsResult.rows,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/redirects] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch redirects' }, { status: 500 })
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

    if (!body.source || !body.source.trim()) {
      return NextResponse.json({ error: 'Source path is required' }, { status: 400 })
    }

    if (!body.target || !body.target.trim()) {
      return NextResponse.json({ error: 'Target path is required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO redirects (source, target, type, updated_at, created_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [
        body.source.trim(),
        body.target.trim(),
        body.type != null ? parseInt(body.type) : 301,
      ]
    )

    const redirect = result.rows[0]

    return NextResponse.json({
      message: 'Redirect created successfully',
      redirect: {
        id: redirect.id,
        source: redirect.source,
        target: redirect.target,
        type: redirect.type,
        createdAt: redirect.created_at,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/redirects] POST error:', err)
    return NextResponse.json({ error: 'Failed to create redirect' }, { status: 500 })
  }
}
