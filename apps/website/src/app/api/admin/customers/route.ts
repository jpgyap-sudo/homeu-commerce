import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/** DELETE /api/admin/customers — requires a recent customer-delete OTP. */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await request.json() as { ids?: Array<string | number> }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array of customer IDs' }, { status: 400 })
    }

    const customerIds = [...new Set(ids.map(Number))]
    if (customerIds.some(id => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ error: 'All customer IDs must be positive integers' }, { status: 400 })
    }

    const result = await query(
      `WITH consumed_otp AS (
         UPDATE otp_codes
         SET used = TRUE
         WHERE id = (
           SELECT id FROM otp_codes
           WHERE email = $1
             AND purpose = 'customer_delete'
             AND used = FALSE
             AND verified_at > NOW() - INTERVAL '5 minutes'
             AND expires_at > NOW()
           ORDER BY verified_at DESC
           LIMIT 1
           FOR UPDATE
         )
         RETURNING id
       ), deleted AS (
         DELETE FROM customers
         WHERE id = ANY($2::int[])
           AND EXISTS (SELECT 1 FROM consumed_otp)
         RETURNING id
       )
       SELECT
         (SELECT COUNT(*)::int FROM consumed_otp) AS otp_consumed,
         COALESCE((SELECT ARRAY_AGG(id) FROM deleted), ARRAY[]::int[]) AS deleted_ids`,
      [session.email.toLowerCase().trim(), customerIds]
    )

    if (!result.rows[0]?.otp_consumed) {
      return NextResponse.json({ error: 'A recent OTP verification is required' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      deleted: result.rows[0].deleted_ids.length,
    })
  } catch (err: any) {
    console.error('[API] Bulk delete customers error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete customers' }, { status: 500 })
  }
}

/** GET /api/admin/customers — search and list customers for admin utilities. */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role === 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    let result
    if (search) {
      result = await query(
        `SELECT id, name, email, phone, company FROM customers
         WHERE name ILIKE $1 OR email ILIKE $1 OR COALESCE(phone, '') ILIKE $1
         ORDER BY name ASC LIMIT 50`,
        [`%${search}%`]
      )
    } else {
      result = await query(
        `SELECT id, name, email, phone, company FROM customers
         ORDER BY name ASC LIMIT 50`
      )
    }

    return NextResponse.json({ customers: result.rows })
  } catch (err: any) {
    console.error('[API] GET customers error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch customers' }, { status: 500 })
  }
}
