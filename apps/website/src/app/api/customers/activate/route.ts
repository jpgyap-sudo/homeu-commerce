import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    await query(`
      CREATE TABLE IF NOT EXISTS activation_tokens (
        id          SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        token       TEXT NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `, [])

    const result = await query(
      `SELECT customer_id FROM activation_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW()
       LIMIT 1`,
      [token]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Activation link is invalid or has expired' }, { status: 400 })
    }

    const customerId = result.rows[0].customer_id
    await query(`UPDATE customers SET status = 'active', updated_at = NOW() WHERE id = $1`, [customerId])
    await query(`UPDATE activation_tokens SET used = true WHERE token = $1`, [token])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/customers/activate] POST error:', err)
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}

// Helper used by /api/customers POST (registration) to generate an activation token
async function generateActivationToken(customerId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 hours

  await query(`
    CREATE TABLE IF NOT EXISTS activation_tokens (
      id          SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      token       TEXT NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `, [])

  await query(
    `INSERT INTO activation_tokens (customer_id, token, expires_at) VALUES ($1,$2,$3)`,
    [customerId, token, expires]
  )

  return token
}
