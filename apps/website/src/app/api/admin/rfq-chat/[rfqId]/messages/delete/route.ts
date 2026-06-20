/**
 * POST /api/admin/rfq-chat/[rfqId]/messages/delete
 *
 * Two-step deletion flow:
 * Step 1 (select): Returns a deletion request ID. OTP is sent to jpgyap@gmail.com.
 * Step 2 (confirm): With OTP code, actually soft-deletes the messages.
 *
 * Request body (step 1 - select):
 *   { action: "select", messageIds: ["uuid1", "uuid2"] }
 *
 * Request body (step 2 - confirm):
 *   { action: "confirm", deletionRequestId: "uuid", otpCode: "123456" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  getConversationByRfqId,
  createDeletionRequest,
  executeDeletionRequest,
} from '@/lib/rfq-chat-db'

const OTP_EMAIL = 'jpgyap@gmail.com'

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

    const conversation = await getConversationByRfqId(rfqRequestId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    // ── Step 1: Select messages for deletion ──
    if (action === 'select') {
      const { messageIds } = body
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return NextResponse.json({ error: 'messageIds array is required' }, { status: 400 })
      }

      // Verify none of the selected messages are system events (cannot delete)
      const protectedTypes = ['system_event', 'notification']
      const { query: dbQuery } = await import('@/lib/db')
      const protectedMsgs = await dbQuery(
        `SELECT id, message_type FROM rfq_chat_messages
         WHERE id = ANY($1::uuid[]) AND message_type = ANY($2)`,
        [messageIds, protectedTypes]
      )

      if (protectedMsgs.rows.length > 0) {
        const protectedLabels = protectedMsgs.rows
          .map((r: any) => `${r.id} (type: ${r.message_type})`)
          .join(', ')
        return NextResponse.json({
          error: `Cannot delete system timeline events: ${protectedLabels}`,
          protectedMessageIds: protectedMsgs.rows.map((r: any) => r.id),
          deletableMessageIds: messageIds.filter(
            (id: string) => !protectedMsgs.rows.some((r: any) => r.id === id)
          ),
        }, { status: 400 })
      }

      // Create deletion request (pending OTP)
      const deletionRequestId = await createDeletionRequest(
        Number(session.id),
        conversation.id,
        messageIds
      )

      // Send OTP to jpgyap@gmail.com
      const otpResult = await sendOtpEmail(Number(session.id))

      return NextResponse.json({
        deletionRequestId,
        messageCount: messageIds.length,
        otpSent: otpResult.sent,
        otpTo: OTP_EMAIL,
      })
    }

    // ── Step 2: Confirm deletion with OTP ──
    if (action === 'confirm') {
      const { deletionRequestId, otpCode } = body

      if (!deletionRequestId || !otpCode) {
        return NextResponse.json({ error: 'deletionRequestId and otpCode are required' }, { status: 400 })
      }

      // Verify OTP
      const otpValid = await verifyOtp(OTP_EMAIL, otpCode)
      if (!otpValid) {
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
      }

      // Mark the deletion request as OTP-verified
      await query(
        'UPDATE rfq_chat_deletion_requests SET otp_verified = TRUE, otp_verified_at = NOW() WHERE id = $1',
        [deletionRequestId]
      )

      // Execute the deletion
      const executed = await executeDeletionRequest(deletionRequestId, Number(session.id))

      if (!executed) {
        return NextResponse.json({
          error: 'Deletion request already executed or not found',
        }, { status: 400 })
      }

      // Audit log
      console.log(`[rfq-chat-delete] Admin ${session.id} (${session.email}) deleted messages via OTP`)

      return NextResponse.json({
        success: true,
        message: 'Messages deleted successfully',
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use "select" or "confirm"' }, { status: 400 })
  } catch (err: any) {
    console.error('[admin/rfq-chat/delete] Error:', err.message)
    return NextResponse.json({ error: 'Failed to process deletion' }, { status: 500 })
  }
}

/**
 * Send OTP to jpgyap@gmail.com for deletion approval.
 * Uses the existing OTP infrastructure.
 */
async function sendOtpEmail(adminUserId: number): Promise<{ sent: boolean }> {
  try {
    // Generate OTP via the existing admin OTP endpoint pattern
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Store OTP in the same otp_codes table
    await query(
      'DELETE FROM otp_codes WHERE email = $1 AND used = FALSE',
      [OTP_EMAIL]
    )
    await query(
      'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
      [OTP_EMAIL, hash, expiresAt]
    )

    // Send via nodemailer using DB-stored SMTP config
    const { createMailTransporter, loadSmtpConfig } = await import('@/lib/smtp-config')
    const transporter = await createMailTransporter()
    const smtpConfig = await loadSmtpConfig()

    await transporter.sendMail({
      from: smtpConfig.from,
      to: OTP_EMAIL,
      subject: '🔐 Confirm Message Deletion — Home Atelier Admin',
      html: `
        <div style="font-family: Arial; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2>Home Atelier — Admin Alert</h2>
          <p>An admin has requested to delete messages from an RFQ conversation.</p>
          <div style="text-align: center; margin: 24px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #222;">
            ${otp}
          </div>
          <p style="color: #666;">This code expires in 5 minutes.</p>
          <p style="font-size: 12px; color: #999;">If you did not request this, please check your account security.</p>
        </div>
      `,
    })

    console.log(`[rfq-chat-delete] OTP sent to ${OTP_EMAIL} (not logged for security)`)
    return { sent: true }
  } catch (err: any) {
    console.error('[rfq-chat-delete] Failed to send OTP email:', err.message)
    return { sent: false }
  }
}

/**
 * Verify an OTP code against the stored hash.
 */
async function verifyOtp(email: string, code: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT * FROM otp_codes WHERE email = $1 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email]
    )
    if (result.rows.length === 0) return false

    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(code, result.rows[0].code)
    if (valid) {
      // Mark OTP as used
      await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [result.rows[0].id])
    }
    return valid
  } catch {
    return false
  }
}
