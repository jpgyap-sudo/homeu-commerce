/**
 * POST /api/admin/rfq-chat/[rfqId]/notify
 *
 * Admin-only: Sends a notification email to the customer with a
 * direct deep link to their RFQ account. This is the ONLY way
 * an email is sent — admin must explicitly click the Notify button.
 *
 * Inserts a notification system message in the RFQ chat and logs
 * the notification event.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  getConversationByRfqId,
  insertMessage,
  logNotification,
} from '@/lib/rfq-chat-db'
import {
  sendRfqNotificationEmail,
  getRfqForNotification,
} from '@/lib/rfq-chat-notify'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role (any role except customer can notify)
    if (session.role === 'customer') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { rfqId } = await params
    const rfqRequestId = parseInt(rfqId)
    if (isNaN(rfqRequestId)) {
      return NextResponse.json({ error: 'Invalid RFQ ID' }, { status: 400 })
    }

    // Fetch RFQ customer info
    const rfqInfo = await getRfqForNotification(rfqRequestId)
    if (!rfqInfo) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
    }

    if (!rfqInfo.email) {
      return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 })
    }

    // Get or create the conversation
    const conversation = await getConversationByRfqId(rfqRequestId)
    if (!conversation) {
      return NextResponse.json({ error: 'No chat conversation found for this RFQ' }, { status: 404 })
    }

    // Send the email
    const emailResult = await sendRfqNotificationEmail(
      rfqInfo.email,
      rfqInfo.customerName,
      rfqRequestId
    )

    if (!emailResult.success) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send email' }, { status: 500 })
    }

    // Insert a system notification message in the chat
    await insertMessage({
      conversationId: conversation.id,
      senderType: 'system',
      content: `📨 Notification sent to ${rfqInfo.email}`,
      messageType: 'notification',
      metadata: {
        notificationType: 'admin_notify',
        emailSentTo: rfqInfo.email,
        emailMessageId: emailResult.messageId,
      },
    })

    // Log the notification
    const rfqDisplayId = `RFQ #${String(rfqRequestId).slice(-6).toUpperCase()}`
    await logNotification({
      conversationId: conversation.id,
      adminUserId: Number(session.id),
      notificationType: 'admin_notify',
      emailSentTo: rfqInfo.email,
      emailSubject: `Update on your ${rfqDisplayId} — Home Atelier`,
      emailLink: `${process.env.APP_URL || 'https://homeu.ph'}/customer/rfq/${rfqRequestId}`,
      triggeredBy: 'manual',
    })

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${rfqInfo.email}`,
      emailSentTo: rfqInfo.email,
    })
  } catch (err: any) {
    console.error('[admin/rfq-chat/notify] Error:', err.message)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}

/**
 * GET /api/admin/rfq-chat/[rfqId]/notify-log
 * Returns the notification history for an RFQ conversation.
 */
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
      return NextResponse.json({ logs: [] })
    }

    const { getNotificationLog } = await import('@/lib/rfq-chat-db')
    const logs = await getNotificationLog(conversation.id)

    return NextResponse.json({ logs })
  } catch (err: any) {
    console.error('[admin/rfq-chat/notify-log] Error:', err.message)
    return NextResponse.json({ error: 'Failed to fetch notification log' }, { status: 500 })
  }
}
