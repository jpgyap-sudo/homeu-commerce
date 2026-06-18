import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, action, code } = body

    if (action === 'generate') {
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

      const otp = String(Math.floor(100000 + Math.random() * 900000))
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

      await query('DELETE FROM otp_codes WHERE email = $1 AND used = FALSE', [email])
      await query('INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)', [email, otp, expiresAt])

      console.log(`[OTP] ${email}: ${otp}`)
      return NextResponse.json({ success: true, code: otp }) // Demo: returns code. Production: remove.
    }

    if (action === 'verify') {
      if (!email || !code) return NextResponse.json({ error: 'email and code required' }, { status: 400 })
      const { rows } = await query(
        'SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() LIMIT 1',
        [email, code]
      )
      if (rows.length === 0) return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
      await query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [rows[0].id])
      return NextResponse.json({ success: true, verified: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
