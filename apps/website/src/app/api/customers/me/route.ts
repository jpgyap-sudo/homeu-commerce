/**
 * GET /api/customers/me — Fetch the currently logged-in customer profile.
 *
 * Uses the session email to look up the customer record.
 * Falls back to lead-based lookup if no customer exists.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure customers table exists (safety for missing migrations)
    try { await query('SELECT 1 FROM customers LIMIT 0', []) } catch {
      await query(`CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE NOT NULL,
        phone TEXT, password_hash TEXT, role TEXT DEFAULT 'customer',
        status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`, [])
    }

    // Try to find customer by email
    const result = await query(
      `SELECT id, name, email, created_at, updated_at
       FROM customers
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [session.email]
    )

    if (result.rows.length > 0) {
      const c = result.rows[0]
      return NextResponse.json({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: null,
        company: null,
        address: null,
        createdAt: c.created_at,
      })
    }

    // Fallback: try lead with matching email
    const leadResult = await query(
      `SELECT id, name, email, mobile, company_name
       FROM chatbot.leads
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [session.email]
    )

    if (leadResult.rows.length > 0) {
      const l = leadResult.rows[0]
      return NextResponse.json({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.mobile,
        company: l.company_name,
        address: null,
        createdAt: null,
      })
    }

    // No customer or lead found — auto-create from session data
    try {
      const insertResult = await query(
        `INSERT INTO customers (email, name, role, status, created_at, updated_at)
         VALUES ($1, $2, 'customer', 'active', NOW(), NOW())
         RETURNING id, name, email, created_at`,
        [session.email, session.name || session.email.split('@')[0]]
      )
      const newCustomer = insertResult.rows[0]
      return NextResponse.json({
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: null,
        company: null,
        address: null,
        createdAt: newCustomer.created_at,
      })
    } catch (insertErr) {
      console.error('[api/customers/me] Auto-create failed:', insertErr)
      return NextResponse.json({ error: 'Account not found. Please contact support.' }, { status: 404 })
    }
  } catch (err) {
    console.error('[api/customers/me] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
