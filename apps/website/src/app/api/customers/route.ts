/**
 * Customers API Route — POST (create)
 *
 * Used by the admin customer create page.
 * Auth is checked via session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Validate required fields
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
    // Handle duplicate email gracefully
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message || 'Failed to create customer' }, { status: 500 })
  }
}
