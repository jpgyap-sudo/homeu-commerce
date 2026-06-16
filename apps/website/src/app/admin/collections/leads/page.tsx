'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Lead {
  id: string
  name: string
  email: string
  mobile: string
  buyer_type: string | null
  company_name: string | null
  project_location: string | null
  source_page: string | null
  referrer: string | null
  status: string
  score: number
  score_label: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: '🆕 New', color: '#3498db' },
  contacted: { label: '📞 Contacted', color: '#f39c12' },
  qualified: { label: '✅ Qualified', color: '#27ae60' },
  quoted: { label: '📄 Quoted', color: '#9b59b6' },
  won: { label: '🏆 Won', color: '#2ecc71' },
  lost: { label: '❌ Lost', color: '#e74c3c' },
  spam: { label: '🚫 Spam', color: '#95a5a6' },
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status]?.label || status
}

function statusColor(status: string): string {
  return STATUS_LABELS[status]?.color || '#667168'
}

function scoreBadge(score: number, label: string | null): string {
  const badges: Record<string, string> = {
    hot: '🔥 Hot',
    warm: '🟡 Warm',
    cold: '🔵 Cold',
    qualified: '✅ Qualified',
  }
  if (label && badges[label]) return badges[label]
  if (score >= 70) return '🔥 Hot'
  if (score >= 40) return '🟡 Warm'
  return '🔵 Cold'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return iso }
}

export default function AdminLeadsListPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadLeads()
  }, [statusFilter])

  async function loadLeads() {
    setLoading(true)
    setError('')
    try {
      let url = '/api/leads?limit=50'
      if (statusFilter) url += `&status=${statusFilter}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load leads')
      const data = await res.json()
      setLeads(data.docs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadLeads()
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Leads</h1>
          <p style={{ color: '#667168', margin: '4px 0 0', fontSize: 14 }}>
            Manage inbound sales leads from the chatbot
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', border: '1px solid #d9e0d7',
              borderRadius: 8, fontSize: 14, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '8px 16px', background: '#1a6d3e', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
          }}>
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px', border: '1px solid #d9e0d7', borderRadius: 8,
            fontSize: 14, minWidth: 140, background: '#fff',
          }}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f6f4' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Contact</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} style={{ padding: 12 }}>
                      <div style={{ height: 16, background: '#e5e7eb', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && leads.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 48, background: '#fff',
          border: '1px solid #d9e0d7', borderRadius: 12,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <h3 style={{ margin: '0 0 8px', color: '#151a17' }}>No leads found</h3>
          <p style={{ color: '#667168', margin: 0, fontSize: 14 }}>
            {searchTerm || statusFilter ? 'Try adjusting your search or filter.' : 'Leads will appear here once visitors submit the lead gate form.'}
          </p>
        </div>
      )}

      {/* Leads table */}
      {!loading && !error && leads.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f4f6f4' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderTop: '1px solid #d9e0d7' }}>
                    <td style={{ padding: 12 }}>
                      <Link href={`/admin/collections/leads/${lead.id}`}
                        style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                        {lead.name}
                      </Link>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: '#667168' }}>
                      <div>{lead.email}</div>
                      <div>{lead.mobile}</div>
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>{lead.buyer_type || '—'}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                        fontSize: 12, fontWeight: 500,
                        color: '#fff', background: statusColor(lead.status),
                      }}>
                        {statusLabel(lead.status)}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                        fontSize: 12, fontWeight: 500, color: '#fff',
                        background: lead.score >= 70 ? '#e74b16' : lead.score >= 40 ? '#d4a017' : '#667168',
                      }}>
                        {scoreBadge(lead.score, lead.score_label)} {lead.score}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: '#667168' }}>{lead.source_page || '—'}</td>
                    <td style={{ padding: 12, fontSize: 12, color: '#667168' }}>{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 12px', fontSize: 12, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
  whiteSpace: 'nowrap',
}
