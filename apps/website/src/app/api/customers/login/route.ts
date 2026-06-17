import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json(
        { errors: [{ message: 'Email and password are required' }] },
        { status: 400 }
      )
    }

    const result = await query(
      `SELECT id, email, name, role, password_hash, status
       FROM customers
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    )

    const user = result.rows[0]
    if (!user || !user.password_hash) {
      return NextResponse.json(
        { errors: [{ message: 'Invalid email or password' }] },
        { status: 401 }
      )
    }

    if (user.status && user.status === 'inactive') {
      return NextResponse.json(
        { errors: [{ message: 'Account is inactive. Please contact us.' }] },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { errors: [{ message: 'Invalid email or password' }] },
        { status: 401 }
      )
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      role: user.role || 'customer',
    })

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    console.error('[api/customers/login] POST error:', err)
    return NextResponse.json({ errors: [{ message: 'Login failed' }] }, { status: 500 })
  }
}
