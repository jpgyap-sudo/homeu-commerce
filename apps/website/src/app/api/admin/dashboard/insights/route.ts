import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── Unread counts per provider ─────────────────────────────────────
    let unreadCounts = { website: 0, email: 0, facebook: 0, instagram: 0 }

    // Website chat unread
    try {
      const websiteResult = await query(`
        SELECT COUNT(*)::int AS count FROM chatbot.messages m
        WHERE m.sender_type = 'visitor'
          AND NOT EXISTS (
            SELECT 1 FROM chatbot.messages m2
            WHERE m2.conversation_id = m.conversation_id
              AND m2.sender_type IN ('admin', 'agent')
              AND m2.created_at > m.created_at
          )
      `)
      unreadCounts.website = websiteResult.rows[0]?.count || 0
    } catch { /* chatbot tables may not exist */ }

    // Email unread
    try {
      const emailResult = await query(`
        SELECT COUNT(*)::int AS count FROM emails
        WHERE folder = 'INBOX' AND (is_read = FALSE OR is_read IS NULL)
      `)
      unreadCounts.email = emailResult.rows[0]?.count || 0
    } catch { /* emails table may not exist */ }

    // Facebook unread
    try {
      const fbResult = await query(`
        SELECT COUNT(*)::int AS count FROM inbox_conversations c
        JOIN inbox_channels ch ON ch.id = c.channel_id
        WHERE ch.type = 'facebook' AND c.status != 'archived'
          AND (
            SELECT COUNT(*) FROM inbox_messages m
            WHERE m.conversation_id = c.id AND m.direction = 'outbound'
          ) = 0
      `)
      unreadCounts.facebook = fbResult.rows[0]?.count || 0
    } catch { /* inbox tables may not exist */ }

    // Instagram unread
    try {
      const igResult = await query(`
        SELECT COUNT(*)::int AS count FROM inbox_conversations c
        JOIN inbox_channels ch ON ch.id = c.channel_id
        WHERE ch.type = 'instagram' AND c.status != 'archived'
          AND (
            SELECT COUNT(*) FROM inbox_messages m
            WHERE m.conversation_id = c.id AND m.direction = 'outbound'
          ) = 0
      `)
      unreadCounts.instagram = igResult.rows[0]?.count || 0
    } catch { /* inbox tables may not exist */ }

    // ── Unreplied / forgotten ──────────────────────────────────────────
    let unrepliedCount = 0

    // Website conversations without admin reply
    try {
      const websiteUnreplied = await query(`
        SELECT COUNT(*)::int AS count FROM chatbot.conversations c
        WHERE c.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM chatbot.messages m
            WHERE m.conversation_id = c.id
              AND m.sender_type IN ('admin', 'agent')
          )
      `)
      unrepliedCount += websiteUnreplied.rows[0]?.count || 0
    } catch { /* skip */ }

    // Email unreplied
    try {
      const emailUnreplied = await query(`
        SELECT COUNT(*)::int AS count FROM emails
        WHERE folder = 'INBOX'
          AND (is_read = FALSE OR is_read IS NULL)
          AND (replied_at IS NULL)
      `)
      unrepliedCount += emailUnreplied.rows[0]?.count || 0
    } catch { /* skip */ }

    // Inbox conversations without outbound reply
    try {
      const inboxUnreplied = await query(`
        SELECT COUNT(*)::int AS count FROM inbox_conversations c
        WHERE c.status != 'archived'
          AND NOT EXISTS (
            SELECT 1 FROM inbox_messages m
            WHERE m.conversation_id = c.id AND m.direction = 'outbound'
          )
      `)
      unrepliedCount += inboxUnreplied.rows[0]?.count || 0
    } catch { /* skip */ }

    // ── Pending RFQ requests ───────────────────────────────────────────
    let pendingRfqCount = 0
    try {
      const rfqResult = await query(`
        SELECT COUNT(*)::int AS count FROM rfq_requests
        WHERE status IN ('new', 'contacted')
      `)
      pendingRfqCount = rfqResult.rows[0]?.count || 0
    } catch { /* rfq_requests table may not exist */ }

    // ── Recent admin activity ──────────────────────────────────────────
    interface Activity { action: string; targetType: string; targetId: string; timestamp: string }
    let recentActivity: Activity[] = []

    try {
      // Check if admin_activity table exists
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'admin_activity'
        ) AS exists
      `)
      if (tableCheck.rows[0]?.exists) {
        const activityResult = await query(`
          SELECT action, target_type, target_id, created_at
          FROM admin_activity
          ORDER BY created_at DESC
          LIMIT 10
        `)
        recentActivity = activityResult.rows.map((r: any) => ({
          action: r.action,
          targetType: r.target_type,
          targetId: r.target_id,
          timestamp: r.created_at,
        }))
      }
    } catch { /* skip */ }

    return NextResponse.json({
      unreadCounts,
      unrepliedCount,
      pendingRfqCount,
      recentActivity,
    })
  } catch (error: any) {
    console.error('[dashboard-insights] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
