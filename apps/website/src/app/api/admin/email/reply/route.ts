import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import nodemailer from 'nodemailer'

/**
 * POST /api/admin/email/reply
 * Send a reply via Zoho SMTP.
 * Body: { to, subject, text, inReplyTo? }
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { to, subject, text, inReplyTo } = body

    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'to, subject, and text required' }, { status: 400 })
    }

    // Reuse existing nodemailer SMTP config
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SALES_EMAIL || process.env.SMTP_USER,
        pass: process.env.SALES_EMAIL_PASS || process.env.SMTP_PASS,
      },
    })

    const info = await transporter.sendMail({
      from: process.env.SALES_EMAIL || process.env.SMTP_FROM || 'sales@homeatelier.ph',
      to,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      text,
      inReplyTo,
      references: inReplyTo,
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
