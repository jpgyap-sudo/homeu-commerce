import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'

const OTP_SALT_ROUNDS = 10
const OTP_EXPIRY_MINUTES = 5
const OTP_RESEND_SECONDS = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, action, code } = body

    if (action === 'generate') {
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

      // Rate limit: check if a recent OTP was sent
      const recent = await query(
        `SELECT created_at FROM otp_codes WHERE email = $1 AND used = FALSE ORDER BY created_at DESC LIMIT 1`,
        [email]
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

      await query('DELETE FROM otp_codes WHERE email = $1 AND used = FALSE', [email])
      await query(
        'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
        [email, hash, expiresAt]
      )

      // TODO: send via email provider: sendEmail(email, `Your OTP: ${otp}`)
      console.log(`[OTP] Generated for ${email} (not logged for security)`)

      // NEVER return the OTP — only confirm it was generated
      return NextResponse.json({ success: true, sent: true })
    }

    if (action === 'verify') {
      if (!email || !code) return NextResponse.json({ error: 'email and code required' }, { status: 400 })

      const { rows } = await query(
        'SELECT * FROM otp_codes WHERE email = $1 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [email]
      )
      if (rows.length === 0) return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })

      const valid = await bcrypt.compare(code, rows[0].code)
      if (!valid) return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })

      await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [rows[0].id])
      return NextResponse.json({ success: true, verified: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[OTP] Error:', err)
    return NextResponse.json({ error: 'Failed to process OTP' }, { status: 500 })
  }
}
