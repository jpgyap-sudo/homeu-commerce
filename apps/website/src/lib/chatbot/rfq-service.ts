/**
 * RFQ Cart Service
 *
 * Manages RFQ cart operations: add/remove items, submit RFQ,
 * send Telegram alerts.
 *
 * Uses the chatbot schema (chatbot.rfq_carts, chatbot.rfq_items)
 * and inserts RFQ requests into the rfq_requests table.
 */

import { logTask } from '../central-logger.mjs'
import { sendTelegramAlert } from './telegram-client'
import { createSignal } from './lead-scorer'
import { addItemToCart, syncCartItems, clearCart, submitCart } from './cart-service'
import { query } from '../db'

export interface RFQItemInput {
  productId: string
  productTitle: string
  productUrl?: string
  referencePrice?: number
  quantity: number
  notes?: string
  inspirationImageUrl?: string
  acceptsAlternatives?: boolean
  matchType?: string
}

export interface RFQSubmitInput {
  leadId: string
  conversationId?: string
  deliveryLocation?: string
  projectType?: string
  targetDate?: string
  budgetRange?: string
  notes?: string
  items: RFQItemInput[]
}

export interface RFQResult {
  success: boolean
  rfqCartId?: string
  error?: string
}

// ── Add Item to RFQ Cart ──────────────────────────────────────

export async function addItemToRFQCart(
  leadId: string,
  conversationId: string,
  item: RFQItemInput
): Promise<RFQResult> {
  try {
    const result = await addItemToCart(leadId, {
      productId: item.productId,
      productTitle: item.productTitle,
      referencePrice: item.referencePrice,
      quantity: item.quantity,
      notes: item.notes,
      acceptsAlternatives: item.acceptsAlternatives,
      matchType: item.matchType,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    console.log(`[chatbot] Item added to RFQ cart (persisted):`, {
      leadId,
      conversationId,
      productId: item.productId,
      quantity: item.quantity,
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add item' }
  }
}

// ── Sync Full Cart ────────────────────────────────────────────

/**
 * Full cart sync — replaces all server-side items with the client's items.
 * Called by the QuoteCart component when leadId is available.
 */
export async function syncRFQCart(
  leadId: string,
  items: RFQItemInput[]
): Promise<RFQResult> {
  try {
    await syncCartItems(
      leadId,
      items.map((item) => ({
        productId: item.productId,
        productTitle: item.productTitle,
        referencePrice: item.referencePrice,
        quantity: item.quantity,
        notes: item.notes,
        acceptsAlternatives: item.acceptsAlternatives,
        matchType: item.matchType,
      }))
    )

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to sync cart' }
  }
}

// ── Submit RFQ ────────────────────────────────────────────────

export async function submitRFQ(input: RFQSubmitInput): Promise<RFQResult> {
  try {
    // Insert into rfq_requests table directly
    const { rows } = await query(
      `INSERT INTO rfq_requests (lead_id, customer_name, email, phone, delivery_location, project_type, notes, items, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [
        input.leadId || null,
        input.leadId || '',          // customerName — will be enriched from lead data
        '',                           // email — will be enriched from lead data
        '',                           // phone — will be enriched from lead data
        input.deliveryLocation || '',
        input.projectType || '',
        input.notes || '',
        JSON.stringify(input.items.map(item => ({
          productId: item.productId,
          productTitle: item.productTitle,
          referencePrice: item.referencePrice || 0,
          quantity: item.quantity,
          notes: item.notes,
        }))),
        'new',
      ]
    )

    const rfqCartId = String(rows[0]?.id || '')

    // Mark server-side cart as submitted
    try {
      await submitCart(input.leadId)
    } catch {
      // Best-effort
    }

    // Send Telegram alert
    await sendTelegramAlert({
      eventType: 'RFQ_SUBMITTED',
      leadId: input.leadId,
      conversationId: input.conversationId,
      leadName: input.leadId, // placeholder — lead name lookup needed
      mobile: '',
      summary: `${input.items.length} items requested for ${input.projectType || 'project'} at ${input.deliveryLocation || 'TBD'}`,
      rfqItems: input.items.length,
      urgency: input.targetDate ? `Target: ${input.targetDate}` : undefined,
    })

    // Log to central logger
    await logTask({
      agent: 'concierge-builder',
      status: 'completed',
      summary: `RFQ submitted: ${input.items.length} items for lead ${input.leadId}`,
      files: ['apps/website/src/lib/chatbot/rfq-service.ts'],
      verification: 'RFQ created in rfq_requests table',
    })

    return { success: true, rfqCartId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
