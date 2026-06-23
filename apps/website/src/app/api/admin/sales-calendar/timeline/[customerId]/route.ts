import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// GET /api/admin/sales-calendar/timeline/[customerId] — Compiles a customer timeline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId } = await params
    const custId = parseInt(customerId, 10)

    if (isNaN(custId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    // Load customer basic details
    const custRes = await query('SELECT id, name, email, phone, company FROM customers WHERE id = $1', [custId])
    if (custRes.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    const customer = custRes.rows[0]

    const timelineEvents: any[] = []

    // 1. RFQ Requests
    try {
      const rfqRes = await query(
        `SELECT id, created_at, status, notes, address, message
         FROM rfq_requests
         WHERE customer_id = $1`,
        [custId]
      )
      for (const row of rfqRes.rows) {
        timelineEvents.push({
          id: `rfq-submit-${row.id}`,
          timestamp: row.created_at,
          eventType: 'rfq_submitted',
          title: '📋 RFQ Submitted',
          description: row.message || `Submitted a Request for Quotation (Status: ${row.status})`,
          notes: row.notes || '',
          href: `/admin/rfq/${row.id}`
        })
      }
    } catch (e: any) {
      console.warn('[timeline-api] rfq error:', e.message)
    }

    // 2. Quotation Milestones
    try {
      const quoteRes = await query(
        `SELECT id, quotation_number, status, grand_total, created_at, sent_at, updated_at
         FROM quotations
         WHERE customer_id = $1`,
        [custId]
      )

      for (const row of quoteRes.rows) {
        const formattedTotal = Number(row.grand_total).toLocaleString('en-PH', { maximumFractionDigits: 0 })
        
        // Initial creation
        timelineEvents.push({
          id: `quote-create-${row.id}`,
          timestamp: row.created_at,
          eventType: 'quotation_created',
          title: '📄 Quotation Created',
          description: `Quotation #${row.quotation_number} generated for ₱${formattedTotal}`,
          notes: '',
          href: `/admin/quotations/${row.id}`
        })

        // Sent to client
        if (row.sent_at) {
          timelineEvents.push({
            id: `quote-sent-${row.id}`,
            timestamp: row.sent_at,
            eventType: 'quotation_sent',
            title: '📨 Quotation Sent',
            description: `Quotation #${row.quotation_number} dispatched to client's email`,
            notes: '',
            href: `/admin/quotations/${row.id}`
          })
        }

        // Approved
        if (row.status === 'accepted') {
          timelineEvents.push({
            id: `quote-accepted-${row.id}`,
            timestamp: row.updated_at,
            eventType: 'quotation_accepted',
            title: '✅ Order Confirmed',
            description: `Client approved Quotation #${row.quotation_number} & paid deposit`,
            notes: '',
            href: `/admin/quotations/${row.id}`
          })
        }
      }
    } catch (e: any) {
      console.warn('[timeline-api] quote error:', e.message)
    }

    // 3. Quotation Versions History (Revisions & Admin Edits)
    try {
      const versionRes = await query(
        `SELECT v.id, v.version_number, v.revision_type, v.revision_message, v.changelog, v.created_at, q.quotation_number, q.id as quote_id
         FROM quotation_versions v
         JOIN quotations q ON q.id = v.quotation_id
         WHERE q.customer_id = $1`,
        [custId]
      )
      for (const row of versionRes.rows) {
        if (row.revision_type === 'customer_revision') {
          timelineEvents.push({
            id: `quote-revision-req-${row.id}`,
            timestamp: row.created_at,
            eventType: 'revision_requested',
            title: '🔄 Revision Requested by Client',
            description: `Client requested changes on Quote #${row.quotation_number}`,
            notes: row.revision_message || '',
            href: `/admin/quotations/${row.quote_id}`
          })
        } else if (row.revision_type === 'admin_edit') {
          let changeDesc = 'Quotation revised by administrator.'
          if (row.changelog && Array.isArray(row.changelog) && row.changelog.length > 0) {
            changeDesc = 'Revised fields: ' + row.changelog.map((c: any) => `${c.label} (${c.from} ➔ ${c.to})`).join(', ')
          }
          timelineEvents.push({
            id: `quote-version-edit-${row.id}`,
            timestamp: row.created_at,
            eventType: 'quotation_revised',
            title: `✏️ Quotation Revised (v${row.version_number})`,
            description: changeDesc,
            notes: row.revision_message || '',
            href: `/admin/quotations/${row.quote_id}`
          })
        }
      }
    } catch (e: any) {
      console.warn('[timeline-api] versions error:', e.message)
    }

    // 4. Showroom Visit Appointments (Chatbot bookings)
    try {
      const apptRes = await query(
        `SELECT a.id, a.preferred_date, a.preferred_time, a.status, a.notes, a.created_at
         FROM chatbot.appointments a
         JOIN chatbot.leads l ON a.lead_id = l.id
         WHERE LOWER(l.email) = LOWER($1)`,
        [customer.email]
      )
      for (const row of apptRes.rows) {
        const dateStr = new Date(row.preferred_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        timelineEvents.push({
          id: `appt-booking-${row.id}`,
          timestamp: row.created_at,
          eventType: 'showroom_booked',
          title: '📅 Showroom Visit Booked',
          description: `Scheduled showroom visit for ${dateStr} at ${row.preferred_time} (Status: ${row.status})`,
          notes: row.notes || '',
          href: `/admin/collections/appointments/${row.id}`
        })
      }
    } catch (e: any) {
      console.warn('[timeline-api] appointments error:', e.message)
    }

    // 5. Custom Sales Calendar Events (Meetings, Site Visits, Presentations, Notes)
    try {
      const customRes = await query(
        `SELECT id, event_type, title, description, event_date, event_time, created_at
         FROM sales_calendar_events
         WHERE customer_id = $1`,
        [custId]
      )
      for (const row of customRes.rows) {
        let icon = '📅'
        if (row.event_type === 'site_visit') icon = '🏠'
        else if (row.event_type === 'meeting') icon = '💼'
        else if (row.event_type === 'presentation') icon = '📊'
        else if (row.event_type === 'note') icon = '📝'
        else if (row.event_type === 'task') icon = '✅'

        const dateStr = new Date(row.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        const timeStr = row.event_time ? ` at ${row.event_time}` : ''

        timelineEvents.push({
          id: `custom-event-${row.id}`,
          timestamp: row.created_at,
          eventType: `custom_${row.event_type}`,
          title: `${icon} ${row.title}`,
          description: `Scheduled ${row.event_type.replace('_', ' ')} for ${dateStr}${timeStr}`,
          notes: row.description || '',
          href: '#' // managed inside calendar view
        })
      }
    } catch (e: any) {
      console.warn('[timeline-api] custom events error:', e.message)
    }

    // Sort all events chronologically (newest first)
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      customer,
      timeline: timelineEvents
    })
  } catch (error: any) {
    console.error('[timeline-api] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to compile customer timeline' },
      { status: 500 }
    )
  }
}
