import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { resolveRfqAccess } from '@/lib/rfq-access'

/**
 * Recursively convert snake_case object keys to camelCase.
 */
function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)

  const cameled: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    cameled[camelKey] = snakeToCamel(obj[key])
  }
  return cameled
}

/**
 * GET /api/rfq-requests/[id]
 *
 * Returns a single RFQ request with full detail including items.
 * Keys are converted to camelCase for frontend consumers (customer RFQ detail page).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const access = resolveRfqAccess(session, null)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { id } = await params
    const rfqId = parseInt(id)
    if (isNaN(rfqId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    // Fetch RFQ with aggregated items JSON
    const result = await query(
      `SELECT r.*, COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'id', ri.id,
          'productId', ri.product_id,
          'productSlug', p.slug,
          'productTitleSnapshot', ri.product_title_snapshot,
          'skuSnapshot', ri.sku_snapshot,
          'unitPriceSnapshot', ri.unit_price_snapshot,
          'quantity', ri.quantity,
          'notes', ri.notes
        ) ORDER BY ri.id) FROM rfq_request_items ri LEFT JOIN products p ON p.id = ri.product_id WHERE ri.rfq_request_id = r.id),
        '[]'::jsonb
      ) as items
      FROM rfq_requests r
      WHERE r.id = $1
        AND (
          $2::integer IS NULL
          OR r.customer_id = $2
          OR LOWER(COALESCE(r.email, '')) = LOWER($3)
        )`,
      [rfqId, access.customerId, session.email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    // Convert to camelCase for the frontend consumer
    const rfq = snakeToCamel(result.rows[0])

    return NextResponse.json(rfq)
  } catch (error: any) {
    console.error('RFQ request detail GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch RFQ request' }, { status: 500 })
  }
}

/**
 * PATCH /api/rfq-requests/[id]
 *
 * Two narrow actions, gated by role:
 *   - Customer: { action: 'request_extension', reason } — asks the store
 *     to push back the 30-day auto-archive deadline before it hits.
 *   - Staff: { action: 'approve_extension' | 'deny_extension', extendDays? }
 *     — decides on a pending request.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const rfqId = parseInt(id)
    if (isNaN(rfqId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }
    const body = await request.json()
    const { action } = body

    if (action === 'request_extension') {
      const access = resolveRfqAccess(session, null)
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
      const result = await query(
        `UPDATE rfq_requests
         SET extension_status = 'requested', extension_reason = $1
         WHERE id = $2 AND archived_at IS NULL
           AND ($3::integer IS NULL OR customer_id = $3 OR LOWER(COALESCE(email, '')) = LOWER($4))
         RETURNING id, extension_status, extension_reason`,
        [reason, rfqId, access.customerId, session.email]
      )
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'RFQ not found or already archived' }, { status: 404 })
      }
      return NextResponse.json(snakeToCamel(result.rows[0]))
    }

    if (action === 'approve_extension' || action === 'deny_extension') {
      if (session.role === 'customer') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const extendDays = Number.isInteger(body.extendDays) && body.extendDays > 0 ? body.extendDays : 30
      const approved = action === 'approve_extension'
      const result = await query(
        `UPDATE rfq_requests
         SET extension_status = $1::varchar,
             extension_approved_until = CASE WHEN $1::varchar = 'approved' THEN NOW() + ($2::text || ' days')::interval ELSE extension_approved_until END
         WHERE id = $3
         RETURNING id, extension_status, extension_approved_until`,
        [approved ? 'approved' : 'denied', extendDays, rfqId]
      )
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
      }
      return NextResponse.json(snakeToCamel(result.rows[0]))
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('RFQ request PATCH error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update RFQ request' }, { status: 500 })
  }
}
