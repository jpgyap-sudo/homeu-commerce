/**
 * POST /api/chat/leads
 *
 * Creates a new lead record. This must be called before the visitor
 * can freely chat, upload images, or submit RFQs.
 *
 * Auto-syncs with customer accounts:
 *   - If customerId provided (logged-in user), links lead to that customer
 *   - If email matches an existing customer, links lead automatically
 *   - Returns isExistingCustomer flag for frontend to show personalized greeting
 *
 * Request body:
 *   { name, email, mobile, buyerType?, companyName?, sourcePage?, customerId?, consent }
 *
 * Response:
 *   { leadId, conversationId, customerLinked, customerId, isExistingCustomer, signals }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSignal } from '@/lib/chatbot/lead-scorer'
import { findCustomerByEmail, linkLeadToCustomer } from '@/lib/chatbot/customer-sync'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, mobile, buyerType, companyName, sourcePage, customerId, consent } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!mobile?.trim() || mobile.replace(/\s/g, '').length < 7) {
      return NextResponse.json({ error: 'Valid mobile number is required (min 7 digits)' }, { status: 400 })
    }

    if (!consent) {
      return NextResponse.json({ error: 'Consent is required to proceed' }, { status: 400 })
    }

    // In production, INSERT INTO chatbot.leads
    // For MVP, generate IDs
    const leadId = crypto.randomUUID?.() || `lead-${Date.now()}`
    const conversationId = crypto.randomUUID?.() || `conv-${Date.now()}`

    // ── Customer Sync ──────────────────────────────────────────
    let customerLinked = false
    let resolvedCustomerId: string | undefined = customerId
    let isExistingCustomer = false

    // Priority 1: customerId explicitly provided (user was logged in)
    if (customerId) {
      await linkLeadToCustomer(leadId, customerId)
      customerLinked = true
      isExistingCustomer = true
      console.log(`[chatbot] Lead ${leadId} linked to logged-in customer ${customerId}`)
    }

    // Priority 2: No customerId but email matches an existing customer
    if (!customerId && email?.trim()) {
      try {
        const existingCustomer = await findCustomerByEmail(email.trim())
        if (existingCustomer?.id) {
          await linkLeadToCustomer(leadId, existingCustomer.id)
          resolvedCustomerId = existingCustomer.id
          customerLinked = true
          isExistingCustomer = true
          console.log(`[chatbot] Lead ${leadId} auto-linked to existing customer ${existingCustomer.id} by email`)
        }
      } catch {
        // Email lookup is best-effort
      }
    }

    console.log(`[chatbot] Lead created:`, {
      leadId,
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      buyerType: buyerType || null,
      companyName: companyName?.trim() || null,
      sourcePage: sourcePage || null,
      customerLinked,
      customerId: resolvedCustomerId,
    })

    // Scoring signals — extra points for customers
    const signals = [
      createSignal('lead_gate_completed', { buyerType }),
    ]
    if (buyerType) {
      signals.push(createSignal(`buyer_type_${buyerType}`, { buyerType }))
    }
    if (customerLinked) {
      signals.push(createSignal('existing_customer_linked', { customerId: resolvedCustomerId }))
    }

    return NextResponse.json({
      leadId,
      conversationId,
      customerLinked,
      customerId: resolvedCustomerId,
      isExistingCustomer,
      signals,
    })
  } catch (err) {
    console.error('[chatbot] POST /api/chat/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
