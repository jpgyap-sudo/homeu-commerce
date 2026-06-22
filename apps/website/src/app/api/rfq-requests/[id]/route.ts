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
        AND ($2::integer IS NULL OR r.customer_id = $2)`,
      [rfqId, access.customerId]
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
