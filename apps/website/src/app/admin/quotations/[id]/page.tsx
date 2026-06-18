'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuotationItem {
  id: string
  itemNumber: number
  product?: string | { id: string }
  description: string
  material?: string
  dimensions?: string
  color?: string
  quantity: number
  unitCost: number
  discountPercent: number
  discountedCost: number
  total: number
}

interface QuotationData {
  id: string
  quotationNumber: string
  customerName: string
  email?: string
  phone?: string
  deliveryLocation?: string
  projectType?: string
  customer?: string | { id: string }
  rfq?: string | { id: string }
  items?: QuotationItem[]
  subtotal: number
  shippingCost: number
  grandTotal: number
  validUntil?: string
  status: string
  sentAt?: string
  sentVia?: string
  internalNotes?: string
  termsDeliveryLeadtime?: string
  termsPaymentTerms?: string
  termsWarranty?: string
  termsBankDetails?: string
  termsCancellationPolicy?: string
  termsReturnPolicy?: string
  termsRejectionOfItems?: string
  termsRefundPolicy?: string
  createdAt: string
  updatedAt: string
}

function computeDiscountedCost(unitCost: number, discountPercent: number): number {
  return Math.round(unitCost * (1 - discountPercent / 100) * 100) / 100
}

function computeTotal(discountedCost: number, quantity: number): number {
  return Math.round(discountedCost * quantity * 100) / 100
}

export default function EditQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const [quotation, setQuotation] = useState<QuotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [projectType, setProjectType] = useState('home')
  const [rfqId, setRfqId] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [shippingCost, setShippingCost] = useState(0)
  const [validUntil, setValidUntil] = useState('')
  const [status, setStatus] = useState('draft')
  const [sentAt, setSentAt] = useState('')
  const [sentVia, setSentVia] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [terms, setTerms] = useState<Record<string, string>>({})

  const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0)
  const grandTotal = Math.round((subtotal + shippingCost) * 100) / 100

  useEffect(() => {
    async function loadQuotation() {
      try {
        const id = params?.id
        if (!id) throw new Error('Quotation ID not found')

        const res = await fetch(`/api/quotations/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load quotation')

        const data: QuotationData = await res.json()
        setQuotation(data)
        populateForm(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    }

    loadQuotation()
  }, [params?.id])

  function populateForm(data: QuotationData) {
    setCustomerName(data.customerName || '')
    setEmail(data.email || '')
    setPhone(data.phone || '')
    setDeliveryLocation(data.deliveryLocation || '')
    setProjectType(data.projectType || 'home')
    setRfqId(typeof data.rfq === 'object' ? data.rfq?.id || '' : data.rfq || '')
    setItems((data.items || []).map((item: any) => ({
      ...item,
      key: item.id || `item-${Date.now()}-${Math.random()}`,
    })))
    setShippingCost(data.shippingCost || 0)
    setValidUntil(data.validUntil ? data.validUntil.split('T')[0] : '')
    setStatus(data.status || 'draft')
    setSentAt(data.sentAt || '')
    setSentVia(data.sentVia || '')
    setInternalNotes(data.internalNotes || '')
    setTerms({
      deliveryLeadtime: data.termsDeliveryLeadtime || '',
      paymentTerms: data.termsPaymentTerms || '',
      warranty: data.termsWarranty || '',
      bankDetails: data.termsBankDetails || '',
      cancellationPolicy: data.termsCancellationPolicy || '',
      returnPolicy: data.termsReturnPolicy || '',
      rejectionOfItems: data.termsRejectionOfItems || '',
      refundPolicy: data.termsRefundPolicy || '',
    })
  }

  function updateItem(key: string, field: string, value: any) {
    setItems((prev: any[]) =>
      prev.map((item: any) => {
        if (item.key !== key) return item
        const updated = { ...item, [field]: value }
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
    setItems((prev: any[]) =>
      prev.filter((item: any) => item.key !== key)
        .map((item: any, idx: number) => ({ ...item, itemNumber: idx + 1 }))
    )
  }

  function updateTerm(field: string, value: string) {
    setTerms(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const id = params?.id
      if (!id) throw new Error('Quotation ID not found')

      const quotationUpdate = {
        customerName,
        email: email || undefined,
        phone,
        deliveryLocation: deliveryLocation || undefined,
        projectType: projectType || undefined,
        items: items.map((item: any) => ({
          ...item,
          product: item.productId || (typeof item.product === 'object' ? item.product?.id : item.product) || undefined,
        })),
        subtotal,
        shippingCost,
        grandTotal,
        validUntil: validUntil || undefined,
        status,
        sentAt: sentAt || undefined,
        sentVia: sentVia || undefined,
        internalNotes: internalNotes || undefined,
        termsDeliveryLeadtime: terms.deliveryLeadtime,
        termsPaymentTerms: terms.paymentTerms,
        termsWarranty: terms.warranty,
        termsBankDetails: terms.bankDetails,
        termsCancellationPolicy: terms.cancellationPolicy,
        termsReturnPolicy: terms.returnPolicy,
        termsRejectionOfItems: terms.rejectionOfItems,
        termsRefundPolicy: terms.refundPolicy,
      }

      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationUpdate),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }

      setSuccess('Quotation updated successfully!')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleSend() {
    if (!confirm('Mark this quotation as sent? This will set the status to "Sent" and record the current date/time.')) return
    setError('')
    setSuccess('')

    try {
      const id = params?.id
      if (!id) throw new Error('Quotation ID not found')

      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentVia: 'email',
        }),
      })

      if (!res.ok) throw new Error('Failed to mark as sent')

      setSuccess('Quotation marked as sent!')
      setStatus('sent')
      setSentAt(new Date().toISOString())
      setSentVia('email')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to send')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this quotation? This cannot be undone.')) return
    setError('')
    try {
      const id = params?.id
      if (!id) throw new Error('Quotation ID not found')
      const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/admin/quotations')
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading quotation...</p>
      </main>
    )
  }

  if (error && !quotation) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#c00', padding: '16px', borderRadius: 6 }}>{error}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/quotations" style={{ color: '#666' }}>&larr; Back to Quotations</Link>
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ marginBottom: 8, fontSize: 14 }}>
            <Link href="/admin/quotations" style={{ color: '#666' }}>Quotations</Link>
            <span style={{ color: '#999', margin: '0 8px' }}>/</span>
            <span style={{ color: '#222', fontWeight: 600 }}>{quotation?.quotationNumber}</span>
          </div>
          <h1 style={{ margin: 0 }}>Edit Quotation</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href={`/quotation/${quotation?.id}`}
            target="_blank"
            style={{
              padding: '8px 16px',
              background: '#f5f5f5',
              color: '#222',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            👁 Preview
          </Link>
          {status === 'draft' && (
            <button
              onClick={handleSend}
              style={{
                padding: '8px 16px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              📨 Mark as Sent
            </button>
          )}
          <a
            href={`/api/admin/quotations/pdf/${quotation?.id}`}
            style={{
              padding: '8px 16px',
              background: '#c9a050',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            📄 Download PDF
          </a>
          <button
            onClick={handleDelete}
            style={{
              padding: '8px 16px',
              background: '#fff',
              color: '#e11d48',
              border: '1px solid #e11d48',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>{success}</div>
      )}

      <form onSubmit={handleSave}>
        {/* Status Badge */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Status</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }}
            >
              <option value="draft">📄 Draft</option>
              <option value="sent">📨 Sent</option>
              <option value="accepted">✅ Accepted</option>
              <option value="rejected">❌ Rejected</option>
            </select>
            {status === 'sent' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 2, fontSize: 12, color: '#666' }}>Sent Date</label>
                  <input
                    type="datetime-local"
                    value={sentAt ? sentAt.slice(0, 16) : ''}
                    onChange={e => setSentAt(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 2, fontSize: 12, color: '#666' }}>Sent Via</label>
                  <select
                    value={sentVia}
                    onChange={e => setSentVia(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="in-person">In-Person</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Client Information */}
        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Client Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Customer Name *</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Contact Number *</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Project Type</label>
              <select value={projectType} onChange={e => setProjectType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="home">Home</option>
                <option value="condo">Condo</option>
                <option value="restaurant">Restaurant</option>
                <option value="hotel">Hotel</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Delivery Location</label>
              <input type="text" value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Items</h2>
          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', fontSize: 14 }}>No items in this quotation.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 30 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', minWidth: 180 }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', width: 90 }}>Material</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', width: 80 }}>Dimensions</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', width: 70 }}>Color</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 45 }}>QTY</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Unit Cost</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 55 }}>Disc %</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Disc Cost</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.key} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ textAlign: 'center', padding: '6px' }}>{item.itemNumber}</td>
                      <td style={{ padding: '6px' }}>
                        <input type="text" value={item.description} onChange={e => updateItem(item.key, 'description', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input type="text" value={item.material || ''} onChange={e => updateItem(item.key, 'material', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input type="text" value={item.dimensions || ''} onChange={e => updateItem(item.key, 'dimensions', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input type="text" value={item.color || ''} onChange={e => updateItem(item.key, 'color', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.key, 'quantity', parseInt(e.target.value) || 1)}
                          style={{ width: 45, padding: '4px 4px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input type="number" min={0} step={0.01} value={item.unitCost} onChange={e => updateItem(item.key, 'unitCost', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }} />
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <input type="number" min={0} max={100} value={item.discountPercent} onChange={e => updateItem(item.key, 'discountPercent', parseFloat(e.target.value) || 0)}
                          style={{ width: 50, padding: '4px 4px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'center' }} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>
                        ₱{item.discountedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>
                        ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px' }}>
                        <button type="button" onClick={() => removeItem(item.key)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 16, padding: 0 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #ddd' }}>
                    <td colSpan={8} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Subtotal:</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 13 }}>Shipping / Handling:</td>
                    <td style={{ padding: '6px 6px' }}>
                      <input type="number" min={0} step={0.01} value={shippingCost} onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                        style={{ width: '100%', padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, textAlign: 'right', boxSizing: 'border-box' }} />
                    </td>
                    <td></td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #222' }}>
                    <td colSpan={8} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, fontSize: 16 }}>Grand Total:</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, fontSize: 16 }}>₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Validity & Internal Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Validity</h3>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Valid Until</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }} />
            </div>
          </div>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Internal Notes</h3>
            <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={4}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              placeholder="Notes for internal team..." />
          </div>
        </div>

        {/* Terms & Conditions (collapsible summary) */}
        <details style={{ marginBottom: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 16, padding: '8px 0' }}>
            Terms & Conditions
          </summary>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginTop: 12 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                ['deliveryLeadtime', 'Delivery Leadtime'],
                ['paymentTerms', 'Payment Terms'],
                ['warranty', 'Warranty'],
                ['bankDetails', 'Bank Details (Eastwest Bank)'],
                ['cancellationPolicy', 'Cancellation Policy'],
                ['returnPolicy', 'Return Policy'],
                ['rejectionOfItems', 'Rejection of Items'],
                ['refundPolicy', 'Refund Policy'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>{label}</label>
                  <textarea
                    value={terms[field] || ''}
                    onChange={e => updateTerm(field, e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, paddingBottom: 40 }}>
          <Link href="/admin/quotations"
            style={{ padding: '10px 24px', background: '#f5f5f5', color: '#222', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
            &larr; Back
          </Link>
          <button type="submit" disabled={saving}
            style={{
              padding: '10px 32px', background: saving ? '#999' : '#222', color: '#fff', border: 'none',
              borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  )
}
