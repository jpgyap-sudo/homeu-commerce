/**
 * GET /api/admin/products/picker — Products + categories for the visual product picker.
 *
 * Returns products grouped by category so the ProductPicker UI can render
 * category filter tabs + a searchable product grid.
 *
 * Query params:
 *   q            — search by product title (optional)
 *   category_id  — filter by category (optional)
 *   limit        — max products (default 50, cap 100)
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const categoryId = searchParams.get('category_id') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // ── Fetch distinct categories that have active products (including M2M) ──
    const catRes = await query(
      `SELECT DISTINCT c.id, c.title, c.slug
       FROM categories c
       WHERE EXISTS (
         SELECT 1 FROM products p WHERE p.category_id = c.id AND p.status = 'active'
         UNION
         SELECT 1 FROM collection_products cp JOIN products p2 ON p2.id = cp.product_id WHERE cp.collection_id = c.id AND p2.status = 'active'
       )
       ORDER BY c.title ASC`,
      []
    )
    const categories = catRes.rows

    // ── Build product query ──────────────────────────────────────────
    const conditions: string[] = ["p.status = 'active'"]
    const values: any[] = []
    let paramIdx = 0

    if (q) {
      paramIdx++
      conditions.push(`LOWER(p.title) LIKE LOWER($${paramIdx})`)
      values.push(`%${q}%`)
    }

    if (categoryId) {
      paramIdx++
      conditions.push(`(p.category_id = $${paramIdx} OR EXISTS (SELECT 1 FROM collection_products cp WHERE cp.collection_id = $${paramIdx} AND cp.product_id = p.id))`)
      values.push(parseInt(categoryId, 10))
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const prodRes = await query(
      `SELECT p.id, p.title, p.slug, p.price, p.sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url,
              cat.title AS category_title, cat.id AS category_id
       FROM products p
       LEFT JOIN categories cat ON cat.id = p.category_id
       ${whereClause}
       ORDER BY p.title ASC
       LIMIT $${paramIdx + 1}`,
      [...values, limit]
    )

    const products = prodRes.rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.sale_price || p.price,
      originalPrice: p.price,
      imageUrl: p.image_url || null,
      categoryTitle: p.category_title || null,
      categoryId: p.category_id,
    }))

    return NextResponse.json({ products, categories, total: products.length })
  } catch (err) {
    console.error('[api/admin/products/picker] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
