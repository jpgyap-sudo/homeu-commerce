/**
 * PATCH  /api/admin/products/[id]/variants/[variantId] — edit a variant.
 * DELETE /api/admin/products/[id]/variants/[variantId] — remove a variant.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { variantId } = await params
    const body = await request.json()

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 0

    const fieldMap: Record<string, string> = {
      title: 'title', sku: 'sku', price: 'price', salePrice: 'sale_price',
      inventoryQuantity: 'inventory_quantity', sortOrder: 'sort_order',
    }
    for (const [key, column] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        idx++
        const isNumeric = ['price', 'sale_price', 'inventory_quantity', 'sort_order'].includes(column)
        setClauses.push(`"${column}" = $${idx}`)
        values.push(isNumeric && body[key] !== null ? Number(body[key]) : body[key])
      }
    }
    if (setClauses.length === 0 && body.isDefault === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    setClauses.push('updated_at = NOW()')

    values.push(variantId)
    const result = await query(
      `UPDATE product_variants SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    if (body.isDefault) {
      await query(
        'UPDATE product_variants SET is_default = (id = $1) WHERE product_id = $2',
        [variantId, result.rows[0].product_id]
      )
    }

    return NextResponse.json({ variant: result.rows[0] })
  } catch (err: any) {
    console.error('[admin/products/:id/variants/:variantId] PATCH error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { variantId } = await params
    const result = await query('DELETE FROM product_variants WHERE id = $1 RETURNING id', [variantId])
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[admin/products/:id/variants/:variantId] DELETE error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
