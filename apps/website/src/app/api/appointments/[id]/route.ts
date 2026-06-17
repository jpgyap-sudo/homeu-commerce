import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * GET /api/appointments/[id] — single appointment detail (admin only)
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
    const { id } = await params
    const r = await query(
      `SELECT a.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
       FROM chatbot.appointments a
       LEFT JOIN chatbot.leads l ON a.lead_id = l.id
       WHERE a.id = $1`,
      [id]
    )
    if (r.rows.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    return NextResponse.json(r.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
