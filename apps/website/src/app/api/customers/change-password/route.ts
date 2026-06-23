import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { sendChangePasswordOtp, verifyOtp } from '@/lib/otp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // ── Send OTP for password change ──────────────────────────────
    if (action === 'send_otp') {
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const result = await sendChangePasswordOtp(session.email)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 429 })
      }

      return NextResponse.json({ success: true })
    }

    // ── Verify OTP and change password ────────────────────────────
    if (action === 'change_password') {
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { currentPassword, newPassword, code } = body

      if (!currentPassword || !newPassword || !code) {
        return NextResponse.json(
          { error: 'Current password, new password, and verification code are required' },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters' },
          { status: 400 }
        )
      }

      // Verify current password
      const { rows } = await query(
        `SELECT password_hash FROM customers WHERE id = $1`,
        [session.id]
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const bcrypt = await import('bcryptjs')
      const valid = bcrypt.compareSync(currentPassword, rows[0].password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      // Verify OTP
      const otpResult = await verifyOtp(session.email, code, 'change_password')
      if (!otpResult.verified) {
        return NextResponse.json(
          { error: otpResult.error || 'Invalid or expired verification code' },
          { status: 400 }
        )
      }

      // Update password
      const hash = bcrypt.hashSync(newPassword, 10)
      await query(
        `UPDATE customers SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [hash, session.id]
      )

      // Log activity
      await query(
        `INSERT INTO activity_log (user_id, user_email, action) VALUES ($1, $2, 'password_changed')`,
        [session.id, session.email]
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('[api/customers/change-password] POST error:', err)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
