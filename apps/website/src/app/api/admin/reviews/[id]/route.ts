/**
 * GET   /api/admin/reviews/[id]
 * PATCH /api/admin/reviews/[id] — approve, decline (reject), flag, or edit.
 *   Manual decision only — there is no auto-approve path. Setting
 *   status='approved' sets published_at and refreshes the product's
 *   review_count/avg_rating cache.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { refreshProductRatingCache } from '../route'

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'flagged'])

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const result = await query(
      `SELECT r.*, p.title as product_title, p.slug as product_slug,
              (SELECT json_agg(rr.* ORDER BY rr.created_at) FROM review_replies rr WHERE rr.review_id = r.id) as replies,
              (SELECT json_agg(m.url ORDER BY rp.created_at)
               FROM review_photos rp
               JOIN media m ON m.id = rp.media_id
               WHERE rp.review_id = r.id) as photos
       FROM reviews r LEFT JOIN products p ON p.id = r.product_id
       WHERE r.id = $1`,
      [id]
    )
    if (result.rowCount === 0) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    return NextResponse.json({ review: result.rows[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      values.push(body.status)
      updates.push(`status = $${values.length}`)
      if (body.status === 'approved') updates.push(`published_at = NOW()`)
    }
    if (body.title !== undefined) { values.push(body.title); updates.push(`title = $${values.length}`) }
    if (body.body !== undefined) { values.push(body.body); updates.push(`body = $${values.length}`) }
    if (body.rating !== undefined) { values.push(parseInt(body.rating, 10)); updates.push(`rating = $${values.length}`) }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    updates.push(`updated_at = NOW()`)

    values.push(id)
    const result = await query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rowCount === 0) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

    if (result.rows[0].product_id) {
      await refreshProductRatingCache(result.rows[0].product_id)
    }

    return NextResponse.json({ review: result.rows[0] })
  } catch (err: any) {
    console.error('[admin/reviews/:id] PATCH error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
