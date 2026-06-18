import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * PATCH /api/products/bulk — Bulk edit products
 *
 * Update multiple products at once.
 * Body: { ids: number[], updates: { field: value, ... } }
 *
 * Supported fields: price, sale_price, category_id, status, seo_title,
 *   seo_description, materials, dimensions
 */
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { ids, updates } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'updates object required' }, { status: 400 })
    }

    // Whitelist allowed fields for bulk update
    const allowedFields = ['price', 'sale_price', 'category_id', 'status',
      'seo_title', 'seo_description', 'materials', 'dimensions']
    const fields = Object.keys(updates).filter(f => allowedFields.includes(f))

    if (fields.length === 0) {
      return NextResponse.json({ error: `No valid fields. Allowed: ${allowedFields.join(', ')}` }, { status: 400 })
    }

    // Build SET clause
    const sets = fields.map((f, i) => `${f} = $${i + 1}`)
    const vals = fields.map(f => updates[f])

    // Build IN clause for ids
    const placeholders = ids.map((_, i) => `$${fields.length + 1 + i}`)
    const allVals = [...vals, ...ids]

    const sql = `UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id IN (${placeholders.join(', ')})`
    const result = await query(sql, allVals)

    return NextResponse.json({ updated: result.rowCount || 0, ids, fields })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
