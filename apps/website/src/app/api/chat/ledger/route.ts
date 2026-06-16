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
import { createLedgerEvent, EVENT_SCORES, computeScoreFromEvents } from '@/lib/chatbot/ledger'
import { insertLedgerEvent, getLedgerEvents, query } from '@/lib/chatbot/db'

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

    // Persist to PostgreSQL via db.ts helper
    let dbId: string | undefined
    try {
      dbId = await insertLedgerEvent({
        leadId,
        conversationId,
        eventType,
        eventData,
        scoreDelta: event.scoreDelta,
      })
    } catch (dbErr) {
      console.warn('[ledger] DB unavailable, using in-memory fallback:', dbErr instanceof Error ? dbErr.message : dbErr)
    }

    console.log(`[ledger] Event recorded: ${eventType} for lead ${leadId} (score: ${event.scoreDelta})${dbId ? ` DB id: ${dbId}` : ''}`)

    return NextResponse.json({
      success: true,
      event: {
        id: dbId || event.id,
        eventType: event.eventType,
        scoreDelta: event.scoreDelta,
        createdAt: event.createdAt,
      },
      currentScore: event.scoreDelta,
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
      // GET without leadId returns aggregate scoring stats for the admin dashboard
      const distribution = await query(
        `SELECT
           COALESCE(SUM(CASE WHEN score >= 81 THEN 1 ELSE 0 END), 0) AS qualified,
           COALESCE(SUM(CASE WHEN score >= 51 AND score < 81 THEN 1 ELSE 0 END), 0) AS hot,
           COALESCE(SUM(CASE WHEN score >= 21 AND score < 51 THEN 1 ELSE 0 END), 0) AS warm,
           COALESCE(SUM(CASE WHEN score < 21 THEN 1 ELSE 0 END), 0) AS cold,
           COALESCE(AVG(score), 0)::numeric(10,2) AS avg_score,
           COUNT(*) AS total_leads,
           COALESCE(SUM(CASE WHEN score >= 51 THEN 1 ELSE 0 END), 0) AS high_value_leads
         FROM chatbot.leads`
      ).catch(() => [])

      return NextResponse.json({
        scoringSummary: distribution.length > 0 ? distribution[0] : {
          qualified: 0, hot: 0, warm: 0, cold: 0,
          avg_score: 0, total_leads: 0, high_value_leads: 0,
        },
        source: distribution.length > 0 ? 'database' : 'none',
      })
    }

    // Fetch events from PostgreSQL
    let events: any[]
    try {
      events = await getLedgerEvents(leadId)
    } catch {
      events = []
    }

    const currentScore = computeScoreFromEvents(events)

    return NextResponse.json({
      leadId,
      events,
      totalEvents: events.length,
      currentScore,
    })
  } catch (err) {
    console.error('[ledger] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
