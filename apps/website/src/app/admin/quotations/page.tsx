'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuotationItem {
  id: string
  itemNumber: number
  description: string
  quantity: number
  unitCost: number
  discountPercent: number
  discountedCost: number
  total: number
}

interface Quotation {
  id: string
  quotationNumber: string
  customerName: string
  email?: string
  phone?: string
  grandTotal: number
  status: string
  validUntil?: string
  createdAt: string
  items?: QuotationItem[]
  rfq?: { id: string }
  rfqId?: string
  pending_revision?: boolean
  revision_request?: string
  guestToken?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '📄 Draft', color: '#f0ad4e' },
  sent: { label: '📨 Sent', color: '#5bc0de' },
  accepted: { label: '✅ Accepted', color: '#27ae60' },
  rejected: { label: '❌ Rejected', color: '#e74c3c' },
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

export default function AdminQuotationsPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Quotation>>({})

  useEffect(() => {
    loadQuotations()
  }, [statusFilter])

  async function loadQuotations() {
    setLoading(true)
    setError('')
    setSelectedIds([])
    try {
      let url = '/api/quotations?limit=50'
      if (statusFilter) url += `&status=${statusFilter}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load quotations')
      const data = await res.json()
      setQuotations(data.docs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load quotations')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadQuotations()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this quotation?')) return
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setQuotations(prev => prev.filter(q => q.id !== id))
      setSelectedIds(prev => prev.filter(x => x !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Select all checkbox handler
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedIds(quotations.map(q => q.id))
    } else {
      setSelectedIds([])
    }
  }

  // Select row checkbox handler
  function handleSelectRow(id: string, checked: boolean) {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id))
    }
  }

  // Bulk delete selected items
  async function handleDeleteSelected() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected quotation(s)?`)) return
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/quotations/${id}`, { method: 'DELETE' })))
      setQuotations(prev => prev.filter(q => !selectedIds.includes(q.id)))
      setSelectedIds([])
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected items')
    }
  }

  // Start inline editing
  function startEdit(q: Quotation) {
    setEditingId(q.id)
    setEditForm({
      customerName: q.customerName || '',
      email: q.email || '',
      phone: q.phone || '',
      grandTotal: q.grandTotal || 0,
      status: q.status || '',
      validUntil: q.validUntil || '',
    })
  }

  // Save inline edit changes
  async function saveEdit(id: string) {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editForm.customerName,
          email: editForm.email,
          phone: editForm.phone,
          grandTotal: editForm.grandTotal,
          status: editForm.status,
          validUntil: editForm.validUntil || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to update quotation')
      const updated = await res.json()
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q))
      setEditingId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to save changes')
    }
  }

  async function handleQuickSend(q: Quotation) {
    if (!q.email || !q.email.trim()) {
      alert('Client email address is required to send the quotation. Please edit the quotation to add an email address.')
      return
    }

    if (!confirm(`Send quotation #${q.quotationNumber} to client email (${q.email})?`)) return

    setSendingId(q.id)
    setError('')

    try {
      // 1. Fetch single quotation to get guestToken
      const detailRes = await fetch(`/api/quotations/${q.id}`, { credentials: 'include' })
      if (!detailRes.ok) throw new Error('Failed to load quotation details')
      const detailData = await detailRes.json()
      const guestToken = detailData.guestToken

      // 2. Send the email using the SMTP endpoint
      const guestUrl = quotationPublicUrl(q.id, guestToken)
      const emailBody = `Dear ${q.customerName},

Thank you for choosing Home Atelier. We have prepared your quotation #${q.quotationNumber} for your review.

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
          to: q.email.trim(),
          subject: `Quotation #${q.quotationNumber} from Home Atelier`,
          body: emailBody,
        }),
      })

      if (!emailRes.ok) {
        const emailErr = await emailRes.json()
        throw new Error(emailErr.error || 'Failed to send email to client')
      }
      const emailData = await emailRes.json()

      // 3. Update status in db
      const res = await fetch(`/api/quotations/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
          sentAt: new Date().toISOString(),
          sentVia: 'email',
        }),
      })

      if (!res.ok) throw new Error('Failed to update quotation status to Sent')

      let msg = `Quotation #${q.quotationNumber} sent successfully to ${q.email}!`
      if (emailData.note && emailData.note.includes('saved locally')) {
        msg = `Quotation status updated to Sent! (SMTP is not configured, so the email was saved to the inbox locally for simulation)`
      }

      alert(msg)
      // Update local state status
      setQuotations(prev => prev.map(item => {
        if (item.id === q.id) {
          return { ...item, status: 'sent' }
        }
        return item
      }))
    } catch (err: any) {
      alert(err.message || 'Failed to send')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0 }}>Quotation Maker</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            Create, manage, and send formal quotations to customers.
          </p>
        </div>
        <Link
          href="/admin/quotations/new"
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
          + New Quotation
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
          <input
            type="text"
            placeholder="Search by name, email, or quotation #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#f5f5f5',
              border: '1px solid #ccc',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>

        {selectedIds.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            🗑️ Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Loading — skeleton UI */}
      {loading && (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', width: 40 }}><input type="checkbox" disabled /></th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Quotation #</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Contact</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px' }}>Amount</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>Valid Until</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px' }}><input type="checkbox" disabled /></td>
                    <td style={{ padding: '10px 12px' }}><div style={{ width: 100, height: 14, background: '#eee', borderRadius: 4 }} /></td>
                    <td style={{ padding: '10px 12px' }}><div style={{ width: 120, height: 14, background: '#eee', borderRadius: 4 }} /></td>
                    <td style={{ padding: '10px 12px' }}><div style={{ width: 150, height: 14, background: '#eee', borderRadius: 4 }} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}><div style={{ width: 80, height: 14, background: '#eee', borderRadius: 4, marginLeft: 'auto' }} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><div style={{ width: 60, height: 14, background: '#eee', borderRadius: 4, margin: '0 auto' }} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><div style={{ width: 60, height: 14, background: '#eee', borderRadius: 4, margin: '0 auto' }} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><div style={{ width: 80, height: 14, background: '#eee', borderRadius: 4, margin: '0 auto' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ textAlign: 'center', color: '#999', fontSize: 13, marginTop: 12 }}>Loading quotations...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && quotations.length === 0 && (
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 60,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>No quotations yet</p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
            Create your first quotation from an RFQ or start from scratch.
          </p>
          <Link
            href="/admin/quotations/new"
            style={{
              padding: '10px 24px',
              background: '#222',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Create Quotation
          </Link>
        </div>
      )}

      {/* Quotations Table */}
      {!loading && quotations.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={quotations.length > 0 && selectedIds.length === quotations.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Quotation #</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Contact</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Valid Until</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => {
                const isEditing = editingId === q.id
                const statusInfo = STATUS_LABELS[q.status] || { label: q.status, color: '#999' }
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid #eee', background: isEditing ? '#f8fafc' : 'transparent' }}>
                    {/* Checkbox */}
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={(e) => handleSelectRow(q.id, e.target.checked)}
                      />
                    </td>

                    {/* Quotation # */}
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      <Link href={`/admin/quotations/${q.id}`} style={{ color: '#222', textDecoration: 'none' }}>
                        {q.quotationNumber}
                      </Link>
                      {q.rfqId && (
                        <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>
                          <Link href={`/admin/rfq/${q.rfqId}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                            🔗 RFQ Details
                          </Link>
                        </div>
                      )}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '10px 12px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.customerName || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        />
                      ) : (
                        q.customerName
                      )}
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '10px 12px', color: '#666' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <input
                            type="text"
                            placeholder="Email"
                            value={editForm.email || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            value={editForm.phone || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                          />
                        </div>
                      ) : (
                        <>
                          {q.email && <div>{q.email}</div>}
                          <div>{q.phone}</div>
                        </>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.grandTotal || 0}
                          onChange={e => setEditForm(prev => ({ ...prev, grandTotal: parseFloat(e.target.value) || 0 }))}
                          style={{ width: 100, textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        />
                      ) : (
                        `₱${(q.grandTotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {isEditing ? (
                        <select
                          value={editForm.status || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                          style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        <>
                          <span style={{
                            background: statusInfo.color + '20',
                            color: statusInfo.color,
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {statusInfo.label}
                          </span>
                          {q.pending_revision && (
                            <span style={{
                              display: 'inline-block', marginLeft: 6,
                              background: '#fff3cd', color: '#856404',
                              padding: '2px 8px', borderRadius: 12,
                              fontSize: 11, fontWeight: 700,
                            }}>
                              🔄 Revise
                            </span>
                          )}
                        </>
                      )}
                    </td>

                    {/* Valid Until */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#666' }}>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.validUntil || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, validUntil: e.target.value }))}
                          style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        />
                      ) : (
                        q.validUntil && !isNaN(new Date(q.validUntil).getTime())
                          ? new Date(q.validUntil).toLocaleDateString('en-PH')
                          : '—'
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => saveEdit(q.id)}
                            style={{
                              color: '#27ae60',
                              fontSize: 13,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 600,
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              color: '#666',
                              fontSize: 13,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                          {q.status === 'draft' && (
                            <button
                              onClick={() => handleQuickSend(q)}
                              disabled={sendingId !== null}
                              style={{
                                color: '#0066cc',
                                fontSize: 13,
                                background: 'none',
                                border: 'none',
                                cursor: sendingId !== null ? 'not-allowed' : 'pointer',
                                padding: 0,
                                fontWeight: 600,
                              }}
                            >
                              {sendingId === q.id ? 'Sending...' : 'Send'}
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(q)}
                            style={{ color: '#222', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                          >
                            Edit
                          </button>
                          <Link
                            href={quotationPublicUrl(q.id, q.guestToken)}
                            style={{ color: '#0066cc', fontSize: 13 }}
                            target="_blank"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDelete(q.id)}
                            style={{
                              color: '#c00',
                              fontSize: 13,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Back link */}
      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/admin" style={{ color: '#666', fontSize: 14 }}>
          &larr; Back to Dashboard
        </Link>
      </p>
    </main>
  )
}
