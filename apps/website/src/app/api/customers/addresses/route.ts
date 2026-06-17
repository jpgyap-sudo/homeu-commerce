import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id           SERIAL PRIMARY KEY,
      customer_id  INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      label        TEXT DEFAULT 'Home',
      address_line1 TEXT,
      address_line2 TEXT,
      city         TEXT,
      province     TEXT,
      postal_code  TEXT,
      country      TEXT DEFAULT 'Philippines',
      is_default   BOOLEAN DEFAULT false,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `, [])
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureTable()

    const customer = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [session.email]
    )
    if (customer.rows.length === 0) return NextResponse.json({ docs: [] })

    const result = await query(
      `SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [customer.rows[0].id]
    )
    return NextResponse.json({ docs: result.rows })
  } catch (err) {
    console.error('[api/customers/addresses] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureTable()

    const customer = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [session.email]
    )
    if (customer.rows.length === 0) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const customerId = customer.rows[0].id
    const body = await request.json()
    const { label, address_line1, address_line2, city, province, postal_code, country, is_default } = body

    if (is_default) {
      await query(
        `UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`,
        [customerId]
      )
    }

    const result = await query(
      `INSERT INTO customer_addresses (customer_id, label, address_line1, address_line2, city, province, postal_code, country, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [customerId, label || 'Home', address_line1, address_line2, city, province, postal_code, country || 'Philippines', is_default || false]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (err) {
    console.error('[api/customers/addresses] POST error:', err)
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
  }
}
