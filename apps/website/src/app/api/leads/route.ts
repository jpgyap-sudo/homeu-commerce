/**
 * /api/leads
 *
 * GET: List/search/filter chatbot.leads. Used by the admin Leads management page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let sql = `SELECT * FROM chatbot.leads WHERE 1=1`
    const params: unknown[] = []
    let paramIdx = 0

    if (search) {
      paramIdx++
      sql += ` AND (LOWER(name) LIKE $${paramIdx} OR LOWER(email) LIKE $${paramIdx} OR LOWER(mobile) LIKE $${paramIdx})`
      params.push(`%${search.toLowerCase()}%`)
    }

    if (status) {
      paramIdx++
      sql += ` AND status = $${paramIdx}`
      params.push(status)
    }

    // Count total matching
    const countResult = await query(
      sql.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    )
    const total = Number(countResult.rows[0]?.count || 0)

    // Fetch page
    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)

    return NextResponse.json({
      docs: result.rows,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/leads] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
