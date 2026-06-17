import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const result = await query('SELECT * FROM quotations WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Quotation GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotation' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const fields = Object.keys(body)
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    const sets = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ')
    const values = fields.map((f) => body[f])
    values.push(id)
    const result = await query(
      `UPDATE quotations SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Quotation PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update quotation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const result = await query('DELETE FROM quotations WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Quotation DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete quotation' },
      { status: 500 }
    )
  }
}
