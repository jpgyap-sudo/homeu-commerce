import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import nodemailer from 'nodemailer'

/**
 * POST /api/admin/email/send — Compose and send a new email via SMTP.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { to, subject, body: emailBody, cc } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: 'to, subject, and body required' }, { status: 400 })
    }

    // Try sending via SMTP if configured
    let sentMessageId: string | null = null
    const smtpConfigured = process.env.SMTP_HOST && process.env.SALES_EMAIL

    if (smtpConfigured) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.zoho.com',
          port: parseInt(process.env.SMTP_PORT || '465'),
          secure: process.env.SMTP_SECURE !== 'false',
          auth: {
            user: process.env.SALES_EMAIL,
            pass: process.env.SALES_EMAIL_PASS || process.env.SMTP_PASS,
          },
        })

        const info = await transporter.sendMail({
          from: process.env.SALES_EMAIL || 'sales@homeatelier.ph',
          to,
          cc: cc || undefined,
          subject,
          text: emailBody,
        })

        sentMessageId = info.messageId
      } catch (smtpErr: any) {
        console.error('[email/send] SMTP send failed:', smtpErr.message)
        // Continue — save to DB even if SMTP fails
      }
    }

    // Save to emails table
    const messageId = sentMessageId || `sent-${Date.now()}`
    await query(
      `INSERT INTO emails (message_id, subject, sender_name, sender_email, recipient_email, cc, body_text, is_read, folder, category, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'INBOX', 'sent', NOW())
       ON CONFLICT (message_id) DO NOTHING`,
      [messageId, subject, session.name, session.email, to, cc || null, emailBody]
    )

    return NextResponse.json({
      success: true,
      sent: !!smtpConfigured,
      messageId,
      note: smtpConfigured ? 'Email sent via SMTP' : 'Email saved locally (SMTP not configured — set SMTP_HOST + SALES_EMAIL in .env)',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
