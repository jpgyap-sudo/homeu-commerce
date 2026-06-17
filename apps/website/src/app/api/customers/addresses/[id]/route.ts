import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const customer = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [session.email]
    )
    if (customer.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const { label, address_line1, address_line2, city, province, postal_code, country, is_default } = body
    const customerId = customer.rows[0].id

    if (is_default) {
      await query(`UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`, [customerId])
    }

    const result = await query(
      `UPDATE customer_addresses
       SET label=$1, address_line1=$2, address_line2=$3, city=$4, province=$5, postal_code=$6, country=$7, is_default=$8
       WHERE id=$9 AND customer_id=$10 RETURNING *`,
      [label, address_line1, address_line2, city, province, postal_code, country, is_default || false, id, customerId]
    )
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('[api/customers/addresses/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const customer = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [session.email]
    )
    if (customer.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await query(
      `DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2`,
      [id, customer.rows[0].id]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/customers/addresses/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
