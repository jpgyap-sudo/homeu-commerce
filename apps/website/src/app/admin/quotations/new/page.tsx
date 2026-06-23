'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { extractMaterialsFromDescription, extractDimensionsFromDescription } from '@/lib/format-utils'

// ── Types ──

interface Product {
  id: string
  title: string
  sku?: string
  price?: number
  salePrice?: number
  dimensions?: string
  materials?: string
  description?: any
  images?: Array<{ url: string }>
}

interface RFQ {
  id: string
  customerName: string
  email?: string
  phone?: string
  deliveryLocation?: string
  projectType?: string
  items?: Array<{
    id: string
    product?: string | { id: string; title?: string }
    productTitleSnapshot?: string
    skuSnapshot?: string
    unitPriceSnapshot?: number
    quantity: number
  }>
}

interface QuotationItem {
  key: string
  itemNumber: number
  productId: string
  productTitle: string
  description: string
  material: string
  dimensions: string
  color: string
  imageUrl?: string
  quantity: number
  unitCost: number
  discountPercent: number
  discountedCost: number
  total: number
}

// ── Default Terms ──

const DEFAULT_TERMS = {
  deliveryLeadtime: 'Please allow 2–4 weeks for manufacturing and delivery depending on availability.',
  paymentTerms: '50% down payment upon order confirmation. Remaining 50% due before delivery.',
  warranty: 'All furniture pieces come with a standard manufacturer warranty covering manufacturing defects.',
  bankDetails:
    'Bank: Eastwest Bank\nAccount Name: Home Atelier\nAccount Number: (set BANK_DETAILS in .env)',
  cancellationPolicy:
    'Cancellations made within 24 hours of order confirmation are fully refundable. After 24 hours, a cancellation fee may apply.',
  returnPolicy:
    'Items may be returned within 7 days of delivery subject to inspection and approval.',
  rejectionOfItems:
    'Any damage or discrepancy must be reported within 24 hours of delivery. Photos may be required for assessment.',
  refundPolicy:
    'Refunds will be processed within 14 business days after item(s) are returned and inspected.',
}

// ── Helper ──

function computeDiscountedCost(unitCost: number, discountPercent: number): number {
  return Math.round(unitCost * (1 - discountPercent / 100) * 100) / 100
}

function computeTotal(discountedCost: number, quantity: number): number {
  return Math.round(discountedCost * quantity * 100) / 100
}

// ── Component ──

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}><p style={{ color: '#666' }}>Loading...</p></main>}>
      <NewQuotationPageContent />
    </Suspense>
  )
}

function NewQuotationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlRfqId = searchParams.get('rfqId')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Customer Info ──
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [projectType, setProjectType] = useState('home')
  const [customerId, setCustomerId] = useState('')
  const [rfqId, setRfqId] = useState('')

  // ── RFQ Integration ──
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [showRfqPicker, setShowRfqPicker] = useState(false)
  const [rfqSearch, setRfqSearch] = useState('')
  const [loadingRfqs, setLoadingRfqs] = useState(false)

  // ── Items ──
  const [items, setItems] = useState<QuotationItem[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [nextItemNumber, setNextItemNumber] = useState(1)

  // ── Totals ──
  const [shippingCost, setShippingCost] = useState(0)
  const [validUntil, setValidUntil] = useState('')

  // ── Terms & Conditions ──
  const [terms, setTerms] = useState(DEFAULT_TERMS)

  // ── Computed totals ──
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const grandTotal = Math.round((subtotal + shippingCost) * 100) / 100

  // ── Auto-load RFQ from URL ──
  useEffect(() => {
    if (urlRfqId) {
      fetch(`/api/rfq?id=${urlRfqId}`)
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Failed to load RFQ')
        })
        .then(data => {
          const mappedRfq: RFQ = {
            id: String(data.id),
            customerName: data.customer_name || '',
            email: data.customer_email || '',
            phone: data.customer_phone || '',
            deliveryLocation: data.delivery_location || '',
            projectType: data.project_type || 'home',
            items: (data.items || []).map((item: any) => ({
              id: String(item.id),
              product: item.product_id ? { id: String(item.product_id), title: item.product_title_snapshot } : item.product_title_snapshot,
              productTitleSnapshot: item.product_title_snapshot,
              skuSnapshot: item.sku_snapshot,
              unitPriceSnapshot: Number(item.unit_price_snapshot) || 0,
              quantity: Number(item.quantity) || 1,
              materials: item.product_materials || '',
              dimensions: item.product_dimensions || '',
              imageUrl: item.product_image_url || '',
            }))
          }
          handleSelectRfq(mappedRfq)
        })
        .catch(err => console.error('Error auto-loading RFQ:', err))
    }
  }, [urlRfqId])

  // ── Load RFQs ──
  useEffect(() => {
    if (rfqSearch.length >= 2 || showRfqPicker) {
      loadRfqs()
    }
  }, [rfqSearch, showRfqPicker])

  async function loadRfqs() {
    setLoadingRfqs(true)
    try {
      let url = '/api/rfq-requests?limit=20'
      if (rfqSearch) url += `&search=${encodeURIComponent(rfqSearch)}`
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setRfqs(data.rfqs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingRfqs(false)
    }
  }

  function handleSelectRfq(rfq: RFQ) {
    setCustomerName(rfq.customerName)
    setEmail(rfq.email || '')
    setPhone(rfq.phone || '')
    setDeliveryLocation(rfq.deliveryLocation || '')
    setProjectType(rfq.projectType || 'home')
    setRfqId(rfq.id)

    // Copy items from RFQ
    if (rfq.items && rfq.items.length > 0) {
      const newItems: QuotationItem[] = rfq.items.map((rfqItem, idx) => {
        const productId = typeof rfqItem.product === 'object' ? rfqItem.product?.id || '' : rfqItem.product || ''
        const productTitle = typeof rfqItem.product === 'object' ? rfqItem.product?.title || rfqItem.productTitleSnapshot || '' : rfqItem.productTitleSnapshot || ''
        const materials = (rfqItem as any).materials || (rfqItem as any).productMaterials || ''
        const dimensions = (rfqItem as any).dimensions || (rfqItem as any).productDimensions || ''
        const imageUrl = (rfqItem as any).imageUrl || (rfqItem as any).productImageUrl || ''
        return {
          key: `item-${Date.now()}-${idx}`,
          itemNumber: idx + 1,
          productId,
          productTitle,
          description: productTitle,
          material: materials,
          dimensions: dimensions,
          color: '',
          imageUrl,
          quantity: rfqItem.quantity || 1,
          unitCost: rfqItem.unitPriceSnapshot || 0,
          discountPercent: 0,
          discountedCost: computeDiscountedCost(rfqItem.unitPriceSnapshot || 0, 0),
          total: computeTotal(rfqItem.unitPriceSnapshot || 0, rfqItem.quantity || 1),
        }
      })
      setItems(newItems)
      setNextItemNumber(newItems.length + 1)
    }

    setShowRfqPicker(false)
  }

  // ── Load Products ──
  useEffect(() => {
    if (productSearch.length >= 2 || showProductPicker) {
      loadProducts()
    }
  }, [productSearch, showProductPicker])

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      let url = '/api/products?limit=20&depth=2'
      if (productSearch) {
        url += `&where[or][0][title][contains]=${encodeURIComponent(productSearch)}&where[or][1][sku][contains]=${encodeURIComponent(productSearch)}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.docs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingProducts(false)
    }
  }

  function handleSelectProduct(product: Product) {
    const newItem: QuotationItem = {
      key: `item-${Date.now()}`,
      itemNumber: nextItemNumber,
      productId: product.id,
      productTitle: product.title,
      description: product.title,
      material: product.materials || extractMaterialsFromDescription(product.description),
      dimensions: product.dimensions || extractDimensionsFromDescription(product.description),
      color: '',
      imageUrl: product.images?.[0]?.url || '',
      quantity: 1,
      unitCost: product.salePrice || product.price || 0,
      discountPercent: 0,
      discountedCost: computeDiscountedCost(product.salePrice || product.price || 0, 0),
      total: computeTotal(product.salePrice || product.price || 0, 1),
    }
    setItems(prev => [...prev, newItem])
    setNextItemNumber(prev => prev + 1)
    setShowProductPicker(false)
    setProductSearch('')
  }

  // ── Item Management ──
  function updateItem(key: string, field: keyof QuotationItem, value: any) {
    setItems(prev =>
      prev.map(item => {
        if (item.key !== key) return item
        const updated = { ...item, [field]: value }

        // Auto-compute discounted cost and total
        if (field === 'unitCost' || field === 'discountPercent') {
          updated.discountedCost = computeDiscountedCost(updated.unitCost, updated.discountPercent)
          updated.total = computeTotal(updated.discountedCost, updated.quantity)
        }
        if (field === 'quantity') {
          updated.total = computeTotal(updated.discountedCost, updated.quantity)
        }

        return updated
      })
    )
  }

  function removeItem(key: string) {
    setItems(prev => {
      const filtered = prev.filter(item => item.key !== key)
      // Re-number items
      return filtered.map((item, idx) => ({ ...item, itemNumber: idx + 1 }))
    })
    setNextItemNumber(prev => prev - 1)
  }

  // ── Terms Update ──
  function updateTerm(field: string, value: string) {
    setTerms(prev => ({ ...prev, [field]: value }))
  }

  // ── Save ──
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!customerName.trim()) {
      setError('Customer name is required.')
      return
    }
    if (!phone.trim()) {
      setError('Contact number is required.')
      return
    }
    if (items.length === 0) {
      setError('At least one item is required.')
      return
    }

    setSaving(true)
    try {
      const quotationRequest = {
        customerName: customerName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        deliveryLocation: deliveryLocation.trim() || undefined,
        projectType: projectType || undefined,
        customer: customerId || undefined,
        rfq: rfqId || undefined,
        items: items.map(item => ({
          itemNumber: item.itemNumber,
          productId: item.productId || undefined,
          productTitle: item.productTitle,
          description: item.description,
          material: item.material || undefined,
          dimensions: item.dimensions || undefined,
          color: item.color || undefined,
          imageUrl: item.imageUrl || undefined,
          quantity: item.quantity,
          unitCost: item.unitCost,
          discountPercent: item.discountPercent,
          discountedCost: item.discountedCost,
          total: item.total,
        })),
        subtotal,
        shippingCost,
        grandTotal,
        validUntil: validUntil || undefined,
        status: 'draft',
        ...terms,
      }

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationRequest),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create quotation')
      }

      const result = await res.json()
      setSuccess(`Quotation ${result.quotation?.quotationNumber || ''} created successfully!`)
      setTimeout(() => {
        router.push(`/admin/quotations/${result.quotation?.id}`)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to save quotation')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/quotations" style={{ color: '#666' }}>Quotations</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#222', fontWeight: 600 }}>New Quotation</span>
      </div>

      <h1 style={{ marginBottom: 8 }}>Create New Quotation</h1>
      <p style={{ color: '#666', marginBottom: 32, fontSize: 14 }}>
        Fill in customer details, add items with pricing, and set terms & conditions.
      </p>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Section: Import from RFQ ── */}
        <div style={{
          background: '#f0f7ff',
          border: '1px solid #b3d4f7',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 14 }}>📋 Import from RFQ</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                Pull customer details and items from an existing RFQ request.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRfqPicker(!showRfqPicker)}
              style={{
                padding: '8px 16px',
                background: '#222',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {showRfqPicker ? 'Close' : 'Select RFQ'}
            </button>
          </div>

          {rfqId && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#0066cc' }}>
              ✓ Linked to RFQ: <Link href={`/admin/rfq/${rfqId}`} style={{ color: '#0066cc' }}>View RFQ</Link>
            </div>
          )}

          {showRfqPicker && (
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Search RFQs by customer name..."
                value={rfqSearch}
                onChange={e => setRfqSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  marginBottom: 8,
                }}
              />
              {loadingRfqs ? (
                <p style={{ fontSize: 13, color: '#666' }}>Loading RFQs...</p>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {rfqs.map(rfq => (
                    <div
                      key={rfq.id}
                      onClick={() => handleSelectRfq(rfq)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        background: '#fff',
                        borderRadius: 4,
                        marginBottom: 4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{rfq.customerName}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {rfq.phone} · {rfq.items?.length || 0} item(s) · {rfq.projectType || 'N/A'}
                      </div>
                    </div>
                  ))}
                  {rfqs.length === 0 && (
                    <p style={{ fontSize: 13, color: '#999' }}>No RFQs found.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Section: Client Information ── */}
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Client Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Contact Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Project Type
              </label>
              <select
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              >
                <option value="home">Home</option>
                <option value="condo">Condo</option>
                <option value="restaurant">Restaurant</option>
                <option value="hotel">Hotel</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Delivery Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={e => setDeliveryLocation(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* ── Section: Items ── */}
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Items</h2>
            <button
              type="button"
              onClick={() => setShowProductPicker(true)}
              style={{
                padding: '8px 16px',
                background: '#222',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              + Add Product
            </button>
          </div>

          {/* Product Picker Modal */}
          {showProductPicker && (
            <div style={{
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              background: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>Select a Product</strong>
                <button
                  type="button"
                  onClick={() => { setShowProductPicker(false); setProductSearch('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666' }}
                >
                  ✕ Close
                </button>
              </div>
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  marginBottom: 8,
                }}
              />
              {loadingProducts ? (
                <p style={{ fontSize: 13, color: '#666' }}>Loading products...</p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {products.map(product => (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        borderRadius: 4,
                        marginBottom: 2,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{product.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {product.sku && `SKU: ${product.sku} · `}
                        ₱{(product.salePrice || product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        {product.dimensions && ` · ${product.dimensions}`}
                        {product.materials && ` · ${product.materials}`}
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && productSearch.length >= 2 && (
                    <p style={{ fontSize: 13, color: '#999' }}>No products found.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          {items.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>
              No items added yet. Click &ldquo;+ Add Product&rdquo; to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 40 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', minWidth: 200 }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', width: 100 }}>Material</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', width: 80 }}>Dimensions</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', width: 80 }}>Color</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 50 }}>QTY</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', width: 90 }}>Unit Cost</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 60 }}>Disc %</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', width: 90 }}>Disc Cost</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', width: 90 }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.key} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ textAlign: 'center', padding: '6px' }}>{item.itemNumber}</td>
                      <td style={{ padding: '6px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee', flexShrink: 0 }} />
                          )}
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => updateItem(item.key, 'description', e.target.value)}
                            style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          value={item.material}
                          onChange={e => updateItem(item.key, 'material', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          value={item.dimensions}
                          onChange={e => updateItem(item.key, 'dimensions', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          value={item.color}
                          onChange={e => updateItem(item.key, 'color', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItem(item.key, 'quantity', parseInt(e.target.value) || 1)}
                          style={{ width: 50, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitCost}
                          onChange={e => updateItem(item.key, 'unitCost', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.discountPercent}
                          onChange={e => updateItem(item.key, 'discountPercent', parseFloat(e.target.value) || 0)}
                          style={{ width: 50, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>
                        ₱{item.discountedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>
                        ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 16, padding: 0 }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #ddd' }}>
                    <td colSpan={8} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Subtotal:</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>
                      ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 13 }}>
                      Shipping / Handling:
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={shippingCost}
                        onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td></td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #222' }}>
                    <td colSpan={8} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, fontSize: 16 }}>Grand Total:</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, fontSize: 16 }}>
                      ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Section: Validity ── */}
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Validity</h2>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
              Valid Until
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }}
            />
          </div>
        </div>

        {/* ── Section: Terms & Conditions ── */}
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Terms & Conditions</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Delivery Leadtime
              </label>
              <input
                type="text"
                value={terms.deliveryLeadtime}
                onChange={e => updateTerm('deliveryLeadtime', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Payment Terms
              </label>
              <textarea
                value={terms.paymentTerms}
                onChange={e => updateTerm('paymentTerms', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Warranty
              </label>
              <textarea
                value={terms.warranty}
                onChange={e => updateTerm('warranty', e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Bank Details (Eastwest Bank)
              </label>
              <textarea
                value={terms.bankDetails}
                onChange={e => updateTerm('bankDetails', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Cancellation Policy
              </label>
              <textarea
                value={terms.cancellationPolicy}
                onChange={e => updateTerm('cancellationPolicy', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Return Policy
              </label>
              <textarea
                value={terms.returnPolicy}
                onChange={e => updateTerm('returnPolicy', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Rejection of Items
              </label>
              <textarea
                value={terms.rejectionOfItems}
                onChange={e => updateTerm('rejectionOfItems', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>
                Refund Policy
              </label>
              <textarea
                value={terms.refundPolicy}
                onChange={e => updateTerm('refundPolicy', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
          <Link
            href="/admin/quotations"
            style={{
              padding: '10px 24px',
              background: '#f5f5f5',
              color: '#222',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 32px',
              background: saving ? '#999' : '#222',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </main>
  )
}
