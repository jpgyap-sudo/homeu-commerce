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
    // Resolve lead name and customer_id from chatbot.leads table
    let customerId: number | null = null
    let customerName = input.leadId || ''
    let customerEmail = ''
    let customerPhone = ''
    if (input.leadId) {
      try {
        const leadRes = await query(
          `SELECT name, email, mobile, davincios_customer_id FROM chatbot.leads WHERE id = $1 LIMIT 1`,
          [input.leadId]
        )
        if (leadRes.rows.length > 0) {
          customerName = leadRes.rows[0].name || customerName
          customerEmail = leadRes.rows[0].email || ''
          customerPhone = leadRes.rows[0].mobile || ''
          const dCustId = Number(leadRes.rows[0].davincios_customer_id)
          if (Number.isInteger(dCustId) && dCustId > 0) {
            customerId = dCustId
          }
        }
      } catch (err) {
        console.error('[chatbot] Failed to fetch lead info:', err)
      }
    }

    // Fallback: resolve customer_id by email lookup in customers table
    if (!customerId && customerEmail.trim()) {
      try {
        const custRes = await query(
          `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [customerEmail.trim()]
        )
        if (custRes.rows.length > 0) {
          customerId = Number(custRes.rows[0].id)
        }
      } catch (err) {
        console.error('[chatbot] Failed to resolve customer by email:', err)
      }
    }

    // Clean project type to fit enum_rfq_requests_project_type
    let pType = String(input.projectType || 'other').toLowerCase()
    if (!['home', 'office', 'hotel', 'restaurant', 'other'].includes(pType)) {
      pType = 'other'
    }

    // Insert into rfq_requests table directly using valid database columns
    const rfqTotalEstimate = input.items.reduce((sum, item) => sum + (item.referencePrice || 0) * item.quantity, 0)
    const { rows } = await query(
      `INSERT INTO rfq_requests (customer_id, customer_name, email, phone, delivery_location, project_type, notes, target_date, budget_range, estimated_total, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id`,
      [
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        input.deliveryLocation || '',
        pType,
        input.notes || '',
        input.targetDate || null,
        input.budgetRange || null,
        rfqTotalEstimate || null,
        'new',
      ]
    )

    const rfqCartId = String(rows[0]?.id || '')

    // Loop through items and insert them into the canonical rfq_request_items table
    if (input.items && Array.isArray(input.items) && input.items.length > 0) {
      for (const item of input.items) {
        const prodId = Number(item.productId)
        const validProdId = Number.isInteger(prodId) && prodId > 0 ? prodId : null
        
        let skuSnapshot = ''
        if (validProdId) {
          try {
            const prodRes = await query('SELECT sku FROM products WHERE id = $1 LIMIT 1', [validProdId])
            if (prodRes.rows.length > 0) {
              skuSnapshot = prodRes.rows[0].sku || ''
            }
          } catch { /* best effort */ }
        }

        await query(
          `INSERT INTO rfq_request_items (rfq_request_id, product_id, product_title_snapshot, sku_snapshot, unit_price_snapshot, quantity, notes, accepts_alternatives, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            Number(rfqCartId),
            validProdId,
            item.productTitle || '',
            skuSnapshot,
            item.referencePrice || 0,
            item.quantity || 1,
            item.notes || '',
            item.acceptsAlternatives !== false,
          ]
        )
      }
    }

    // Mark server-side cart as submitted
    try {
      await submitCart(input.leadId)
    } catch {
      // Best-effort
    }

    // Calculate total value for priority triaging
    const rfqTotalVal = rfqTotalEstimate
    const isHighPriority = rfqTotalVal > 150000 || ['hotel', 'restaurant', 'office'].includes(String(input.projectType).toLowerCase())
    const priorityEmoji = isHighPriority ? '🔥 [HIGH PRIORITY]' : '🟢 [Standard Priority]'
    const adminBase = process.env.ADMIN_PUBLIC_SERVER_URL || 'https://admin.homeatelier.ph'

    // Send Telegram alert
    await sendTelegramAlert({
      eventType: 'RFQ_SUBMITTED',
      leadId: input.leadId,
      conversationId: input.conversationId,
      leadName: customerName || input.leadId || 'Anonymous Visitor',
      mobile: customerPhone || '',
      summary: `${priorityEmoji}\n${input.items.length} items requested for ${input.projectType || 'project'} at ${input.deliveryLocation || 'TBD'}`,
      rfqItems: input.items.length,
      rFQTotal: rfqTotalVal > 0 ? rfqTotalVal.toLocaleString('en-PH', { minimumFractionDigits: 0 }) : undefined,
      urgency: input.targetDate ? `Target: ${input.targetDate}` : undefined,
      adminUrl: `${adminBase}/admin/rfq/${rfqCartId}`,
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
