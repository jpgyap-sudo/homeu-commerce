import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * DELETE /api/admin/customers
 *
 * Bulk delete customers by IDs.
 * Requires authentication and OTP verification (handled client-side before calling).
 */
export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { ids } = body as { ids?: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array of customer UUIDs' },
        { status: 400 }
      )
    }

    // Build parameterized DELETE with positional placeholders
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
    const result = await query(
      `DELETE FROM customers WHERE id IN (${placeholders})`,
      ids
    )

    return NextResponse.json({
      success: true,
      deleted: result.rowCount,
    })
  } catch (err: any) {
    console.error('[API] Bulk delete customers error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to delete customers' },
      { status: 500 }
    )
  }
}
