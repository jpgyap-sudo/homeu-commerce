'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { formatPrice, formatQuantity } from '@/lib/format-utils'
import InlineProductBrowser from '@/components/InlineProductBrowser'

// ── Types ──────────────────────────────────────────────────────────────────

export type QuoteItem = {
  productId: string
  title: string
  sku?: string
  price?: number
  quantity: number
  imageUrl?: string
  slug?: string
  /** THE GENIUS: per-item notes/questions — the missing friction-reducer */
  notes?: string
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

// ── Storage ────────────────────────────────────────────────────────────────

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
        notes: typeof item.notes === 'string' ? item.notes : '',
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
  if (existing) {
    existing.quantity = normalizeQuantity(existing.quantity + quantity)
    // Preserve existing notes unless new notes were explicitly provided
    if (item.notes && !existing.notes) existing.notes = item.notes
  } else {
    items.push({ ...item, quantity, notes: item.notes || '' })
  }
  saveQuoteCart(items)
}

export function updateQuoteCartQuantity(productId: string, quantity: number) {
  const items = getQuoteCart()
    .map((item) => item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item)
  saveQuoteCart(items)
}

export function updateQuoteItemNotes(productId: string, notes: string) {
  const items = getQuoteCart()
    .map((item) => item.productId === productId ? { ...item, notes } : item)
  saveQuoteCart(items)
}

export function removeFromQuoteCart(productId: string) {
  saveQuoteCart(getQuoteCart().filter((item) => item.productId !== productId))
}

export function clearQuoteCart() {
  saveQuoteCart([])
}

export function getQuoteCartLeadId(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(CART_LEAD_ID_KEY) }
  catch { return null }
}

export function setQuoteCartLeadId(leadId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (leadId) localStorage.setItem(CART_LEAD_ID_KEY, leadId)
    else localStorage.removeItem(CART_LEAD_ID_KEY)
  } catch { /* silent */ }
}

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
          notes: item.notes,
        })),
      }),
    })
  } catch { /* silent */ }
}

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
      notes: item.notes || '',
    }))
    const clientItems = getQuoteCart()
    if (clientItems.length === 0) {
      saveQuoteCart(serverItems)
    } else {
      const clientProductIds = new Set(clientItems.map((i) => i.productId))
      const newServerItems = serverItems.filter((i) => !clientProductIds.has(i.productId))
      if (newServerItems.length > 0) saveQuoteCart([...clientItems, ...newServerItems])
    }
  } catch { /* silent */ }
}

export async function clearServerCart(): Promise<void> {
  const leadId = getQuoteCartLeadId()
  if (!leadId) return
  try { await fetch(`/api/cart/sync?leadId=${encodeURIComponent(leadId)}`, { method: 'DELETE' }) }
  catch { /* silent */ }
}

// ── QuoteCartBadge ─────────────────────────────────────────────────────────

export function QuoteCartBadge({ countOnly = false }: { countOnly?: boolean } = {}) {
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

  if (countOnly) {
    return count > 0
      ? <span className="site-header__rfq-count" aria-label={`${count} RFQ cart item${count === 1 ? '' : 's'}`}>{count}</span>
      : null
  }

  return (
    <a
      className="site-header__icon-btn site-header__rfq-btn"
      href="/quote-cart"
      aria-label={`RFQ cart with ${count} item${count === 1 ? '' : 's'}`}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M3 4h2l1.6 9.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.82L18 7H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="17" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="17" r="1" fill="currentColor" stroke="none" />
      </svg>
      <span className="site-header__rfq-label">RFQ</span>
      {count > 0 && <span className="site-header__rfq-count" aria-hidden="true">{count}</span>}
    </a>
  )
}

// ── QuickRFQ Inline Widget (THE GENIUS) ────────────────────────────────────

interface QuickRFQProps {
  product: {
    id: number | string
    title: string
    slug: string
    price?: number | null
    sku?: string
    imageUrl?: string | null
  }
  /** Optional note preset — e.g., "I need this in walnut finish" */
  presetNote?: string
}

/**
 * QuickRFQ — Frictionless "Add to RFQ" with optional per-item notes.
 *
 * THE GENIUS: Instead of a plain "Add to RFQ" button, this widget:
 * 1. Shows a one-tap "Add to RFQ" button with minimalist price
 * 2. Has an optional notes expander (click to add questions/notes for THIS item)
 * 3. Auto-rotates to "View in RFQ" when item is already in cart
 * 4. Shows inline quantity selector for bulk inquiries
 */
export function QuickRFQ({ product, presetNote }: QuickRFQProps) {
  const [inCart, setInCart] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState(presetNote || '')

  useEffect(() => {
    const check = () => {
      const items = getQuoteCart()
      setInCart(items.some((i) => i.productId === String(product.id)))
    }
    check()
    window.addEventListener(CART_EVENT, check)
    return () => window.removeEventListener(CART_EVENT, check)
  }, [product.id])

  function handleAdd() {
    addToQuoteCart({
      productId: String(product.id),
      title: product.title,
      slug: product.slug,
      sku: product.sku,
      price: product.price ?? undefined,
      imageUrl: product.imageUrl ?? undefined,
      quantity,
      notes: notes.trim() || undefined,
    })
    setInCart(true)
    setShowNotes(false)
  }

  const priceEl = product.price != null ? (
    <span style={priceStyle}>{formatPrice(product.price)}</span>
  ) : null

  if (inCart) {
    return (
      <a href="/quote-cart" style={inCartBtnStyle}>
        ✓ View in RFQ Cart
      </a>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        {/* Qty */}
        <div style={qtyGroupStyle}>
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            style={qtyBtnStyle}
            disabled={quantity <= 1}
          >−</button>
          <span style={qtyValStyle}>{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(999, quantity + 1))}
            style={qtyBtnStyle}
            disabled={quantity >= 999}
          >+</button>
        </div>

        {/* Add to RFQ */}
        <button
          type="button"
          onClick={handleAdd}
          style={addBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#0f4f2b')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1a6d3e')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 4h2l1.6 9.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.82L18 7H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="17" r="1" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="17" r="1" fill="currentColor" stroke="none" />
            </svg>
            Add to RFQ
          </span>
          {priceEl}
        </button>

        {/* Notes toggle */}
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          style={noteToggleStyle}
          title="Add questions or notes for this item"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M16 2H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8l4-4V3a1 1 0 0 0-1-1z" />
            <path d="M6 6h8M6 10h8M6 14h4" />
          </svg>
        </button>
      </div>

      {/* Notes expander */}
      {showNotes && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Questions about this ${product.title}? E.g. finish, size, timeline…`}
            rows={2}
            style={notesInputStyle}
          />
        </div>
      )}
    </div>
  )
}

// ── Minimalist price styling ───────────────────────────────────────────────

const priceStyle: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontWeight: 500,
  fontSize: 13,
  letterSpacing: '-0.01em',
  opacity: 0.9,
}

const addBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 18px',
  background: '#1a6d3e',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 150ms ease',
  whiteSpace: 'nowrap',
}

const qtyGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  border: '1.5px solid #d9e0d7',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#fff',
}

const qtyBtnStyle: React.CSSProperties = {
  width: 34,
  height: 38,
  border: 'none',
  background: '#f4f6f2',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#151a17',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}

const qtyValStyle: React.CSSProperties = {
  width: 38,
  textAlign: 'center',
  fontSize: 14,
  fontWeight: 700,
  color: '#151a17',
}

const noteToggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 38,
  border: '1.5px solid #d9e0d7',
  borderRadius: 8,
  background: '#fff',
  color: '#667168',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  fontSize: 16,
}

const notesInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #d9e0d7',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: 48,
  background: '#fbfcfa',
  color: '#151a17',
  outline: 'none',
  boxSizing: 'border-box',
}

// ── In-cart button style (reused) ──────────────────────────────────────────

const inCartBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 18px',
  background: '#e8f2ec',
  color: '#1a6d3e',
  border: '1.5px solid #b7d4c2',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'all 150ms ease',
}

// ── QuoteCartExperience (Redesigned) ───────────────────────────────────────

export function QuoteCartExperience() {
  const [items, setItems] = useState<QuoteItem[]>([])
  const [form, setForm] = useState<QuoteForm>({
    customerName: '', email: '', phone: '', deliveryLocation: '', projectType: 'home', notes: '',
  })
  const [customerId, setCustomerId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successId, setSuccessId] = useState('')

  useEffect(() => {
    const loaded = getQuoteCart()
    setItems(loaded)
    const leadId = getQuoteCartLeadId()
    if (leadId) {
      fetchServerCart().then(() => setItems(getQuoteCart()))
    }

    // Backfill price for items added before price was captured correctly
    // (e.g. via an older chat-recommendation path) — never trust a stale
    // cached `undefined` price when the live product has one.
    const missingPrice = loaded.filter((i) => i.price == null)
    if (missingPrice.length > 0) {
      Promise.all(
        missingPrice.map((i) =>
          fetch(`/api/products/${i.productId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => (p?.price != null ? { productId: i.productId, price: p.price } : null))
            .catch(() => null)
        )
      ).then((results) => {
        const fixes = results.filter(Boolean) as { productId: string; price: number }[]
        if (fixes.length === 0) return
        const current = getQuoteCart()
        const patched = current.map((item) => {
          const fix = fixes.find((f) => f.productId === item.productId)
          return fix ? { ...item, price: fix.price } : item
        })
        saveQuoteCart(patched)
        setItems(patched)
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
      } catch { /* guest OK */ }
    }
    hydrateCustomer()
  }, [])

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0), [items])
  const totalQuantity = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])

  function lineTotal(item: QuoteItem): number {
    return (item.price || 0) * item.quantity
  }

  function syncItems(nextItems: QuoteItem[]) {
    setItems(nextItems)
    saveQuoteCart(nextItems)
    setSuccessId('')
    syncCartToServer()
  }

  function updateItemNotes(productId: string, notes: string) {
    const next = items.map((i) => i.productId === productId ? { ...i, notes } : i)
    setItems(next)
    saveQuoteCart(next)
  }

  function changeQuantity(productId: string, quantity: number) {
    syncItems(items.map((i) => i.productId === productId ? { ...i, quantity: normalizeQuantity(quantity) } : i))
  }

  function removeItem(productId: string) {
    syncItems(items.filter((i) => i.productId !== productId))
  }

  function updateForm(field: keyof QuoteForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  async function submitRFQ(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setSuccessId('')
    if (items.length === 0) { setError('Add at least one product before submitting.'); return }
    if (!form.customerName.trim() || !form.phone.trim()) { setError('Name and phone are required.'); return }
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
            notes: item.notes || undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit RFQ.')
      setSuccessId(data.rfqId || '')
      clearQuoteCart(); setItems([]); clearServerCart()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit RFQ.')
    } finally { setSubmitting(false) }
  }

  return (
    <main className="quote-cart-shell">
      <nav className="quote-cart-breadcrumb" aria-label="Breadcrumb">
        <a href="/products">&larr; Continue Shopping</a>
        <span>/</span>
        <span>Request for Quotation</span>
      </nav>

      <section className="quote-cart-hero">
        <div>
          <p className="eyebrow">HomeU RFQ Cart</p>
          <h1>Request a quotation</h1>
          <p>Review items, add notes per item, and submit for a formal quotation.</p>
        </div>
        <div className="quote-cart-summary-hero">
          <strong>{totalQuantity}</strong>
          <span>{formatQuantity(totalQuantity, 'item')}</span>
          {subtotal > 0 && (
            <span className="quote-cart-subtotal-hero">
              {formatPrice(subtotal, 'always')}
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
          <p>Reference: <strong>RFQ #{successId.slice(-6).toUpperCase()}</strong></p>
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
              <button type="button" className="text-button" onClick={() => syncItems([])}>Clear All</button>
            )}
          </div>

          {/* Inline product browser — search & add products without leaving cart */}
          <div style={{ padding: '0 0 16px' }}>
            <InlineProductBrowser onAdd={(product) => {
              addToQuoteCart({
                productId: product.productId,
                title: product.title,
                slug: product.slug,
                price: product.price || undefined,
                imageUrl: product.imageUrl || undefined,
                quantity: 1,
              })
              setItems(getQuoteCart())
            }} />
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
                  {/* Thumbnail */}
                  <div className="quote-cart-line-image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div className="quote-cart-line-image-placeholder">🛋️</div>
                    )}
                  </div>

                  {/* Info + Notes */}
                  <div className="quote-cart-line-info">
                    <h3>
                      {item.slug ? <a href={`/products/${item.slug}`}>{item.title}</a> : item.title}
                    </h3>
                    {item.sku && <p className="quote-cart-line-sku">SKU: {item.sku}</p>}
                    {item.price != null ? (
                      <span className="quote-cart-line-unit-price">
                        {formatPrice(item.price)} each <em className="quote-cart-estimate-tag">est.</em>
                      </span>
                    ) : (
                      <span className="quote-cart-line-unit-price">Price by quotation</span>
                    )}

                    {/* Per-item notes (THE GENIUS) */}
                    <div className="quote-cart-notes-field">
                      <label htmlFor={`notes-${item.productId}`} className="quote-cart-notes-label">
                        ✎ Notes &amp; questions for this item
                      </label>
                      <textarea
                        id={`notes-${item.productId}`}
                        value={item.notes || ''}
                        onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                        placeholder={`E.g. preferred color, finish, size, or delivery timeline for ${item.title}…`}
                        rows={2}
                        className="quote-cart-notes-textarea"
                      />
                    </div>
                  </div>

                  {/* Qty */}
                  <div className="quote-cart-line-qty">
                    <button type="button" className="qty-btn"
                      onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}>−</button>
                    <span className="qty-value">{item.quantity}</span>
                    <button type="button" className="qty-btn"
                      onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= 999}>+</button>
                  </div>

                  {/* Subtotal */}
                  <div className="quote-cart-line-subtotal">
                    <span className="subtotal-label">Subtotal</span>
                    <strong>{item.price ? formatPrice(lineTotal(item), 'always') : '—'}</strong>
                  </div>

                  {/* Remove */}
                  <button type="button" className="quote-cart-line-remove"
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Remove ${item.title}`}>✕</button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Right: Contact Form */}
        <aside className="quote-cart-sidebar">
          <div className="quote-cart-sidebar-sticky">
            <div className="quote-cart-order-summary">
              <h3>Order Summary</h3>
              <div className="order-summary-rows">
                <div className="order-summary-row">
                  <span>Items ({totalQuantity})</span>
                  <span>{subtotal > 0 ? formatPrice(subtotal, 'always') : '—'}</span>
                </div>
                <div className="order-summary-row">
                  <span>Delivery</span>
                  <span className="order-summary-note">Quoted separately</span>
                </div>
                <div className="order-summary-row order-summary-total">
                  <span>Estimated Total</span>
                  <span>{subtotal > 0 ? formatPrice(subtotal, 'always') : '—'}</span>
                </div>
              </div>
              <p className="order-summary-disclaimer">
                Prices shown are estimates and subject to change — final pricing may vary due to price
                increases or customization. Customization availability depends on the item, material, and
                quantity. Delivery fees and final pricing are confirmed in your formal quotation.
              </p>
            </div>

            <form className="quote-form" onSubmit={submitRFQ}>
              <h3>Contact Details</h3>
              <label>Full Name <span className="required">*</span>
                <input value={form.customerName} onChange={(e) => updateForm('customerName', e.target.value)}
                  placeholder="Juan dela Cruz" required />
              </label>
              <label>Phone <span className="required">*</span>
                <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="+63 9XX XXX XXXX" required />
              </label>
              <label>Email
                <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="juan@example.com" />
              </label>
              <label>Delivery Location
                <input value={form.deliveryLocation} onChange={(e) => updateForm('deliveryLocation', e.target.value)}
                  placeholder="City, province, or building address" />
              </label>
              <label>Project Type
                <select value={form.projectType} onChange={(e) => updateForm('projectType', e.target.value)}>
                  <option value="home">Home</option>
                  <option value="condo">Condo</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>Additional Notes
                <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)}
                  placeholder="Timeline, budget range, or any other details for the HomeU team"
                  rows={3} />
              </label>

              {error && <p className="quote-form-error" role="alert">{error}</p>}

              <button className="primary-button quote-submit-btn" type="submit"
                disabled={submitting || items.length === 0}>
                {submitting ? 'Submitting...' : 'Submit Request for Quotation'}
              </button>
              <p className="quote-form-note">
                No payment required. HomeU will send a formal quotation.
              </p>
            </form>
          </div>
        </aside>
      </div>
    </main>
  )
}
