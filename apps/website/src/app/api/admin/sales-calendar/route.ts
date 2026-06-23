import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// GET /api/admin/sales-calendar — Aggregates all calendar events for the calendar view
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch Showroom Visits (Appointments)
    let showroomAppointments: any[] = []
    try {
      const apptResult = await query(`
        SELECT a.id, COALESCE(l.name, 'Unknown') as customer_name, 
               TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as event_date, 
               a.preferred_time, a.status, a.notes, l.email, l.phone, c.id as customer_id
        FROM chatbot.appointments a
        LEFT JOIN chatbot.leads l ON l.id = a.lead_id
        LEFT JOIN customers c ON LOWER(c.email) = LOWER(l.email)
        WHERE a.preferred_date IS NOT NULL
      `)
      showroomAppointments = apptResult.rows.map((row: any) => {
        let color = '#f59e0b' // Amber for requested
        if (row.status === 'confirmed') color = '#2563eb' // Blue
        else if (row.status === 'completed') color = '#059669' // Emerald
        else if (row.status === 'cancelled') color = '#ef4444' // Red

        return {
          id: `appt-${row.id}`,
          dbId: row.id,
          type: 'appointment',
          date: row.event_date,
          time: row.preferred_time || '',
          title: `Showroom Visit: ${row.customer_name}`,
          description: row.notes || '',
          status: row.status,
          color,
          href: `/admin/collections/appointments/${row.id}`,
          customer: {
            id: row.customer_id || null,
            name: row.customer_name,
            email: row.email || '',
            phone: row.phone || ''
          }
        }
      })
    } catch (e: any) {
      console.warn('[sales-calendar-api] chatbot.appointments error:', e.message)
    }

    // 2. Fetch Quotations Milestones
    let quotationMilestones: any[] = []
    try {
      const quoteResult = await query(`
        SELECT q.id, q.quotation_number, q.customer_name, q.grand_total, 
               TO_CHAR(q.sent_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') as sent_date, 
               TO_CHAR(q.updated_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') as accepted_date,
               TO_CHAR(q.valid_until, 'YYYY-MM-DD') as validity_date,
               q.status, q.email, q.phone, q.customer_id
        FROM quotations q
      `)

      for (const row of quoteResult.rows) {
        const formattedTotal = Number(row.grand_total).toLocaleString('en-PH', { maximumFractionDigits: 0 })
        const customerInfo = {
          id: row.customer_id || null,
          name: row.customer_name,
          email: row.email || '',
          phone: row.phone || ''
        }

        // If sent date exists, add "sent" event
        if (row.sent_date) {
          quotationMilestones.push({
            id: `quote-sent-${row.id}`,
            dbId: row.id,
            type: 'quotation',
            date: row.sent_date,
            time: `₱${formattedTotal}`,
            title: `Quote Sent: ${row.customer_name} (${row.quotation_number})`,
            description: `Sent formal quotation for ₱${formattedTotal}`,
            status: 'sent',
            color: '#ea580c', // Orange
            href: `/admin/quotations/${row.id}`,
            customer: customerInfo
          })
        }

        // If accepted status, add "accepted" event
        if (row.status === 'accepted' && row.accepted_date) {
          quotationMilestones.push({
            id: `quote-accepted-${row.id}`,
            dbId: row.id,
            type: 'quotation',
            date: row.accepted_date,
            time: `₱${formattedTotal}`,
            title: `Order Confirmed: ${row.customer_name} (${row.quotation_number})`,
            description: `Quotation approved and deposit paid for ₱${formattedTotal}`,
            status: 'accepted',
            color: '#10b981', // Green
            href: `/admin/quotations/${row.id}`,
            customer: customerInfo
          })
        }

        // If validity date exists and quotation is sent, show expiration event
        if (row.validity_date && row.status === 'sent') {
          quotationMilestones.push({
            id: `quote-expired-${row.id}`,
            dbId: row.id,
            type: 'quotation',
            date: row.validity_date,
            time: '',
            title: `Quote Expiry: ${row.customer_name} (${row.quotation_number})`,
            description: `Validity expires for quotation #${row.quotation_number}`,
            status: 'expired',
            color: '#dc2626', // Red
            href: `/admin/quotations/${row.id}`,
            customer: customerInfo
          })
        }
      }
    } catch (e: any) {
      console.warn('[sales-calendar-api] quotations milestones error:', e.message)
    }

    // 3. Fetch RFQs Submitted
    let rfqMilestones: any[] = []
    try {
      const rfqResult = await query(`
        SELECT r.id, r.customer_name, 
               TO_CHAR(r.created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') as event_date, 
               r.status, r.email, r.phone, r.customer_id
        FROM rfq_requests r
      `)
      rfqMilestones = rfqResult.rows.map((row: any) => ({
        id: `rfq-${row.id}`,
        dbId: row.id,
        type: 'rfq',
        date: row.event_date,
        time: '',
        title: `RFQ Received: ${row.customer_name}`,
        description: `New Request for Quotation submitted (Status: ${row.status})`,
        status: row.status,
        color: '#06b6d4', // Cyan
        href: `/admin/rfq/${row.id}`,
        customer: {
          id: row.customer_id || null,
          name: row.customer_name,
          email: row.email || '',
          phone: row.phone || ''
        }
      }))
    } catch (e: any) {
      console.warn('[sales-calendar-api] rfq milestones error:', e.message)
    }

    // 4. Fetch Custom Calendar Events
    let customEvents: any[] = []
    try {
      const customResult = await query(`
        SELECT e.id, e.event_type, e.title, e.description, 
               TO_CHAR(e.event_date, 'YYYY-MM-DD') as event_date, 
               e.event_time, e.customer_id, c.name as customer_name, c.email, c.phone
        FROM sales_calendar_events e
        LEFT JOIN customers c ON e.customer_id = c.id
      `)
      customEvents = customResult.rows.map((row: any) => {
        let color = '#4b5563' // Gray for default task
        if (row.event_type === 'site_visit') color = '#a855f7' // Purple
        else if (row.event_type === 'meeting') color = '#d946ef' // Magenta/Pink (outside meeting)
        else if (row.event_type === 'presentation') color = '#ec4899' // Pink (outside presentation)
        else if (row.event_type === 'note') color = '#6b7280' // Slate
        else if (row.event_type === 'appointment') color = '#10b981' // Green (outside appointment)

        return {
          id: `custom-${row.id}`,
          dbId: row.id,
          type: 'custom',
          eventType: row.event_type,
          date: row.event_date,
          time: row.event_time || '',
          title: row.title,
          description: row.description || '',
          status: 'pending',
          color,
          href: '#', // custom event, managed in-place
          customer: row.customer_id ? {
            id: row.customer_id,
            name: row.customer_name || '',
            email: row.email || '',
            phone: row.phone || ''
          } : null
        }
      })
    } catch (e: any) {
      console.warn('[sales-calendar-api] custom events error:', e.message)
    }

    // Standardize and sort chronologically
    const allEvents = [
      ...showroomAppointments,
      ...quotationMilestones,
      ...rfqMilestones,
      ...customEvents
    ]

    return NextResponse.json({ events: allEvents })
  } catch (error: any) {
    console.error('[sales-calendar-api] GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch calendar events' }, { status: 500 })
  }
}

// POST /api/admin/sales-calendar — Adds a custom event to the database
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventType, title, description, eventDate, eventTime, customerId } = body

    if (!eventType || !title || !eventDate) {
      return NextResponse.json({ error: 'eventType, title, and eventDate are required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO sales_calendar_events (event_type, title, description, event_date, event_time, customer_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventType, title, description || null, eventDate, eventTime || null, customerId ? Number(customerId) : null]
    )

    return NextResponse.json({ success: true, event: result.rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error('[sales-calendar-api] POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create calendar event' }, { status: 500 })
  }
}
