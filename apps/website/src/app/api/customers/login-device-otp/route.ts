import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { sendLoginDeviceOtp, verifyOtp } from '@/lib/otp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // ── Send OTP for new device login ─────────────────────────────
    if (action === 'send_otp') {
      const { email, password } = body

      if (!email?.trim() || !password) {
        return NextResponse.json(
          { errors: [{ message: 'Email and password are required' }] },
          { status: 400 }
        )
      }

      // Verify credentials first before sending OTP
      const result = await query(
        `SELECT id, email, name, role, password_hash, status
         FROM customers
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [email.trim()]
      )

      const user = result.rows[0]
      if (!user || !user.password_hash) {
        return NextResponse.json(
          { errors: [{ message: 'Invalid email or password' }] },
          { status: 401 }
        )
      }

      if (user.status && user.status === 'inactive') {
        return NextResponse.json(
          { errors: [{ message: 'Account is inactive. Please contact us.' }] },
          { status: 403 }
        )
      }

      const bcrypt = await import('bcryptjs')
      const valid = bcrypt.compareSync(password, user.password_hash)
      if (!valid) {
        return NextResponse.json(
          { errors: [{ message: 'Invalid email or password' }] },
          { status: 401 }
        )
      }

      // Send OTP
      const otpResult = await sendLoginDeviceOtp(email.trim())
      if (!otpResult.success) {
        return NextResponse.json({ errors: [{ message: otpResult.error }] }, { status: 429 })
      }

      return NextResponse.json({
        success: true,
        requires_device_otp: true,
        user: { id: user.id, email: user.email, name: user.name },
      })
    }

    // ── Verify OTP and complete login ─────────────────────────────
    if (action === 'verify_login') {
      const { email, code, deviceId, trustDevice } = body

      if (!email?.trim() || !code) {
        return NextResponse.json(
          { errors: [{ message: 'Email and verification code are required' }] },
          { status: 400 }
        )
      }

      const otpResult = await verifyOtp(email.trim(), code, 'login_new_device')
      if (!otpResult.verified) {
        return NextResponse.json(
          { errors: [{ message: otpResult.error || 'Invalid or expired verification code' }] },
          { status: 400 }
        )
      }

      // Get the user
      const { rows } = await query(
        `SELECT id, email, name, role FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email.trim()]
      )

      if (rows.length === 0) {
        return NextResponse.json({ errors: [{ message: 'User not found' }] }, { status: 404 })
      }

      const user = rows[0]

      // Create session
      await createSession({
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        role: user.role || 'customer',
        tabs: ['main'],
      })

      // If trustDevice is true, store device fingerprint in known_devices
      if (trustDevice && deviceId) {
        const deviceRecord = {
          device_id: deviceId,
          trusted_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || 'unknown',
        }
        await query(
          `UPDATE customers
           SET known_devices = known_devices || $2::jsonb
           WHERE id = $1`,
          [user.id, JSON.stringify([deviceRecord])]
        )
      }

      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      })
    }

    return NextResponse.json({ errors: [{ message: 'Invalid action' }] }, { status: 400 })
  } catch (err) {
    console.error('[api/customers/login-device-otp] POST error:', err)
    return NextResponse.json({ errors: [{ message: 'Verification failed' }] }, { status: 500 })
  }
}
