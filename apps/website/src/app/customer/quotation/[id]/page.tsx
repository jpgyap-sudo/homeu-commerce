'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import QuotationRevisionButtons from '@/components/QuotationRevisionButtons'
import QuotationRevisionSummary from '@/components/QuotationRevisionSummary'
import QuotationVersionCompare from '@/components/QuotationVersionCompare'
import QuotationRevisionChat from '@/components/QuotationRevisionChat'
import QuotationTimeline from '@/components/QuotationTimeline'
import type { RevisionAction } from '@/components/QuotationRevisionButtons'

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
  const [summaryActions, setSummaryActions] = useState<Array<{ id: string; itemIndex: number; itemTitle: string; actionType: string; description: string }>>([])
  const [versions, setVersions] = useState<any[]>([])
  const [showVersionCompare, setShowVersionCompare] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')

  // Load version history for timeline + compare
  useEffect(() => {
    if (!quotation?.id) return
    fetch(`/api/quotations/${quotation.id}/versions`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.versions)) setVersions(data.versions)
        else if (Array.isArray(data)) setVersions(data)
      })
      .catch(() => {})
  }, [quotation?.id])

  const handleRevisionAction = useCallback((action: RevisionAction) => {
    const item = quotation?.items?.[action.itemIndex]
    const title = item?.description || `Item #${action.itemIndex + 1}`

    let description = ''
    switch (action.actionType) {
      case 'remove': description = `Remove: ${title}`; break
      case 'change_qty': description = `Change qty: ${title} → ${action.payload.newQty || '?'}`; break
      case 'change_finish': description = `Change finish: ${title} → ${action.payload.finish || 'custom'}`; break
      case 'swap': description = `Swap: ${title}`; break
      case 'lower_price': description = `Lower price: ${title}`; break
      case 'lead_time': description = `Lead time: ${title}`; break
      default: description = `Change: ${title}`
    }

    setSummaryActions(prev => [...prev, {
      id: `action-${Date.now()}-${Math.random()}`,
      itemIndex: action.itemIndex,
      itemTitle: title,
      actionType: action.actionType,
      description,
    }])
  }, [quotation])

  const handleSendRevision = useCallback(async (freeText: string) => {
    if (!quotation) return
    setActionLoading(true)
    setActionMsg('')
    try {
      // Build the revision message from structured actions + free text
      const actionLines = summaryActions.map(a => a.description).join('\n')
      const fullMessage = [actionLines, freeText].filter(Boolean).join('\n\n')
      if (!fullMessage.trim()) {
        setActionMsg('❌ Please add at least one change or type a message.')
        setActionLoading(false)
        return
      }

      // Save revision items
      if (summaryActions.length > 0) {
        await fetch(`/api/quotations/${quotation.id}/revision-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: summaryActions.map(a => ({
              itemIndex: a.itemIndex,
              actionType: a.actionType,
              payload: {},
            })),
          }),
        })
      }

      const res = await fetch(`/api/quotations/${quotation.id}/revision-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullMessage.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send revision request')
      setActionMsg('✅ Revision request sent! The team will review and update your quotation.')
      setShowRevise(false)
      setSummaryActions([])
      setQuotation(prev => prev ? { ...prev, pending_revision: true, revision_request: fullMessage.trim() } : prev)
    } catch (err: any) {
      setActionMsg('❌ ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }, [quotation, summaryActions])

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
  const isRevised = quotation.status === 'revised'

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
                {isRevised ? 'Revised Quotation Ready for Review' : quotation.pending_revision ? 'Revised Quotation Ready for Review' : 'Review Your Quotation'}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#667168' }}>
                {isRevised
                  ? 'The team has updated your quotation based on your feedback. See what changed below.'
                  : quotation.pending_revision
                    ? 'The team is reviewing your revision request.'
                    : 'Please review the items and pricing. If everything looks good, approve below.'}
              </p>
            </div>
          </div>

          {/* Version compare for revised status */}
          {isRevised && versions.length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowVersionCompare(!showVersionCompare)}
                style={{
                  padding: '8px 16px',
                  background: showVersionCompare ? '#1a6d3e' : '#fff',
                  color: showVersionCompare ? '#fff' : '#1a6d3e',
                  border: '1px solid #1a6d3e',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 8,
                }}
              >
                📊 {showVersionCompare ? 'Hide Changes' : 'View Changes from Previous Version'}
              </button>
              {showVersionCompare && (
                <QuotationVersionCompare
                  previous={versions[versions.length - 2]?.snapshot || null}
                  current={versions[versions.length - 1]?.snapshot || versions[0]?.snapshot || {}}
                  onClose={() => setShowVersionCompare(false)}
                />
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleApprove} disabled={actionLoading} style={{
              flex: 1, padding: '14px 24px', background: '#1a6d3e', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              ✅ {actionLoading ? 'Processing…' : 'Approve & Confirm'}
            </button>
            {!quotation.pending_revision && !isRevised && (
              <button onClick={() => setShowRevise(!showRevise)} disabled={actionLoading} style={{
                padding: '14px 24px', background: '#fff', color: '#d97706',
                border: '1.5px solid #fde68a', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                ✏️ Request Changes
              </button>
            )}
          </div>

          {/* Revision form with line-item buttons */}
          {showRevise && !quotation.pending_revision && (
            <div style={{ marginTop: 16, padding: 16, background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', margin: '0 0 8px' }}>
                What would you like to change? Click a button below any item to add a revision request.
              </p>

              {/* Line-Item Revision Buttons per item */}
              {quotation.items && quotation.items.map((item, idx) => (
                <div key={item.id || idx} style={{
                  padding: '8px 12px',
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #fde68a',
                  marginBottom: 8,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#151a17' }}>
                    #{item.itemNumber} — {item.description.substring(0, 50)}
                  </div>
                  <QuotationRevisionButtons
                    itemIndex={idx}
                    itemTitle={item.description || `Item #${item.itemNumber || idx + 1}`}
                    onAction={handleRevisionAction}
                    disabled={actionLoading}
                  />
                </div>
              ))}

              {/* Revision Summary Tray */}
              <QuotationRevisionSummary
                actions={summaryActions}
                onRemove={(id) => setSummaryActions(prev => prev.filter(a => a.id !== id))}
                onClear={() => setSummaryActions([])}
                onSend={(freeText) => handleSendRevision(freeText)}
                isSending={actionLoading}
              />
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
            <img
              src="https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com/uploads/661b4f02354d0a3763a4a0331fad557e312abdc19bece013a3d86bbe8582df1a.png"
              alt="Home Atelier"
              style={{ height: 80, maxWidth: 320, objectFit: 'contain', display: 'block', marginBottom: 6 }}
            />
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
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 90 }}>Unit Cost</th>
              <th style={{ textAlign: 'right', padding: '8px 6px', width: 90 }}>Total</th>
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
                <td style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 600 }}>
                  ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {(() => {
              const subtotal = quotation.subtotal || 0
              const shipping = quotation.shippingCost || 0
              const grand = quotation.grandTotal || 0
              const discount = Math.max(0, subtotal - (grand - shipping))
              const hasDiscount = discount > 0.005
              return (
                <>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #ddd' }}>Subtotal:</td>
                    <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600, borderTop: '2px solid #ddd' }}>
                      ₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {hasDiscount && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#c00' }}>Discount:</td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#c00' }}>
                        −₱{discount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {shipping > 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#555' }}>Shipping / Handling:</td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '6px 12px', fontSize: 12, color: '#555' }}>
                        ₱{shipping.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, fontSize: 16, borderTop: '3px double #222' }}>Grand Total:</td>
                    <td colSpan={2} style={{ textAlign: 'right', padding: '12px 12px', fontWeight: 700, fontSize: 16, borderTop: '3px double #222' }}>
                      ₱{grand.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              )
            })()}
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

      {/* ── Timeline ── */}
      {versions.length > 0 && (
        <QuotationTimeline
          versions={versions}
          currentStatus={quotation.status}
          hasPendingRevision={!!quotation.pending_revision}
        />
      )}

      {/* ── Revision Chat ── */}
      <QuotationRevisionChat quotationId={quotation.id} />

      {/* ── Pending Revision Banner ── */}
      {quotation.pending_revision && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
          padding: 16, marginTop: 24, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>🔄</span>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#854d0e' }}>Revision Requested</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#854d0e' }}>
              The HomeU team is reviewing your revision request. They will update the quotation and notify you.
            </p>
            {quotation.revision_request && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#333', fontStyle: 'italic' }}>
                Your message: &ldquo;{quotation.revision_request}&rdquo;
              </p>
            )}
          </div>
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
