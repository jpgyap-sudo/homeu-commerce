/**
 * POST /api/admin/products/[id]/variants — add a new variant (model/size/
 * option) to a product. Public reads go through /api/products/[id], which
 * already returns `variants[]` — this route is the admin write side.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

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

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    const price = parseFloat(body.price)
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'A valid price is required' }, { status: 400 })
    }

    const productRes = await query('SELECT id FROM products WHERE id::text = $1 OR slug = $1 LIMIT 1', [id])
    if (productRes.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const productId = productRes.rows[0].id

    const sortRes = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM product_variants WHERE product_id = $1', [productId])
    const sortOrder = sortRes.rows[0].next

    const result = await query(
      `INSERT INTO product_variants (product_id, title, sku, price, sale_price, inventory_quantity, sort_order, is_default, option1_title, option1_value, option2_title, option2_value, option3_title, option3_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        productId, body.title.trim(), body.sku || null, price,
        body.salePrice != null && body.salePrice !== '' ? parseFloat(body.salePrice) : null,
        body.inventoryQuantity != null ? parseInt(body.inventoryQuantity, 10) : 0,
        sortOrder, Boolean(body.isDefault),
        body.option1Title || '', body.option1Value || '',
        body.option2Title || '', body.option2Value || '',
        body.option3Title || '', body.option3Value || '',
      ]
    )

    if (body.isDefault) {
      await query('UPDATE product_variants SET is_default = false WHERE product_id = $1 AND id <> $2', [productId, result.rows[0].id])
    }

    return NextResponse.json({ variant: result.rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error('[admin/products/:id/variants] POST error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
