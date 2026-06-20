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
  pending_revision?: boolean
  revision_request?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '📄 Draft', color: '#f0ad4e' },
  sent: { label: '📨 Sent', color: '#5bc0de' },
  accepted: { label: '✅ Accepted', color: '#27ae60' },
  rejected: { label: '❌ Rejected', color: '#e74c3c' },
}

export default function AdminQuotationsPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadQuotations()
  }, [statusFilter])

  async function loadQuotations() {
    setLoading(true)
    setError('')
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
    } catch (err: any) {
      alert(err.message)
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
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
                const statusInfo = STATUS_LABELS[q.status] || { label: q.status, color: '#999' }
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      <Link href={`/admin/quotations/${q.id}`} style={{ color: '#222', textDecoration: 'none' }}>
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{q.customerName}</td>
                    <td style={{ padding: '10px 12px', color: '#666' }}>
                      {q.email && <div>{q.email}</div>}
                      <div>{q.phone}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                      ₱{(q.grandTotal || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#666' }}>
                      {q.validUntil
                        ? new Date(q.validUntil).toLocaleDateString('en-PH')
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link
                          href={`/admin/quotations/${q.id}`}
                          style={{ color: '#222', fontSize: 13 }}
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/quotation/${q.id}`}
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
