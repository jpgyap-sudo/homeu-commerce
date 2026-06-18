import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { currentPassword, newPassword } = await request.json()
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Both passwords required' }, { status: 400 })

    const { rows } = await query('SELECT password_hash FROM customers WHERE id = $1', [session.id])
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hash = bcrypt.hashSync(newPassword, 10)
    await query('UPDATE customers SET password_hash = $1 WHERE id = $2', [hash, session.id])

    // Log activity
    await query("INSERT INTO activity_log (user_id, user_email, action) VALUES ($1,$2,'password_changed')", [session.id, session.email])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
