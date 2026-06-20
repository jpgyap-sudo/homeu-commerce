/**
 * GET /api/admin/rfq-chat/[rfqId]/messages
 * POST /api/admin/rfq-chat/[rfqId]/messages
 *
 * Admin-facing RFQ chat API.
 * - GET: Returns ALL messages (no TTL, includes deleted with is_deleted flag)
 * - POST: Send a message as admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getConversationByRfqId,
  getAdminMessages,
  getOrCreateConversation,
  insertMessage,
  toggleCustomerVisibility,
  updateConversationMetadata,
} from '@/lib/rfq-chat-db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfqId } = await params
    const rfqRequestId = parseInt(rfqId)
    if (isNaN(rfqRequestId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    const conversation = await getConversationByRfqId(rfqRequestId)
    if (!conversation) {
      return NextResponse.json({ messages: [], conversation: null })
    }

    const messages = await getAdminMessages(conversation.id)

    // Enrich admin messages with sender name if admin_user_id is set
    const enrichedMessages = await enrichAdminNames(messages)

    return NextResponse.json({
      messages: enrichedMessages,
      conversation: {
        id: conversation.id,
        status: conversation.status,
        messageCount: conversation.message_count,
        lastMessageAt: conversation.last_message_at,
        internalScore: conversation.internal_score,
        adminNotes: conversation.admin_notes,
        source: conversation.source,
        createdAt: conversation.created_at,
      },
    })
  } catch (err: any) {
    console.error('[admin/rfq-chat] GET messages error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfqId } = await params
    const rfqRequestId = parseInt(rfqId)
    if (isNaN(rfqRequestId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    const body = await request.json()
    const { content, internalNote, messageType, metadata } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const sanitized = content.trim().replace(/<[^>]*>/g, '')

    const conversationId = await getOrCreateConversation(rfqRequestId)

    const messageId = await insertMessage({
      conversationId,
      senderType: 'admin',
      adminUserId: Number(session.id),
      content: sanitized,
      messageType: messageType || 'text',
      metadata: metadata || undefined,
      customerVisible: internalNote !== true,
    })

    return NextResponse.json({
      id: messageId,
      content: sanitized,
      senderType: 'admin',
      adminUserId: Number(session.id),
      adminName: session.name,
      customerVisible: internalNote !== true,
      createdAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[admin/rfq-chat] POST message error:', err.message)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/rfq-chat/[rfqId]/messages/[msgId]
 * Toggle customer_visibility on a message.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string; msgId?: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, messageId, visible } = body

    if (action === 'toggle_visibility' && messageId) {
      const updated = await toggleCustomerVisibility(messageId, visible !== false)
      return NextResponse.json({ success: updated })
    }

    if (action === 'update_conversation') {
      const { rfqId } = await params
      const rfqRequestId = parseInt(rfqId)
      if (isNaN(rfqRequestId)) {
        return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
      }
      const conversation = await getConversationByRfqId(rfqRequestId)
      if (conversation) {
        await updateConversationMetadata(conversation.id, body.metadata || {})
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[admin/rfq-chat] PATCH error:', err.message)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

/**
 * Enrich messages with admin display names.
 */
async function enrichAdminNames(messages: any[]): Promise<any[]> {
  const adminIds = new Set<number>()
  for (const msg of messages) {
    if (msg.admin_user_id && msg.sender_type === 'admin') {
      adminIds.add(Number(msg.admin_user_id))
    }
  }

  if (adminIds.size === 0) return messages

  const { query } = await import('@/lib/db')
  const ids = Array.from(adminIds)
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
  const result = await query(
    `SELECT id, name, email FROM customers WHERE id IN (${placeholders})`,
    ids
  )

  const nameMap: Record<number, string> = {}
  for (const row of result.rows) {
    nameMap[Number(row.id)] = row.name || row.email || 'Admin'
  }

  return messages.map((msg) => ({
    ...msg,
    adminName: msg.admin_user_id ? nameMap[Number(msg.admin_user_id)] || 'Admin' : null,
  }))
}
