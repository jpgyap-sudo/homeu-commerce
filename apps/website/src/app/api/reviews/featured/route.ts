/**
 * GET /api/reviews/featured — public, top approved reviews site-wide for the
 * homepage "What Our Customers Say" section. Reviewer email never included.
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '6', 10), 20)

    const result = await query(
      `SELECT r.id, r.reviewer_name, r.rating, r.title, r.body, r.verified_purchase, r.review_date,
              p.title as product_title, p.slug as product_slug
       FROM reviews r
       JOIN products p ON p.id = r.product_id
       WHERE r.status = 'approved' AND r.rating >= 4 AND r.body IS NOT NULL AND length(r.body) > 0
       ORDER BY r.rating DESC, r.review_date DESC
       LIMIT $1`,
      [limit]
    )

    return NextResponse.json({ reviews: result.rows })
  } catch (err: any) {
    console.error('[reviews/featured] GET error:', err.message)
    return NextResponse.json({ reviews: [] })
  }
}
