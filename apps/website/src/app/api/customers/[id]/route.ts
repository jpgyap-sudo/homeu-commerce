/**
 * Customers API Route — GET (single) and PATCH (update)
 *
 * Used by the admin customer edit page.
 * Auth is checked via session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { rows } = await query('SELECT * FROM customers WHERE id = $1', [id])
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Only allow updating specific fields
  const allowedFields = ['name', 'email', 'phone', 'notes', 'company', 'address', 'lead_status']
  const updates: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    // Build dynamic UPDATE query
    const keys = Object.keys(updates)
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
    const values = keys.map(k => updates[k])
    values.push(id)

    const { rows } = await query(
      `UPDATE customers SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update customer' }, { status: 500 })
  }
}
