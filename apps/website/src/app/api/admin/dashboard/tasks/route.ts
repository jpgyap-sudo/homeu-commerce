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
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, 
               TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, 
               a.preferred_time, a.created_at
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
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, 
               TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, 
               a.preferred_time, a.status
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
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, 
               TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, 
               a.status, a.created_at AS updated_at
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        WHERE a.status IN ('completed', 'cancelled')
        ORDER BY a.created_at DESC
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
        SELECT a.id, COALESCE(l.name, 'Unknown') as lead_name, 
               TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, 
               a.preferred_time, a.status
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        WHERE a.preferred_date >= CURRENT_DATE - INTERVAL '60 days'
          AND a.preferred_date <= CURRENT_DATE + INTERVAL '60 days'
      `)
      const apptEvents = apptCalendarResult.rows.map((row: any) => ({
        id: row.id,
        type: 'appointment',
        date: row.preferred_date || null,
        title: `Showroom Visit: ${row.lead_name}`,
        time: row.preferred_time || '',
        status: row.status,
        color: row.status === 'confirmed' ? '#2563eb' : row.status === 'completed' ? '#059669' : '#94a3b8',
        href: `/admin/collections/appointments/${row.id}`
      }))

      // 6b. Quotations
      const quoteCalendarResult = await query(`
        SELECT id, quotation_number, customer_name, grand_total, 
               TO_CHAR(created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') as created_date, 
               status
        FROM quotations
        WHERE created_at >= NOW() - INTERVAL '60 days'
      `)
      const quoteEvents = quoteCalendarResult.rows.map((row: any) => ({
        id: row.id,
        type: 'quotation',
        date: row.created_date || null,
        title: `Quote ${row.quotation_number}: ${row.customer_name}`,
        time: `₱${Number(row.grand_total).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        status: row.status,
        color: row.status === 'accepted' ? '#059669' : row.status === 'sent' ? '#d97706' : '#64748b',
        href: `/admin/quotations/${row.id}`
      }))

      // 6c. Custom Sales Calendar Events
      let customEvents: any[] = []
      try {
        const customCalendarResult = await query(`
          SELECT e.id, e.event_type, e.title, e.description, 
                 TO_CHAR(e.event_date, 'YYYY-MM-DD') as event_date, 
                 e.event_time, e.customer_id, c.name as customer_name, c.email, c.phone
          FROM sales_calendar_events e
          LEFT JOIN customers c ON e.customer_id = c.id
          WHERE e.event_date >= CURRENT_DATE - INTERVAL '60 days'
            AND e.event_date <= CURRENT_DATE + INTERVAL '60 days'
        `)
        customEvents = customCalendarResult.rows.map((row: any) => {
          let color = '#4b5563' // Gray for default task
          if (row.event_type === 'site_visit') color = '#a855f7' // Purple
          else if (row.event_type === 'meeting') color = '#d946ef' // Magenta/Pink (outside meeting)
          else if (row.event_type === 'presentation') color = '#ec4899' // Pink (outside presentation)
          else if (row.event_type === 'note') color = '#6b7280' // Slate
          else if (row.event_type === 'appointment') color = '#10b981' // Green (outside appointment)

          return {
            id: `custom-${row.id}`,
            type: 'custom',
            eventType: row.event_type,
            date: row.event_date || null,
            title: row.title,
            time: row.event_time || '',
            status: 'pending',
            color,
            href: row.customer_id ? `/admin/sales-calendar?customerId=${row.customer_id}` : '/admin/sales-calendar',
            customer: row.customer_id ? {
              id: row.customer_id,
              name: row.customer_name || '',
              email: row.email || '',
              phone: row.phone || ''
            } : null
          }
        })
      } catch (e) {
        console.warn('[tasks-api] custom calendar events query error:', (e as Error).message)
      }

      calendarEvents = [...apptEvents, ...quoteEvents, ...customEvents]
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
