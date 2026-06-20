/**
 * POST /api/system/rfq-chat/quotation-event
 *
 * Internal API — called when a quotation event happens:
 *   - Quotation created (v1)
 *   - Quotation updated to new version
 *   - Revision requested by customer
 *   - Quotation sent to customer
 *   - Quotation accepted
 *
 * This inserts a system_event message into the RFQ chat timeline.
 * Called from quotation-versions.ts and quotation status change hooks.
 *
 * Request body:
 *   { rfqRequestId, quotationId, versionNumber, eventType, eventLabel, message? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateConversation, insertMessage } from '@/lib/rfq-chat-db'

const EVENT_ICONS: Record<string, string> = {
  quotation_created: '📄',
  quotation_updated: '✏️',
  revision_requested: '🔄',
  quotation_sent: '📨',
  quotation_accepted: '✅',
  quotation_rejected: '❌',
  revision_resolved: '🔄',
}

const EVENT_LABELS: Record<string, string> = {
  quotation_created: 'Quotation created',
  quotation_updated: 'Quotation updated',
  revision_requested: 'Revision requested',
  quotation_sent: 'Quotation sent to you',
  quotation_accepted: 'Quotation accepted',
  quotation_rejected: 'Quotation rejected',
  revision_resolved: 'Revision resolved',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rfqRequestId, quotationId, versionNumber, eventType, eventLabel, message } = body

    if (!rfqRequestId || !eventType) {
      return NextResponse.json({ error: 'rfqRequestId and eventType are required' }, { status: 400 })
    }

    const icon = EVENT_ICONS[eventType] || '📋'
    const label = eventLabel || EVENT_LABELS[eventType] || eventType
    let content = ''

    if (message) {
      content = `${icon} ${label} — "${message}"`
    } else if (quotationId && versionNumber) {
      const versionLabel = versionNumber === 1 ? '' : ` v${versionNumber}`
      content = `${icon} ${label}${versionLabel}`
    } else if (quotationId) {
      content = `${icon} ${label}`
    } else {
      content = `${icon} ${label}`
    }

    // Get or create the RFQ chat conversation
    const conversationId = await getOrCreateConversation(rfqRequestId)

    // Insert system event message
    const messageId = await insertMessage({
      conversationId,
      senderType: 'system',
      content,
      messageType: eventType === 'quotation_sent' ? 'notification' : 'system_event',
      relatedQuotationId: quotationId || undefined,
      relatedVersionNumber: versionNumber || undefined,
      metadata: {
        eventType,
        quotationId,
        versionNumber,
        rfqRequestId,
      },
    })

    return NextResponse.json({
      success: true,
      messageId,
      conversationId,
    })
  } catch (err: any) {
    console.error('[system/rfq-chat/quotation-event] Error:', err.message)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}
