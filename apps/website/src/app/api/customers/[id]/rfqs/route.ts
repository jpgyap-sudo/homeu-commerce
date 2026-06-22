/**
 * API route to fetch RFQ requests linked to a customer.
 * Links via rfq_requests.customer_id = customers.id
 *
 * Returns camelCase JSON with aggregated items, matching the RFQDetail shape
 * expected by the admin customer detail page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { rows } = await query(
      `SELECT r.id, r.status, r.customer_name, r.email, r.phone,
              r.delivery_location, r.project_type, r.notes,
              r.estimated_total, r.created_at, r.updated_at,
              r.quotation_sent_at, r.quotation_sent_via, r.quotation_notes,
              r.closed_at, r.closed_reason,
              r.archived_at, r.auto_archive_deadline,
              r.extension_status, r.extension_reason, r.extension_approved_until,
              COALESCE(
                (SELECT jsonb_agg(jsonb_build_object(
                  'id', ri.id,
                  'productTitleSnapshot', ri.product_title_snapshot,
                  'skuSnapshot', ri.sku_snapshot,
                  'unitPriceSnapshot', ri.unit_price_snapshot,
                  'quantity', ri.quantity,
                  'notes', ri.notes
                ) ORDER BY ri.id) FROM rfq_request_items ri WHERE ri.rfq_request_id = r.id),
                '[]'::jsonb
              ) as items
       FROM rfq_requests r
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [id]
    )

    // Convert snake_case rows to camelCase for frontend consumers
    const rfqs = rows.map(snakeToCamel)

    return NextResponse.json(rfqs)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch RFQs' }, { status: 500 })
  }
}
