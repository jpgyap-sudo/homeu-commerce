/**
 * GET /api/chat/visitor?email=xxx
 *
 * Returns a durable returning visitor profile by email. Chat history is
 * resumable for 30 days from the last client-started interaction.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { generateReturningGreeting } from '@/lib/chatbot/ledger'
import { getRecentConversationForLead, getRecentMessagesForConversation } from '@/lib/chatbot/db'
import { findCustomerByEmail, linkLeadToCustomer } from '@/lib/chatbot/customer-sync'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email?.trim()) {
      return NextResponse.json({ found: false })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { rows } = await query(
      `SELECT
         id::text,
         name,
         email,
         mobile,
         style_dna,
         conversation_summary,
         daVincios_customer_id AS "daVinciosCustomerId",
         last_seen_at
       FROM chatbot.leads
       WHERE LOWER(email) = LOWER($1)
       ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [normalizedEmail]
    )

    const lead = rows[0]
    if (!lead) {
      const customer = await findCustomerByEmail(normalizedEmail)
      if (!customer?.id) return NextResponse.json({ found: false })

      return NextResponse.json({
        found: true,
        lead: {
          id: null,
          name: customer.name || '',
          email: customer.email || normalizedEmail,
          mobile: customer.phone || '',
          styleDNA: {},
          lastConversationSummary: '',
          customerId: customer.id,
        },
        conversationId: null,
        messages: [],
        canResume: false,
        isExistingCustomer: true,
        historyRetainedDays: 30,
        greeting: `Welcome back${customer.name ? `, ${customer.name.split(' ')[0]}` : ''}.`,
      })
    }

    let customerId = lead.daVinciosCustomerId ? String(lead.daVinciosCustomerId) : undefined
    if (!customerId) {
      const customer = await findCustomerByEmail(normalizedEmail)
      if (customer?.id) {
        customerId = customer.id
        await linkLeadToCustomer(lead.id, customer.id)
      }
    }

    const conversationId = await getRecentConversationForLead(lead.id, 30)
    const messages = conversationId ? await getRecentMessagesForConversation(conversationId, 30) : []
    const greeting = generateReturningGreeting(
      lead.name,
      lead.style_dna || { styles: [], materials: [], colors: [], categories: [], roomTypes: [], recentSearches: [] },
      [],
      lead.conversation_summary || ''
    )

    return NextResponse.json({
      found: true,
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        mobile: lead.mobile,
        styleDNA: lead.style_dna,
        lastConversationSummary: lead.conversation_summary,
        customerId,
      },
      conversationId,
      messages,
      canResume: Boolean(conversationId),
      historyRetainedDays: 30,
      greeting,
    })
  } catch (err) {
    console.warn('[chatbot] visitor lookup failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ found: false })
  }
}
