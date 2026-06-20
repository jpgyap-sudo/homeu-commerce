'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface RFQItem {
  id: string
  product_title: string
  product_id: string
  quantity: number
  reference_price: number
  notes?: string
  inspiration_image_url?: string
  accepts_alternatives?: boolean
  match_type?: string
}

interface RFQCart {
  id: string
  lead_id: string
  conversation_id?: string
  status: string
  delivery_location?: string
  project_type?: string
  target_date?: string
  budget_range?: string
  notes?: string
  estimated_total?: number
  created_at: string
  submitted_at?: string
  items?: RFQItem[]
}

interface LeadInfo {
  id: string
  name: string
  email: string
  mobile: string
  buyer_type?: string
  company_name?: string
  project_location?: string
  status?: string
  score?: number
  score_label?: string
  created_at?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '📄 Draft', color: '#f0ad4e' },
  submitted: { label: '📨 Submitted', color: '#5bc0de' },
  quoted: { label: '📋 Quoted', color: '#27ae60' },
  closed: { label: '🔒 Closed', color: '#999' },
}

export default function RFQDetailPage() {
  const params = useParams()
  const [rfq, setRfq] = useState<RFQCart | null>(null)
  const [lead, setLead] = useState<LeadInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRFQ() {
      try {
        const id = params?.id
        if (!id) throw new Error('RFQ ID not found')

        const res = await fetch(`/api/rfq?id=${id}`)
        if (!res.ok) throw new Error('Failed to load RFQ')

        const data: RFQCart = await res.json()
        setRfq(data)

        // Try loading lead info
        if (data.lead_id) {
          try {
            const leadRes = await fetch(`/api/chat/leads/lookup?leadId=${data.lead_id}`)
            if (leadRes.ok) {
              const leadData = await leadRes.json()
              setLead(leadData)
            }
          } catch {
            // Lead lookup is best-effort
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load RFQ')
      } finally {
        setLoading(false)
      }
    }

    loadRFQ()
  }, [params?.id])

  if (loading) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 150, height: 20, background: '#eee', borderRadius: 4 }} />
          <div style={{ width: 100, height: 20, background: '#eee', borderRadius: 4 }} />
        </div>
        <div style={{ width: '60%', height: 24, background: '#eee', borderRadius: 4, marginBottom: 24 }} />
        <div style={{ height: 200, background: '#f5f5f5', borderRadius: 8 }} />
        <p style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>Loading RFQ details...</p>
      </main>
    )
  }

  if (error || !rfq) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#c00', padding: '16px', borderRadius: 6 }}>
          {error || 'RFQ not found'}
        </div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/rfq" style={{ color: '#666' }}>&larr; Back to RFQs</Link>
        </p>
      </main>
    )
  }

  const statusInfo = STATUS_LABELS[rfq.status] || { label: rfq.status, color: '#999' }
  const totalItems = rfq.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  const estimatedTotal = rfq.estimated_total || rfq.items?.reduce((sum, item) => sum + (item.reference_price * item.quantity), 0) || 0

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 14 }}>
        <Link href="/admin" style={{ color: '#666' }}>Dashboard</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <Link href="/admin/rfq" style={{ color: '#666' }}>RFQs</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#222', fontWeight: 600 }}>{rfq.id?.substring(0, 8)}...</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>
            RFQ Details
            <span style={{
              marginLeft: 12,
              background: statusInfo.color + '20',
              color: statusInfo.color,
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              verticalAlign: 'middle',
            }}>
              {statusInfo.label}
            </span>
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            Submitted {rfq.submitted_at
              ? new Date(rfq.submitted_at).toLocaleString('en-PH')
              : new Date(rfq.created_at).toLocaleString('en-PH')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href={`/admin/quotations/new?rfqId=${rfq.id}`}
            style={{
              padding: '10px 24px',
              background: '#222',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + Create Quotation
          </Link>
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Customer Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div>
            <strong>Name:</strong>{' '}
            {lead?.name || '—'}
          </div>
          <div>
            <strong>Email:</strong>{' '}
            <a href={`mailto:${lead?.email}`} style={{ color: '#0066cc' }}>{lead?.email || '—'}</a>
          </div>
          <div>
            <strong>Mobile:</strong>{' '}
            {lead?.mobile || '—'}
          </div>
          <div>
            <strong>Buyer Type:</strong>{' '}
            {lead?.buyer_type || '—'}
          </div>
          <div>
            <strong>Company:</strong>{' '}
            {lead?.company_name || '—'}
          </div>
          <div>
            <strong>Lead Score:</strong>{' '}
            {lead?.score != null ? `${lead.score} (${lead.score_label || 'N/A'})` : '—'}
          </div>
        </div>
      </div>

      {/* RFQ Details */}
      <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>RFQ Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div><strong>Delivery Location:</strong> {rfq.delivery_location || '—'}</div>
          <div><strong>Project Type:</strong> {rfq.project_type || '—'}</div>
          <div><strong>Target Date:</strong> {rfq.target_date ? new Date(rfq.target_date).toLocaleDateString('en-PH') : '—'}</div>
          <div><strong>Budget Range:</strong> {rfq.budget_range || '—'}</div>
          <div><strong>Estimated Total:</strong> ₱{estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          <div><strong>Total Items:</strong> {rfq.items?.length || 0} ({totalItems} units)</div>
        </div>
        {rfq.notes && (
          <div style={{ marginTop: 12 }}>
            <strong>Notes:</strong>
            <p style={{ margin: '4px 0 0', color: '#555', whiteSpace: 'pre-wrap' }}>{rfq.notes}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Items ({rfq.items?.length || 0})</h2>
        {!rfq.items || rfq.items.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', fontSize: 14 }}>No items in this RFQ.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Product</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>Quantity</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Ref. Price</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Subtotal</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>Accepts Alt.</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rfq.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {item.product_title || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      ₱{(item.reference_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      ₱{((item.reference_price || 0) * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {item.accepts_alternatives !== false ? '✅ Yes' : '❌ No'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#666', fontSize: 13 }}>
                      {item.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #222' }}>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, fontSize: 16 }}>
                    Estimated Total:
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, fontSize: 16 }}>
                    ₱{estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Chat Section (Admin) ── */}
      <div style={{ marginTop: 32, marginBottom: 24 }}>
        {(() => {
          const ChatAdmin = React.lazy(() => import('@/components/rfq-chat/RfqChatAdminContainer'))
          return (
            <React.Suspense fallback={<div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Loading chat...</div>}>
              <ChatAdmin rfqId={rfq.id} customerEmail={lead?.email} />
            </React.Suspense>
          )
        })()}
      </div>

      {/* Back link */}
      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/admin/rfq" style={{ color: '#666', fontSize: 14 }}>
          &larr; Back to RFQs
        </Link>
      </p>
    </main>
  )
}
