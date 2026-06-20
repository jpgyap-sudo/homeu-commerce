/**
 * POST /api/system/rfq-chat/backfill
 *
 * Mirrors chatbot messages into the RFQ chat when a lead opens an RFQ cart.
 * Deduplicated — won't re-import already-backfilled conversations.
 *
 * Request body:
 *   { rfqRequestId: number, leadId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import {
  getOrCreateConversation,
  insertMessage,
  getConversationByRfqId,
  createBackfillLog,
  getBackfillLog,
  updateConversationSource,
} from '@/lib/rfq-chat-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rfqRequestId, leadId } = body

    if (!rfqRequestId || !leadId) {
      return NextResponse.json({ error: 'rfqRequestId and leadId are required' }, { status: 400 })
    }

    // Find all chatbot conversations for this lead
    const chatbotConvs = await query(
      `SELECT id, created_at FROM chatbot.conversations
       WHERE lead_id = $1
       ORDER BY created_at ASC`,
      [leadId]
    )

    if (chatbotConvs.rows.length === 0) {
      return NextResponse.json({ mirrored: 0, message: 'No chatbot conversations found for this lead' })
    }

    // Get or create RFQ chat conversation
    let rfqConversationId: string
    const existingConv = await getConversationByRfqId(rfqRequestId)
    if (existingConv) {
      rfqConversationId = existingConv.id
    } else {
      rfqConversationId = await getOrCreateConversation(rfqRequestId)
    }

    let totalMirrored = 0
    let backfilledConvs = 0

    for (const conv of chatbotConvs.rows) {
      const chatbotConvId = conv.id as string

      // Check if already backfilled
      const existingLog = await getBackfillLog(chatbotConvId, rfqConversationId)
      if (existingLog) continue

      // Fetch messages from this chatbot conversation
      const messages = await query(
        `SELECT id, sender_type, content, message_type, metadata, created_at
         FROM chatbot.messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [chatbotConvId]
      )

      if (messages.rows.length === 0) continue

      // Mirror each message into RFQ chat
      for (const msg of messages.rows) {
        // Map sender types: visitor→customer, bot→ai_bot, admin→admin, system→system
        const senderMap: Record<string, string> = {
          visitor: 'customer',
          bot: 'ai_bot',
          admin: 'admin',
          system: 'system',
        }

        await insertMessage({
          conversationId: rfqConversationId,
          senderType: (senderMap[msg.sender_type as string] || msg.sender_type) as any,
          content: msg.content || '',
          messageType: msg.message_type || 'text',
          metadata: {
            backfilledFrom: 'chatbot',
            originalMessageId: msg.id,
            originalCreatedAt: msg.created_at,
            originalMetadata: msg.metadata || {},
          },
          customerVisible: true,
        })

        totalMirrored++
      }

      // Log the backfill
      await createBackfillLog(chatbotConvId, rfqConversationId, messages.rows.length)
      backfilledConvs++
    }

    // Update conversation source tracking
    if (backfilledConvs > 0) {
      await updateConversationSource(
        rfqConversationId,
        'chatbot_backfill',
        chatbotConvs.rows[0].id as string
      )

      // Insert system event noting the import
      await insertMessage({
        conversationId: rfqConversationId,
        senderType: 'system',
        content: `📋 Previous chat history imported (${totalMirrored} messages from ${backfilledConvs} conversation${backfilledConvs > 1 ? 's' : ''})`,
        messageType: 'system_event',
        metadata: {
          eventType: 'backfill_complete',
          totalMirrored,
          conversationsBackfilled: backfilledConvs,
        },
      })
    }

    return NextResponse.json({
      success: true,
      mirrored: totalMirrored,
      conversationsBackfilled: backfilledConvs,
      rfqConversationId,
    })
  } catch (err: any) {
    console.error('[system/rfq-chat/backfill] Error:', err.message)
    return NextResponse.json({ error: 'Failed to backfill messages' }, { status: 500 })
  }
}
