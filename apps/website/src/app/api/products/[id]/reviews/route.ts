/**
 * GET /api/products/[id]/reviews — public, approved reviews only.
 *
 * `id` may be a numeric product id or a slug, matching the main product
 * route. Reviewer email is never included in the response.
 *
 * POST — customer submits a review. Email is now required for storefront
 * submissions (used for admin/CS follow-up, never exposed publicly).
 * Signed-in customers may auto-fill from their session.
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

    const breakdownResult = await query(
      `SELECT rating, COUNT(*) as count FROM reviews
       WHERE product_id = $1 AND status = 'approved' GROUP BY rating`,
      [product.id]
    )
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const row of breakdownResult.rows) breakdown[row.rating] = parseInt(row.count, 10)

    const reviewsResult = await query(
      `SELECT id, reviewer_name, rating, title, body, verified_purchase, source, review_date,
              (SELECT json_agg(rr.* ORDER BY rr.created_at) FROM review_replies rr WHERE rr.review_id = reviews.id) as replies,
              (SELECT json_agg(m.url ORDER BY rp.created_at)
               FROM review_photos rp
               JOIN media m ON m.id = rp.media_id
               WHERE rp.review_id = reviews.id) as photos
       FROM reviews
       WHERE product_id = $1 AND status = 'approved'
       ORDER BY review_date DESC
       LIMIT $2 OFFSET $3`,
      [product.id, limit, offset]
    )

    return NextResponse.json({
      reviewCount: parseInt(statsResult.rows[0].count, 10) || 0,
      avgRating: parseFloat(statsResult.rows[0].avg) || 0,
      breakdown,
      reviews: reviewsResult.rows,
    })
  } catch (err: any) {
    console.error('[products/:id/reviews] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}

/**
 * POST /api/products/[id]/reviews — customer submits a review via the
 * public "Write a Review" form. Always lands as status='pending' — same
 * manual-decision-only policy as every other review source (import,
 * admin-created); nothing here auto-publishes.
 *
 * Email is required for storefront submissions (hidden from public display)
 * and auto-filled from session when available.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reviewerName, reviewerEmail, rating, title, reviewBody, photoUrls } = body

    const ratingNum = parseInt(rating, 10)
    if (!reviewerName || !String(reviewerName).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!reviewerEmail || !String(reviewerEmail).trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!String(reviewerEmail).includes('@') || !String(reviewerEmail).includes('.')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }
    if (!reviewBody || !String(reviewBody).trim()) {
      return NextResponse.json({ error: 'Review text is required' }, { status: 400 })
    }

    const productResult = await query(
      `SELECT id FROM products WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [id]
    )
    if (productResult.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const productId = productResult.rows[0].id

    const insertResult = await query(
      `INSERT INTO reviews
        (product_id, reviewer_name, reviewer_email, rating, title, body, status,
         source, verified_purchase, review_date)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'storefront', false, NOW())
       RETURNING id`,
      [productId, String(reviewerName).trim(), String(reviewerEmail).trim(), ratingNum,
        title || null, String(reviewBody).trim()]
    )

    const reviewId = insertResult.rows[0].id

    // Insert associated photos (media_ids) into review_photos
    if (Array.isArray(photoUrls) && photoUrls.length > 0) {
      const photoValues: any[] = []
      const placeholders: string[] = []
      for (let i = 0; i < photoUrls.length; i++) {
        const mediaId = Number(photoUrls[i])
        if (mediaId > 0) {
          placeholders.push(`($${photoValues.length + 1}::uuid, $${photoValues.length + 2})`)
          photoValues.push(reviewId, mediaId)
        }
      }
      if (placeholders.length > 0) {
        await query(
          `INSERT INTO review_photos (review_id, media_id) VALUES ${placeholders.join(', ')}`,
          photoValues
        )
      }
    }

    return NextResponse.json({ ok: true, message: 'Thanks! Your review will appear after it\'s reviewed by our team.' }, { status: 201 })
  } catch (err: any) {
    console.error('[products/:id/reviews] POST error:', err.message)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
