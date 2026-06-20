/**
 * GET /api/rfq-chat/[rfqId]/messages
 * POST /api/rfq-chat/[rfqId]/messages
 *
 * Customer-facing RFQ chat API.
 * - GET: Returns messages from the last 30 days (customer-visible, non-deleted)
 * - POST: Sends a new message as the customer
 *
 * Uses getSession() from @/lib/auth — same session system as customer dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  getOrCreateConversation,
  getConversationByRfqId,
  getCustomerMessages,
  insertMessage,
} from '@/lib/rfq-chat-db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfqId } = await params
    const rfqRequestId = parseInt(rfqId)
    if (isNaN(rfqRequestId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    // Verify this customer owns the RFQ by email match
    const owns = await verifyCustomerOwnsRfq(session.email, rfqRequestId)
    if (!owns) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    const conversation = await getConversationByRfqId(rfqRequestId)
    if (!conversation) {
      return NextResponse.json({ messages: [], conversationId: null })
    }

    const messages = await getCustomerMessages(conversation.id)

    return NextResponse.json({
      messages,
      conversationId: conversation.id,
      messageCount: conversation.message_count,
    })
  } catch (err: any) {
    console.error('[rfq-chat] GET messages error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfqId } = await params
    const rfqRequestId = parseInt(rfqId)
    if (isNaN(rfqRequestId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    // Verify ownership
    const owns = await verifyCustomerOwnsRfq(session.email, rfqRequestId)
    if (!owns) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    const body = await request.json()
    const { content, messageType, metadata } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Sanitize — strip HTML tags from content only, not metadata
    const sanitized = content.trim().replace(/<[^>]*>/g, '')

    // Get or create conversation
    const conversationId = await getOrCreateConversation(rfqRequestId)

    // Insert the message (with metadata for product cards, etc.)
    const messageId = await insertMessage({
      conversationId,
      senderType: 'customer',
      content: sanitized,
      messageType: messageType || 'text',
      metadata: metadata || undefined,
    })

    return NextResponse.json({
      id: messageId,
      content: sanitized,
      senderType: 'customer',
      createdAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[rfq-chat] POST message error:', err.message)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

/**
 * Verify the customer owns this RFQ by email OR customer_id.
 * First tries customer_id (for registered customers), then falls back to email.
 */
async function verifyCustomerOwnsRfq(
  email: string,
  rfqRequestId: number
): Promise<boolean> {
  try {
    // First, try to find the customer record for this session
    const customerResult = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    )

    if (customerResult.rows.length > 0) {
      const customerId = customerResult.rows[0].id
      // Check by customer_id
      const byId = await query(
        `SELECT id FROM rfq_requests WHERE id = $1 AND customer_id = $2 LIMIT 1`,
        [rfqRequestId, customerId]
      )
      if (byId.rows.length > 0) return true
    }

    // Fallback: check by email on rfq_requests
    const byEmail = await query(
      `SELECT id FROM rfq_requests
       WHERE id = $1
         AND LOWER(COALESCE(email, '')) = LOWER($2)
       LIMIT 1`,
      [rfqRequestId, email]
    )
    return byEmail.rows.length > 0
  } catch {
    return false
  }
}
