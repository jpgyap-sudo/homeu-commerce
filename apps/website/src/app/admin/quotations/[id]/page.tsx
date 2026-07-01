'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { extractMaterialsFromDescription, extractDimensionsFromDescription } from '@/lib/format-utils'
import QuotationRevisionWorkspace from '@/components/admin/QuotationRevisionWorkspace'

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


interface QuotationItem {
  id: string
  itemNumber: number
  product?: string | { id: string }
  description: string
  material?: string
  dimensions?: string
  color?: string
  imageUrl?: string
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
  guestToken?: string
  pending_revision?: boolean
  revision_request?: string
}

function computeDiscountedCost(unitCost: number, discountPercent: number): number {
  return Math.round(unitCost * (1 - discountPercent / 100) * 100) / 100
}

function computeTotal(discountedCost: number, quantity: number): number {
  return Math.round(discountedCost * quantity * 100) / 100
}

function storefrontBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || ''
  if (configured && !configured.includes('admin.homeatelier.ph')) {
    return configured.replace(/\/$/, '')
  }
  return 'https://store.homeatelier.ph'
}

function quotationPublicUrl(id: string, token?: string): string {
  const suffix = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${storefrontBaseUrl()}/quotation/${id}${suffix}`
}

export default function EditQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Per-quotation theme overrides (on top of the global Quotation Theme Builder)
  const [themeOverrides, setThemeOverrides] = useState<Record<string, any>>({})
  const [savingOverrides, setSavingOverrides] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState('')

  // Product Picker state
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Versions state
  const [versions, setVersions] = useState<any[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0)
  const grandTotal = Math.round((subtotal + shippingCost) * 100) / 100

  // Load products when picker is opened or search changes
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
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoadingProducts(false)
    }
  }

  function handleSelectProduct(product: Product) {
    const newItem = {
      key: `item-${Date.now()}`,
      id: `item-${Date.now()}`,
      itemNumber: items.length + 1,
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
      total: computeTotal(computeDiscountedCost(product.salePrice || product.price || 0, 0), 1),
    }
    setItems(prev => [...prev, newItem])
    setShowProductPicker(false)
    setProductSearch('')
  }

  useEffect(() => {
    async function loadQuotationAndVersions() {
      try {
        const id = params?.id
        if (!id) throw new Error('Quotation ID not found')

        setLoadingVersions(true)
        const [qRes, vRes] = await Promise.all([
          fetch(`/api/quotations/${id}`, { credentials: 'include' }),
          fetch(`/api/quotations/${id}/versions`, { credentials: 'include' })
        ])

        if (!qRes.ok) throw new Error('Failed to load quotation')
        const data: QuotationData = await qRes.json()
        setQuotation(data)
        populateForm(data)

        if (vRes.ok) {
          const vData = await vRes.json()
          setVersions(vData.versions || [])
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load quotation data')
      } finally {
        setLoading(false)
        setLoadingVersions(false)
      }
    }

    loadQuotationAndVersions()
  }, [params?.id])

  // Jump straight to the revision workspace when arriving from the list
  // page's "Revise" badge (?focus=revision), instead of landing at the top
  // of this long page.
  useEffect(() => {
    if (loading || searchParams?.get('focus') !== 'revision') return
    const el = document.getElementById('revision-workspace')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, searchParams])

  useEffect(() => {
    const id = params?.id
    if (!id) return
    let cancelled = false
    fetch(`/api/admin/quotations/${id}/theme-override`, { credentials: 'include' })
      .then(res => (res.ok ? res.json() : {}))
      .then(data => { if (!cancelled) setThemeOverrides(data || {}) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [params?.id])

  async function saveThemeOverrides() {
    const id = params?.id
    if (!id) return
    setSavingOverrides(true)
    setOverrideStatus('')
    try {
      const res = await fetch(`/api/admin/quotations/${id}/theme-override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(themeOverrides),
      })
      if (!res.ok) throw new Error('Failed to save overrides')
      setOverrideStatus('Saved')
      setTimeout(() => setOverrideStatus(''), 2200)
    } catch (err: any) {
      setOverrideStatus(err.message || 'Failed to save overrides')
    } finally {
      setSavingOverrides(false)
    }
  }

  const handleResolveRevision = useCallback(async (updatedItems: any[], message: string) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const id = params?.id
      if (!id) throw new Error('Quotation ID not found')

      // Update items + resolve revision + set status to 'revised'
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedItems,
          resolveRevision: true,
          status: 'revised',
          revisionNote: message,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to resolve revision')
      }

      setSuccess('Revision resolved! Customer can now review the updated quotation.')
      
      // Reload details and versions
      const [updatedRes, verRes] = await Promise.all([
        fetch(`/api/quotations/${id}`, { credentials: 'include' }),
        fetch(`/api/quotations/${id}/versions`, { credentials: 'include' })
      ])
      
      if (updatedRes.ok) {
        const data = await updatedRes.json()
        setQuotation(data)
        populateForm(data)
      }
      if (verRes.ok) {
        const vData = await verRes.json()
        setVersions(vData.versions || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resolve revision')
    } finally {
      setSaving(false)
    }
  }, [params?.id])

  const handleRejectRevision = useCallback(async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const id = params?.id
      if (!id) throw new Error('Quotation ID not found')

      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolveRevision: true }),
      })

      if (!res.ok) throw new Error('Failed to reject revision')

      setSuccess('Revision rejected. Kept current version.')
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to reject revision')
    } finally {
      setSaving(false)
    }
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
    let validUntilStr = ''
    if (data.validUntil) {
      if (typeof data.validUntil === 'string') {
        validUntilStr = data.validUntil.split('T')[0]
      } else {
        try {
          validUntilStr = new Date(data.validUntil).toISOString().split('T')[0]
        } catch {
          // ignore
        }
      }
    }
    setValidUntil(validUntilStr)
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
    if (saving) return
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
        validUntil: validUntil || null,
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

  function handleCopyLink() {
    if (!quotation) return
    const guestUrl = quotationPublicUrl(quotation.id, quotation.guestToken)
    navigator.clipboard.writeText(guestUrl)
    setSuccess('Client quotation link copied to clipboard!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleSend() {
    if (!email || !email.trim()) {
      setError('Client email address is required to send the quotation.')
      return
    }
    const isResend = status === 'sent'
    if (!confirm(`${isResend ? 'Resend' : 'Send'} quotation #${quotation?.quotationNumber || ''} to client email (${email})?`)) return
    
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const id = params?.id
      if (!id) throw new Error('Quotation ID not found')

      // ── Auto-save current form state before sending ──
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
        validUntil: validUntil || null,
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

      const saveRes = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationUpdate),
      })

      if (!saveRes.ok) {
        const saveErrData = await saveRes.json()
        throw new Error(saveErrData.error || 'Failed to save changes before sending')
      }

      // ── Now proceed with sending email ──
      const guestUrl = quotationPublicUrl(String(id), quotation?.guestToken)
      const emailBody = `Dear ${customerName},

Thank you for choosing Home Atelier. We have prepared your quotation #${quotation?.quotationNumber || ''} for your review.

You can view the full details and respond to this quotation online at:
${guestUrl}

You can also view this quotation directly in your customer account dashboard:
${storefrontBaseUrl()}/customer/dashboard

If you have any questions or would like to request revisions, please let us know.

Best regards,
Home Atelier Team`

      const emailRes = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          subject: `Quotation #${quotation?.quotationNumber || ''} from Home Atelier`,
          body: emailBody,
        }),
      })

      if (!emailRes.ok) {
        const emailErr = await emailRes.json()
        throw new Error(emailErr.error || 'Failed to send email to client')
      }
      const emailData = await emailRes.json()
      if (!emailData.sent) {
        throw new Error(emailData.note || 'Email was not sent. Check SMTP settings before marking this quotation as sent.')
      }

      // 2. Update status and log send info in db
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentVia: 'email',
        }),
      })

      if (!res.ok) throw new Error('Failed to update quotation status to Sent')

      let msg = `Quotation saved and sent successfully via email to ${email}!`
      if (emailData.note && emailData.note.includes('saved locally')) {
        msg = `Quotation changes saved and status updated to Sent! (SMTP is not configured, so the email was saved to the inbox locally for simulation)`
      }

      setSuccess(msg)
      setStatus('sent')
      const newSentAt = new Date().toISOString()
      setSentAt(newSentAt)
      setSentVia('email')

      // Reload details and versions
      const [updatedRes, verRes] = await Promise.all([
        fetch(`/api/quotations/${id}`, { credentials: 'include' }),
        fetch(`/api/quotations/${id}/versions`, { credentials: 'include' })
      ])
      
      if (updatedRes.ok) {
        const data = await updatedRes.json()
        setQuotation(data)
      }
      if (verRes.ok) {
        const vData = await verRes.json()
        setVersions(vData.versions || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send')
    } finally {
      setSaving(false)
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

  const clientPreviewHref = quotation?.guestToken
    ? quotationPublicUrl(quotation.id, quotation.guestToken)
    : quotation ? quotationPublicUrl(quotation.id) : storefrontBaseUrl()
  const pdfPreviewHref = `/api/admin/quotations/pdf/${quotation?.id}?preview=1`

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
            href={clientPreviewHref}
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
          <a
            href={pdfPreviewHref}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '8px 16px',
              background: '#fff',
              color: '#222',
              border: '1px solid #c9a050',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            PDF Preview
          </a>
          {(status === 'draft' || status === 'sent') && (
            <button
              type="button"
              onClick={handleSend}
              disabled={saving}
              style={{
                padding: '8px 16px',
                background: '#0066cc',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Sending...' : status === 'sent' ? '📨 Resend Email' : '📨 Send to Client'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              padding: '8px 16px',
              background: '#fff',
              color: '#222',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            🔗 Copy Client Link
          </button>
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
            type="button"
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

      {quotation?.pending_revision && quotation?.revision_request && (
        <QuotationRevisionWorkspace
          quotationId={quotation.id}
          items={items.length > 0 ? items : (quotation.items || []).map((item: any) => ({
            title: item.description || item.productTitle || `Item ${item.itemNumber}`,
            sku: item.sku || '',
            quantity: item.quantity || 1,
            unitCost: item.unitCost || 0,
            discountPercent: item.discountPercent || 0,
            total: item.total || 0,
          }))}
          revisionRequest={quotation.revision_request}
          onResolve={handleResolveRevision}
          onReject={handleRejectRevision}
        />
      )}

      {rfqId && (
        <div style={{ display: 'inline-block', background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 16 }}>
          ✓ Linked to RFQ: <Link href={`/admin/rfq/${rfqId}`} style={{ color: '#0066cc', fontWeight: 600 }}>View RFQ Details</Link>
        </div>
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
                fontWeight: 600,
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
                        textAlign: 'left',
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
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee', flexShrink: 0 }} />
                          )}
                          <input type="text" value={item.description} onChange={e => updateItem(item.key, 'description', e.target.value)}
                            style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
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

        {/* PDF theme overrides — for this quotation only, on top of the global Quotation Theme Builder */}
        <details style={{ marginBottom: 24, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
          <summary style={{ fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>PDF theme overrides for this quotation</summary>
          <p style={{ color: '#777', fontSize: 13, margin: '10px 0 16px' }}>
            Overrides apply only to this quotation&apos;s PDF, on top of the global{' '}
            <Link href="/admin/theme/quotation" style={{ color: '#0066cc' }}>Quotation Theme Builder</Link> settings. Leave blank/off to use the global default.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={themeOverrides.showWatermark === false}
                onChange={e => setThemeOverrides(prev => ({ ...prev, showWatermark: e.target.checked ? false : undefined }))}
              />
              Force-hide watermark for this quotation
            </label>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Footer text override</label>
              <input
                type="text"
                value={themeOverrides.footerText || ''}
                onChange={e => setThemeOverrides(prev => ({ ...prev, footerText: e.target.value || undefined }))}
                placeholder="Leave blank to use the global footer text"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={saveThemeOverrides}
              disabled={savingOverrides}
              style={{ background: '#222', color: '#fff', border: 0, borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {savingOverrides ? 'Saving…' : 'Save overrides'}
            </button>
            {overrideStatus && <span style={{ fontSize: 12, color: overrideStatus === 'Saved' ? '#17693a' : '#8a5a00', fontWeight: 700 }}>{overrideStatus}</span>}
          </div>
        </details>

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

        {/* Version History (collapsible summary) */}
        <details style={{ marginBottom: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 16, padding: '8px 0', userSelect: 'none' }}>
            📜 Version History & Changelog ({versions.length})
          </summary>
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginTop: 12 }}>
            {loadingVersions ? (
              <p style={{ fontSize: 13, color: '#666' }}>Loading version history...</p>
            ) : versions.length === 0 ? (
              <p style={{ fontSize: 13, color: '#999', margin: 0 }}>No version history recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {versions.map((ver: any) => (
                  <div key={ver.id} style={{ borderBottom: '1px solid #eef1ed', paddingBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>Version #{ver.version_number}</strong>
                      <span style={{ fontSize: 12, color: '#666' }}>
                        {new Date(ver.created_at).toLocaleString('en-PH')} by {ver.created_by}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: ver.revision_type === 'customer_revision' ? '#fff3cd' : ver.revision_type === 'initial' ? '#e8f2ec' : '#e0f2fe',
                        color: ver.revision_type === 'customer_revision' ? '#856404' : ver.revision_type === 'initial' ? '#1a6d3e' : '#0369a1',
                        marginRight: 8,
                        textTransform: 'capitalize'
                      }}>
                        {ver.revision_type ? ver.revision_type.replace('_', ' ') : 'edit'}
                      </span>
                      {ver.revision_message && (
                        <span style={{ fontStyle: 'italic', color: '#555' }}>
                          &ldquo;{ver.revision_message}&rdquo;
                        </span>
                      )}
                    </div>
                    {ver.changelog && Array.isArray(ver.changelog) && ver.changelog.length > 0 && (
                      <ul style={{ margin: '4px 0 0 20px', padding: 0, fontSize: 12, color: '#666' }}>
                        {ver.changelog.map((c: any, idx: number) => (
                          <li key={idx} style={{ marginBottom: 2 }}>
                            <strong>{c.label}:</strong> {c.from} &rarr; {c.to}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
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
