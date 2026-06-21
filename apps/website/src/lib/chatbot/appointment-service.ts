/**
 * Appointment Booking Service
 *
 * Handles showroom visit appointment requests.
 * Stores in chatbot.appointments table and sends Telegram alert.
 */

import { sendTelegramAlert } from './telegram-client'
import { query } from '../db'

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
    const inserted = await query(
      `INSERT INTO chatbot.appointments
         (lead_id, conversation_id, preferred_date, preferred_time, visitor_count, categories_of_interest, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.leadId,
        input.conversationId || null,
        input.preferredDate,
        input.preferredTime,
        input.visitorCount,
        input.categoriesOfInterest || [],
        input.notes || null,
      ]
    )
    const appointmentId = String(inserted.rows[0].id)

    const leadResult = await query(
      `SELECT name, mobile FROM chatbot.leads WHERE id = $1 LIMIT 1`,
      [input.leadId]
    )
    const lead = leadResult.rows[0] || {}

    // Send Telegram alert
    await sendTelegramAlert({
      eventType: 'APPOINTMENT_REQUESTED',
      leadId: input.leadId,
      conversationId: input.conversationId,
      leadName: lead.name || 'Unknown lead',
      mobile: lead.mobile || '',
      summary: `Showroom visit: ${input.visitorCount} visitor(s) on ${input.preferredDate} at ${input.preferredTime}` +
        (input.categoriesOfInterest?.length ? ` | Interested in: ${input.categoriesOfInterest.join(', ')}` : ''),
      appointmentDate: `${input.preferredDate} ${input.preferredTime}`,
    }).catch((error) => {
      console.error('[chatbot] Appointment persisted but Telegram alert failed:', error)
    })

    return { success: true, appointmentId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to book appointment' }
  }
}
