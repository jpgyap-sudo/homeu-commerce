import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch unread/unreplied chatbot conversations
    let unreadChats: any[] = []
    try {
      const chatResult = await query(`
        SELECT c.id, COALESCE(l.name, 'Anonymous Visitor') as lead_name, c.last_message_at
        FROM chatbot.conversations c
        LEFT JOIN chatbot.leads l ON l.id = c.lead_id
        WHERE c.status = 'active' AND c.is_read = FALSE
        ORDER BY c.last_message_at DESC
        LIMIT 5
      `)
      unreadChats = chatResult.rows
    } catch (e) {
      console.warn('[tasks-api] chatbot.conversations error:', (e as Error).message)
    }

    // 2. Fetch pending RFQ requests
    let pendingRfqs: any[] = []
    try {
      const rfqResult = await query(`
        SELECT id, customer_name, estimated_total, created_at, status
        FROM rfq_requests
        WHERE status IN ('new', 'contacted')
        ORDER BY created_at DESC
        LIMIT 5
      `)
      pendingRfqs = rfqResult.rows
    } catch (e) {
      console.warn('[tasks-api] rfq_requests error:', (e as Error).message)
    }

    // 3. Fetch new showroom visit requests (requested status)
    let showroomRequests: any[] = []
    try {
      const apptResult = await query(`
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, a.preferred_date, a.preferred_time, a.created_at
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        WHERE a.status = 'requested'
        ORDER BY a.created_at DESC
        LIMIT 5
      `)
      showroomRequests = apptResult.rows
    } catch (e) {
      console.warn('[tasks-api] appointments requests error:', (e as Error).message)
    }

    // 4. Fetch upcoming showroom appointments (confirmed, next 7 days)
    let upcomingAppointments: any[] = []
    try {
      const upcomingResult = await query(`
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, a.preferred_date, a.preferred_time, a.status
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        WHERE a.status = 'confirmed'
          AND a.preferred_date >= CURRENT_DATE
          AND a.preferred_date <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY a.preferred_date ASC, a.preferred_time ASC
        LIMIT 5
      `)
      upcomingAppointments = upcomingResult.rows
    } catch (e) {
      console.warn('[tasks-api] upcoming appointments error:', (e as Error).message)
    }

    // 5. Fetch past tasks / activity history (Quotations sent, RFQs resolved, Appointments done)
    let pastQuotations: any[] = []
    try {
      const quoteResult = await query(`
        SELECT id, quotation_number, customer_name, grand_total, created_at, status
        FROM quotations
        ORDER BY created_at DESC
        LIMIT 10
      `)
      pastQuotations = quoteResult.rows
    } catch (e) {
      console.warn('[tasks-api] quotations history error:', (e as Error).message)
    }

    let pastAppointments: any[] = []
    try {
      const apptHistoryResult = await query(`
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, a.preferred_date, a.status, a.updated_at
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        WHERE a.status IN ('completed', 'cancelled')
        ORDER BY a.updated_at DESC
        LIMIT 5
      `)
      pastAppointments = apptHistoryResult.rows
    } catch (e) {
      console.warn('[tasks-api] appointments history error:', (e as Error).message)
    }

    let pastRfqs: any[] = []
    try {
      const rfqHistoryResult = await query(`
        SELECT id, customer_name, status, updated_at
        FROM rfq_requests
        WHERE status NOT IN ('new', 'contacted')
        ORDER BY updated_at DESC
        LIMIT 5
      `)
      pastRfqs = rfqHistoryResult.rows
    } catch (e) {
      console.warn('[tasks-api] rfq history error:', (e as Error).message)
    }

    // 6. Fetch calendar events (Quotations and Appointments for last 60 days to next 60 days)
    let calendarEvents: any[] = []
    try {
      // 6a. Appointments
      const apptCalendarResult = await query(`
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, a.preferred_date, a.preferred_time, a.status
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        WHERE a.preferred_date >= CURRENT_DATE - INTERVAL '60 days'
          AND a.preferred_date <= CURRENT_DATE + INTERVAL '60 days'
      `)
      const apptEvents = apptCalendarResult.rows.map((row: any) => ({
        id: row.id,
        type: 'appointment',
        date: row.preferred_date ? new Date(row.preferred_date).toISOString().split('T')[0] : null,
        title: `Showroom Visit: ${row.lead_name}`,
        time: row.preferred_time || '',
        status: row.status,
        color: row.status === 'confirmed' ? '#2563eb' : row.status === 'completed' ? '#059669' : '#94a3b8',
        href: `/admin/collections/appointments/${row.id}`
      }))

      // 6b. Quotations
      const quoteCalendarResult = await query(`
        SELECT id, quotation_number, customer_name, grand_total, created_at, status
        FROM quotations
        WHERE created_at >= NOW() - INTERVAL '60 days'
      `)
      const quoteEvents = quoteCalendarResult.rows.map((row: any) => ({
        id: row.id,
        type: 'quotation',
        date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : null,
        title: `Quote ${row.quotation_number}: ${row.customer_name}`,
        time: `₱${Number(row.grand_total).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        status: row.status,
        color: row.status === 'accepted' ? '#059669' : row.status === 'sent' ? '#d97706' : '#64748b',
        href: `/admin/quotations/${row.id}`
      }))

      calendarEvents = [...apptEvents, ...quoteEvents]
    } catch (e) {
      console.warn('[tasks-api] calendar aggregation error:', (e as Error).message)
    }

    return NextResponse.json({
      tasksToDo: {
        unreadChats,
        pendingRfqs,
        showroomRequests,
        upcomingAppointments
      },
      pastTasks: {
        quotations: pastQuotations,
        appointments: pastAppointments,
        rfqs: pastRfqs
      },
      calendarEvents
    })
  } catch (error: any) {
    console.error('[tasks-api] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
