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

function formatPreferredDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const parts = cleanStr.split('-')
  if (parts.length !== 3) return cleanStr
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const dateObj = new Date(year, month, day)
  return dateObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminAppointmentsListPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Appointment>>({})

  useEffect(() => {
    loadAppointments()
  }, [statusFilter])

  async function loadAppointments() {
    setLoading(true)
    setError('')
    setSelectedIds([])
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

  // Select all checkbox handler
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedIds(appointments.map(a => a.id))
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
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected appointment(s)?`)) return
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/appointments/${id}`, { method: 'DELETE' })))
      setAppointments(prev => prev.filter(a => !selectedIds.includes(a.id)))
      setSelectedIds([])
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected items')
    }
  }

  // Start inline editing
  function startEdit(apt: Appointment) {
    setEditingId(apt.id)
    setEditForm({
      lead_name: apt.lead_name || '',
      lead_email: apt.lead_email || '',
      lead_mobile: apt.lead_mobile || '',
      preferred_date: apt.preferred_date ? apt.preferred_date.split('T')[0] : '',
      preferred_time: apt.preferred_time || '',
      visitor_count: apt.visitor_count || 1,
      status: apt.status || '',
      notes: apt.notes || '',
    })
  }

  // Save inline edit changes
  async function saveEdit(id: string) {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: editForm.lead_name,
          leadEmail: editForm.lead_email,
          leadMobile: editForm.lead_mobile,
          preferredDate: editForm.preferred_date || null,
          preferredTime: editForm.preferred_time,
          visitorCount: editForm.visitor_count,
          status: editForm.status,
          notes: editForm.notes,
        }),
      })
      if (!res.ok) throw new Error('Failed to update appointment')
      const updated = await res.json()
      
      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        lead_name: updated.lead_name,
        lead_email: updated.lead_email,
        lead_mobile: updated.lead_mobile,
        preferred_date: updated.preferred_date,
        preferred_time: updated.preferred_time,
        visitor_count: updated.visitor_count,
        status: updated.status,
        notes: updated.notes,
      } : a))
      setEditingId(null)
    } catch (err: any) {
      alert(err.message || 'Failed to save changes')
    }
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

            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '8px 16px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🗑️ Delete Selected ({selectedIds.length})
              </button>
            )}
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
                    <th style={{ width: 40, padding: 12 }}><input type="checkbox" disabled /></th>
                    <th style={thStyle}>Lead</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Visitors</th>
                    <th style={thStyle}>Categories & Notes</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td style={{ padding: 12 }}><input type="checkbox" disabled /></td>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <td key={j} style={{ padding: 12 }}>
                          <div style={{ height: 16, background: '#e5e7eb', borderRadius: 4 }} />
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
                      <th style={{ width: 40, padding: 12 }}>
                        <input
                          type="checkbox"
                          checked={appointments.length > 0 && selectedIds.length === appointments.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={thStyle}>Lead</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Visitors</th>
                      <th style={thStyle}>Categories & Notes</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Created</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => {
                      const isEditing = editingId === apt.id
                      return (
                        <tr key={apt.id} style={{ borderTop: '1px solid #d9e0d7', background: isEditing ? '#f8fafc' : 'transparent' }}>
                          {/* Checkbox */}
                          <td style={{ padding: 12 }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(apt.id)}
                              onChange={(e) => handleSelectRow(apt.id, e.target.checked)}
                            />
                          </td>

                          {/* Lead */}
                          <td style={{ padding: 12 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <input
                                  type="text"
                                  placeholder="Name"
                                  value={editForm.lead_name || ''}
                                  onChange={e => setEditForm(prev => ({ ...prev, lead_name: e.target.value }))}
                                  style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
                                />
                                <input
                                  type="text"
                                  placeholder="Email"
                                  value={editForm.lead_email || ''}
                                  onChange={e => setEditForm(prev => ({ ...prev, lead_email: e.target.value }))}
                                  style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                                />
                                <input
                                  type="text"
                                  placeholder="Mobile"
                                  value={editForm.lead_mobile || ''}
                                  onChange={e => setEditForm(prev => ({ ...prev, lead_mobile: e.target.value }))}
                                  style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12 }}
                                />
                              </div>
                            ) : (
                              <>
                                <div>
                                  <Link href={`/admin/collections/appointments/${apt.id}`}
                                    style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                                    {apt.lead_name || 'Unknown'}
                                  </Link>
                                </div>
                                <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>{apt.lead_email}</div>
                                <div style={{ fontSize: 11, color: '#667168' }}>{apt.lead_mobile}</div>
                              </>
                            )}
                          </td>

                          {/* Date */}
                          <td style={{ padding: 12, fontSize: 13 }}>
                            {isEditing ? (
                              <input
                                type="date"
                                value={editForm.preferred_date || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, preferred_date: e.target.value }))}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
                              />
                            ) : (
                              formatPreferredDate(apt.preferred_date)
                            )}
                          </td>

                          {/* Time */}
                          <td style={{ padding: 12, fontSize: 13 }}>
                            {isEditing ? (
                              <input
                                type="text"
                                placeholder="E.g. 10:00 AM"
                                value={editForm.preferred_time || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, preferred_time: e.target.value }))}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
                              />
                            ) : (
                              apt.preferred_time || '—'
                            )}
                          </td>

                          {/* Visitors */}
                          <td style={{ padding: 12, fontSize: 13 }}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.visitor_count || 1}
                                onChange={e => setEditForm(prev => ({ ...prev, visitor_count: parseInt(e.target.value) || 1 }))}
                                style={{ width: 60, padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
                              />
                            ) : (
                              apt.visitor_count || '—'
                            )}
                          </td>

                          {/* Categories & Notes */}
                          <td style={{ padding: 12, fontSize: 12, color: '#667168' }}>
                            {isEditing ? (
                              <textarea
                                placeholder="Notes"
                                value={editForm.notes || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12, resize: 'vertical' }}
                              />
                            ) : (
                              <>
                                <div style={{ fontWeight: 500 }}>
                                  {(apt.categories_of_interest || []).join(', ') || 'No categories selected'}
                                </div>
                                {apt.notes && (
                                  <div style={{ marginTop: 4, fontStyle: 'italic', color: '#888' }}>
                                    Note: {apt.notes}
                                  </div>
                                )}
                              </>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ padding: 12 }}>
                            {isEditing ? (
                              <select
                                value={editForm.status || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
                              >
                                <option value="requested">Requested</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            ) : (
                              <span style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                                fontSize: 12, fontWeight: 500, color: '#fff',
                                background: statusColor(apt.status),
                              }}>
                                {statusLabel(apt.status)}
                              </span>
                            )}
                          </td>

                          {/* Created */}
                          <td style={{ padding: 12, fontSize: 12, color: '#667168' }}>{formatDate(apt.created_at)}</td>

                          {/* Actions */}
                          <td style={{ padding: 12 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => saveEdit(apt.id)}
                                  style={{
                                    color: '#1a6d3e', background: 'none', border: 'none',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  style={{
                                    color: '#666', background: 'none', border: 'none',
                                    fontSize: 13, cursor: 'pointer', padding: 0
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  onClick={() => startEdit(apt)}
                                  style={{
                                    color: '#151a17', background: 'none', border: 'none',
                                    fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0
                                  }}
                                >
                                  Edit
                                </button>
                                <Link href={`/admin/collections/appointments/${apt.id}`}
                                  style={{ color: '#1a6d3e', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                                  View
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
