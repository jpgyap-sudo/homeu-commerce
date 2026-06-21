import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const VALID_STATUSES = new Set(['new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'spam'])

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const result = await query(`SELECT * FROM chatbot.leads WHERE id = $1`, [id])
    if (result.rowCount === 0) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    if (!VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 })
    }
    const result = await query(
      `UPDATE chatbot.leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [body.status, id]
    )
    if (result.rowCount === 0) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
