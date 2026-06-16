/**
 * API route to fetch chatbot leads linked to a customer.
 * Links via chatbot.leads.davincios_customer_id = customers.id
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { rows } = await query(
      `SELECT id, name, email, mobile, buyer_type, company_name,
              status, score, score_label, source_page, created_at
       FROM chatbot.leads
       WHERE davincios_customer_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    )
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch leads' }, { status: 500 })
  }
}
