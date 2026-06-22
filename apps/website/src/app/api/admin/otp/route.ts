import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createMailTransporter, loadSmtpConfig } from '@/lib/smtp-config'

const OTP_SALT_ROUNDS = 10
const OTP_EXPIRY_MINUTES = 5
const OTP_RESEND_SECONDS = 30
const ALLOWED_PURPOSES = new Set(['customer_delete'])

async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  try {
    const transporter = await createMailTransporter()
    const smtpConfig = await loadSmtpConfig()

    await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject: 'Your OTP Code — Home Atelier',
      html: `
        <div style="font-family: Arial; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #222;">Home Atelier</h2>
          <p>Your one-time verification code is:</p>
          <div style="text-align: center; margin: 24px 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #222;">
            ${otp}
          </div>
          <p style="color: #666;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="font-size: 12px; color: #999;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    })

    console.log(`[OTP] Email sent to ${to} (code ${otp.length}-digit)`)
    return true
  } catch (err: any) {
    console.error('[OTP] Failed to send email:', err.message)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, code, purpose } = await request.json()
    if (!ALLOWED_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: 'Invalid OTP purpose' }, { status: 400 })
    }

    const email = session.email.toLowerCase().trim()

    if (action === 'generate') {
      const recent = await query(
        `SELECT created_at FROM otp_codes
         WHERE email = $1 AND purpose = $2 AND used = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [email, purpose]
      )

      if (recent.rows.length > 0) {
        const elapsed = (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000
        if (elapsed < OTP_RESEND_SECONDS) {
          return NextResponse.json({
            error: `Please wait ${Math.ceil(OTP_RESEND_SECONDS - elapsed)}s before requesting a new code`,
          }, { status: 429 })
        }
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000))
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
      const hash = await bcrypt.hash(otp, OTP_SALT_ROUNDS)

      await query(
        'DELETE FROM otp_codes WHERE email = $1 AND purpose = $2 AND used = FALSE',
        [email, purpose]
      )
      await query(
        'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
        [email, hash, purpose, expiresAt]
      )

      if (!await sendOtpEmail(email, otp)) {
        await query(
          'DELETE FROM otp_codes WHERE email = $1 AND purpose = $2 AND used = FALSE',
          [email, purpose]
        )
        return NextResponse.json(
          { error: 'Failed to send OTP email. Check SMTP settings.' },
          { status: 502 }
        )
      }

      return NextResponse.json({ success: true, sent: true, note: 'OTP sent to email' })
    }

    if (action === 'verify') {
      if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

      const { rows } = await query(
        `SELECT * FROM otp_codes
         WHERE email = $1 AND purpose = $2 AND used = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [email, purpose]
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
      }

      if (!await bcrypt.compare(String(code), rows[0].code)) {
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
      }

      await query('UPDATE otp_codes SET verified_at = NOW() WHERE id = $1', [rows[0].id])
      return NextResponse.json({ success: true, verified: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[OTP] Error:', err)
    return NextResponse.json({ error: 'Failed to process OTP' }, { status: 500 })
  }
}
