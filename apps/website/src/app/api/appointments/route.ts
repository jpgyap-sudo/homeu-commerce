/**
 * /api/appointments
 *
 * GET: List/search/filter chatbot.appointments. Used by the admin Appointments management page.
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
    const leadId = searchParams.get('leadId') || ''
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let sql = `
      SELECT a.*, TO_CHAR(a.preferred_date, 'YYYY-MM-DD') as preferred_date, l.name as lead_name, l.email as lead_email, l.mobile as lead_mobile
      FROM chatbot.appointments a
      LEFT JOIN chatbot.leads l ON l.id = a.lead_id
      WHERE 1=1
    `
    const params: unknown[] = []
    let paramIdx = 0

    if (search) {
      paramIdx++
      sql += ` AND (LOWER(l.name) LIKE $${paramIdx} OR LOWER(l.email) LIKE $${paramIdx})`
      params.push(`%${search.toLowerCase()}%`)
    }

    if (status) {
      paramIdx++
      sql += ` AND a.status = $${paramIdx}`
      params.push(status)
    }

    if (leadId) {
      paramIdx++
      sql += ` AND a.lead_id = $${paramIdx}`
      params.push(leadId)
    }

    const fromIndex = sql.indexOf('FROM chatbot.appointments')
    const countSql = `SELECT COUNT(*) as count ${sql.slice(fromIndex)}`
    const countResult = await query(countSql, params)
    const total = Number(countResult.rows[0]?.count || 0)

    // Fetch page
    sql += ` ORDER BY a.created_at DESC LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`
    params.push(limit, offset)

    const result = await query(sql, params)

    return NextResponse.json({
      docs: result.rows,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[api/appointments] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
