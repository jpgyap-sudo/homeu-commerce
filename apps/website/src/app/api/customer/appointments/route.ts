/**
 * GET  /api/customer/appointments — list the logged-in customer's own
 *      showroom-visit appointment requests (for the "Book Appointment"
 *      dashboard widget).
 * POST /api/customer/appointments — request a new appointment.
 *
 * Bridges the customer-session world to the existing chatbot.appointments
 * system (lead_id-keyed) so the dashboard reuses the same booking
 * pipeline — and Telegram alert — the chat widget already uses, instead of
 * building a second, parallel appointments table.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { findLeadByEmail } from '@/lib/chatbot/customer-sync'
import { insertLead } from '@/lib/chatbot/db'
import { requestAppointment } from '@/lib/chatbot/appointment-service'

async function resolveLeadId(customerId: number, name: string, email: string, phone: string): Promise<string> {
  const existing = await findLeadByEmail(email)
  if (existing) return existing.id
  return insertLead({
    name: name || email,
    email,
    mobile: phone || '',
    buyerType: 'individual',
    consent: true,
    daVinciosCustomerId: String(customerId),
  })
}

export async function GET(_request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const lead = await findLeadByEmail(session.email)
    if (!lead) {
      return NextResponse.json({ appointments: [] })
    }
    const result = await query(
      `SELECT id, preferred_date, preferred_time, visitor_count, categories_of_interest, status, notes, created_at
       FROM chatbot.appointments WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [lead.id]
    )
    return NextResponse.json({
      appointments: result.rows.map((r: any) => ({
        id: r.id,
        preferredDate: r.preferred_date,
        preferredTime: r.preferred_time,
        visitorCount: r.visitor_count,
        categoriesOfInterest: r.categories_of_interest || [],
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    })
  } catch (err: any) {
    console.error('[api/customer/appointments] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { preferredDate, preferredTime, visitorCount, categoriesOfInterest, notes } = body

    if (!preferredDate?.trim()) return NextResponse.json({ error: 'Preferred date is required' }, { status: 400 })
    if (!preferredTime?.trim()) return NextResponse.json({ error: 'Preferred time is required' }, { status: 400 })
    const count = Number(visitorCount) || 1
    if (count < 1 || count > 20) return NextResponse.json({ error: 'Visitor count must be between 1 and 20' }, { status: 400 })

    const requestedDate = new Date(`${preferredDate}T00:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (Number.isNaN(requestedDate.getTime()) || requestedDate < today) {
      return NextResponse.json({ error: 'Preferred date must be today or later' }, { status: 400 })
    }

    const customerRes = await query('SELECT phone FROM customers WHERE id = $1 LIMIT 1', [session.id])
    const phone = customerRes.rows[0]?.phone || ''

    const leadId = await resolveLeadId(Number(session.id), session.name, session.email, phone)

    const result = await requestAppointment({
      leadId,
      preferredDate,
      preferredTime,
      visitorCount: count,
      categoriesOfInterest: Array.isArray(categoriesOfInterest) ? categoriesOfInterest : undefined,
      notes: notes?.trim() || undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to book appointment' }, { status: 500 })
    }
    return NextResponse.json({ success: true, appointmentId: result.appointmentId })
  } catch (err: any) {
    console.error('[api/customer/appointments] POST error:', err.message)
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 })
  }
}
