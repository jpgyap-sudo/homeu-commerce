/**
 * GET /api/products    — Product listing with search/filter/pagination (public)
 * POST /api/products   — Create a new product (auth required)
 *
 * Custom API endpoint for products CRUD operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

// ── GET (public — no auth required for storefront reads) ─────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const orderBy = searchParams.get('orderBy') || 'title ASC'

    // Build WHERE clause
    const conditions: string[] = []
    const values: any[] = []
    let paramIndex = 0

    if (search) {
      paramIndex++
      conditions.push(`(LOWER(p.title) LIKE LOWER($${paramIndex}) OR LOWER(p.description::text) LIKE LOWER($${paramIndex}))`)
      values.push(`%${search}%`)
    }

    if (category) {
      paramIndex++
      // Match by slug (URL param) OR title (legacy)
      conditions.push(`EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND (LOWER(c.slug) = LOWER($${paramIndex}) OR LOWER(c.title) = LOWER($${paramIndex})))`)
      values.push(category)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    // Fetch products
    const safeOrderBy = ['title ASC', 'title DESC', 'price ASC', 'price DESC', 'created_at DESC', 'created_at ASC'].includes(orderBy) ? orderBy : 'title ASC'
    const productsResult = await query(
      `SELECT p.*,
              (SELECT row_to_json(c.*) FROM categories c WHERE c.id = p.category_id) as category,
              (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id) as images
       FROM products p
       ${whereClause}
       ORDER BY p.${safeOrderBy}
       LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...values, limit, offset]
    )

    const docs = productsResult.rows.map(formatProduct)

    return NextResponse.json({ docs, total, limit, offset })
  } catch (err) {
    console.error('[api/products] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
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

    // Validate required fields
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
      const existing = await query('SELECT id FROM products WHERE slug = $1', [finalSlug])
      if (existing.rows.length === 0) break
      finalSlug = `${slug}-${slugCounter}`
      slugCounter++
    }

    const result = await query(
      `INSERT INTO products (title, slug, sku, price, sale_price, show_price, price_note, description, dimensions, materials, category_id, seo_title, seo_description, updated_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING *`,
      [
        body.title.trim(),
        finalSlug,
        body.sku?.trim() || null,
        body.price != null ? parseFloat(body.price) : null,
        body.sale_price != null ? parseFloat(body.sale_price) : null,
        body.show_price !== false,
        body.price_note?.trim() || null,
        body.description || null,
        body.dimensions?.trim() || null,
        body.materials?.trim() || null,
        body.category_id ? parseInt(body.category_id) : null,
        body.seo_title?.trim() || null,
        body.seo_description?.trim() || null,
      ]
    )

    const product = result.rows[0]

    return NextResponse.json({
      message: 'Product created successfully',
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        salePrice: product.sale_price,
        createdAt: product.created_at,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[api/products] POST error:', err)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatProduct(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: row.sale_price || row.price,
    originalPrice: row.price,
    category: row.category,
    images: row.images || [],
    imageUrl: row.images?.[0]?.url || null,
    materials: row.materials,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
