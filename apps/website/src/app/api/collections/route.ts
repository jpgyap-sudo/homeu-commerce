/**
 * GET  /api/collections   — list collections (public reads)
 * POST /api/collections   — create a collection (auth required)
 *
 * Collections are stored in the `categories` table (upgraded in place with
 * smart-rule + manual capabilities). Membership lives in collection_products.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'
}

// ── GET ───────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const featuredOnly = searchParams.get('featured') === 'true'
    const publishedOnly = searchParams.get('published') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conditions: string[] = []
    const values: any[] = []
    let idx = 0

    if (search) {
      idx++
      conditions.push(`(LOWER(c.title) LIKE LOWER($${idx}) OR LOWER(c.slug) LIKE LOWER($${idx}))`)
      values.push(`%${search}%`)
    }
    if (featuredOnly) conditions.push('c.featured = true')
    if (publishedOnly) conditions.push('c.published = true')

    const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT c.id, c.title, c.slug, c.description, c.image_url,
              c.collection_type, c.rules, c.rules_match, c.published,
              c.position, c.product_sort, c.featured,
              c.seo_title, c.seo_description, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM collection_products cp WHERE cp.collection_id = c.id) AS product_count
       FROM categories c
       ${whereSQL}
       ORDER BY c.position ASC, c.title ASC
       LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, limit, offset]
    )

    return NextResponse.json({
      docs: result.rows.map((c: any) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        imageUrl: c.image_url || null,
        type: c.collection_type,
        rules: c.rules || [],
        rulesMatch: c.rules_match,
        published: c.published,
        position: c.position,
        productSort: c.product_sort,
        featured: c.featured,
        seoTitle: c.seo_title,
        seoDescription: c.seo_description,
        productCount: parseInt(c.product_count, 10) || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      total: result.rows.length,
    })
  } catch (err) {
    console.error('[api/collections] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let slug = body.slug?.trim() || slugify(body.title)
    let finalSlug = slug
    let n = 1
    while (true) {
      const existing = await query('SELECT id FROM categories WHERE slug = $1', [finalSlug])
      if (existing.rows.length === 0) break
      finalSlug = `${slug}-${n++}`
    }

    const type = body.type === 'smart' ? 'smart' : 'manual'
    const rulesMatch = body.rulesMatch === 'any' ? 'any' : 'all'
    const rules = Array.isArray(body.rules) ? body.rules : []

    const result = await query(
      `INSERT INTO categories
         (title, slug, description, image_url, collection_type, rules, rules_match,
          published, position, product_sort, featured, seo_title, seo_description,
          updated_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
       RETURNING id`,
      [
        body.title.trim(),
        finalSlug,
        body.description?.trim() || null,
        body.imageUrl?.trim() || null,
        type,
        JSON.stringify(rules),
        rulesMatch,
        body.published !== false,
        parseInt(body.position, 10) || 0,
        body.productSort || 'manual',
        !!body.featured,
        body.seoTitle?.trim() || null,
        body.seoDescription?.trim() || null,
      ]
    )

    return NextResponse.json({ id: result.rows[0].id, slug: finalSlug }, { status: 201 })
  } catch (err) {
    console.error('[api/collections] POST error:', err)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
