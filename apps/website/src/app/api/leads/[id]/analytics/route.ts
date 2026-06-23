/**
 * GET /api/leads/[id]/analytics
 *
 * Fetches comprehensive analytics for a single lead:
 *   - Page view history (paths, timestamps, time-on-page)
 *   - Top viewed pages (aggregated)
 *   - Top categories/collections viewed
 *   - Session timeline
 *   - Style DNA + visitor profile (from chatbot.visitor_profiles)
 *   - Recent searches from ledger events
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // ── Page View History ──────────────────────────────────────
    const pageViews = await query(
      `SELECT id, path, title, referrer, session_id, time_on_page_sec, created_at
       FROM chatbot.lead_page_views
       WHERE lead_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [id]
    )

    // ── Top Viewed Pages ──────────────────────────────────────
    const topPages = await query(
      `SELECT path,
              COUNT(*) AS view_count,
              MAX(created_at) AS last_viewed_at,
              ROUND(AVG(time_on_page_sec)::numeric, 1) AS avg_time_sec
       FROM chatbot.lead_page_views
       WHERE lead_id = $1
       GROUP BY path
       ORDER BY view_count DESC, last_viewed_at DESC
       LIMIT 20`,
      [id]
    )

    // ── Top Categories/Collections ────────────────────────────
    // Derive categories from paths like /products/..., /categories/...
    const topCategories = await query(
      `SELECT
          CASE
            WHEN path ~ '^/products/' THEN SPLIT_PART(path, '/', 3)
            WHEN path ~ '^/categories/' THEN SPLIT_PART(path, '/', 3)
            WHEN path ~ '^/collections/' THEN SPLIT_PART(path, '/', 3)
            ELSE 'other'
          END AS category,
          COUNT(*) AS view_count,
          MAX(created_at) AS last_viewed_at
       FROM chatbot.lead_page_views
       WHERE lead_id = $1
         AND path NOT IN ('/', '/login', '/cart', '/checkout', '/customer/dashboard')
       GROUP BY category
       ORDER BY view_count DESC
       LIMIT 15`,
      [id]
    )

    // ── Session Timeline ─────────────────────────────────────
    const sessions = await query(
      `SELECT session_id,
              MIN(created_at) AS session_start,
              MAX(created_at) AS session_end,
              COUNT(*) AS page_count,
              ROUND(SUM(COALESCE(time_on_page_sec, 0))::numeric, 1) AS total_time_sec
       FROM chatbot.lead_page_views
       WHERE lead_id = $1 AND session_id IS NOT NULL
       GROUP BY session_id
       ORDER BY session_start DESC
       LIMIT 20`,
      [id]
    )

    // ── Visitor Profile / Style DNA ──────────────────────────
    const profile = await query(
      `SELECT * FROM chatbot.visitor_profiles WHERE lead_id = $1`,
      [id]
    )

    // ── Recent Searches from Ledger Events ───────────────────
    const searches = await query(
      `SELECT event_data, created_at
       FROM chatbot.lead_ledger_events
       WHERE lead_id = $1
         AND event_type IN ('product_page_visited', 'image_uploaded')
         AND event_data IS NOT NULL
         AND event_data != '{}'::jsonb
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    )

    return NextResponse.json({
      pageViews: pageViews.rows,
      topPages: topPages.rows,
      topCategories: topCategories.rows,
      sessions: sessions.rows,
      visitorProfile: profile.rows[0] || null,
      searches: searches.rows,
    })
  } catch (err: any) {
    console.error('[api/leads/analytics] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
