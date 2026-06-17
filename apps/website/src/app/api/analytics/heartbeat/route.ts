import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * POST /api/analytics/heartbeat — lightweight visitor ping.
 *
 * Called every 30s by LiveVisitorTracker to update the visitor's
 * last_seen timestamp. Inserts new visitors on first call.
 *
 * Body: { visitorId: string, path?: string, isAdmin?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const visitorId = String(body.visitorId || '').slice(0, 100)
    const path = String(body.path || '').slice(0, 500)
    const isAdmin = Boolean(body.isAdmin)

    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 })
    }

    // UPSERT: insert or update last_seen
    await query(
      `INSERT INTO visitor_sessions (visitor_id, last_seen, current_path, is_admin)
       VALUES ($1, NOW(), $2, $3)
       ON CONFLICT (visitor_id)
       DO UPDATE SET last_seen = NOW(), current_path = $2, is_admin = $3, visit_count = visitor_sessions.visit_count + 1`,
      [visitorId, path, isAdmin]
    )

    // Clean up sessions older than 10 minutes (no heartbeat)
    await query(
      `DELETE FROM visitor_sessions WHERE last_seen < NOW() - INTERVAL '10 minutes'`
    ).catch(() => { /* best-effort cleanup */ })

    // Get current counts for response
    const r = await query(`
      SELECT
        COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '5 minutes') as active_5m,
        COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '1 minute') as active_1m,
        COUNT(*) FILTER (WHERE is_admin = TRUE AND last_seen >= NOW() - INTERVAL '5 minutes') as admin_5m
      FROM visitor_sessions
    `)

    const row = r.rows[0] || {}

    return NextResponse.json({
      success: true,
      activeVisitors: Number(row.active_5m || 0),
      activeNow: Number(row.active_1m || 0),
      adminOnline: Number(row.admin_5m || 0),
    })
  } catch (error: any) {
    console.error('[heartbeat] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
