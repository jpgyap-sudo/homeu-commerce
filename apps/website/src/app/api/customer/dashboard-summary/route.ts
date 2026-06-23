/**
 * GET /api/customer/dashboard-summary
 *
 * Single aggregated payload for the customer dashboard "command center":
 * profile, RFQ projects (with item + chat summary), and quotations awaiting
 * a decision. One round trip instead of the dashboard firing off N separate
 * fetches (and N+1 chat lookups per RFQ).
 *
 * Strictly scoped to the logged-in customer's own data — a customer session
 * can never pass another customer's id (mirrors resolveRfqAccess in
 * /api/rfq-requests; staff roles get 403 here since this route has no use
 * for them).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const out: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = snakeToCamel(obj[key])
  }
  return out
}

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const customerId = Number(session.id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return NextResponse.json({ error: 'Customer account is invalid' }, { status: 403 })
  }

  try {
    const customerRes = await query(
      `SELECT id, name, email, phone, address, created_at FROM customers WHERE id = $1 LIMIT 1`,
      [customerId]
    )
    if (customerRes.rowCount === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customerEmail = customerRes.rows[0].email || session.email

    const rfqsRes = await query(
      `SELECT r.*,
              COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                  'id', ri.id,
                  'productTitleSnapshot', ri.product_title_snapshot,
                  'skuSnapshot', ri.sku_snapshot,
                  'unitPriceSnapshot', ri.unit_price_snapshot,
                  'quantity', ri.quantity
                ) ORDER BY ri.id) FROM rfq_request_items ri WHERE ri.rfq_request_id = r.id),
                '[]'::jsonb
              ) AS items,
              c.id AS conversation_id,
              c.message_count,
              c.last_message_at,
              (SELECT m.sender_type FROM rfq_chat_messages m
                WHERE m.conversation_id = c.id AND m.customer_visible = TRUE AND m.deleted_at IS NULL
                ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender,
              (SELECT m.content FROM rfq_chat_messages m
                WHERE m.conversation_id = c.id AND m.customer_visible = TRUE AND m.deleted_at IS NULL
                ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview
       FROM rfq_requests r
       LEFT JOIN LATERAL (
         SELECT *
         FROM rfq_chat_conversations
         WHERE rfq_request_id = r.id
         ORDER BY last_message_at DESC NULLS LAST, created_at DESC
         LIMIT 1
       ) c ON TRUE
       WHERE r.customer_id = $1
          OR LOWER(COALESCE(r.email, '')) = LOWER($2)
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [customerId, customerEmail]
    )

    const quotationsRes = await query(
      `SELECT q.id,
              q.quotation_number,
              q.rfq_id,
              q.status,
              q.pending_revision,
              q.revision_request,
              COALESCE(q.grand_total, q.total, 0) AS total,
              q.created_at,
              q.updated_at
       FROM quotations q
       LEFT JOIN rfq_requests r ON r.id = q.rfq_id
       WHERE q.customer_id = $1
          OR LOWER(COALESCE(q.email, q.customer_email, '')) = LOWER($2)
          OR r.customer_id = $1
          OR LOWER(COALESCE(r.email, '')) = LOWER($2)
       ORDER BY q.created_at DESC
       LIMIT 100`,
      [customerId, customerEmail]
    )

    const rfqs = rfqsRes.rows.map(snakeToCamel)
    const quotations = quotationsRes.rows.map(snakeToCamel)

    const activeProjects = rfqs.filter((r: any) => !['closed', 'lost'].includes(r.status)).length
    const awaitingDecision = quotations.filter((q: any) => q.status === 'sent' && !q.pendingRevision).length
    const totalInvestment = quotations
      .filter((q: any) => q.status === 'accepted')
      .reduce((sum: number, q: any) => sum + (parseFloat(q.total) || 0), 0)

    return NextResponse.json({
      customer: snakeToCamel(customerRes.rows[0]),
      rfqs,
      quotations,
      stats: { activeProjects, awaitingDecision, totalInvestment },
    })
  } catch (err: any) {
    console.error('[api/customer/dashboard-summary] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
