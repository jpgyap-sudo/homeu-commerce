/**
 * GET /api/categories      — Categories listing (public)
 * POST /api/categories     — Create a new category (auth required)
 *
 * Custom API endpoint for categories CRUD operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ── GET (public — no auth required for storefront reads) ─────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await query(
      `SELECT c.*, COALESCE(m.url, c.image_url) as image_url
       FROM categories c
       LEFT JOIN media m ON c.image_id = m.id
       ORDER BY c.title ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    return NextResponse.json({
      docs: result.rows.map((cat: any) => ({
        id: cat.id,
        title: cat.title,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.image_url || null,
        parentId: cat.parent_id || null,
        productCount: cat.product_count || 0,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      })),
      total: result.rows.length,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/categories] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
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

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let slug = body.slug?.trim()
    if (!slug) {
      slug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'untitled'
    }

    let finalSlug = slug
    let slugCounter = 1
    while (true) {
      const existing = await query('SELECT id FROM categories WHERE slug = $1', [finalSlug])
      if (existing.rows.length === 0) break
      finalSlug = `${slug}-${slugCounter}`
      slugCounter++
    }

    const result = await query(
      `INSERT INTO categories (title, slug, description, image_url, parent_id, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        body.title.trim(),
        finalSlug,
        body.description?.trim() || null,
        body.image_url?.trim() || null,
        body.parent_id ? parseInt(body.parent_id) : null,
      ]
    )

    const cat = result.rows[0]

    return NextResponse.json({
      message: 'Category created successfully',
      category: {
        id: cat.id,
        title: cat.title,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.image_url || null,
        parentId: cat.parent_id || null,
        createdAt: cat.created_at,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/categories] POST error:', err)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
