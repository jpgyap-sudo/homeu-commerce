import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    await query(
      `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id         SERIAL PRIMARY KEY,
        email      TEXT NOT NULL UNIQUE,
        subscribed_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      []
    )

    await query(
      `INSERT INTO newsletter_subscribers (email)
       VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim()]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/newsletter] POST error:', err)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
