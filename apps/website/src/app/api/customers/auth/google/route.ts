/**
 * POST /api/customers/auth/google
 *
 * Google OAuth login for customer/storefront accounts.
 * Same as admin version but creates a customer-role session
 * and redirects to /customer/dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential } = body
    if (!credential) {
      return NextResponse.json({ error: 'Google credential token is required' }, { status: 400 })
    }

    // Verify Google ID token
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })

    const payload = await res.json()
    if (!payload.email || !payload.email_verified) {
      return NextResponse.json({ error: 'Google account must have a verified email' }, { status: 403 })
    }

    const expectedAud = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    if (expectedAud && payload.aud !== expectedAud) {
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 403 })
    }

    const email = payload.email.toLowerCase().trim()
    const name = payload.name || payload.given_name || email.split('@')[0]

    // Look up or create customer
    let userResult = await query(
      `SELECT id, email, name, role FROM customers WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    )

    let userId: number
    let role: string

    if (userResult.rows.length > 0) {
      userId = parseInt(String(userResult.rows[0].id), 10)
      role = userResult.rows[0].role || 'customer'
    } else {
      // Auto-create as customer
      const insertResult = await query(
        `INSERT INTO customers (email, name, role, status, created_at, updated_at)
         VALUES ($1, $2, 'customer', 'active', NOW(), NOW())
         RETURNING id`,
        [email, name]
      )
      userId = parseInt(String(insertResult.rows[0].id), 10)
      role = 'customer'
    }

    await createSession({
      id: userId,
      email,
      name,
      role,
      tabs: ['*'],
    })

    return NextResponse.json({ success: true, user: { id: userId, email, name, role } })
  } catch (err: any) {
    console.error('[customers/auth/google] Error:', err.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
