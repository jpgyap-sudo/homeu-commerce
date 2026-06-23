/**
 * GET  /api/admin/products/[id]/bundles — list bundle offers for a product
 * POST /api/admin/products/[id]/bundles — add a "buy together" bundle partner
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const productRes = await query('SELECT id FROM products WHERE id::text = $1 OR slug = $1 LIMIT 1', [id])
    if (productRes.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const productId = productRes.rows[0].id

    const result = await query(
      `SELECT b.*, p.title AS bundled_title, p.slug AS bundled_slug,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS bundled_image_url,
              tv.title AS trigger_variant_title
       FROM product_bundles b
       JOIN products p ON p.id = b.bundled_product_id
       LEFT JOIN product_variants tv ON tv.id = b.trigger_variant_id
       WHERE b.product_id = $1
       ORDER BY b.sort_order ASC, b.id ASC`,
      [productId]
    )

    // Own variants of this product, so the admin can pick which size/variant
    // each bundle row should trigger on (mirrors the original Bundler app's
    // per-variant tiers, e.g. 6-seater table -> 6 chairs, 10-seater -> 10 chairs).
    const variantsRes = await query(
      `SELECT id, title FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC`,
      [productId]
    )

    return NextResponse.json({ bundles: result.rows, productVariants: variantsRes.rows })
  } catch (err: any) {
    console.error('[admin/products/:id/bundles] GET error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

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

    if (!body.bundledProductId) {
      return NextResponse.json({ error: 'bundledProductId is required' }, { status: 400 })
    }

    const productRes = await query('SELECT id FROM products WHERE id::text = $1 OR slug = $1 LIMIT 1', [id])
    if (productRes.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const productId = productRes.rows[0].id
    const bundledProductId = parseInt(body.bundledProductId, 10)

    if (bundledProductId === productId) {
      return NextResponse.json({ error: 'A product cannot be bundled with itself' }, { status: 400 })
    }

    const sortRes = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM product_bundles WHERE product_id = $1', [productId])
    const sortOrder = sortRes.rows[0].next

    const result = await query(
      `INSERT INTO product_bundles
         (product_id, bundled_product_id, bundled_variant_id, trigger_variant_id, bundled_quantity, discount_type, discount_value, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (product_id, bundled_product_id, COALESCE(trigger_variant_id, 0)) DO UPDATE SET
         bundled_variant_id = EXCLUDED.bundled_variant_id,
         bundled_quantity = EXCLUDED.bundled_quantity,
         discount_type = EXCLUDED.discount_type,
         discount_value = EXCLUDED.discount_value,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING *`,
      [
        productId,
        bundledProductId,
        body.bundledVariantId ? parseInt(body.bundledVariantId, 10) : null,
        body.triggerVariantId ? parseInt(body.triggerVariantId, 10) : null,
        body.bundledQuantity ? parseInt(body.bundledQuantity, 10) : 1,
        body.discountType === 'fixed' ? 'fixed' : 'percent',
        body.discountValue != null && body.discountValue !== '' ? parseFloat(body.discountValue) : 0,
        sortOrder,
        body.active !== false,
      ]
    )

    return NextResponse.json({ bundle: result.rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error('[admin/products/:id/bundles] POST error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
