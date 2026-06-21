/**
 * GET   /api/admin/designer-club — list applications (filter by status).
 * PATCH /api/admin/designer-club?id=N — update status/notes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const VALID_STATUSES = new Set(['new', 'contacted', 'approved', 'declined'])

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const conditions: string[] = []
    const values: any[] = []
    if (status && VALID_STATUSES.has(status)) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM designer_club_applications ${where} ORDER BY created_at DESC`,
      values
    )
    return NextResponse.json({ applications: result.rows })
  } catch (err: any) {
    console.error('[admin/designer-club] GET error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id query param is required' }, { status: 400 })

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      values.push(body.status)
      updates.push(`status = $${values.length}`)
    }
    if (body.notes !== undefined) {
      values.push(body.notes)
      updates.push(`notes = $${values.length}`)
    }
    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    updates.push('updated_at = NOW()')

    values.push(id)
    const result = await query(
      `UPDATE designer_club_applications SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rowCount === 0) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    return NextResponse.json({ application: result.rows[0] })
  } catch (err: any) {
    console.error('[admin/designer-club] PATCH error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
