import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

/**
 * Recursively convert snake_case object keys to camelCase.
 * Skips null/undefined, arrays, dates, primitives.
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
 * GET /api/rfq-requests
 *
 * List RFQ requests with optional customer filter, search, and pagination.
 * Returns camelCase keys with aggregated items JSON array.
 *
 * Query params:
 *   customerId  - Filter by customer_id (number)
 *   limit       - Max results (default 20, max 100)
 *   offset      - Pagination offset (default 0)
 *   search      - Optional search term for customer_name/email
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = request.nextUrl
    const customerId = searchParams.get('customerId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    const conditions: string[] = []
    const values: any[] = []
    let idx = 0

    if (customerId) {
      idx++
      conditions.push(`r.customer_id = $${idx}`)
      values.push(parseInt(customerId))
    }

    if (search) {
      idx++
      conditions.push(
        `(LOWER(COALESCE(r.customer_name,'')) LIKE LOWER($${idx}) OR LOWER(COALESCE(r.email,'')) LIKE LOWER($${idx}))`
      )
      values.push(`%${search}%`)
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count total matching rows
    const countRes = await query(
      `SELECT COUNT(*) as total FROM rfq_requests r ${whereSQL}`,
      values
    )
    const total = parseInt(countRes.rows[0]?.total || '0')

    // Fetch paginated rows with aggregated items
    idx++
    const itemsSQL = `SELECT r.*, COALESCE(
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
    ${whereSQL}
    ORDER BY r.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}`

    const result = await query(itemsSQL, [...values, limit, offset])

    // Convert snake_case rows to camelCase for frontend consumers
    const rfqs = result.rows.map(snakeToCamel)

    return NextResponse.json({
      rfqs,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('RFQ requests GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch RFQ requests' }, { status: 500 })
  }
}
