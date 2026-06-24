/**
 * GET /api/products    — Product listing with search/filter/pagination (public)
 * POST /api/products   — Create a new product (auth required)
 *
 * Custom API endpoint for products CRUD operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { buildCategoryTagCondition } from '@/lib/category-filter'
import { compileRules } from '@/lib/collection-rules'

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
      // Smart collections (e.g. "Limited-Time Collection Offer") aren't tied
      // to a product's single category_id — they're a dynamic rule (like
      // SALE_PRICE > 0) evaluated across the whole catalog. Check for one
      // before falling back to the normal category_id/tag matching.
      const smartResult = await query(
        `SELECT rules, rules_match FROM categories WHERE LOWER(slug) = LOWER($1) AND collection_type = 'smart' LIMIT 1`,
        [category]
      )
      if (smartResult.rowCount && smartResult.rowCount > 0) {
        const { where, params } = compileRules(
          smartResult.rows[0].rules || [],
          smartResult.rows[0].rules_match === 'any' ? 'any' : 'all',
          paramIndex
        )
        conditions.push(`(${where})`)
        values.push(...params)
        paramIndex += params.length
      } else {
        paramIndex++
        // Match by the product's primary category (slug or legacy title)…
        const categoryChecks = [
          `EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND (LOWER(c.slug) = LOWER($${paramIndex}) OR LOWER(c.title) = LOWER($${paramIndex})))`,
        ]
        values.push(category)
        // …OR by collection_products (many-to-many — the real Shopify-import
        // membership; a product can be in several collections at once, e.g.
        // both "Dining Chair" and "48 Hour Dispatch").
        paramIndex++
        categoryChecks.push(
          `EXISTS (SELECT 1 FROM collection_products cp JOIN categories c2 ON c2.id = cp.collection_id
            WHERE cp.product_id = p.id AND (LOWER(c2.slug) = LOWER($${paramIndex}) OR LOWER(c2.title) = LOWER($${paramIndex})))`
        )
        values.push(category)
        // …OR by the Shopify smart-collection TAG rule for this handle, so the
        // granular nav dropdowns (sofa, pendant-light, rugs, …) resolve.
        const tagCond = buildCategoryTagCondition(category, paramIndex + 1)
        if (tagCond) {
          categoryChecks.push(tagCond.sql)
          values.push(...tagCond.values)
          paramIndex += tagCond.values.length
        }
        conditions.push(`(${categoryChecks.join(' OR ')})`)
      }
    }

    // Missing data filters (admin diagnostic)
    const missing = searchParams.get('missing') || ''
    if (missing) {
      const filters = missing.split(',').map(m => m.trim())
      for (const f of filters) {
        switch (f) {
          case 'image':
            conditions.push(`NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)`)
            break
          case 'seo':
            conditions.push(`(p.seo_title IS NULL OR p.seo_title = '' OR p.seo_description IS NULL OR p.seo_description = '')`)
            break
          case 'price':
            conditions.push(`(p.price IS NULL OR p.price = 0)`)
            break
          case 'category':
            conditions.push(`p.category_id IS NULL AND NOT EXISTS (SELECT 1 FROM collection_products cp WHERE cp.product_id = p.id)`)
            break
          case 'description':
            conditions.push(`(p.description IS NULL OR p.description::text = '' OR p.description::text = '{}')`)
            break
          case 'dimensions':
            conditions.push(`(p.dimensions IS NULL OR p.dimensions = '')`)
            break
        }
      }
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
              (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id) as images,
              (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') as live_review_count,
              (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') as live_avg_rating
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
      `INSERT INTO products (
         title, slug, sku, status, vendor, product_type,
         price, sale_price, show_price, price_note,
         inventory_tracked, inventory_quantity, sales_channel,
         description, dimensions, materials, tags,
         category_id, seo_title, seo_description, updated_at, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, $17, $18, $19, $20, NOW(), NOW())
       RETURNING *`,
      [
        body.title.trim(),
        finalSlug,
        body.sku?.trim() || null,
        body.status?.trim() || 'draft',
        body.vendor?.trim() || null,
        body.product_type?.trim() || null,
        body.price != null ? parseFloat(body.price) : null,
        body.sale_price != null ? parseFloat(body.sale_price) : null,
        body.show_price !== false,
        body.price_note?.trim() || null,
        body.inventory_tracked === true,
        body.inventory_quantity != null ? parseInt(body.inventory_quantity) : 0,
        body.sales_channel?.trim() || 'online-store',
        body.description != null ? JSON.stringify(body.description) : null,
        body.dimensions?.trim() || null,
        body.materials?.trim() || null,
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : null,
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
    showPrice: row.show_price !== false,
    category: row.category,
    images: row.images || [],
    imageUrl: row.images?.[0]?.url || null,
    materials: row.materials,
    dimensions: row.dimensions,
    tags: row.tags || [],
    reviewCount: parseInt(row.live_review_count, 10) || 0,
    avgRating: row.live_avg_rating ? parseFloat(row.live_avg_rating) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
