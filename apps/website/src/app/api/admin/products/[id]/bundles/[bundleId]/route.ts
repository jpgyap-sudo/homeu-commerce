/**
 * PATCH  /api/admin/products/[id]/bundles/[bundleId] — edit a bundle offer
 * DELETE /api/admin/products/[id]/bundles/[bundleId] — remove a bundle offer
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bundleId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { bundleId } = await params
    const body = await request.json()

    const setClauses: string[] = []
    const values: any[] = []
    let idx = 0

    const fieldMap: Record<string, string> = {
      bundledVariantId: 'bundled_variant_id',
      triggerVariantId: 'trigger_variant_id',
      bundledQuantity: 'bundled_quantity',
      discountType: 'discount_type',
      discountValue: 'discount_value',
      sortOrder: 'sort_order',
      active: 'active',
    }
    for (const [key, column] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        idx++
        setClauses.push(`"${column}" = $${idx}`)
        values.push(body[key])
      }
    }
    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    setClauses.push('updated_at = NOW()')

    values.push(bundleId)
    const result = await query(
      `UPDATE product_bundles SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    return NextResponse.json({ bundle: result.rows[0] })
  } catch (err: any) {
    console.error('[admin/products/:id/bundles/:bundleId] PATCH error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bundleId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { bundleId } = await params
    const result = await query('DELETE FROM product_bundles WHERE id = $1 RETURNING id', [bundleId])
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[admin/products/:id/bundles/:bundleId] DELETE error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
