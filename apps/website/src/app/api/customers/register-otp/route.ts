import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { sendRegistrationOtp, verifyOtp } from '@/lib/otp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // ── Send OTP for registration ─────────────────────────────────
    if (action === 'send_otp') {
      const { email, name, phone } = body

      if (!email?.trim()) {
        return NextResponse.json({ errors: [{ message: 'Email is required' }] }, { status: 400 })
      }
      if (!name?.trim()) {
        return NextResponse.json({ errors: [{ message: 'Name is required' }] }, { status: 400 })
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ errors: [{ message: 'Invalid email format' }] }, { status: 400 })
      }

      // Check if email already exists
      const existing = await query(
        `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email.trim()]
      )
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { errors: [{ message: 'An account with this email already exists' }] },
          { status: 409 }
        )
      }

      const result = await sendRegistrationOtp(email.trim(), name.trim(), phone?.trim())
      if (!result.success) {
        return NextResponse.json({ errors: [{ message: result.error }] }, { status: 429 })
      }

      return NextResponse.json({ success: true })
    }

    // ── Complete registration after OTP verification ──────────────
    if (action === 'complete_registration') {
      const { email, code, name, phone, password, subscribe_newsletter, accepted_terms } = body

      if (!email?.trim()) {
        return NextResponse.json({ errors: [{ message: 'Email is required' }] }, { status: 400 })
      }
      if (!code) {
        return NextResponse.json({ errors: [{ message: 'Verification code is required' }] }, { status: 400 })
      }
      if (!name?.trim()) {
        return NextResponse.json({ errors: [{ message: 'Name is required' }] }, { status: 400 })
      }
      if (!password || password.length < 6) {
        return NextResponse.json(
          { errors: [{ message: 'Password must be at least 6 characters' }] },
          { status: 400 }
        )
      }
      // Verify OTP
      const otpResult = await verifyOtp(email.trim(), code, 'registration')
      if (!otpResult.verified) {
        return NextResponse.json(
          { errors: [{ message: otpResult.error || 'Invalid or expired verification code' }] },
          { status: 400 }
        )
      }

      // Create the customer account
      const bcrypt = await import('bcryptjs')
      const passwordHash = bcrypt.hashSync(password, 10)

      const { rows } = await query(
        `INSERT INTO customers (name, email, phone, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'customer', 'active', NOW(), NOW())
         RETURNING id, name, email, role`,
        [
          name.trim(),
          email.trim().toLowerCase(),
          phone?.trim() || null,
          passwordHash,
        ]
      )

      const user = rows[0]

      // Auto-subscribe to newsletter if consent given (default: on)
      if (subscribe_newsletter !== false) {
        try {
          await query(
            `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
              id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE,
              source TEXT DEFAULT 'registration', subscribed_at TIMESTAMPTZ DEFAULT NOW()
            )`, []
          )
          await query(
            `INSERT INTO newsletter_subscribers (email, source)
             VALUES ($1, 'registration') ON CONFLICT (email) DO NOTHING`,
            [email.trim().toLowerCase()]
          )
          console.log(`[register-otp] Auto-subscribed ${email} to newsletter`)
        } catch (nsErr) {
          console.error('[register-otp] Newsletter subscribe error:', nsErr)
          // Non-fatal — don't block registration
        }
      }

      // Create session (auto-login after registration)
      await createSession({
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        role: user.role || 'customer',
        tabs: ['main'],
      })

      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      })
    }

    return NextResponse.json({ errors: [{ message: 'Invalid action' }] }, { status: 400 })
  } catch (err: any) {
    console.error('[api/customers/register-otp] POST error:', err)
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      return NextResponse.json(
        { errors: [{ message: 'An account with this email already exists' }] },
        { status: 409 }
      )
    }
    return NextResponse.json({ errors: [{ message: 'Registration failed' }] }, { status: 500 })
  }
}
