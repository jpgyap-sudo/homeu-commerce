/**
 * GET /api/chat/leads/lookup?email=xxx
 *
 * Looks up a chatbot lead by email. Used by the customer-sync engine
 * to check if a lead exists before linking to a customer account.
 * Queries the chatbot.leads table directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email?.trim()) {
      return NextResponse.json({ lead: null })
    }

    const { rows } = await query(
      `SELECT id, name, email, mobile, created_at
       FROM chatbot.leads
       WHERE LOWER(email) = LOWER($1)
       ORDER BY created_at DESC LIMIT 1`,
      [email.trim()]
    )

    if (rows.length === 0) {
      return NextResponse.json({ lead: null })
    }

    return NextResponse.json({
      lead: {
        id: rows[0].id,
        name: rows[0].name || '',
        email: rows[0].email || '',
        mobile: rows[0].mobile || '',
        createdAt: rows[0].created_at,
      },
    })
  } catch {
    return NextResponse.json({ lead: null })
  }
}
