/**
 * API route to fetch RFQ requests linked to a customer.
 * Links via rfq_requests.customer = customers.id
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

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
      `SELECT id, status, delivery_location, project_type,
              estimated_total, notes, created_at, submitted_at
       FROM rfq_requests
       WHERE customer = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    )
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch RFQs' }, { status: 500 })
  }
}
