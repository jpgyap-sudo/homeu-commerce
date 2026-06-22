import { query } from '@/lib/db'

/**
 * Recomputes a product's cached review_count/avg_rating from its approved
 * reviews. Call after any review status change (create/approve/reject).
 *
 * Lives outside any route.ts file — Next.js route modules may only export
 * HTTP method handlers and a fixed set of route config values, so a plain
 * helper exported alongside GET/POST fails the build's route export check.
 */
export async function refreshProductRatingCache(productId: number) {
  await query(
    `UPDATE products SET
       review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND status = 'approved'),
       avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = $1 AND status = 'approved'), 0)
     WHERE id = $1`,
    [productId]
  )
}
