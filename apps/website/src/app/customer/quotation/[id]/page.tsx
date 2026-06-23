'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuotationItem {
  id: string
  itemNumber: number
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
  items?: QuotationItem[]
  subtotal: number
  shippingCost: number
  grandTotal: number
  validUntil?: string
  status: string
  sentAt?: string
  createdAt: string
  termsDeliveryLeadtime?: string
  termsPaymentTerms?: string
  termsWarranty?: string
  pending_revision?: boolean
  revision_request?: string
  termsBankDetails?: string
  termsCancellationPolicy?: string
  termsReturnPolicy?: string
  termsRejectionOfItems?: string
  termsRefundPolicy?: string
}

export default function CustomerQuotationPage() {
  const params = useParams()
  const router = useRouter()
  const [quotation, setQuotation] = useState<QuotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadQuotation() {
      try {
        // Verify logged in
        const meRes = await fetch('/api/customers/me', { credentials: 'include' })
        if (!meRes.ok) {
          router.push('/login')
          return
        }

        const id = params?.id
        if (!id) throw new Error('Quotation ID not found')

        const res = await fetch(`/api/quotations/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Quotation not found')

        const data = await res.json()
        setQuotation(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    }

    loadQuotation()
  }, [params?.id, router])

  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [showRevise, setShowRevise] = useState(false)
  const [reviseText, setReviseText] = useState('')
  const [reviseItems, setReviseItems] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading quotation...</p>
      </main>
    )
  }

  if (error || !quotation) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#c00', padding: '16px', borderRadius: 6 }}>{error || 'Quotation not found'}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/customer/dashboard" style={{ color: '#666' }}>&larr; Back to Dashboard</Link>
        </p>
      </main>
    )
  }

  async function handleApprove() {
    if (!quotation) return
    setActionLoading(true); setActionMsg('')
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      const data = await res.json()
      setQuotation(data)
      setActionMsg('✅ Quotation approved! We\'ll start preparing your order.')
    } catch (err: any) { setActionMsg('❌ ' + err.message) }
    finally { setActionLoading(false) }
  }

  async function handleRevise() {
    if (!quotation) return
    if (!reviseText.trim()) return
    setActionLoading(true); setActionMsg('')
    try {
      const res = await fetch(`/api/quotations/${quotation.id}/revision-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: reviseText.trim(),
          items: [...reviseItems],
        }),
      })
      if (!res.ok) throw new Error('Failed to send revision request')
      setActionMsg('✅ Revision request sent! The team will review and update your quotation.')
      setShowRevise(false)
      setQuotation(prev => prev ? { ...prev, pending_revision: true, revision_request: reviseText.trim() } : prev)
    } catch (err: any) { setActionMsg('❌ ' + err.message) }
    finally { setActionLoading(false) }
  }

  const canAct = quotation.status === 'sent' || quotation.status === 'revised'

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      {/* ── Approval / Revision Action Bar ── */}
      {canAct && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24,
          border: '1px solid #e3e8e0', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: showRevise ? 16 : 0 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#e8f2ec',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>📋</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#151a17' }}>
                {quotation.pending_revision ? 'Revised Quotation Ready for Review' : 'Review Your Quotation'}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#667168' }}>
                {quotation.pending_revision
                  ? 'The team has updated your quotation based on your feedback. Please review and confirm.'
                  : `Please review the items and pricing. If everything looks good, approve below.`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleApprove} disabled={actionLoading} style={{
              flex: 1, padding: '14px 24px', background: '#1a6d3e', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              ✅ {actionLoading ? 'Processing…' : 'Approve & Confirm'}
            </button>
            <button onClick={() => setShowRevise(!showRevise)} disabled={actionLoading} style={{
              padding: '14px 24px', background: '#fff', color: '#d97706',
              border: '1.5px solid #fde68a', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              ✏️ Request Changes
            </button>
          </div>

          {/* Revision form */}
          {showRevise && (
            <div style={{ marginTop: 16, padding: 16, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', margin: '0 0 8px' }}>
                What would you like to change?
              </p>

              {/* Item-level checkboxes */}
              {quotation.items && quotation.items.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: '#92400e', margin: '0 0 6px', fontWeight: 500 }}>Select items to revise:</p>
                  {quotation.items.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12 }}>
                      <input type="checkbox" checked={reviseItems.has(item.id)} onChange={e => {
                        const next = new Set(reviseItems)
                        e.target.checked ? next.add(item.id) : next.delete(item.id)
                        setReviseItems(next)
                      }} style={{ accentColor: '#d97706' }} />
                      Item #{item.itemNumber} — {item.description.substring(0, 40)}…
                    </label>
                  ))}
                </div>
              )}

              <textarea value={reviseText} onChange={e => setReviseText(e.target.value)} rows={3}
                placeholder="E.g. Can you adjust the pricing on Item #2? I'd prefer a different finish on Item #1..."
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={handleRevise} disabled={actionLoading || !reviseText.trim()} style={{
                  padding: '10px 20px', background: '#d97706', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {actionLoading ? 'Sending…' : 'Send Revision Request'}
                </button>
                <button onClick={() => setShowRevise(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actionMsg && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: actionMsg.includes('✅') ? '#ecfdf5' : '#fef2f2', borderRadius: 8, fontSize: 13, color: actionMsg.includes('✅') ? '#065f46' : '#991b1b' }}>
              {actionMsg}
            </div>
          )}
        </div>
      )}
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/customer/dashboard" style={{ color: '#666' }}>Dashboard</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#222', fontWeight: 600 }}>Quotation {quotation.quotationNumber}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Your Quotation</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            {quotation.quotationNumber} · {new Date(quotation.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          href={`/quotation/${quotation.id}`}
          target="_blank"
          style={{
            padding: '8px 20px',
            background: '#222',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🖨 View Full & Print
        </Link>
      </div>

      {/* Company Header */}
      <div style={{
        background: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: 8,
        padding: 20,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Home Atelier</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
              56 Valencia QC · Jen Tang
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Phone: +63 2 8703 1996 · Email: sales@homeu.ph
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: quotation.status === 'accepted' ? '#27ae60' : quotation.status === 'sent' ? '#5bc0de' : '#f0ad4e',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>
              {quotation.status}
            </div>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginBottom: 24,
      }}>
        <div style={{ flex: 1, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Client Information</h3>
          <p style={{ margin: '2px 0', fontSize: 14 }}><strong>{quotation.customerName}</strong></p>
          {quotation.phone && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Phone: {quotation.phone}</p>}
          {quotation.email && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Email: {quotation.email}</p>}
        </div>
        <div style={{ flex: 1, background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Delivery Information</h3>
          {quotation.deliveryLocation && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>{quotation.deliveryLocation}</p>}
          {quotation.projectType && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Project: {quotation.projectType}</p>}
          {quotation.validUntil && !isNaN(new Date(quotation.validUntil).getTime()) && <p style={{ margin: '2px 0', fontSize: 13, color: '#555' }}>Valid Until: {new Date(quotation.validUntil).toLocaleDateString('en-PH')}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Order Details</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 40 }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 6px' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 45 }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Unit Cost</th>
              <th style={{ textAlign: 'center', padding: '8px 6px', width: 55 }}>Disc %</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Disc Cost</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 85 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items?.map((item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 600 }}>{item.itemNumber}</td>
                <td style={{ padding: '10px 6px' }}>
                  <div>{item.description}</div>
                  {(item.material || item.dimensions || item.color) && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                      {[item.material, item.dimensions, item.color].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '10px 6px' }}>
                  ₱{item.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 6px', color: '#c00' }}>
                  {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600 }}>
                  ₱{item.discountedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600 }}>
                  ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #ddd' }}>Subtotal:</td>
              <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #ddd' }}>
                ₱{(quotation.subtotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {quotation.shippingCost > 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#555' }}>Shipping / Handling:</td>
                <td colSpan={2} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#555' }}>
                  ₱{quotation.shippingCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, fontSize: 16, borderTop: '3px double #222' }}>Grand Total:</td>
              <td colSpan={2} style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, fontSize: 16, borderTop: '3px double #222' }}>
                ₱{(quotation.grandTotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Thank You */}
      <div style={{
        textAlign: 'center',
        padding: 16,
        marginBottom: 24,
        background: '#f9f9f9',
        border: '1px solid #eee',
        borderRadius: 8,
        fontStyle: 'italic',
        color: '#555',
      }}>
        Thank you for ordering your new beloved furnishing piece at Home Atelier.
      </div>

      {/* ── Revision Request Section (THE GENIUS) ── */}
      {quotation.status === 'sent' && (
        <div style={{
          background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8,
          padding: 20, marginTop: 24,
        }}>
          {quotation.pending_revision ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🔄</span>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Revision Requested</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                  The HomeU team is reviewing your revision request. They will update the quotation and notify you.
                </p>
                {quotation.revision_request && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#333', fontStyle: 'italic' }}>
                    Your message: &ldquo;{quotation.revision_request}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Need changes?</h3>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
                If you'd like to revise pricing, items, or terms, let us know what you need and we'll create an updated quotation.
              </p>
              <textarea
                id="revision-message"
                rows={3}
                placeholder="E.g. Can you adjust the pricing for Item X? We'd also like to add..."
                style={{
                  width: '100%', padding: '10px 12px', border: '1.5px solid #d9e0d7',
                  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                  marginBottom: 10, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={async () => {
                    const msg = (document.getElementById('revision-message') as HTMLTextAreaElement).value
                    if (!msg.trim()) return alert('Please enter your revision request.')
                    try {
                      const res = await fetch(`/api/quotations/${quotation.id}/revision-request`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: msg.trim() }),
                      })
                      if (res.ok) {
                        // Update state to show pending
                        setQuotation(prev => prev ? { ...prev, pending_revision: true, revision_request: msg.trim() } : prev)
                      } else {
                        const data = await res.json()
                        alert(data.error || 'Failed to submit revision request')
                      }
                    } catch {
                      alert('Failed to submit revision request. Please try again.')
                    }
                  }}
                  style={{
                    padding: '10px 24px', background: '#1a6d3e', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Request Revision
                </button>
                <a href={`mailto:sales@homeu.ph?subject=Question about Quotation ${quotation.quotationNumber}`}
                  style={{
                    padding: '10px 24px', background: '#222', color: '#fff',
                    borderRadius: 6, textDecoration: 'none', fontSize: 14, display: 'inline-flex',
                    alignItems: 'center',
                  }}>
                  ✉ Email Us
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
        <Link href="/customer/dashboard" style={{
          padding: '10px 24px', background: '#f5f5f5', color: '#222',
          borderRadius: 6, textDecoration: 'none', fontSize: 14,
        }}>
          &larr; Back to Dashboard
        </Link>
        {quotation.status !== 'accepted' && quotation.status !== 'rejected' && !quotation.pending_revision && (
          <a href={`mailto:sales@homeu.ph?subject=Question about Quotation ${quotation.quotationNumber}`}
            style={{
              padding: '10px 24px', background: '#222', color: '#fff',
              borderRadius: 6, textDecoration: 'none', fontSize: 14,
            }}>
            ✉ Reply to Quotation
          </a>
        )}
      </div>
    </main>
  )
}
