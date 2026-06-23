/**
 * GET /api/leads/[id]/conversations
 *
 * Returns all chatbot conversations for a given lead.
 * Used by the lead detail page to show conversation history.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { rows } = await query(
      `SELECT id, status, current_intent, message_count, last_message_at, device_info, created_at
       FROM chatbot.conversations
       WHERE lead_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    )

    return NextResponse.json({ conversations: rows })
  } catch (err: any) {
    console.error('[api/leads/conversations] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
