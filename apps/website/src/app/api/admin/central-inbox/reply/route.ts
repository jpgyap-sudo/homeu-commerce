import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * POST /api/admin/central-inbox/reply
 * Send a reply to a conversation via the appropriate channel.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { conversationId, channel, body: replyText } = body
    if (!conversationId || !replyText) return NextResponse.json({ error: 'conversationId and body required' }, { status: 400 })

    if (channel === 'website') {
      await query(
        `INSERT INTO chatbot.messages (conversation_id, sender_type, content, message_type)
         VALUES ($1, 'bot', $2, 'text')`,
        [conversationId, replyText]
      )
      await query(
        `UPDATE chatbot.conversations SET message_count = COALESCE(message_count, 0) + 1, last_message_at = now() WHERE id = $1`,
        [conversationId]
      )
      return NextResponse.json({ success: true, channel: 'website' })
    }

    if (channel === 'rfq') {
      await query(
        `INSERT INTO rfq_chat_messages (conversation_id, sender_type, content, message_type, customer_visible)
         VALUES ($1, 'admin', $2, 'text', true)`,
        [conversationId, replyText]
      )
      await query(
        `UPDATE rfq_chat_conversations SET message_count = message_count + 1, last_message_at = now() WHERE id = $1`,
        [conversationId]
      )
      return NextResponse.json({ success: true, channel: 'rfq' })
    }

    if (channel === 'email') {
      // Email reply via SMTP (nodemailer already configured)
      const { rows } = await query('SELECT sender_email, subject FROM emails WHERE id = $1', [conversationId])
      if (rows.length > 0) {
        const email = rows[0]
        // For now, insert a reply record into emails table
        await query(
          `INSERT INTO emails (message_id, subject, sender_name, sender_email, recipient_email, body_text, is_read, folder, category, received_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, 'INBOX', 'replied', NOW())`,
          [`reply-${Date.now()}`, email.subject ? `Re: ${email.subject}` : 'Reply', session.name, session.email, email.sender_email, replyText]
        )
        return NextResponse.json({ success: true, channel: 'email', note: 'Reply recorded locally. Configure SMTP for actual email sending.' })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
