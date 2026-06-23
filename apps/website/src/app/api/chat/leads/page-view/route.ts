/**
 * POST /api/chat/leads/page-view
 *
 * Records a page view for a lead. Called by the frontend PageViewTracker
 * (or a lead-specific tracker) when a lead with an active session navigates.
 *
 * The frontend fires this on each page navigation when leadId is known,
 * and sends the time_on_page_sec when the previous page is unloaded.
 *
 * Request body:
 *   { leadId, path, title?, referrer?, sessionId?, timeOnPageSec? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, path, title, referrer, sessionId, timeOnPageSec } = body

    if (!leadId || !path) {
      return NextResponse.json({ error: 'leadId and path are required' }, { status: 400 })
    }

    // Verify lead exists
    const leadCheck = await query('SELECT id FROM chatbot.leads WHERE id = $1', [leadId])
    if (leadCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await query(
      `INSERT INTO chatbot.lead_page_views (lead_id, path, title, referrer, session_id, time_on_page_sec)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        leadId,
        path,
        title || null,
        referrer || null,
        sessionId || null,
        timeOnPageSec != null ? Math.round(timeOnPageSec * 10) / 10 : 0,
      ]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[chat/leads/page-view] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
