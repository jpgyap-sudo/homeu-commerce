import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { createMailTransporter, loadSmtpConfig } from '@/lib/smtp-config'

/**
 * POST /api/admin/email/send - Compose and send a new email via SMTP.
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

    const smtp = await loadSmtpConfig()
    if (!smtp.host || !smtp.user || !smtp.pass) {
      return NextResponse.json(
        {
          error: 'SMTP is not configured. Set it in DaVinciOS email settings before sending client emails.',
          sent: false,
        },
        { status: 503 }
      )
    }

    let sentMessageId: string | null = null
    try {
      const transporter = await createMailTransporter()
      const info = await transporter.sendMail({
        from: smtp.from || smtp.user,
        to,
        cc: cc || undefined,
        subject,
        text: emailBody,
      })
      sentMessageId = info.messageId
    } catch (smtpErr: any) {
      console.error('[email/send] SMTP send failed:', smtpErr.message)
      return NextResponse.json(
        {
          error: `SMTP send failed: ${smtpErr.message}`,
          sent: false,
        },
        { status: 502 }
      )
    }

    await query(
      `INSERT INTO emails (message_id, subject, sender_name, sender_email, recipient_email, cc, body_text, is_read, folder, category, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'INBOX', 'sent', NOW())
       ON CONFLICT (message_id) DO NOTHING`,
      [sentMessageId || `sent-${Date.now()}`, subject, session.name, session.email, to, cc || null, emailBody]
    )

    return NextResponse.json({
      success: true,
      sent: true,
      messageId: sentMessageId,
      note: 'Email sent via SMTP',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
