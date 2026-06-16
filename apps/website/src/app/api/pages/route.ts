/**
 * GET /api/pages       — Pages listing with search/filter/pagination
 * POST /api/pages      — Create a new page
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 0

    if (search) {
      paramIndex++
      conditions.push(`(LOWER(title) LIKE LOWER($${paramIndex}) OR LOWER(slug) LIKE LOWER($${paramIndex}))`)
      values.push(`%${search}%`)
    }

    if (status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}`)
      values.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM pages ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    // Fetch pages
    const pagesResult = await query(
      `SELECT * FROM pages ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...values, limit, offset]
    )

    return NextResponse.json({
      docs: pagesResult.rows,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/pages] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Auto-generate slug if not provided
    let slug = body.slug?.trim()
    if (!slug) {
      slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'untitled'
    }

    // Ensure slug uniqueness
    let finalSlug = slug
    let slugCounter = 1
    while (true) {
      const existing = await query('SELECT id FROM pages WHERE slug = $1', [finalSlug])
      if (existing.rows.length === 0) break
      finalSlug = `${slug}-${slugCounter}`
      slugCounter++
    }

    const result = await query(
      `INSERT INTO pages (title, slug, content, status, seo_title, seo_description, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        body.title.trim(),
        finalSlug,
        body.content || null,
        body.status || 'draft',
        body.seo_title?.trim() || null,
        body.seo_description?.trim() || null,
      ]
    )

    const page = result.rows[0]

    return NextResponse.json({
      message: 'Page created successfully',
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        createdAt: page.created_at,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/pages] POST error:', err)
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
  }
}
