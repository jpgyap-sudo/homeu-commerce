/**
 * POST /api/admin/auth/google
 *
 * Google OAuth login for admin/customer accounts.
 *
 * Accepts a Google ID token from the client-side Google Identity Services
 * flow, verifies it, looks up or creates the user, and creates a JWT session.
 *
 * Body: { credential: string }   — Google ID token
 * Response: { success: true }    — sets session cookie, redirects
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { query } from '@/lib/db'

// Google OAuth 2.0 token info endpoint (no API key needed for verification)
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token='

interface GoogleTokenPayload {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  given_name?: string
  family_name?: string
  hd?: string
  aud: string
  iss: string
  exp: number
  iat: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credential } = body

    if (!credential) {
      return NextResponse.json({ error: 'Google credential token is required' }, { status: 400 })
    }

    // ── Verify the Google ID token ────────────────────────────────
    let payload: GoogleTokenPayload
    try {
      const res = await fetch(`${GOOGLE_TOKEN_INFO_URL}${credential}`, {
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error('[auth/google] Token verification failed:', res.status, errText.slice(0, 200))
        return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
      }

      payload = await res.json()
    } catch (err: any) {
      console.error('[auth/google] Token verification error:', err.message)
      return NextResponse.json({ error: 'Failed to verify Google token' }, { status: 502 })
    }

    // Validate required fields
    if (!payload.email || !payload.email_verified) {
      return NextResponse.json({ error: 'Google account must have a verified email' }, { status: 403 })
    }

    // Validate audience: use GOOGLE_CLIENT_ID or fallback to NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const expectedAud = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    if (expectedAud && payload.aud !== expectedAud) {
      console.error('[auth/google] Audience mismatch:', { expected: expectedAud, got: payload.aud })
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 403 })
    }

    // ── Look up or create the user ────────────────────────────────
    const email = payload.email.toLowerCase().trim()
    const name = payload.name || payload.given_name || email.split('@')[0]

    // Try to find existing user by email
    const userResult = await query(
      `SELECT id, email, name, role, tab_permissions
       FROM customers
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email]
    )

    let userId: number
    let role: string
    let tabs: string[]

    if (userResult.rows.length > 0) {
      // Existing user — use their role and permissions
      const existing = userResult.rows[0]
      userId = parseInt(String(existing.id), 10)
      role = existing.role || 'admin'
      try {
        tabs = typeof existing.tab_permissions === 'string'
          ? JSON.parse(existing.tab_permissions)
          : (existing.tab_permissions || ['*'])
      } catch {
        tabs = ['*']
      }
    } else {
      // No existing user — check if Google OAuth auto-provisioning is allowed
      const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN
      const emailDomain = email.split('@')[1]

      if (!allowedDomain || emailDomain !== allowedDomain.toLowerCase()) {
        return NextResponse.json({
          error: 'No account found. Ask your admin to create one, or use email/password login.',
        }, { status: 404 })
      }

      // Auto-create user with default admin role
      const insertResult = await query(
        `INSERT INTO customers (email, name, role, status, created_at, updated_at)
         VALUES ($1, $2, 'admin', 'active', NOW(), NOW())
         RETURNING id`,
        [email, name]
      )
      userId = parseInt(String(insertResult.rows[0].id), 10)
      role = 'admin'
      tabs = ['*']

      console.log(`[auth/google] Auto-created user ${email} from Google OAuth`)
    }

    // ── Create session ────────────────────────────────────────────
    await createSession({
      id: userId,
      email,
      name,
      role,
      tabs,
    })

    console.log(`[auth/google] Login successful: ${email} (role: ${role})`)

    return NextResponse.json({
      success: true,
      user: { id: userId, email, name, role },
    })
  } catch (err: any) {
    console.error('[auth/google] Error:', err.message || 'Unknown error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
