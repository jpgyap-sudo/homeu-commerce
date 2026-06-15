/**
 * GET /api/chat/leads/lookup?email=xxx
 *
 * Looks up a chatbot lead by email. Used by the customer-sync engine
 * to check if a lead exists before linking to a customer account.
 *
 * In production, this queries the chatbot.leads table.
 * For MVP, returns null (DB query not yet wired).
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email?.trim()) {
      return NextResponse.json({ lead: null })
    }

    // In production: SELECT id, name FROM chatbot.leads WHERE email = $1 ORDER BY created_at DESC LIMIT 1
    // For MVP, we simulate the lookup
    // This endpoint exists so the sync engine can find leads by email

    console.log(`[chatbot] Lead lookup by email: ${email}`)

    // TODO: Wire to actual DB when chatbot.leads table is connected
    return NextResponse.json({ lead: null })
  } catch {
    return NextResponse.json({ lead: null })
  }
}
