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

  useEffect(() => {
    loadRFQs()
  }, [statusFilter])

  async function loadRFQs() {
    setLoading(true)
    setError('')
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
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
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Contact</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Items</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Est. Total</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Date</th>
                <th style={{ textAlign: 'center', padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map(rfq => {
                const statusInfo = STATUS_LABELS[rfq.status] || { label: rfq.status, color: '#999' }
                const itemCount = rfq.item_count || 0
                return (
                  <tr key={rfq.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {rfq.customer_name || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#666' }}>
                      {rfq.email && <div>{rfq.email}</div>}
                      <div>{rfq.phone || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {itemCount > 0 ? itemCount : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {rfq.estimated_total
                        ? `₱${rfq.estimated_total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
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
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#666', fontSize: 13 }}>
                      {rfq.created_at
                        ? new Date(rfq.created_at).toLocaleDateString('en-PH')
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
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
