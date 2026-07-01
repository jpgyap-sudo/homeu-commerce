import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Quotations pending revision or newly accepted (actionable)
    let quotationsCount = 0
    try {
      const qResult = await query(
        "SELECT COUNT(*)::int AS count FROM quotations WHERE pending_revision = TRUE OR status = 'accepted'"
      )
      quotationsCount = qResult.rows[0]?.count || 0
    } catch (e) {
      console.warn('[sidebar-counts] Failed to count quotations:', (e as Error).message)
    }

    // 2. RFQ Requests with status = 'new'
    let rfqsCount = 0
    try {
      const rfqResult = await query(
        "SELECT COUNT(*)::int AS count FROM rfq_requests WHERE status = 'new'"
      )
      rfqsCount = rfqResult.rows[0]?.count || 0
    } catch (e) {
      console.warn('[sidebar-counts] Failed to count RFQs:', (e as Error).message)
    }

    // 3. Showroom visit appointments with status = 'requested'
    let appointmentsCount = 0
    try {
      const apptResult = await query(
        "SELECT COUNT(*)::int AS count FROM chatbot.appointments WHERE status = 'requested'"
      )
      appointmentsCount = apptResult.rows[0]?.count || 0
    } catch (e) {
      console.warn('[sidebar-counts] Failed to count appointments:', (e as Error).message)
    }

    return NextResponse.json({
      quotations: quotationsCount,
      rfqs: rfqsCount,
      appointments: appointmentsCount,
    })
  } catch (err) {
    console.error('[api/admin/sidebar-counts] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
