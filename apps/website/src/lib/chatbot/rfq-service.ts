/**
 * RFQ Cart Service
 *
 * Manages RFQ cart operations: add/remove items, submit RFQ,
 * sync with DaVinciOS admin panel, send Telegram alerts.
 *
 * Uses the chatbot schema (chatbot.rfq_carts, chatbot.rfq_items)
 * and also submits to the existing DaVinciOS RFQRequests collection
 * for admin panel visibility.
 */

import { logTask } from '../central-logger.mjs'
import { sendTelegramAlert } from './telegram-client'
import { createSignal } from './lead-scorer'
import { addItemToCart, syncCartItems, clearCart, submitCart } from './cart-service'

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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
    // POST to existing DaVinciOS RFQRequests API
    const res = await fetch(`${API_BASE}/api/rfq-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '', // Will be filled from lead data
        email: '',
        phone: '',
        deliveryLocation: input.deliveryLocation,
        projectType: input.projectType,
        notes: input.notes,
        items: input.items.map(item => ({
          product: item.productId,
          productTitleSnapshot: item.productTitle,
          unitPriceSnapshot: item.referencePrice || 0,
          quantity: item.quantity,
        })),
      }),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return { success: false, error: `API error: ${err.slice(0, 200)}` }
    }

    const data = await res.json()

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
      verification: 'RFQ created in DaVinciOS admin',
    })

    return { success: true, rfqCartId: data?.doc?.id || data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}
