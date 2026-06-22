/**
 * GET /api/products/[id]/reviews — public, approved reviews only.
 *
 * `id` may be a numeric product id or a slug, matching the main product
 * route. Reviewer email is never included in the response.
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const productResult = await query(
      `SELECT id FROM products WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [id]
    )
    if (productResult.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const product = productResult.rows[0]

    // Compute live from `reviews` rather than trusting products.review_count/
    // avg_rating — that cache is only refreshed by the admin approve/reply
    // flow (refreshProductRatingCache); anything that touches `reviews`
    // directly (a one-off data fix, a migration, manual testing) leaves it
    // stale, and a single-product query here is cheap enough not to need it.
    const statsResult = await query(
      `SELECT COUNT(*) as count, COALESCE(ROUND(AVG(rating)::numeric, 2), 0) as avg
       FROM reviews WHERE product_id = $1 AND status = 'approved'`,
      [product.id]
    )

    const reviewsResult = await query(
      `SELECT id, reviewer_name, rating, title, body, verified_purchase, source, review_date,
              (SELECT json_agg(rr.* ORDER BY rr.created_at) FROM review_replies rr WHERE rr.review_id = reviews.id) as replies
       FROM reviews
       WHERE product_id = $1 AND status = 'approved'
       ORDER BY review_date DESC
       LIMIT $2 OFFSET $3`,
      [product.id, limit, offset]
    )

    return NextResponse.json({
      reviewCount: parseInt(statsResult.rows[0].count, 10) || 0,
      avgRating: parseFloat(statsResult.rows[0].avg) || 0,
      reviews: reviewsResult.rows,
    })
  } catch (err: any) {
    console.error('[products/:id/reviews] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}
