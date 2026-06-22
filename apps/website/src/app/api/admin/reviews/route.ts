/**
 * GET  /api/admin/reviews — moderation queue (filter by status), paginated.
 * POST /api/admin/reviews — admin manually creates a review (mirrors
 *   Judge.me's "admin" source: free-text name/email, no verification).
 *   Auto-approved immediately — the admin is the trust boundary, not the
 *   fraud screen.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { refreshProductRatingCache } from '@/lib/product-ratings'

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'flagged'])

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const productId = searchParams.get('productId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conditions: string[] = []
    const values: any[] = []
    if (status && VALID_STATUSES.has(status)) {
      values.push(status)
      conditions.push(`r.status = $${values.length}`)
    }
    if (productId) {
      values.push(parseInt(productId, 10))
      conditions.push(`r.product_id = $${values.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await query(`SELECT COUNT(*) as total FROM reviews r ${where}`, values)
    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    values.push(limit, offset)
    const result = await query(
      `SELECT r.id, r.product_id, p.title as product_title, p.slug as product_slug,
              r.reviewer_name, r.reviewer_email, r.rating, r.title, r.body,
              r.status, r.fraud_score, r.fraud_reasons, r.verified_purchase,
              r.source, r.imported_from_judgeme, r.review_date, r.created_at, r.published_at,
              (SELECT COUNT(*) FROM review_replies WHERE review_id = r.id) as reply_count,
              (SELECT json_agg(m.url ORDER BY rp.created_at)
               FROM review_photos rp
               JOIN media m ON m.id = rp.media_id
               WHERE rp.review_id = r.id) as photos
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ${where}
       ORDER BY r.review_date DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    )

    return NextResponse.json({ reviews: result.rows, total, limit, offset })
  } catch (err: any) {
    console.error('[admin/reviews] GET error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { productId, reviewerName, reviewerEmail, rating, title, reviewBody, reviewDate } = body

    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    const ratingNum = parseInt(rating, 10)
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO reviews
        (product_id, reviewer_name, reviewer_email, rating, title, body, status,
         source, verified_purchase, review_date, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', 'admin', false, $7, NOW())
       RETURNING *`,
      [
        productId, reviewerName || null, reviewerEmail || null, ratingNum,
        title || null, reviewBody || null, reviewDate || new Date().toISOString(),
      ]
    )

    await refreshProductRatingCache(productId)

    return NextResponse.json({ review: result.rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error('[admin/reviews] POST error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
