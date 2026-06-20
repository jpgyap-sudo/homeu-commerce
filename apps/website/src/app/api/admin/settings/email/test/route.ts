/**
 * POST /api/admin/settings/email/test
 *
 * Admin-only: Sends a test email using the provided SMTP config
 * to verify the settings are correct.
 *
 * Body: { config: { smtp_host, smtp_port, smtp_secure, smtp_user,
 *                    smtp_pass, smtp_from } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { config } = body

    if (!config?.smtp_host || !config?.smtp_user) {
      return NextResponse.json({ error: 'SMTP host and user are required' }, { status: 400 })
    }

    // Create transporter with the provided config
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port || '587'),
      secure: config.smtp_secure === 'true',
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass || '',
      },
    })

    // Send test email to the current admin's email
    const info = await transporter.sendMail({
      from: config.smtp_from || `"Test" <${config.smtp_user}>`,
      to: session.email,
      subject: '✅ Home Atelier — SMTP Test Email',
      html: `
        <div style="font-family: Arial; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2>SMTP Configuration Test</h2>
          <p style="color: #2e7d32; font-size: 16px;">✅ Your SMTP settings are working correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <div style="font-size: 13px; color: #666;">
            <p>Host: ${config.smtp_host}:${config.smtp_port || 587}</p>
            <p>User: ${config.smtp_user}</p>
            <p>Secure: ${config.smtp_secure === 'true' ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}</p>
            <p>Sent at: ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Test email sent successfully!',
    })
  } catch (err: any) {
    console.error('[admin/settings/email/test] Error:', err.message)
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to send test email',
    }, { status: 500 })
  }
}
