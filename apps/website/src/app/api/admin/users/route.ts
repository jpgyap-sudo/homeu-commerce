import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const ALL_SECTIONS = ['main','catalog','sales','content','insights','apps','system']

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    const { rows } = await query('SELECT id, email, name, role, status, tab_permissions, otp_enabled, theme, created_at FROM customers ORDER BY role, name')
    return NextResponse.json({ users: rows })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    const body = await request.json()
    const { id, name, role, status, tabs, password, otp_enabled, theme } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const sets: string[] = []; const vals: any[] = []; let i = 1
    if (name) { sets.push(`name=$${i++}`); vals.push(name) }
    if (role) { sets.push(`role=$${i++}`); vals.push(role) }
    if (status) { sets.push(`status=$${i++}`); vals.push(status) }
    if (otp_enabled !== undefined) { sets.push(`otp_enabled=$${i++}`); vals.push(otp_enabled) }
    if (theme) { sets.push(`theme=$${i++}`); vals.push(theme) }
    if (tabs !== undefined) {
      const safeTabs = Array.isArray(tabs) ? tabs.filter(t => ALL_SECTIONS.includes(t) || t === '*') : ['*']
      sets.push(`tab_permissions=$${i++}`); vals.push(JSON.stringify(safeTabs))
    }
    if (password) {
      sets.push(`password_hash=$${i++}`); vals.push(bcrypt.hashSync(password, 10))
    }
    if (sets.length === 0) return NextResponse.json({ error: 'no fields' }, { status: 400 })

    vals.push(id)
    const { rows } = await query(`UPDATE customers SET ${sets.join(', ')} WHERE id=$${i} RETURNING id, email, name, role, status, tab_permissions`, vals)
    return NextResponse.json({ user: rows[0] })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  try {
    const body = await request.json()
    const { email, name, role, password, tabs } = body
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 })

    const safeTabs = Array.isArray(tabs) ? tabs.filter(t => ALL_SECTIONS.includes(t) || t === '*') : ['*']
    const { rows } = await query(
      `INSERT INTO customers (email, name, role, status, password_hash, tab_permissions) VALUES ($1,$2,$3,'active',$4,$5) RETURNING id, email, name, role, status, tab_permissions`,
      [email, name || email.split('@')[0], role || 'editor', bcrypt.hashSync(password, 10), JSON.stringify(safeTabs)]
    )
    return NextResponse.json({ user: rows[0] })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
