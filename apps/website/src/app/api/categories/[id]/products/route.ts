/**
 * POST /api/categories/[id]/products — add a product to this category
 *
 * Writes to collection_products, the many-to-many table that mirrors
 * Shopify's real collection membership (a product can belong to several
 * categories at once).
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const productId = parseInt(body.productId, 10)
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const catRes = await query('SELECT id FROM categories WHERE id::text = $1 OR slug = $1 LIMIT 1', [id])
    if (catRes.rowCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    const categoryId = catRes.rows[0].id

    const productRes = await query('SELECT id FROM products WHERE id = $1', [productId])
    if (productRes.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const posRes = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM collection_products WHERE collection_id = $1',
      [categoryId]
    )
    const position = posRes.rows[0].next

    await query(
      `INSERT INTO collection_products (collection_id, product_id, position, source)
       VALUES ($1, $2, $3, 'manual')
       ON CONFLICT (collection_id, product_id) DO NOTHING`,
      [categoryId, productId, position]
    )

    // Sync products.category_id — set as primary category if not already set
    await query(
      `UPDATE products SET category_id = $1 WHERE id = $2 AND category_id IS NULL`,
      [categoryId, productId]
    )

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: any) {
    console.error('[api/categories/:id/products] POST error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
