'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

export type QuoteItem = {
  productId: string
  title: string
  sku?: string
  price?: number
  quantity: number
  imageUrl?: string
  slug?: string
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
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        slug: typeof item.slug === 'string' ? item.slug : undefined,
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

  function lineTotal(item: QuoteItem): number {
    return (item.price || 0) * item.quantity
  }

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
      {/* Breadcrumb */}
      <nav className="quote-cart-breadcrumb" aria-label="Breadcrumb">
        <a href="/products">&larr; Continue Shopping</a>
        <span>/</span>
        <span>Request for Quotation</span>
      </nav>

      {/* Hero */}
      <section className="quote-cart-hero">
        <div>
          <p className="eyebrow">HomeU RFQ Cart</p>
          <h1>Request a quotation</h1>
          <p>
            Review your selected items, tell us about your project, and receive a formal quotation
            from the HomeU team.
          </p>
        </div>
        <div className="quote-cart-summary-hero" aria-label="Cart summary">
          <strong>{totalQuantity}</strong>
          <span>{totalQuantity === 1 ? 'item' : 'items'}</span>
          {subtotal > 0 && (
            <span className="quote-cart-subtotal-hero">
              Est. ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </section>

      {/* Progress Steps */}
      <div className="quote-cart-steps">
        <div className="quote-cart-step quote-cart-step--active">
          <span className="step-number">1</span>
          <span className="step-label">Review Items</span>
        </div>
        <div className="step-divider" />
        <div className="quote-cart-step">
          <span className="step-number">2</span>
          <span className="step-label">Contact Details</span>
        </div>
        <div className="step-divider" />
        <div className="quote-cart-step">
          <span className="step-number">3</span>
          <span className="step-label">Submit RFQ</span>
        </div>
      </div>

      {successId ? (
        <section className="quote-cart-success" role="status">
          <div className="quote-cart-success-icon">✅</div>
          <h2>RFQ Submitted Successfully</h2>
          <p>
            Your request is now in the HomeU queue.
            Reference: <strong>RFQ #{successId.slice(-6).toUpperCase()}</strong>
          </p>
          <div className="quote-cart-actions">
            <a href={`/customer/rfq/${successId}`} className="primary-button">Track RFQ Status</a>
            <a href="/products">Continue Browsing</a>
          </div>
        </section>
      ) : null}

      <div className="quote-cart-grid">
        {/* Left: Cart Items */}
        <section className="quote-cart-panel" aria-labelledby="quote-items-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Your Selection</p>
              <h2 id="quote-items-title">
                {items.length === 0 ? 'Quote Items' : `${totalQuantity} item${totalQuantity !== 1 ? 's' : ''}`}
              </h2>
            </div>
            {items.length > 0 && (
              <button type="button" className="text-button" onClick={() => syncItems([])}>
                Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="quote-cart-empty">
              <div className="quote-cart-empty-icon">🛋️</div>
              <h3>Your quote cart is empty</h3>
              <p>Browse our furniture catalog and add items to request a quotation.</p>
              <a href="/products">Browse Products</a>
            </div>
          ) : (
            <div className="quote-cart-lines">
              {items.map((item) => (
                <article className="quote-cart-line" key={item.productId}>
                  {/* Product thumbnail */}
                  <div className="quote-cart-line-image">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="quote-cart-line-image-placeholder">🛋️</div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="quote-cart-line-info">
                    <h3>
                      {item.slug ? (
                        <a href={`/products/${item.slug}`}>{item.title}</a>
                      ) : (
                        item.title
                      )}
                    </h3>
                    {item.sku && <p className="quote-cart-line-sku">SKU: {item.sku}</p>}
                    {item.price ? (
                      <span className="quote-cart-line-unit-price">
                        ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} each
                      </span>
                    ) : (
                      <span className="quote-cart-line-unit-price">Price by quotation</span>
                    )}
                  </div>

                  {/* Quantity stepper */}
                  <div className="quote-cart-line-qty">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= 999}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Line subtotal */}
                  <div className="quote-cart-line-subtotal">
                    <span className="subtotal-label">Subtotal</span>
                    <strong>
                      {item.price
                        ? `₱${lineTotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </strong>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    className="quote-cart-line-remove"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.title}`}
                    title="Remove"
                  >
                    ✕
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Right: Contact Form + Order Summary (sticky) */}
        <aside className="quote-cart-sidebar">
          <div className="quote-cart-sidebar-sticky">
            {/* Order Summary */}
            <div className="quote-cart-order-summary">
              <h3>Order Summary</h3>
              <div className="order-summary-rows">
                <div className="order-summary-row">
                  <span>Items ({totalQuantity})</span>
                  <span>{subtotal > 0 ? `₱${subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</span>
                </div>
                <div className="order-summary-row">
                  <span>Delivery</span>
                  <span className="order-summary-note">Quoted separately</span>
                </div>
                <div className="order-summary-row order-summary-total">
                  <span>Estimated Total</span>
                  <span>{subtotal > 0 ? `₱${subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</span>
                </div>
              </div>
              <p className="order-summary-disclaimer">
                Final pricing, delivery fees, and availability will be confirmed in your formal quotation.
              </p>
            </div>

            {/* Contact Form */}
            <form className="quote-form" onSubmit={submitRFQ}>
              <h3>Contact Details</h3>

              <label>
                Full Name <span className="required">*</span>
                <input
                  value={form.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                  placeholder="Juan dela Cruz"
                  required
                />
              </label>
              <label>
                Phone Number <span className="required">*</span>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="juan@example.com"
                />
              </label>
              <label>
                Delivery Location
                <input
                  value={form.deliveryLocation}
                  onChange={(e) => updateForm('deliveryLocation', e.target.value)}
                  placeholder="City, province, or building address"
                />
              </label>
              <label>
                Project Type
                <select value={form.projectType} onChange={(e) => updateForm('projectType', e.target.value)}>
                  <option value="home">Home</option>
                  <option value="condo">Condo</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Notes / Special Requests
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  placeholder="Preferred timeline, finishes, dimensions, or any questions for the HomeU team"
                  rows={3}
                />
              </label>

              {error && <p className="quote-form-error" role="alert">{error}</p>}

              <button
                className="primary-button quote-submit-btn"
                type="submit"
                disabled={submitting || items.length === 0}
              >
                {submitting ? 'Submitting...' : 'Submit Request for Quotation'}
              </button>

              <p className="quote-form-note">
                No payment required. HomeU will review and send a formal quotation with final pricing.
              </p>
            </form>
          </div>
        </aside>
      </div>
    </main>
  )
}
