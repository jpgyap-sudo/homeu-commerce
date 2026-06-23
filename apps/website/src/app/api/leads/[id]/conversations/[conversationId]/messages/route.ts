/**
 * GET /api/leads/[id]/conversations/[conversationId]/messages
 *
 * Returns all messages in a chatbot conversation for the admin lead detail page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, conversationId } = await params

  try {
    // Verify the conversation belongs to this lead
    const { rows: messages } = await query(
      `SELECT m.id, m.sender_type, m.content, m.message_type, m.metadata, m.created_at
       FROM chatbot.messages m
       JOIN chatbot.conversations c ON c.id = m.conversation_id
       WHERE m.conversation_id = $1 AND c.lead_id = $2
       ORDER BY m.created_at ASC
       LIMIT 500`,
      [conversationId, id]
    )

    return NextResponse.json({ messages })
  } catch (err: any) {
    console.error('[api/leads/conversations/messages] GET error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
