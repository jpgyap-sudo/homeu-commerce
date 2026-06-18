import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { syncEmails, linkEmailsToCustomers, categorizeEmail } from '@/lib/mail-client'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const folder = url.searchParams.get('folder') || 'INBOX'
    const category = url.searchParams.get('category') || ''
    const search = url.searchParams.get('search') || ''
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0)

    let sql = `SELECT e.*, c.name AS customer_name, c.email AS customer_email
               FROM emails e LEFT JOIN customers c ON e.customer_id = c.id`
    const conditions: string[] = []
    const params: any[] = []
    let i = 1

    if (folder !== 'all') { conditions.push(`e.folder = $${i++}`); params.push(folder) }
    if (category) { conditions.push(`e.category = $${i++}`); params.push(category) }
    if (search) {
      conditions.push(`(e.subject ILIKE $${i} OR e.sender_name ILIKE $${i} OR e.sender_email ILIKE $${i} OR e.body_text ILIKE $${i})`)
      params.push(`%${search}%`); i++
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ` ORDER BY e.received_at DESC LIMIT $${i++} OFFSET $${i++}`
    params.push(limit, offset)

    const { rows } = await query(sql, params)
    const { rows: countRows } = await query('SELECT COUNT(*) FROM emails')

    // Get unread count
    const { rows: unreadRows } = await query('SELECT COUNT(*) FROM emails WHERE is_read = FALSE')

    return NextResponse.json({
      emails: rows,
      total: Number(countRows[0]?.count || 0),
      unread: Number(unreadRows[0]?.count || 0),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, is_read, is_starred, category } = body

    if (id) {
      const sets: string[] = []; const vals: any[] = []; let i = 1
      if (is_read !== undefined) { sets.push(`is_read = $${i++}`); vals.push(is_read) }
      if (is_starred !== undefined) { sets.push(`is_starred = $${i++}`); vals.push(is_starred) }
      if (category) { sets.push(`category = $${i++}`); vals.push(category) }
      if (sets.length > 0) {
        vals.push(id)
        await query(`UPDATE emails SET ${sets.join(', ')} WHERE id = $${i}`, vals)
      }
    } else if (body.markAllRead) {
      await query('UPDATE emails SET is_read = TRUE WHERE is_read = FALSE')
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
