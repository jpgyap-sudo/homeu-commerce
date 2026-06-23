/**
 * POST /api/chat/leads
 *
 * Creates a new lead record in PostgreSQL (chatbot.leads) and opens
 * a chat conversation (chatbot.conversations). This must be called
 * before the visitor can freely chat, upload images, or submit RFQs.
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
import { query } from '@/lib/db'
import { createSignal } from '@/lib/chatbot/lead-scorer'
import { findCustomerByEmail, linkLeadToCustomer } from '@/lib/chatbot/customer-sync'
import { insertLead, insertConversation, insertLedgerEvent } from '@/lib/chatbot/db'
import { sendTelegramAlert } from '@/lib/chatbot/telegram-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, mobile, buyerType, companyName, sourcePage, customerId, consent } = body

    // Validate required fields — at minimum we need a name or an email
    if (!name?.trim() && !email?.trim()) {
      return NextResponse.json({ error: 'Name or email is required' }, { status: 400 })
    }
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    // Mobile is strongly recommended but not strictly required for auto-leads
    if (mobile?.trim() && mobile.replace(/\s/g, '').length < 7) {
      return NextResponse.json({ error: 'Valid mobile number is required (min 7 digits)' }, { status: 400 })
    }

    if (!consent) {
      return NextResponse.json({ error: 'Consent is required to proceed' }, { status: 400 })
    }

    // ── Dedup: check for existing lead by email ──────────────
    // If the same email already exists, update it instead of creating a
    // duplicate — this prevents "spamming" the leads list with multiple
    // entries for the same returning visitor.
    let leadId: string
    let conversationId: string
    let isReturning = false

    try {
      const existing = email?.trim()
        ? await query('SELECT id, total_visits FROM chatbot.leads WHERE LOWER(email) = LOWER($1) LIMIT 1', [email.trim()])
        : null

      if (existing && (existing.rowCount ?? 0) > 0) {
        // Returning lead — update fields and increment visit counter
        leadId = existing.rows[0].id as string
        isReturning = true
        const currentVisits = Number(existing.rows[0].total_visits) || 1

        await query(
          `UPDATE chatbot.leads
           SET name = COALESCE(NULLIF($1, ''), name),
               mobile = COALESCE(NULLIF($2, ''), mobile),
               buyer_type = COALESCE(NULLIF($3, ''), buyer_type),
               company_name = COALESCE(NULLIF($4, ''), company_name),
               source_page = COALESCE(NULLIF($5, ''), source_page),
               total_visits = $6,
               last_seen_at = NOW(),
               updated_at = NOW()
           WHERE id = $7`,
          [name?.trim(), mobile?.trim(), buyerType || null, companyName?.trim() || null, sourcePage || null, currentVisits + 1, leadId]
        )

        console.log(`[chatbot] Returning lead ${leadId} (visit #${currentVisits + 1})`)
      } else {
        // New lead
        leadId = await insertLead({
          name,
          email,
          mobile,
          buyerType,
          companyName,
          sourcePage,
          consent,
          daVinciosCustomerId: customerId,
          metadata: {
            sourcePage: sourcePage || null,
            buyerType: buyerType || null,
            companyName: companyName || null,
          },
        })
      }

      conversationId = await insertConversation({
        leadId,
        status: 'active',
        deviceInfo: {
          userAgent: request.headers.get('user-agent') || undefined,
        },
      })

      console.log(`[chatbot] Lead ${leadId} persisted to DB, conversation ${conversationId}`)
    } catch (dbErr) {
      // Fallback: generate IDs if DB is unavailable (graceful degradation)
      console.warn('[chatbot] DB unavailable, falling back to generated IDs:', dbErr)
      leadId = crypto.randomUUID?.() || `lead-${Date.now()}`
      conversationId = crypto.randomUUID?.() || `conv-${Date.now()}`
    }

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

    // ── Telegram Alert ──────────────────────────────────────────
    sendTelegramAlert({
      eventType: 'NEW_LEAD',
      leadId,
      conversationId,
      leadName: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      buyerType: buyerType || undefined,
      summary: `New lead from ${sourcePage || 'website'} — ${isExistingCustomer ? 'returning customer' : 'new visitor'}`,
    }).catch((err: Error) => {
      console.warn('[chatbot] Telegram alert failed (non-critical):', err.message)
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
