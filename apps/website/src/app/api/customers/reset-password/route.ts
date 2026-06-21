import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'
import crypto from 'crypto'

// POST — request reset link or change password when already logged in
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Logged-in password change (from account page)
    if (body.currentPassword && body.newPassword) {
      const session = await getSession()
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const result = await query(
        `SELECT id, password_hash FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [session.email]
      )
      const user = result.rows[0]
      if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

      const valid = await verifyPassword(body.currentPassword, user.password_hash)
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

      const hash = await hashPassword(body.newPassword)
      await query(`UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, user.id])
      return NextResponse.json({ ok: true })
    }

    // Unauthenticated reset request — generate token and send email
    if (body.email) {
      const customerEmail = body.email.toLowerCase().trim()
      const result = await query(
        `SELECT id, name FROM customers WHERE LOWER(email) = $1 LIMIT 1`,
        [customerEmail]
      )
      if (result.rows.length > 0) {
        const token = crypto.randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

        await query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id         SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
            token      TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used       BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`, [])

        await query(
          `INSERT INTO password_reset_tokens (customer_id, token, expires_at) VALUES ($1,$2,$3)`,
          [result.rows[0].id, token, expires]
        )

        // Load SMTP config from DB with env fallback
        const { loadSmtpConfig } = await import('@/lib/smtp-config')
        const smtp = await loadSmtpConfig()
        const serverUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://store.homeu.ph'
        const resetLink = `${serverUrl}/customer/reset-password?token=${token}`
        const customerName = result.rows[0].name || 'Valued Customer'

        // Send reset email
        try {
          const nodemailer = await import('nodemailer')
          const transporter = nodemailer.default.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: { user: smtp.user, pass: smtp.pass },
          })
          await transporter.sendMail({
            from: smtp.from || 'noreply@homeu.ph',
            to: customerEmail,
            subject: 'Reset Your HomeU Password',
            text: `Hi ${customerName},\n\nWe received a request to reset your HomeU account password.\n\nClick the link below to set a new password (expires in 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\n— HomeU Team`,
            html: `<p>Hi ${customerName},</p><p>We received a request to reset your HomeU account password.</p><p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1a6d3e;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p><p>— HomeU Team</p>`,
          })
          console.log(`[reset-password] Email sent to ${customerEmail}`)
        } catch (emailErr) {
          console.error(`[reset-password] Failed to send email to ${customerEmail}:`, emailErr)
        }
      }
      // Always return OK to prevent email enumeration
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    console.error('[api/customers/reset-password] POST error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

// PATCH — confirm reset with token and set new password
export async function PATCH(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()
    if (!token || !newPassword) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const result = await query(
      `SELECT customer_id FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW() LIMIT 1`,
      [token]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    const customerId = result.rows[0].customer_id
    const hash = await hashPassword(newPassword)

    await query(`UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, customerId])
    await query(`UPDATE password_reset_tokens SET used = true WHERE token = $1`, [token])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/customers/reset-password] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
