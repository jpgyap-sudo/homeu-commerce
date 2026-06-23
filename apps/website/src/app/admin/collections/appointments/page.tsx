'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ShowroomCalendar from '@/components/admin/ShowroomCalendar'

interface Appointment {
  id: string
  lead_id: string
  lead_name: string
  lead_email: string
  lead_mobile: string
  preferred_date: string
  preferred_time: string
  visitor_count: number
  categories_of_interest: string[]
  status: string
  notes: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  requested: { label: '🆕 Requested', color: '#3498db' },
  confirmed: { label: '✅ Confirmed', color: '#27ae60' },
  completed: { label: '✔️ Completed', color: '#2ecc71' },
  cancelled: { label: '❌ Cancelled', color: '#e74c3c' },
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status]?.label || status
}

function statusColor(status: string): string {
  return STATUS_LABELS[status]?.color || '#667168'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return iso }
}

export default function AdminAppointmentsListPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    loadAppointments()
  }, [statusFilter])

  async function loadAppointments() {
    setLoading(true)
    setError('')
    try {
      let url = '/api/appointments?limit=50'
      if (statusFilter) url += `&status=${statusFilter}`
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load appointments')
      const data = await res.json()
      setAppointments(data.docs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadAppointments()
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Appointments</h1>
          <p style={{ color: '#667168', margin: '4px 0 0', fontSize: 14 }}>
            Manage showroom visit bookings from chatbot conversations
          </p>
        </div>
        <div style={{ display: 'flex', background: '#f4f6f4', padding: 4, borderRadius: 8, gap: 4 }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: viewMode === 'list' ? '#fff' : 'transparent',
              color: viewMode === 'list' ? '#151a17' : '#667168',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
              background: viewMode === 'calendar' ? '#fff' : 'transparent',
              color: viewMode === 'calendar' ? '#151a17' : '#667168',
              boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            📅 Calendar View
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <ShowroomCalendar />
      ) : (
        <>
          {/* Search & Filters */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280 }}>
              <input
                type="text"
                placeholder="Search by lead name or email..."
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
                fontSize: 14, minWidth: 160, background: '#fff',
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
                    <th style={thStyle}>Lead</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Visitors</th>
                    <th style={thStyle}>Categories</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
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
          {!loading && !error && appointments.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 48, background: '#fff',
              border: '1px solid #d9e0d7', borderRadius: 12,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <h3 style={{ margin: '0 0 8px', color: '#151a17' }}>No appointments found</h3>
              <p style={{ color: '#667168', margin: 0, fontSize: 14 }}>
                {searchTerm || statusFilter ? 'Try adjusting your search or filter.' : 'Appointments will appear here once visitors book showroom visits through the chatbot.'}
              </p>
            </div>
          )}

          {/* Appointments table */}
          {!loading && !error && appointments.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f4f6f4' }}>
                      <th style={thStyle}>Lead</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Visitors</th>
                      <th style={thStyle}>Categories</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} style={{ borderTop: '1px solid #d9e0d7' }}>
                        <td style={{ padding: 12 }}>
                          <div>
                            <Link href={`/admin/collections/appointments/${apt.id}`}
                              style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                              {apt.lead_name || 'Unknown'}
                            </Link>
                          </div>
                          <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>{apt.lead_email}</div>
                        </td>
                        <td style={{ padding: 12, fontSize: 13 }}>{apt.preferred_date || '—'}</td>
                        <td style={{ padding: 12, fontSize: 13 }}>{apt.preferred_time || '—'}</td>
                        <td style={{ padding: 12, fontSize: 13 }}>{apt.visitor_count || '—'}</td>
                        <td style={{ padding: 12, fontSize: 12, color: '#667168' }}>
                          {(apt.categories_of_interest || []).join(', ') || '—'}
                        </td>
                        <td style={{ padding: 12 }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                            fontSize: 12, fontWeight: 500, color: '#fff',
                            background: statusColor(apt.status),
                          }}>
                            {statusLabel(apt.status)}
                          </span>
                        </td>
                        <td style={{ padding: 12, fontSize: 12, color: '#667168' }}>{formatDate(apt.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 12px', fontSize: 12, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
  whiteSpace: 'nowrap',
}
