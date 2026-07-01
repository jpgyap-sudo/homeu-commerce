/**
 * GET   /api/admin/designer-club — list applications (filter by status).
 *       ?format=csv — export as CSV
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
    const format = searchParams.get('format')

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

    // CSV export
    if (format === 'csv') {
      const rows = result.rows
      const header = 'ID,First Name,Last Name,Position,Email,Company Name,Company Address,Contact Number,Company Socials,Status,Customer ID,Notes,Created At,Updated At\n'
      const csv = rows.map((r: any) =>
        `${r.id},"${r.first_name}","${r.last_name}","${r.position || ''}","${r.email}","${r.company_name}","${r.company_address || ''}","${r.contact_number || ''}","${r.company_socials || ''}",${r.status},${r.customer_id || ''},"${(r.notes || '').replace(/"/g, '""')}","${r.created_at}","${r.updated_at}"`
      ).join('\n')
      return new NextResponse(header + csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="designer-club-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    const countsResult = await query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(CASE WHEN status = 'new' THEN 1 END)::int as new,
         COUNT(CASE WHEN status = 'contacted' THEN 1 END)::int as contacted,
         COUNT(CASE WHEN status = 'approved' THEN 1 END)::int as approved,
         COUNT(CASE WHEN status = 'declined' THEN 1 END)::int as declined,
         COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END)::int as linked
       FROM designer_club_applications`
    )

    return NextResponse.json({ applications: result.rows, metrics: countsResult.rows[0] })
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

    if (body.action === 'link_customer') {
      const appResult = await query(
        `SELECT email FROM designer_club_applications WHERE id = $1 LIMIT 1`,
        [id]
      )
      const email = appResult.rows[0]?.email
      if (!email) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

      const customerResult = await query(
        `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email]
      )
      const custId = customerResult.rows[0]?.id
      if (!custId) {
        return NextResponse.json({ error: 'No customer account found with email ' + email + '. Ask the designer to register on the storefront first.' }, { status: 400 })
      }

      const updated = await query(
        `UPDATE designer_club_applications SET customer_id = $1, status = 'approved', updated_at = now() WHERE id = $2 RETURNING *`,
        [custId, id]
      )
      return NextResponse.json({ application: updated.rows[0] })
    }

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
    if (body.firstName !== undefined) {
      values.push(body.firstName)
      updates.push(`first_name = $${values.length}`)
    }
    if (body.lastName !== undefined) {
      values.push(body.lastName)
      updates.push(`last_name = $${values.length}`)
    }
    if (body.position !== undefined) {
      values.push(body.position)
      updates.push(`position = $${values.length}`)
    }
    if (body.email !== undefined) {
      values.push(body.email)
      updates.push(`email = $${values.length}`)
    }
    if (body.companyName !== undefined) {
      values.push(body.companyName)
      updates.push(`company_name = $${values.length}`)
    }
    if (body.companyAddress !== undefined) {
      values.push(body.companyAddress)
      updates.push(`company_address = $${values.length}`)
    }
    if (body.contactNumber !== undefined) {
      values.push(body.contactNumber)
      updates.push(`contact_number = $${values.length}`)
    }
    if (body.companySocials !== undefined) {
      values.push(body.companySocials)
      updates.push(`company_socials = $${values.length}`)
    }
    if (body.customerId !== undefined) {
      values.push(body.customerId ? Number(body.customerId) : null)
      updates.push(`customer_id = $${values.length}`)
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

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'customer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id query param is required' }, { status: 400 })

    const result = await query('DELETE FROM designer_club_applications WHERE id = $1 RETURNING id', [parseInt(id)])
    if (result.rowCount === 0) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[admin/designer-club] DELETE error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

