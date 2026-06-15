/**
 * POST /api/appointments/request
 *
 * Requests a showroom visit appointment.
 * Sends a Telegram alert to the sales group for manual confirmation.
 *
 * Request:
 *   { leadId, conversationId, preferredDate, preferredTime, visitorCount, categoriesOfInterest?, notes? }
 *
 * Response:
 *   { success, appointmentId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requestAppointment } from '@/lib/chatbot/appointment-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, conversationId, preferredDate, preferredTime, visitorCount, categoriesOfInterest, notes } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }
    if (!preferredDate?.trim()) {
      return NextResponse.json({ error: 'Preferred date is required' }, { status: 400 })
    }
    if (!preferredTime?.trim()) {
      return NextResponse.json({ error: 'Preferred time is required' }, { status: 400 })
    }
    if (!visitorCount || visitorCount < 1) {
      return NextResponse.json({ error: 'At least 1 visitor is required' }, { status: 400 })
    }

    const result = await requestAppointment({
      leadId,
      conversationId,
      preferredDate,
      preferredTime,
      visitorCount,
      categoriesOfInterest,
      notes,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to book appointment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      appointmentId: result.appointmentId,
      message: 'Your showroom visit request has been sent. Our team will confirm your schedule.',
    })
  } catch (err) {
    console.error('[chatbot] POST /api/appointments/request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
