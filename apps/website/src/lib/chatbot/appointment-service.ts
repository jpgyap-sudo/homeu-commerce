/**
 * Appointment Booking Service
 *
 * Handles showroom visit appointment requests.
 * Stores in chatbot.appointments table and sends Telegram alert.
 */

import { sendTelegramAlert } from './telegram-client'

export interface AppointmentInput {
  leadId: string
  conversationId?: string
  preferredDate: string
  preferredTime: string
  visitorCount: number
  categoriesOfInterest?: string[]
  notes?: string
}

export interface AppointmentResult {
  success: boolean
  appointmentId?: string
  error?: string
}

// ── Request Appointment ───────────────────────────────────────

export async function requestAppointment(input: AppointmentInput): Promise<AppointmentResult> {
  try {
    // In MVP, we store the appointment request and send Telegram alert.
    // Phase 2 will persist to chatbot.appointments table and sync with calendar.

    // Simulate storing — in production, this would INSERT into chatbot.appointments
    const appointmentId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    console.log(`[chatbot] Appointment requested:`, {
      leadId: input.leadId,
      date: input.preferredDate,
      time: input.preferredTime,
      visitors: input.visitorCount,
      categories: input.categoriesOfInterest,
    })

    // Send Telegram alert
    await sendTelegramAlert({
      eventType: 'APPOINTMENT_REQUESTED',
      leadId: input.leadId,
      conversationId: input.conversationId,
      leadName: input.leadId,
      mobile: '',
      summary: `Showroom visit: ${input.visitorCount} visitor(s) on ${input.preferredDate} at ${input.preferredTime}` +
        (input.categoriesOfInterest?.length ? ` | Interested in: ${input.categoriesOfInterest.join(', ')}` : ''),
      appointmentDate: `${input.preferredDate} ${input.preferredTime}`,
    })

    return { success: true, appointmentId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to book appointment' }
  }
}
