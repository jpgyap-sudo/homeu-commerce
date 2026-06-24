/**
 * DELETE /api/categories/[id]/products/[productId] — remove a product
 * from this category (collection_products).
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id, productId } = await params

    const catRes = await query('SELECT id FROM categories WHERE id::text = $1 OR slug = $1 LIMIT 1', [id])
    if (catRes.rowCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    const categoryId = catRes.rows[0].id

    const result = await query(
      'DELETE FROM collection_products WHERE collection_id = $1 AND product_id = $2 RETURNING product_id',
      [categoryId, parseInt(productId, 10)]
    )
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Product not linked to this category' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[api/categories/:id/products/:productId] DELETE error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
