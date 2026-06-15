/**
 * POST /api/chat/ledger
 * GET  /api/chat/ledger?leadId=xxx
 *
 * Ledger API — Record and query immutable lead events.
 *
 * POST: Record a new ledger event (lead gate, message, cart action, etc.)
 * GET:  Fetch all events for a lead (for admin view, score replay)
 *
 * Events are the source of truth for:
 *   - Lead scoring (replayable, auditable)
 *   - Style DNA building
 *   - Returning visitor memory
 *   - Sales analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLedgerEvent, EVENT_SCORES } from '@/lib/chatbot/ledger'

// ── In-memory event store for MVP (replace with Postgres in production) ──
const eventStore: Map<string, any[]> = new Map()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, conversationId, eventType, eventData } = body

    if (!leadId || !eventType) {
      return NextResponse.json({ error: 'leadId and eventType are required' }, { status: 400 })
    }

    // Validate event type
    const validTypes = Object.keys(EVENT_SCORES)
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: `Invalid event type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const event = createLedgerEvent(leadId, eventType, eventData, conversationId)

    // Store event (in production: INSERT INTO chatbot.lead_ledger_events)
    if (!eventStore.has(leadId)) eventStore.set(leadId, [])
    eventStore.get(leadId)!.push(event)

    console.log(`[ledger] Event recorded: ${eventType} for lead ${leadId} (score: ${event.scoreDelta})`)

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        eventType: event.eventType,
        scoreDelta: event.scoreDelta,
        createdAt: event.createdAt,
      },
      currentScore: computeScore(leadId),
    })
  } catch (err) {
    console.error('[ledger] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const leadId = request.nextUrl.searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'leadId query parameter is required' }, { status: 400 })
    }

    const events = eventStore.get(leadId) || []

    return NextResponse.json({
      leadId,
      events,
      totalEvents: events.length,
      currentScore: computeScore(leadId),
    })
  } catch (err) {
    console.error('[ledger] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function computeScore(leadId: string): number {
  const events = eventStore.get(leadId) || []
  return events.reduce((sum: number, e: any) => sum + (e.scoreDelta || 0), 0)
}
