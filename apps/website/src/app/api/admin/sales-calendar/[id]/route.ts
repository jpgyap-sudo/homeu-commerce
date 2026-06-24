import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// DELETE /api/admin/sales-calendar/[id] — Deletes a custom calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await query('DELETE FROM sales_calendar_events WHERE id = $1 RETURNING id', [parseInt(id)])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[sales-calendar-api] DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/sales-calendar/[id] — Updates a custom calendar event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { eventType, title, description, eventDate, eventTime, customerId } = body

    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (eventType !== undefined) {
      fields.push(`event_type = $${idx++}`)
      values.push(eventType)
    }
    if (title !== undefined) {
      fields.push(`title = $${idx++}`)
      values.push(title)
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`)
      values.push(description)
    }
    if (eventDate !== undefined) {
      fields.push(`event_date = $${idx++}`)
      values.push(eventDate)
    }
    if (eventTime !== undefined) {
      fields.push(`event_time = $${idx++}`)
      values.push(eventTime)
    }
    if (customerId !== undefined) {
      fields.push(`customer_id = $${idx++}`)
      values.push(customerId ? Number(customerId) : null)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(parseInt(id))
    const result = await query(
      `UPDATE sales_calendar_events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, event: result.rows[0] })
  } catch (error: any) {
    console.error('[sales-calendar-api] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update event' },
      { status: 500 }
    )
  }
}

