/**
 * Customers API Route
 *
 * POST /api/customers — Register a new customer account (public, no auth required)
 * GET  /api/customers — List customers (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Check if this is an admin creating a customer (requires auth)
  const session = await getSession()

  if (session && session.role !== 'customer') {
    // Admin creating a customer — allow with fewer restrictions
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    try {
      const { rows } = await query(
        `INSERT INTO customers (name, email, phone, company, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [
          body.name.trim(),
          body.email.trim().toLowerCase(),
          body.phone?.trim() || null,
          body.company?.trim() || null,
          body.notes?.trim() || null,
        ]
      )
      return NextResponse.json({ customer: rows[0] }, { status: 201 })
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: err.message || 'Failed to create customer' }, { status: 500 })
    }
  }

  // ── Public registration (no auth required) ──
  if (!body.name?.trim()) {
    return NextResponse.json({ errors: [{ message: 'Name is required' }] }, { status: 400 })
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ errors: [{ message: 'Email is required' }] }, { status: 400 })
  }
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ errors: [{ message: 'Password must be at least 6 characters' }] }, { status: 400 })
  }

  try {
    // Hash the password
    const bcrypt = await import('bcryptjs')
    const passwordHash = bcrypt.hashSync(body.password, 10)

    const { rows } = await query(
      `INSERT INTO customers (name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'customer', 'active', NOW(), NOW())
       RETURNING id, name, email, role`,
      [
        body.name.trim(),
        body.email.trim().toLowerCase(),
        body.phone?.trim() || null,
        passwordHash,
      ]
    )

    return NextResponse.json({
      message: 'Account created successfully',
      user: rows[0],
    }, { status: 201 })
  } catch (err: any) {
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      return NextResponse.json({ errors: [{ message: 'An account with this email already exists' }] }, { status: 409 })
    }
    console.error('[api/customers] POST error:', err)
    return NextResponse.json({ errors: [{ message: 'Registration failed' }] }, { status: 500 })
  }
}
