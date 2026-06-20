/**
 * Cart Service — Server-Side Cart Persistence
 *
 * Persists RFQ cart items to PostgreSQL (chatbot.rfq_carts, chatbot.rfq_items)
 * so that logged-in / lead-tracked users can retrieve their cart across devices
 * and sessions. Guest users continue to use localStorage only.
 *
 * Tables (from schema.sql):
 *   chatbot.rfq_carts   — one row per lead/customer cart
 *   chatbot.rfq_items   — individual product rows in a cart
 */

import { query, insertLedgerEvent } from './db'
import { createSignal } from './lead-scorer'
import type { QueryResultRow } from 'pg'

// ── Types ────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  productTitle: string
  sku?: string
  referencePrice?: number
  quantity: number
  notes?: string
  acceptsAlternatives?: boolean
  matchType?: string
}

export interface CartData {
  cartId: string
  leadId: string
  status: string
  deliveryLocation?: string
  projectType?: string
  notes?: string
  estimatedTotal: number
  items: CartItem[]
  createdAt: string
  updatedAt: string
}

// ── Cart CRUD ────────────────────────────────────────────────────

/**
 * Get or create an active (draft) cart for the given lead.
 * Returns the cart ID and whether it was newly created.
 */
export async function getOrCreateCart(leadId: string): Promise<{ cartId: string; created: boolean }> {
  // Try existing draft cart first
  const existing = await query<{ id: string }>(
    `SELECT id FROM chatbot.rfq_carts WHERE lead_id = $1 AND status = 'draft' ORDER BY created_at DESC LIMIT 1`,
    [leadId]
  )

  if (existing.length > 0) {
    return { cartId: existing[0].id, created: false }
  }

  // Create new draft cart
  const created = await query<{ id: string }>(
    `INSERT INTO chatbot.rfq_carts (lead_id, status) VALUES ($1, 'draft') RETURNING id`,
    [leadId]
  )

  return { cartId: created[0].id, created: true }
}

/**
 * Replace all items in the cart with the given items (full sync).
 * Uses a transaction-like pattern: delete all existing items then insert new ones.
 */
export async function syncCartItems(leadId: string, items: CartItem[]): Promise<void> {
  const { cartId } = await getOrCreateCart(leadId)

  // Delete all existing items for this cart
  await query('DELETE FROM chatbot.rfq_items WHERE rfq_cart_id = $1', [cartId])

  if (items.length === 0) return

  // Insert new items
  const values: unknown[] = []
  const placeholders: string[] = []

  items.forEach((item, i) => {
    const base = i * 10
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`
    )
    values.push(
      cartId,
      item.productId,
      item.productTitle,
      item.sku || null,
      item.referencePrice || null,
      item.quantity,
      item.notes || null,
      item.acceptsAlternatives !== false,
      item.matchType || null,
      null // inspiration_image_url — not provided from client
    )
  })

  await query(
    `INSERT INTO chatbot.rfq_items
       (rfq_cart_id, product_id, product_title, product_url, reference_price, quantity, notes, accepts_alternatives, match_type, inspiration_image_url)
     VALUES ${placeholders.join(', ')}`,
    values
  )

  // Compute estimated total and update cart
  const estimatedTotal = items.reduce((sum, item) => sum + (item.referencePrice || 0) * item.quantity, 0)
  await query(
    'UPDATE chatbot.rfq_carts SET estimated_total = $1 WHERE id = $2',
    [estimatedTotal, cartId]
  )
}

/**
 * Get all items in the cart for a lead, plus cart metadata.
 * Returns null if no draft cart exists.
 */
export async function getCart(leadId: string): Promise<CartData | null> {
  const carts = await query<QueryResultRow>(
    `SELECT id, lead_id, status, delivery_location, project_type, notes, estimated_total, created_at
     FROM chatbot.rfq_carts
     WHERE lead_id = $1 AND status = 'draft'
     ORDER BY created_at DESC LIMIT 1`,
    [leadId]
  )

  if (carts.length === 0) return null

  const cart = carts[0]

  const items = await query<QueryResultRow>(
    `SELECT product_id, product_title, product_url, reference_price, quantity, notes, accepts_alternatives, match_type
     FROM chatbot.rfq_items
     WHERE rfq_cart_id = $1
     ORDER BY created_at ASC`,
    [cart.id]
  )

  return {
    cartId: cart.id,
    leadId: cart.lead_id,
    status: cart.status,
    deliveryLocation: cart.delivery_location,
    projectType: cart.project_type,
    notes: cart.notes,
    estimatedTotal: Number(cart.estimated_total) || 0,
    items: items.map((item: QueryResultRow) => ({
      productId: item.product_id,
      productTitle: item.product_title,
      sku: undefined, // not stored in rfq_items — stored in client only
      referencePrice: item.reference_price ? Number(item.reference_price) : undefined,
      quantity: item.quantity,
      notes: item.notes,
      acceptsAlternatives: item.accepts_alternatives,
      matchType: item.match_type,
    })),
    createdAt: cart.created_at,
    updatedAt: cart.created_at,
  }
}

/**
 * Add a single item to the cart (upsert by productId).
 * If the product already exists, increment its quantity.
 */
export async function addItemToCart(
  leadId: string,
  item: CartItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const { cartId } = await getOrCreateCart(leadId)

    // Check if this product already exists in the cart
    const existing = await query<{ id: string; quantity: number }>(
      `SELECT id, quantity FROM chatbot.rfq_items WHERE rfq_cart_id = $1 AND product_id = $2 LIMIT 1`,
      [cartId, item.productId]
    )

    if (existing.length > 0) {
      // Update quantity
      const newQty = Math.min(999, existing[0].quantity + item.quantity)
      await query(
        `UPDATE chatbot.rfq_items SET quantity = $1, product_title = $2, reference_price = $3 WHERE id = $4`,
        [newQty, item.productTitle, item.referencePrice || null, existing[0].id]
      )
    } else {
      // Insert new item
      await query(
        `INSERT INTO chatbot.rfq_items
           (rfq_cart_id, product_id, product_title, reference_price, quantity, notes, accepts_alternatives, match_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          cartId,
          item.productId,
          item.productTitle,
          item.referencePrice || null,
          item.quantity,
          item.notes || null,
          item.acceptsAlternatives !== false,
          item.matchType || null,
        ]
      )
    }

    // Recalculate estimated total
    const allItems = await query<{ reference_price: number; quantity: number }>(
      'SELECT reference_price, quantity FROM chatbot.rfq_items WHERE rfq_cart_id = $1',
      [cartId]
    )
    const estimatedTotal = allItems.reduce((sum, i) => sum + (Number(i.reference_price) || 0) * i.quantity, 0)
    await query('UPDATE chatbot.rfq_carts SET estimated_total = $1 WHERE id = $2', [
      estimatedTotal,
      cartId,
    ])

    // Record lead scoring signal
    try {
      await insertLedgerEvent({
        leadId,
        eventType: 'item_added_to_cart',
        scoreDelta: 20,
        eventData: { productId: item.productId, productTitle: item.productTitle, quantity: item.quantity },
      })
    } catch {
      // Scoring is best-effort
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

/**
 * Remove a single item from the cart by productId.
 */
export async function removeItemFromCart(leadId: string, productId: string): Promise<boolean> {
  const cart = await getCart(leadId)
  if (!cart) return false

  await query(
    'DELETE FROM chatbot.rfq_items WHERE rfq_cart_id = $1 AND product_id = $2',
    [cart.cartId, productId]
  )

  return true
}

/**
 * Clear all items from the cart. If the cart becomes empty, keep it as draft.
 */
export async function clearCart(leadId: string): Promise<boolean> {
  const cart = await getCart(leadId)
  if (!cart) return false

  await query('DELETE FROM chatbot.rfq_items WHERE rfq_cart_id = $1', [cart.cartId])
  await query('UPDATE chatbot.rfq_carts SET estimated_total = 0 WHERE id = $1', [cart.cartId])

  return true
}

/**
 * Mark the cart as submitted (used after RFQ submission).
 */
export async function submitCart(leadId: string): Promise<boolean> {
  const cart = await getCart(leadId)
  if (!cart) return false

  await query(
    `UPDATE chatbot.rfq_carts SET status = 'submitted', submitted_at = now() WHERE id = $1`,
    [cart.cartId]
  )

  return true
}
