'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { addToQuoteCart } from '@/components/QuoteCart'
import RfqAttachments from '@/components/rfq/RfqAttachments'

interface RFQItem {
  id: string
  productId?: number | null
  productSlug?: string | null
  productTitleSnapshot?: string
  skuSnapshot?: string
  unitPriceSnapshot?: number
  quantity: number
}

interface RFQDetail {
  id: string
  customerName: string
  email?: string
  phone?: string
  deliveryLocation?: string
  projectType?: string
  notes?: string
  items?: RFQItem[]
  estimatedTotal: number
  status: string
  quotationSentAt?: string
  quotationSentVia?: string
  quotationNotes?: string
  closedAt?: string
  closedReason?: string
  createdAt: string
  updatedAt: string
  customer?: string
  archivedAt?: string | null
  autoArchiveDeadline?: string | null
  extensionStatus?: 'none' | 'requested' | 'approved' | 'denied'
  extensionReason?: string | null
  extensionApprovedUntil?: string | null
}

// rfq_requests.status enum has exactly 5 values: new, contacted, quoted,
// closed, lost — 'quotation_sent'/'closed_won'/'closed_lost' never existed
// in the DB and could never match a real row.
const STATUS_DETAILS: Record<string, { label: string; color: string; description: string }> = {
  new:       { label: '🟡 New',       color: '#f0ad4e', description: 'Your request has been received and is pending review.' },
  contacted: { label: '🔵 Contacted', color: '#5bc0de', description: 'Our team has reached out to discuss your requirements.' },
  quoted:    { label: '🟣 Quoted',    color: '#9b59b6', description: 'A quotation is being prepared for you — check below once it is ready.' },
  closed:    { label: '✅ Closed',    color: '#2ecc71', description: 'This request has been completed. Thank you!' },
  lost:      { label: '❌ Closed (Not Pursued)', color: '#e74c3c', description: 'This request has been closed.' },
}

export default function RFQDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [rfq, setRfq] = useState<RFQDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [extensionReason, setExtensionReason] = useState('')
  const [requestingExtension, setRequestingExtension] = useState(false)
  const [extensionMsg, setExtensionMsg] = useState('')

  useEffect(() => {
    async function loadRFQ() {
      try {
        // First verify customer is logged in
        const meRes = await fetch('/api/customers/me', { credentials: 'include' })
        if (!meRes.ok) {
          router.push('/login')
          return
        }

        const id = params?.id
        if (!id) throw new Error('RFQ ID not found')

        const res = await fetch(`/api/rfq-requests/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load RFQ details')

        const data = await res.json()
        setRfq(data)
        // Mark as seen so the dashboard's "new message" badge clears —
        // chat has no per-customer read tracking in the DB, so this is a
        // simple local timestamp the dashboard compares against last_message_at.
        window.localStorage.setItem(`homeu_rfq_seen_${id}`, String(Date.now()))
      } catch (err: any) {
        setError(err.message || 'Failed to load RFQ')
      } finally {
        setLoading(false)
      }
    }

    loadRFQ()
  }, [params?.id, router])

  // Dynamic import of RfqChatContainer — declared before early returns to
  // comply with React's Rules of Hooks (all hooks must be called in the same
  // order on every render, so they cannot be placed after if/return).
  const [ChatComponent, setChatComponent] = useState<any>(null)

  useEffect(() => {
    import('@/components/rfq-chat/RfqChatContainer').then(mod => {
      setChatComponent(() => mod.default)
    }).catch(() => {})
  }, [])

  if (loading) {
    return (
      <main style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading RFQ details...</p>
      </main>
    )
  }

  if (error || !rfq) {
    return (
      <main style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#c00', padding: '16px', borderRadius: 6 }}>
          {error || 'RFQ not found'}
        </div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/customer/dashboard" style={{ color: '#666' }}>
            &larr; Back to Dashboard
          </Link>
        </p>
      </main>
    )
  }

  const statusInfo = STATUS_DETAILS[rfq.status] || { label: rfq.status, color: '#999', description: '' }
  const totalItems = rfq.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  const daysUntilArchive = rfq.autoArchiveDeadline
    ? Math.ceil((new Date(rfq.autoArchiveDeadline).getTime() - Date.now()) / 86400000)
    : null
  const showArchiveCountdown = rfq.status === 'new' && !rfq.archivedAt && daysUntilArchive !== null && daysUntilArchive <= 7

  async function requestExtension() {
    setRequestingExtension(true)
    setExtensionMsg('')
    try {
      const res = await fetch(`/api/rfq-requests/${rfq!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'request_extension', reason: extensionReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to request extension')
      setRfq(prev => prev ? { ...prev, extensionStatus: 'requested' } : prev)
      setExtensionMsg('Extension requested — our team will review it shortly.')
    } catch (err: any) {
      setExtensionMsg(err.message || 'Failed to request extension')
    } finally {
      setRequestingExtension(false)
    }
  }

  function reorderItems() {
    const items = rfq?.items || []
    let added = 0
    for (const item of items) {
      if (!item.productId) continue
      addToQuoteCart({
        productId: String(item.productId),
        title: item.productTitleSnapshot || 'Product',
        sku: item.skuSnapshot,
        price: item.unitPriceSnapshot || undefined,
        slug: item.productSlug || undefined,
        quantity: item.quantity,
      })
      added++
    }
    if (added > 0) router.push('/quote-cart')
  }

  return (
    <main style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/customer/dashboard" style={{ color: '#666' }}>Dashboard</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#222', fontWeight: 600 }}>RFQ #{String(rfq.id).slice(-6).toUpperCase()}</span>
      </div>

      {/* ── Chat Messages Section ── */}
      <div style={{ marginBottom: 32 }}>
        {ChatComponent ? (
          <ChatComponent rfqId={rfq.id} isAdmin={false} />
        ) : (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#999',
            fontSize: 14,
            border: '1px solid #eee',
            borderRadius: 8,
          }}>
            Loading messages...
          </div>
        )}
      </div>

      {/* Status Header */}
      <div style={{
        background: statusInfo.color + '15',
        border: `1px solid ${statusInfo.color}40`,
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {statusInfo.label}
        </div>
        <p style={{ color: '#555', margin: 0, fontSize: 14 }}>{statusInfo.description}</p>
      </div>

      {/* Archived notice */}
      {rfq.archivedAt && (
        <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <strong>This request was archived</strong>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#666' }}>
            We didn&apos;t hear back in time to keep this request active, so it was automatically archived on{' '}
            {new Date(rfq.archivedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}.
            Need to revisit it? Just message us below or submit a new request.
          </p>
        </div>
      )}

      {/* Auto-archive countdown + extension request */}
      {showArchiveCountdown && (
        <div style={{ background: '#fffbf0', border: '1px solid #f0d999', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <strong>
            {daysUntilArchive! <= 0
              ? 'This request will be archived very soon'
              : `This request will auto-archive in ${daysUntilArchive} day${daysUntilArchive !== 1 ? 's' : ''}`}
          </strong>
          <p style={{ margin: '4px 0 12px', fontSize: 14, color: '#666' }}>
            We haven&apos;t responded yet — requests with no activity for 30 days are archived automatically.
            Need more time? Ask us for an extension.
          </p>
          {rfq.extensionStatus === 'requested' ? (
            <p style={{ fontSize: 13, color: '#8a6d1f', margin: 0 }}>⏳ Extension requested — awaiting approval.</p>
          ) : rfq.extensionStatus === 'denied' ? (
            <p style={{ fontSize: 13, color: '#c62828', margin: 0 }}>Your extension request was declined.</p>
          ) : (
            <>
              <textarea
                value={extensionReason}
                onChange={e => setExtensionReason(e.target.value)}
                placeholder="Optional: let us know why you need more time"
                rows={2}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={requestExtension}
                disabled={requestingExtension}
                style={{ padding: '8px 18px', background: '#b88935', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: requestingExtension ? 'not-allowed' : 'pointer' }}
              >
                {requestingExtension ? 'Requesting…' : 'Request Extension'}
              </button>
              {extensionMsg && <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>{extensionMsg}</p>}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Project Files */}
        <RfqAttachments rfqId={String(rfq.id)} />

        {/* RFQ Info */}
        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Request Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
            <div><strong>Date Submitted:</strong> {new Date(rfq.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Project Type:</strong> {rfq.projectType || 'Not specified'}</div>
            <div><strong>Delivery Location:</strong> {rfq.deliveryLocation || 'Not specified'}</div>
            <div><strong>Total Items:</strong> {totalItems}</div>
          </div>
        </div>

        {/* Requested Items */}
        {rfq.items && rfq.items.length > 0 && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Requested Items</h2>
              {rfq.items.some(i => i.productId) && (
                <button onClick={reorderItems} style={{
                  padding: '8px 16px', background: '#151a17', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  🔁 Request Similar Quote
                </button>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Product</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px' }}>SKU</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {rfq.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px' }}>{item.productTitleSnapshot || 'Product'}</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px', color: '#666' }}>{item.skuSnapshot || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                      {item.unitPriceSnapshot ? `₱${item.unitPriceSnapshot.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rfq.estimatedTotal > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid #ddd' }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>Estimated Total:</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700 }}>
                      ₱{rfq.estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Quotation Info (shown when quotation is sent) */}
        {Boolean(rfq.quotationSentAt) && (
          <div style={{
            background: '#e8f5e9',
            border: '1px solid #a5d6a7',
            borderRadius: 8,
            padding: 20,
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, color: '#2e7d32' }}>📄 Quotation Sent</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
              {rfq.quotationSentAt && (
                <div><strong>Sent Date:</strong> {new Date(rfq.quotationSentAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              )}
              {rfq.quotationSentVia && (
                <div><strong>Sent Via:</strong> {rfq.quotationSentVia}</div>
              )}
            </div>
            {rfq.quotationNotes && (
              <div style={{ marginTop: 12, fontSize: 14 }}>
                <strong>Notes:</strong>
                <p style={{ margin: '4px 0 0', color: '#555', whiteSpace: 'pre-wrap' }}>{rfq.quotationNotes}</p>
              </div>
            )}
            <div style={{ marginTop: 16, fontSize: 13, color: '#555' }}>
              Please check your email for the full quotation. You may also contact our team for any questions.
            </div>
          </div>
        )}

        {/* Closed Info */}
        {rfq.status === 'lost' && (
          <div style={{
            background: '#fbe9e7',
            border: '1px solid #ef9a9a',
            borderRadius: 8,
            padding: 20,
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#c62828' }}>Request Closed</h2>
            {rfq.closedAt && (
              <div style={{ fontSize: 14 }}><strong>Closed Date:</strong> {new Date(rfq.closedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            )}
            {rfq.closedReason && (
              <div style={{ marginTop: 8, fontSize: 14 }}>
                <strong>Reason:</strong>
                <p style={{ margin: '4px 0 0', color: '#555' }}>{rfq.closedReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Customer Notes */}
        {rfq.notes && (
          <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Your Notes</h2>
            <p style={{ fontSize: 14, color: '#555', margin: 0, whiteSpace: 'pre-wrap' }}>{rfq.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
        <Link
          href="/customer/dashboard"
          style={{
            padding: '10px 24px',
            background: '#f5f5f5',
            color: '#222',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          &larr; Back to Dashboard
        </Link>
        <Link
          href="/products"
          style={{
            padding: '10px 24px',
            background: '#222',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          Browse Products
        </Link>
      </div>
    </main>
  )
}
