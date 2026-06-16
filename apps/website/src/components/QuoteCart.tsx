'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

export type QuoteItem = {
  productId: string
  title: string
  sku?: string
  price?: number
  quantity: number
}

type CustomerProfile = {
  id: string
  name?: string
  email?: string
  phone?: string
  address?: string
}

type QuoteForm = {
  customerName: string
  email: string
  phone: string
  deliveryLocation: string
  projectType: string
  notes: string
}

const CART_KEY = 'homeu_quote_cart'
const CART_EVENT = 'homeu_quote_cart_changed'
const CART_LEAD_ID_KEY = 'homeu_lead_id'

function normalizeQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.min(999, Math.floor(quantity)))
}

function emitCartChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CART_EVENT))
}

export function getQuoteCart(): QuoteItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.productId === 'string' && typeof item.title === 'string')
      .map((item) => ({
        productId: item.productId,
        title: item.title,
        sku: typeof item.sku === 'string' ? item.sku : undefined,
        price: typeof item.price === 'number' ? item.price : undefined,
        quantity: normalizeQuantity(Number(item.quantity) || 1),
      }))
  } catch {
    return []
  }
}

export function saveQuoteCart(items: QuoteItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  emitCartChanged()
}

export function addToQuoteCart(item: QuoteItem) {
  const items = getQuoteCart()
  const existing = items.find((i) => i.productId === item.productId)
  const quantity = normalizeQuantity(item.quantity)
  if (existing) existing.quantity = normalizeQuantity(existing.quantity + quantity)
  else items.push({ ...item, quantity })
  saveQuoteCart(items)
}

export function updateQuoteCartQuantity(productId: string, quantity: number) {
  const items = getQuoteCart()
    .map((item) => item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item)
  saveQuoteCart(items)
}

export function removeFromQuoteCart(productId: string) {
  saveQuoteCart(getQuoteCart().filter((item) => item.productId !== productId))
}

export function clearQuoteCart() {
  saveQuoteCart([])
}

// ── Lead ID helpers (shared between chat widget and quote cart) ──

export function getQuoteCartLeadId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CART_LEAD_ID_KEY)
  } catch {
    return null
  }
}

export function setQuoteCartLeadId(leadId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (leadId) {
      localStorage.setItem(CART_LEAD_ID_KEY, leadId)
    } else {
      localStorage.removeItem(CART_LEAD_ID_KEY)
    }
  } catch {
    // Silently fail
  }
}

// ── Server-side sync ──────────────────────────────────────────

/**
 * Sync the current localStorage cart to the server.
 * Requires a leadId. No-op if leadId is not available.
 */
export async function syncCartToServer(): Promise<void> {
  const leadId = getQuoteCartLeadId()
  if (!leadId) return

  const items = getQuoteCart()
  try {
    await fetch('/api/cart/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        items: items.map((item) => ({
          productId: item.productId,
          productTitle: item.title,
          sku: item.sku,
          referencePrice: item.price,
          quantity: item.quantity,
        })),
      }),
    })
  } catch (err) {
    console.warn('[quotecart] Server sync failed (will retry on next mutation):', err)
  }
}

/**
 * Fetch the server-side cart for the current leadId and merge it into
 * localStorage. Client items take priority (most recent session wins).
 * Call this when the QuoteCartExperience mounts and a leadId is available.
 */
export async function fetchServerCart(): Promise<void> {
  const leadId = getQuoteCartLeadId()
  if (!leadId) return

  try {
    const res = await fetch(`/api/cart/sync?leadId=${encodeURIComponent(leadId)}`)
    if (!res.ok) return

    const data = await res.json()
    if (!Array.isArray(data.items) || data.items.length === 0) return

    const serverItems: QuoteItem[] = data.items.map((item: any) => ({
      productId: item.productId,
      title: item.productTitle,
      sku: item.sku || undefined,
      price: typeof item.referencePrice === 'number' ? item.referencePrice : undefined,
      quantity: normalizeQuantity(item.quantity),
    }))

    // Merge: if client has items, those take priority (keep both, deduplicate by productId)
    const clientItems = getQuoteCart()
    if (clientItems.length === 0) {
      // No client items — use server items
      saveQuoteCart(serverItems)
    } else {
      // Merge: add server items that don't exist in client
      const clientProductIds = new Set(clientItems.map((i) => i.productId))
      const newServerItems = serverItems.filter((i: QuoteItem) => !clientProductIds.has(i.productId))
      if (newServerItems.length > 0) {
        saveQuoteCart([...clientItems, ...newServerItems])
      }
    }
  } catch (err) {
    console.warn('[quotecart] Failed to fetch server cart:', err)
  }
}

/**
 * Delete the server-side cart for the current leadId.
 * Called when the user clears their cart.
 */
export async function clearServerCart(): Promise<void> {
  const leadId = getQuoteCartLeadId()
  if (!leadId) return

  try {
    await fetch(`/api/cart/sync?leadId=${encodeURIComponent(leadId)}`, { method: 'DELETE' })
  } catch {
    // Best-effort
  }
}

// ── Components ────────────────────────────────────────────────

export function QuoteCartBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const sync = () => setCount(getQuoteCart().reduce((sum, item) => sum + item.quantity, 0))
    sync()
    window.addEventListener(CART_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CART_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return (
    <a className="quote-cart-link" href="/quote-cart" aria-label={`Quote cart with ${count} item${count === 1 ? '' : 's'}`}>
      Quote cart
      <span>{count}</span>
    </a>
  )
}

export function QuoteCartExperience() {
  const [items, setItems] = useState<QuoteItem[]>([])
  const [form, setForm] = useState<QuoteForm>({
    customerName: '',
    email: '',
    phone: '',
    deliveryLocation: '',
    projectType: 'home',
    notes: '',
  })
  const [customerId, setCustomerId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successId, setSuccessId] = useState('')

  useEffect(() => {
    setItems(getQuoteCart())

    // If we have a leadId, fetch server cart to merge any items the user
    // may have added on another device or in a previous session
    const leadId = getQuoteCartLeadId()
    if (leadId) {
      fetchServerCart().then(() => {
        // Re-read items after server merge
        setItems(getQuoteCart())
      })
    }

    async function hydrateCustomer() {
      try {
        const res = await fetch('/api/customers/me', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const user = (data.user || data.customer || data) as CustomerProfile
        if (!user?.id) return
        setCustomerId(user.id)
        setForm((current) => ({
          ...current,
          customerName: current.customerName || user.name || '',
          email: current.email || user.email || '',
          phone: current.phone || user.phone || '',
          deliveryLocation: current.deliveryLocation || user.address || '',
        }))
      } catch {
        // Guest RFQs are allowed.
      }
    }

    hydrateCustomer()
  }, [])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0),
    [items],
  )
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  function syncItems(nextItems: QuoteItem[]) {
    setItems(nextItems)
    saveQuoteCart(nextItems)
    setSuccessId('')

    // Sync to server in the background
    syncCartToServer()
  }

  function changeQuantity(productId: string, quantity: number) {
    syncItems(items.map((item) => item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item))
  }

  function removeItem(productId: string) {
    syncItems(items.filter((item) => item.productId !== productId))
  }

  function updateForm(field: keyof QuoteForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  async function submitRFQ(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessId('')

    if (items.length === 0) {
      setError('Add at least one product before submitting an RFQ.')
      return
    }

    if (!form.customerName.trim() || !form.phone.trim()) {
      setError('Name and phone are required so the HomeU team can follow up.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer: customerId || undefined,
          customerName: form.customerName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          deliveryLocation: form.deliveryLocation.trim() || undefined,
          projectType: form.projectType,
          notes: form.notes.trim() || undefined,
          items: items.map((item) => ({
            product: item.productId || undefined,
            productTitleSnapshot: item.title,
            skuSnapshot: item.sku,
            unitPriceSnapshot: item.price || 0,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit RFQ.')

      setSuccessId(data.rfqId || '')
      clearQuoteCart()
      setItems([])

      // Clear server cart too
      clearServerCart()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit RFQ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="quote-cart-shell">
      <section className="quote-cart-hero">
        <div>
          <p className="eyebrow">HomeU RFQ cart</p>
          <h1>Build a furniture quote request</h1>
          <p>
            Review quantities, add delivery details, and send one clean request to the HomeU team.
          </p>
        </div>
        <div className="quote-cart-summary" aria-label="Quote cart summary">
          <strong>{totalQuantity}</strong>
          <span>{totalQuantity === 1 ? 'item' : 'items'} selected</span>
          <span>{subtotal > 0 ? `Estimated ₱${subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Final pricing by quotation'}</span>
        </div>
      </section>

      {successId ? (
        <section className="quote-cart-success" role="status">
          <h2>RFQ submitted</h2>
          <p>Your request is now in the HomeU backend. Reference: RFQ #{successId.slice(-6).toUpperCase()}</p>
          <div className="quote-cart-actions">
            <a href={`/customer/rfq/${successId}`}>View RFQ status</a>
            <a href="/products">Continue browsing</a>
          </div>
        </section>
      ) : null}

      <div className="quote-cart-grid">
        <section className="quote-cart-panel" aria-labelledby="quote-items-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Selected products</p>
              <h2 id="quote-items-title">Quote items</h2>
            </div>
            {items.length > 0 ? (
              <button type="button" className="text-button" onClick={() => syncItems([])}>
                Clear all
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="quote-cart-empty">
              <h3>No products in your quote cart yet</h3>
              <p>Add products from the catalog and come back here to submit a request.</p>
              <a href="/products">Browse products</a>
            </div>
          ) : (
            <div className="quote-cart-lines">
              {items.map((item) => (
                <article className="quote-cart-line" key={item.productId}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.sku ? `SKU ${item.sku}` : 'Catalog item'}</p>
                    <strong>
                      {item.price ? `₱${item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Price by quote'}
                    </strong>
                  </div>
                  <div className="line-controls">
                    <label>
                      Qty
                      <input
                        min={1}
                        max={999}
                        type="number"
                        value={item.quantity}
                        onChange={(event) => changeQuantity(item.productId, Number(event.target.value))}
                      />
                    </label>
                    <button type="button" onClick={() => removeItem(item.productId)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="quote-cart-panel quote-form" onSubmit={submitRFQ}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Request details</p>
              <h2>Contact and delivery</h2>
            </div>
          </div>

          <label>
            Full name
            <input value={form.customerName} onChange={(event) => updateForm('customerName', event.target.value)} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
          </label>
          <label>
            Delivery location
            <input value={form.deliveryLocation} onChange={(event) => updateForm('deliveryLocation', event.target.value)} placeholder="City, province, building, or site" />
          </label>
          <label>
            Project type
            <select value={form.projectType} onChange={(event) => updateForm('projectType', event.target.value)}>
              <option value="home">Home</option>
              <option value="condo">Condo</option>
              <option value="restaurant">Restaurant</option>
              <option value="hotel">Hotel</option>
              <option value="office">Office</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Preferred delivery date, finishes, site constraints, or special requests" />
          </label>

          {error ? <p className="quote-form-error" role="alert">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={submitting || items.length === 0}>
            {submitting ? 'Submitting RFQ...' : 'Submit RFQ'}
          </button>
          <p className="quote-form-note">
            HomeU will review availability, delivery, and final pricing before sending a formal quotation.
          </p>
        </form>
      </div>
    </main>
  )
}
