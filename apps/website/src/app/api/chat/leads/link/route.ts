/**
 * POST /api/chat/leads/link
 *
 * Links a chatbot lead to a customer account.
 * Called after a lead registers a customer account, or when
 * an existing customer starts a chat session.
 *
 * Request: { leadId, customerId }
 * Response: { success }
 *
 * In production: UPDATE chatbot.leads SET daVincios_customer_id = $1 WHERE id = $2
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, customerId } = body

    if (!leadId || !customerId) {
      return NextResponse.json({ error: 'leadId and customerId are required' }, { status: 400 })
    }

    // In production: UPDATE chatbot.leads SET daVincios_customer_id = $2, status = 'converted' WHERE id = $1
    console.log(`[chatbot] Linking lead ${leadId} to customer ${customerId}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[chatbot] Link error:', err)
    return NextResponse.json({ error: 'Failed to link' }, { status: 500 })
  }
}
