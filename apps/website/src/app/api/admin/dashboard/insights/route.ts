import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getUnreadCounts } from '@/lib/central-inbox/service'

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── Unread counts per provider ─────────────────────────────────────
    let unreadCounts = { website: 0, email: 0, facebook: 0, instagram: 0 }

    try {
      const counts = await getUnreadCounts()
      unreadCounts = {
        website: counts.website,
        email: counts.email,
        facebook: counts.facebook,
        instagram: counts.instagram
      }
    } catch (e) {
      console.warn('[dashboard-insights] Failed to fetch unread counts:', (e as Error).message)
    }

    // ── Unreplied / forgotten ──────────────────────────────────────────
    let unrepliedCount = 0
    try {
      const websiteUnreplied = await query(`
        SELECT COUNT(*)::int AS count FROM chatbot.conversations c
        WHERE c.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM chatbot.messages m WHERE m.conversation_id = c.id AND m.sender_type IN ('admin', 'agent'))
      `)
      unrepliedCount += websiteUnreplied.rows[0]?.count || 0
    } catch { /* skip */ }
    try {
      const emailUnreplied = await query(`
        SELECT COUNT(*)::int AS count FROM emails
        WHERE folder = 'INBOX' AND (is_read = FALSE OR is_read IS NULL) AND (replied_at IS NULL)
      `)
      unrepliedCount += emailUnreplied.rows[0]?.count || 0
    } catch { /* skip */ }
    try {
      const inboxUnreplied = await query(`
        SELECT COUNT(*)::int AS count FROM inbox_conversations c
        WHERE c.status != 'archived'
          AND NOT EXISTS (SELECT 1 FROM inbox_messages m WHERE m.conversation_id = c.id AND m.direction = 'outbound')
      `)
      unrepliedCount += inboxUnreplied.rows[0]?.count || 0
    } catch { /* skip */ }

    // ── Pending RFQ requests ───────────────────────────────────────────
    let pendingRfqCount = 0
    try {
      const rfqResult = await query(`SELECT COUNT(*)::int AS count FROM rfq_requests WHERE status IN ('new', 'contacted')`)
      pendingRfqCount = rfqResult.rows[0]?.count || 0
    } catch { /* rfq_requests table may not exist */ }

    // ══════════════════════════════════════════════════════════════════
    // NEW: Conversion Funnel
    // ══════════════════════════════════════════════════════════════════
    let funnel = { visitors: 0, leads: 0, rfqs: 0, quotations: 0, closed: 0 }
    try {
      const funnelResult = await query(`
        SELECT
          (SELECT COUNT(*) FROM page_views WHERE is_admin = FALSE) AS visitors,
          (SELECT COUNT(*) FROM chatbot.leads) AS leads,
          (SELECT COUNT(*) FROM rfq_requests) AS rfqs,
          (SELECT COUNT(*) FROM quotations) AS quotations,
          (SELECT COUNT(*) FROM quotations WHERE status IN ('accepted', 'closed_won')) AS closed
      `)
      funnel = funnelResult.rows[0] || funnel
    } catch { /* skip */ }

    // ══════════════════════════════════════════════════════════════════
    // NEW: RFQ Aging
    // ══════════════════════════════════════════════════════════════════
    let rfqAging: Record<string, number> = { fresh: 0, attention: 0, warning: 0, critical: 0 }
    let rfqAgingValue: Record<string, number> = { fresh: 0, attention: 0, warning: 0, critical: 0 }
    try {
      const agingResult = await query(`
        SELECT
          CASE
            WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 'fresh'
            WHEN created_at >= NOW() - INTERVAL '3 days' THEN 'attention'
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'warning'
            ELSE 'critical'
          END AS bucket,
          COUNT(*)::int AS count,
          COALESCE(SUM(COALESCE(estimated_total, 0)), 0)::numeric(10,2) AS total_value
        FROM rfq_requests
        WHERE status IN ('new', 'contacted')
        GROUP BY bucket
      `)
      for (const row of agingResult.rows) {
        rfqAging[row.bucket] = Number(row.count)
        rfqAgingValue[row.bucket] = Number(row.total_value)
      }
    } catch { /* skip */ }

    // ══════════════════════════════════════════════════════════════════
    // NEW: Response Time (avg hours to first admin reply)
    // ══════════════════════════════════════════════════════════════════
    let avgResponseHours: number | null = null
    try {
      const responseResult = await query(`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first_reply - created_at)) / 3600))::int AS avg_hours
        FROM (
          SELECT c.created_at, MIN(m.created_at) AS first_reply
          FROM chatbot.conversations c
          JOIN chatbot.messages m ON m.conversation_id = c.id AND m.sender_type IN ('admin', 'agent')
          WHERE m.created_at > c.created_at
          GROUP BY c.id
        ) sub
        WHERE first_reply > created_at
      `)
      avgResponseHours = responseResult.rows[0]?.avg_hours || null
    } catch { /* skip */ }

    // ══════════════════════════════════════════════════════════════════
    // NEW: Hot Products by RFQ count
    // ══════════════════════════════════════════════════════════════════
    let hotProducts: { title: string; rfqCount: number }[] = []
    let coldProducts: number = 0
    try {
      const hotResult = await query(`
        SELECT p.title, COUNT(ri.id)::int AS rfq_count
        FROM products p
        LEFT JOIN rfq_request_items ri ON ri.product_id = p.id
        GROUP BY p.id, p.title
        ORDER BY rfq_count DESC
        LIMIT 10
      `)
      hotProducts = hotResult.rows.map((r: any) => ({ title: r.title, rfqCount: r.rfq_count }))
      const coldResult = await query(`
        SELECT COUNT(*)::int AS cold FROM products p
        WHERE NOT EXISTS (SELECT 1 FROM rfq_request_items ri WHERE ri.product_id = p.id)
      `)
      coldProducts = coldResult.rows[0]?.cold || 0
    } catch { /* skip */ }

    // ══════════════════════════════════════════════════════════════════
    // NEW: Weekly Pulse Score (0-100)
    // ══════════════════════════════════════════════════════════════════
    let pulseScore = 50
    try {
      const thisWeek = await query(`
        SELECT
          (SELECT COUNT(*) FROM chatbot.leads WHERE created_at >= NOW() - INTERVAL '7 days') AS leads,
          (SELECT COUNT(*) FROM rfq_requests WHERE created_at >= NOW() - INTERVAL '7 days') AS rfqs,
          (SELECT COUNT(*) FROM quotations WHERE created_at >= NOW() - INTERVAL '7 days') AS quotes,
          (SELECT COUNT(*) FROM chatbot.conversations WHERE status = 'active' AND last_message_at < NOW() - INTERVAL '48 hours') AS stale
      `)
      const w = thisWeek.rows[0] || {}
      const leads = Number(w.leads || 0)
      const rfqs = Number(w.rfqs || 0)
      const quotes = Number(w.quotes || 0)
      const stale = Number(w.stale || 0)
      // Score: leads(0-30) + rfqs(0-30) + quotes(0-30) - stale_penalty(0-20)
      const leadScore = Math.min(leads * 3, 30)
      const rfqScore = Math.min(rfqs * 5, 30)
      const quoteScore = Math.min(quotes * 6, 30)
      const stalePenalty = Math.min(stale * 5, 20)
      pulseScore = Math.max(0, Math.min(100, leadScore + rfqScore + quoteScore - stalePenalty))
    } catch { /* skip */ }

    // ══════════════════════════════════════════════════════════════════
    // NEW: Abandoned RFQ Carts
    // ══════════════════════════════════════════════════════════════════
    let abandonedRfqCount = 0
    try {
      const abResult = await query(`
        SELECT COUNT(*)::int AS count FROM chatbot.rfq_carts
        WHERE status = 'draft' AND updated_at < NOW() - INTERVAL '24 hours'
      `)
      abandonedRfqCount = abResult.rows[0]?.count || 0
    } catch { /* skip */ }

    return NextResponse.json({
      unreadCounts,
      unrepliedCount,
      pendingRfqCount,
      // New fields
      conversionFunnel: funnel,
      rfqAging: { buckets: rfqAging, values: rfqAgingValue },
      avgResponseHours,
      hotProducts,
      coldProductCount: coldProducts,
      pulseScore,
      abandonedRfqCount,
    })
  } catch (error: any) {
    console.error('[dashboard-insights] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
