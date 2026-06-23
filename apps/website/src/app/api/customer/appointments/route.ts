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

const SLOT_CAPACITY = 2
const SLOT_MINUTES = 30
const BOOKED_STATUSES = ['requested', 'confirmed']

function workingWindow(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const day = date.getDay()
  if (day === 0) return { open: 13 * 60, close: 18 * 60 }
  return { open: 10 * 60, close: 18 * 60 }
}

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function formatSlotLabel(startMinutes: number) {
  const endMinutes = startMinutes + SLOT_MINUTES
  const fmt = (minutes: number) => {
    const hour24 = Math.floor(minutes / 60)
    const minute = minutes % 60
    const suffix = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 % 12 || 12
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
  }
  return `${fmt(startMinutes)} - ${fmt(endMinutes)}`
}

function parseSlotTime(time: string) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

async function getSlotAvailability(dateString: string) {
  const window = workingWindow(dateString)
  if (!window) return null

  const countsRes = await query(
    `SELECT preferred_time, COUNT(*)::int AS count
     FROM chatbot.appointments
     WHERE preferred_date = $1::date
       AND status = ANY($2::text[])
     GROUP BY preferred_time`,
    [dateString, BOOKED_STATUSES]
  )
  const counts = new Map<string, number>()
  for (const row of countsRes.rows) {
    const minutes = parseSlotTime(row.preferred_time)
    if (minutes === null) continue
    counts.set(minutesToTime(minutes), Number(row.count || 0))
  }

  const slots = []
  for (let minutes = window.open; minutes < window.close; minutes += SLOT_MINUTES) {
    const time = minutesToTime(minutes)
    const count = counts.get(time) || 0
    slots.push({
      time,
      label: formatSlotLabel(minutes),
      count,
      capacity: SLOT_CAPACITY,
      fullyBooked: count >= SLOT_CAPACITY,
    })
  }
  return {
    date: dateString,
    openTime: minutesToTime(window.open),
    closeTime: minutesToTime(window.close),
    capacity: SLOT_CAPACITY,
    slots,
  }
}

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

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const lead = await findLeadByEmail(session.email)
    const slotAvailability = dateParam ? await getSlotAvailability(dateParam) : null
    if (dateParam && !slotAvailability) {
      return NextResponse.json({ error: 'Invalid appointment date' }, { status: 400 })
    }
    if (!lead) {
      return NextResponse.json({ appointments: [], slotAvailability })
    }
    const result = await query(
      `SELECT id, TO_CHAR(preferred_date, 'YYYY-MM-DD') AS preferred_date, preferred_time, visitor_count, categories_of_interest, status, notes, created_at
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
      slotAvailability,
    })
  } catch (err: any) {
    console.error('[api/customer/appointments] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { preferredDate, preferredTime, visitorCount, categoriesOfInterest, notes, insistFullyBooked } = body

    if (!preferredDate?.trim()) return NextResponse.json({ error: 'Preferred date is required' }, { status: 400 })
    if (!preferredTime?.trim()) return NextResponse.json({ error: 'Preferred time is required' }, { status: 400 })
    const count = Number(visitorCount) || 1
    if (count < 1 || count > 20) return NextResponse.json({ error: 'Visitor count must be between 1 and 20' }, { status: 400 })

    const requestedDate = new Date(`${preferredDate}T00:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (Number.isNaN(requestedDate.getTime()) || requestedDate < today) {
      return NextResponse.json({ error: 'Preferred date must be today or later' }, { status: 400 })
    }
    const requestedMinutes = parseSlotTime(preferredTime)
    const window = workingWindow(preferredDate)
    if (!window || requestedMinutes === null || requestedMinutes % SLOT_MINUTES !== 0 || requestedMinutes < window.open || requestedMinutes >= window.close) {
      return NextResponse.json({ error: 'Please choose an appointment time within showroom working hours.' }, { status: 400 })
    }

    const availability = await getSlotAvailability(preferredDate)
    const requestedSlot = availability?.slots.find((slot: any) => slot.time === minutesToTime(requestedMinutes))
    const fullyBooked = Boolean(requestedSlot?.fullyBooked)
    if (fullyBooked && !insistFullyBooked) {
      return NextResponse.json(
        {
          error: 'This time slot is already fully booked. You may still request it, but priority service cannot be assured.',
          fullyBooked: true,
          slot: requestedSlot,
        },
        { status: 409 }
      )
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
      notes: [
        fullyBooked ? 'Client insisted on a fully booked slot. Priority service cannot be assured.' : '',
        notes?.trim() || '',
      ].filter(Boolean).join('\n') || undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to book appointment' }, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      appointmentId: result.appointmentId,
      fullyBooked,
      warning: fullyBooked ? 'This slot is fully booked. Priority service cannot be assured.' : undefined,
    })
  } catch (err: any) {
    console.error('[api/customer/appointments] POST error:', err.message)
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 })
  }
}
