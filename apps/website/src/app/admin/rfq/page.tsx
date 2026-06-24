'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface RFQCart {
  id: string
  customer_name: string
  email: string
  phone: string
  status: string
  delivery_location?: string
  project_type?: string
  notes?: string
  estimated_total?: number | null
  item_count?: number
  created_at: string
  submitted_at?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '📄 Draft', color: '#f0ad4e' },
  submitted: { label: '📨 Submitted', color: '#5bc0de' },
  quoted: { label: '📋 Quoted', color: '#27ae60' },
  closed: { label: '🔒 Closed', color: '#999' },
}

export default function AdminRFQListPage() {
  const [rfqs, setRfqs] = useState<RFQCart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<RFQCart>>({})

  useEffect(() => {
    loadRFQs()
  }, [statusFilter])

  async function loadRFQs() {
    setLoading(true)
    setError('')
    setSelectedIds([])
    try {
      let url = '/api/rfq?limit=50'
      if (statusFilter) url += `&status=${statusFilter}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load RFQs')
      const data = await res.json()
      setRfqs(data.rfqs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load RFQs')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadRFQs()
  }

  // Select all checkbox handler
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedIds(rfqs.map(r => r.id))
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected RFQ request(s)?`)) return
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/rfq-requests/${id}`, { method: 'DELETE' })))
      setRfqs(prev => prev.filter(r => !selectedIds.includes(r.id)))
      setSelectedIds([])
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected items')
    }
  }

  // Start inline editing
  function startEdit(rfq: RFQCart) {
    setEditingId(rfq.id)
    setEditForm({
      customer_name: rfq.customer_name || '',
      email: rfq.email || '',
      phone: rfq.phone || '',
      estimated_total: rfq.estimated_total || 0,
      status: rfq.status || '',
      delivery_location: rfq.delivery_location || '',
      project_type: rfq.project_type || 'home',
      notes: rfq.notes || '',
    })
  }

  // Save inline edit changes
  async function saveEdit(id: string) {
    try {
      const res = await fetch(`/api/rfq-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editForm.customer_name,
          email: editForm.email,
          phone: editForm.phone,
          estimatedTotal: editForm.estimated_total,
          status: editForm.status,
          deliveryLocation: editForm.delivery_location,
          projectType: editForm.project_type,
          notes: editForm.notes,
        }),
      })
      if (!res.ok) throw new Error('Failed to update RFQ request')
      const updated = await res.json()
      
      const updatedRfq: RFQCart = {
        id: updated.id.toString(),
        customer_name: updated.customerName,
        email: updated.email,
        phone: updated.phone,
        status: updated.status,
        delivery_location: updated.deliveryLocation,
        project_type: updated.projectType,
        notes: updated.notes,
        estimated_total: updated.estimatedTotal ? Number(updated.estimatedTotal) : null,
        item_count: rfqs.find(r => r.id === id)?.item_count,
        created_at: updated.createdAt,
        submitted_at: updated.submittedAt,
      }

      setRfqs(prev => prev.map(r => r.id === id ? updatedRfq : r))
      setEditingId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to save changes')
    }
  }

  // Skeleton loading UI
  if (loading) {
    return (
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ width: 200, height: 28, background: '#eee', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 300, height: 14, background: '#eee', borderRadius: 4 }} />
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ width: '20%', height: 16, background: '#eee', borderRadius: 4 }} />
            <div style={{ width: '20%', height: 16, background: '#eee', borderRadius: 4 }} />
            <div style={{ width: '15%', height: 16, background: '#eee', borderRadius: 4 }} />
            <div style={{ width: '15%', height: 16, background: '#eee', borderRadius: 4 }} />
            <div style={{ width: '10%', height: 16, background: '#eee', borderRadius: 4 }} />
          </div>
        ))}
        <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 14 }}>Loading RFQs...</div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0 }}>RFQ Management</h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
            Review, filter, and manage requests for quotation from customers.
          </p>
        </div>
        <Link
          href="/admin/quotations/new?fromRfq=true"
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
          + New Quotation from RFQ
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
          <input
            type="text"
            placeholder="Search by customer name, email, or ID..."
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
          <option value="submitted">Submitted</option>
          <option value="quoted">Quoted</option>
          <option value="closed">Closed</option>
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

      {/* Empty State */}
      {!loading && rfqs.length === 0 && (
        <div style={{
          background: '#f9f9f9',
          border: '1px solid #eee',
          borderRadius: 8,
          padding: 60,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 18, color: '#666', marginBottom: 8 }}>No RFQs yet</p>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24 }}>
            RFQs from customers will appear here when submitted.
          </p>
        </div>
      )}

      {/* RFQ Table */}
      {!loading && rfqs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={rfqs.length > 0 && selectedIds.length === rfqs.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Contact</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Project / Details</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Est. Total</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Date</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map(rfq => {
                const isEditing = editingId === rfq.id
                const statusInfo = STATUS_LABELS[rfq.status] || { label: rfq.status, color: '#999' }
                const itemCount = rfq.item_count || 0
                return (
                  <tr key={rfq.id} style={{ borderBottom: '1px solid #eee', background: isEditing ? '#f8fafc' : 'transparent' }}>
                    {/* Checkbox */}
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(rfq.id)}
                        onChange={(e) => handleSelectRow(rfq.id, e.target.checked)}
                      />
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.customer_name || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        />
                      ) : (
                        rfq.customer_name || '—'
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
                          {rfq.email && <div>{rfq.email}</div>}
                          <div>{rfq.phone || '—'}</div>
                        </>
                      )}
                    </td>

                    {/* Project / Details */}
                    <td style={{ padding: '10px 12px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <input
                            type="text"
                            placeholder="Project Type"
                            value={editForm.project_type || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, project_type: e.target.value }))}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                          />
                          <input
                            type="text"
                            placeholder="Delivery Location"
                            value={editForm.delivery_location || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, delivery_location: e.target.value }))}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                          />
                          <textarea
                            placeholder="Notes"
                            value={editForm.notes || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={1}
                            style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12, resize: 'vertical' }}
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#444' }}>
                          <div><strong>Type:</strong> {rfq.project_type || '—'}</div>
                          {rfq.delivery_location && <div><strong>Location:</strong> {rfq.delivery_location}</div>}
                          {itemCount > 0 && <div style={{ color: '#666', fontSize: 12 }}>🛍️ {itemCount} items in cart</div>}
                        </div>
                      )}
                    </td>

                    {/* Est. Total */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.estimated_total || 0}
                          onChange={e => setEditForm(prev => ({ ...prev, estimated_total: parseFloat(e.target.value) || 0 }))}
                          style={{ width: 100, textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        />
                      ) : (
                        rfq.estimated_total
                          ? `₱${rfq.estimated_total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                          : '—'
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
                          <option value="submitted">Submitted</option>
                          <option value="quoted">Quoted</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : (
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
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#666', fontSize: 13 }}>
                      {rfq.created_at
                        ? new Date(rfq.created_at).toLocaleDateString('en-PH')
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => saveEdit(rfq.id)}
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
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            onClick={() => startEdit(rfq)}
                            style={{ color: '#222', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                          >
                            Edit
                          </button>
                          <Link
                            href={`/admin/rfq/${rfq.id}`}
                            style={{ color: '#0066cc', fontSize: 13 }}
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/quotations/new?rfqId=${rfq.id}`}
                            style={{ color: '#222', fontSize: 13 }}
                          >
                            Create Quote
                          </Link>
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

      {/* Navigation */}
      <p style={{ marginTop: 32, textAlign: 'center' }}>
        <Link href="/admin" style={{ color: '#666', fontSize: 14 }}>
          &larr; Back to Dashboard
        </Link>
      </p>
    </main>
  )
}
