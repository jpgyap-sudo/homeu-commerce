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

const SLOT_MINUTES = 30

function workingWindow(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const day = date.getDay()
  if (day === 0) return { open: 13 * 60, close: 18 * 60 }
  return { open: 10 * 60, close: 18 * 60 }
}

function parseSlotTime(time: string) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

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
    if (visitorCount > 20) {
      return NextResponse.json({ error: 'Visitor count cannot exceed 20' }, { status: 400 })
    }
    const requestedDate = new Date(`${preferredDate}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (Number.isNaN(requestedDate.getTime()) || requestedDate < today) {
      return NextResponse.json({ error: 'Preferred date must be today or later' }, { status: 400 })
    }
    const requestedMinutes = parseSlotTime(preferredTime)
    const window = workingWindow(preferredDate)
    if (!window || requestedMinutes === null || requestedMinutes % SLOT_MINUTES !== 0 || requestedMinutes < window.open || requestedMinutes >= window.close) {
      return NextResponse.json({ error: 'Please choose a showroom visit time within working hours.' }, { status: 400 })
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
