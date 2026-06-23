'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface AppointmentDetail {
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

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  requested: { label: '🆕 Requested', color: '#3498db' },
  confirmed: { label: '✅ Confirmed', color: '#27ae60' },
  completed: { label: '✔️ Completed', color: '#2ecc71' },
  cancelled: { label: '❌ Cancelled', color: '#e74c3c' },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
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

export default function AppointmentDetailPage() {
  const params = useParams()
  const apptId = params.id as string

  const [appt, setAppt] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!apptId) return
    loadAppointment()
  }, [apptId])

  async function loadAppointment() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/appointments/${apptId}`)
      if (!res.ok) throw new Error('Failed to load appointment')
      setAppt(await res.json())
    } catch (err: any) {
      setError(err.message || 'Failed to load appointment')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(status: string) {
    if (!appt) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/appointments/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update appointment')
      setAppt((current) => current ? { ...current, ...data } : data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ height: 24, width: 200, background: '#e5e7eb', borderRadius: 4, marginBottom: 24 }} />
        <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 32 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: 20, background: '#e5e7eb', borderRadius: 4, marginBottom: 16, width: `${60 + i * 8}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!appt) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ margin: '0 0 8px', color: '#151a17' }}>Appointment not found</h3>
          <p style={{ color: '#667168', marginBottom: 16 }}>{error || 'The requested appointment does not exist.'}</p>
          <Link href="/admin/collections/appointments" style={{ color: '#1a6d3e' }}>&larr; Back to Appointments</Link>
        </div>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[appt.status] || { label: appt.status, color: '#667168' }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/dashboard" style={{ color: '#667168', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: '#667168', margin: '0 8px' }}>/</span>
        <Link href="/admin/collections/appointments" style={{ color: '#667168', textDecoration: 'none' }}>Appointments</Link>
        <span style={{ color: '#667168', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 500 }}>{appt.lead_name || 'Appointment'}</span>
      </div>

      {error && <div role="alert" style={{ padding: 12, marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b' }}>{error}</div>}

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>
        Showroom Visit — {appt.lead_name || 'Unknown Lead'}
      </h1>

      {/* Appointment Info Card */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Status">
            <select
              value={appt.status}
              disabled={saving}
              onChange={(event) => updateStatus(event.target.value)}
              style={{ padding: '7px 10px', border: `1px solid ${statusStyle.color}`, borderRadius: 8, background: '#fff' }}
            >
              {Object.entries(STATUS_STYLES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
            </select>
            {saving && <span style={{ marginLeft: 8, color: '#667168', fontSize: 12 }}>Saving…</span>}
          </Field>
          <Field label="Created" value={formatDate(appt.created_at)} />
          <Field label="Preferred Date" value={formatPreferredDate(appt.preferred_date)} />
          <Field label="Preferred Time" value={appt.preferred_time || '—'} />
          <Field label="Visitor Count" value={String(appt.visitor_count || '—')} />
          <Field label="Categories of Interest" value={(appt.categories_of_interest || []).join(', ') || '—'} />
        </div>

        {appt.notes && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Notes</div>
            <div style={{ background: '#f4f6f4', padding: 16, borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>{appt.notes}</div>
          </div>
        )}
      </div>

      {/* Lead Info Card */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>👤 Lead Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Name" value={appt.lead_name || '—'} />
          <Field label="Email" value={appt.lead_email || '—'} />
          <Field label="Mobile" value={appt.lead_mobile || '—'} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href={`/admin/collections/leads/${appt.lead_id}`} style={{ color: '#1a6d3e', fontSize: 14 }}>
            View full lead profile &rarr;
          </Link>
        </div>
      </div>

      {/* Back link */}
      <Link href="/admin/collections/appointments" style={{ color: '#1a6d3e', textDecoration: 'none', fontSize: 14 }}>
        &larr; Back to Appointments
      </Link>
    </div>
  )
}

function Field({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      {children || <div style={{ fontSize: 14, color: '#151a17' }}>{value || '—'}</div>}
    </div>
  )
}
