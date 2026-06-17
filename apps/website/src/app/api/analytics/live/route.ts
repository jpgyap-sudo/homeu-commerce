import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * GET /api/analytics/live — current visitor stats.
 *
 * Returns active visitor counts and which pages they're on.
 * Query: ?detail=true to include per-page breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const detail = request.nextUrl.searchParams.get('detail') === 'true'

    const [counts, pages] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '5 minutes') as active,
          COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '1 minute') as now,
          COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '15 minutes') as recent,
          COUNT(*) FILTER (WHERE is_admin = TRUE AND last_seen >= NOW() - INTERVAL '5 minutes') as admins
        FROM visitor_sessions
      `),
      detail
        ? query(`
            SELECT current_path as path, COUNT(*) as count
            FROM visitor_sessions
            WHERE last_seen >= NOW() - INTERVAL '5 minutes'
            GROUP BY current_path
            ORDER BY count DESC
            LIMIT 15
          `)
        : Promise.resolve({ rows: [] }),
    ])

    const row = counts.rows[0] || {}

    return NextResponse.json({
      active: Number(row.active || 0),
      now: Number(row.now || 0),
      recent: Number(row.recent || 0),
      admins: Number(row.admins || 0),
      pages: detail ? pages.rows.map((r: any) => ({ path: r.path, count: Number(r.count) })) : [],
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    // If table doesn't exist yet, return zeros
    return NextResponse.json({
      active: 0, now: 0, recent: 0, admins: 0, pages: [],
      timestamp: new Date().toISOString(),
    })
  }
}
