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
      `SELECT a.*, TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, l.name as lead_name, l.email as lead_email, l.mobile as lead_mobile
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

const VALID_STATUSES = new Set(['requested', 'confirmed', 'completed', 'cancelled'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()

    // Find the appointment to get its lead_id
    const aptRes = await query('SELECT lead_id FROM chatbot.appointments WHERE id = $1', [id])
    if (aptRes.rowCount === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
    const leadId = aptRes.rows[0].lead_id

    // Update chatbot.leads if lead fields are provided
    if (body.leadName !== undefined || body.leadEmail !== undefined || body.leadMobile !== undefined) {
      const leadSets: string[] = []
      const leadValues: any[] = []
      let idx = 1
      if (body.leadName !== undefined) {
        leadSets.push(`name = $${idx++}`)
        leadValues.push(body.leadName)
      }
      if (body.leadEmail !== undefined) {
        leadSets.push(`email = $${idx++}`)
        leadValues.push(body.leadEmail)
      }
      if (body.leadMobile !== undefined) {
        leadSets.push(`mobile = $${idx++}`)
        leadValues.push(body.leadMobile)
      }
      if (leadSets.length > 0) {
        leadValues.push(leadId)
        await query(
          `UPDATE chatbot.leads SET ${leadSets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          leadValues
        )
      }
    }

    // Update chatbot.appointments fields
    const aptSets: string[] = []
    const aptValues: any[] = []
    let aptIdx = 1
    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: 'Invalid appointment status' }, { status: 400 })
      }
      aptSets.push(`status = $${aptIdx++}`)
      aptValues.push(body.status)
    }
    if (body.notes !== undefined) {
      aptSets.push(`notes = $${aptIdx++}`)
      aptValues.push(body.notes)
    }
    if (body.preferredDate !== undefined) {
      aptSets.push(`preferred_date = $${aptIdx++}`)
      aptValues.push(body.preferredDate || null)
    }
    if (body.preferredTime !== undefined) {
      aptSets.push(`preferred_time = $${aptIdx++}`)
      aptValues.push(body.preferredTime)
    }
    if (body.visitorCount !== undefined) {
      aptSets.push(`visitor_count = $${aptIdx++}`)
      aptValues.push(body.visitorCount ? parseInt(body.visitorCount) : null)
    }
    if (body.categoriesOfInterest !== undefined) {
      aptSets.push(`categories_of_interest = $${aptIdx++}`)
      aptValues.push(Array.isArray(body.categoriesOfInterest) ? body.categoriesOfInterest : [])
    }

    if (aptSets.length > 0) {
      aptValues.push(id)
      await query(
        `UPDATE chatbot.appointments SET ${aptSets.join(', ')} WHERE id = $${aptIdx}`,
        aptValues
      )
    }

    // Fetch the updated appointment details
    const result = await query(
      `SELECT a.*, TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, l.name as lead_name, l.email as lead_email, l.mobile as lead_mobile
       FROM chatbot.appointments a
       LEFT JOIN chatbot.leads l ON a.lead_id = l.id
       WHERE a.id = $1`,
      [id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/appointments/[id]
 *
 * Deletes an appointment (admin only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await query('DELETE FROM chatbot.appointments WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

