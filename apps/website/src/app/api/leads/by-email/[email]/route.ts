/**
 * GET /api/leads/by-email/[email]
 *
 * Returns ALL leads for a given email address. Used by the lead detail page
 * to show "Other leads from this client" — aggregated view so the admin can
 * see every visit/session a person has made.
 *
 * Each lead includes visit count, page view stats, conversation info, and
 * the customer link status.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await params
  const decodedEmail = decodeURIComponent(email)

  if (!decodedEmail?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const { rows } = await query(
      `SELECT l.*,
              COALESCE(l.total_visits, 1) AS total_visits,
              (SELECT COUNT(*) FROM chatbot.lead_page_views pv WHERE pv.lead_id = l.id) AS page_view_count,
              (SELECT COUNT(*) FROM chatbot.conversations c WHERE c.lead_id = l.id) AS conversation_count,
              (SELECT COUNT(*) FROM chatbot.messages m
               JOIN chatbot.conversations c ON c.id = m.conversation_id
               WHERE c.lead_id = l.id) AS message_count
       FROM chatbot.leads l
       WHERE LOWER(l.email) = LOWER($1)
       ORDER BY l.created_at DESC
       LIMIT 50`,
      [decodedEmail.trim()]
    )

    return NextResponse.json({ leads: rows, email: decodedEmail.trim() })
  } catch (err: any) {
    console.error('[api/leads/by-email] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
