/**
 * /api/cart/sync
 *
 * Server-side cart persistence API. Used by the QuoteCart component
 * to sync the client-side localStorage cart to the server for
 * lead-tracked / logged-in users.
 *
 * GET    /api/cart/sync?leadId=xxx   — Fetch server-side cart items
 * POST   /api/cart/sync              — Full sync: replace all items
 * DELETE /api/cart/sync?leadId=xxx   — Clear all items from cart
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCart, syncCartItems, clearCart, addItemToCart, removeItemFromCart } from '@/lib/chatbot/cart-service'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidLeadId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

// ── GET: Retrieve server-side cart ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'leadId query parameter is required' }, { status: 400 })
    }
    if (!isValidLeadId(leadId)) {
      return NextResponse.json({ error: 'leadId must be a valid UUID' }, { status: 400 })
    }

    const cart = await getCart(leadId)

    if (!cart) {
      return NextResponse.json({ items: [], estimatedTotal: 0 })
    }

    return NextResponse.json({
      cartId: cart.cartId,
      leadId: cart.leadId,
      status: cart.status,
      deliveryLocation: cart.deliveryLocation,
      projectType: cart.projectType,
      notes: cart.notes,
      estimatedTotal: cart.estimatedTotal,
      items: cart.items.map((item) => ({
        productId: item.productId,
        productTitle: item.productTitle,
        sku: item.sku,
        referencePrice: item.referencePrice,
        quantity: item.quantity,
      })),
      createdAt: cart.createdAt,
    })
  } catch (err) {
    console.error('[cart] GET /api/cart/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST: Full sync — replace all items ────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, items } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }
    if (!isValidLeadId(leadId)) {
      return NextResponse.json({ error: 'leadId must be a valid UUID' }, { status: 400 })
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
    }

    // Normalize items
    const normalizedItems = items
      .filter((item: any) => item && typeof item.productId === 'string' && typeof item.productTitle === 'string')
      .map((item: any) => ({
        productId: item.productId,
        productTitle: item.productTitle,
        sku: typeof item.sku === 'string' ? item.sku : undefined,
        referencePrice: typeof item.referencePrice === 'number' ? item.referencePrice : undefined,
        quantity: Math.max(1, Math.min(999, Math.floor(Number(item.quantity) || 1))),
      }))

    await syncCartItems(leadId, normalizedItems)

    return NextResponse.json({
      success: true,
      syncedCount: normalizedItems.length,
    })
  } catch (err) {
    console.error('[cart] POST /api/cart/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE: Clear the cart ─────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'leadId query parameter is required' }, { status: 400 })
    }
    if (!isValidLeadId(leadId)) {
      return NextResponse.json({ error: 'leadId must be a valid UUID' }, { status: 400 })
    }

    await clearCart(leadId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cart] DELETE /api/cart/sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
