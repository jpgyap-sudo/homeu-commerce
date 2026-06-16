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

export default function AppointmentDetailPage() {
  const params = useParams()
  const apptId = params.id as string

  const [appt, setAppt] = useState<AppointmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!apptId) return
    loadAppointment()
  }, [apptId])

  async function loadAppointment() {
    setLoading(true)
    setError('')
    try {
      // Fetch all appointments and find the one with matching ID
      const res = await fetch(`/api/appointments?limit=100`)
      if (!res.ok) throw new Error('Failed to load appointments')
      const data = await res.json()
      const found = (data.docs || []).find((a: any) => a.id === apptId)
      if (!found) throw new Error('Appointment not found')
      setAppt(found)
    } catch (err: any) {
      setError(err.message || 'Failed to load appointment')
    } finally {
      setLoading(false)
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

  if (error || !appt) {
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

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>
        Showroom Visit — {appt.lead_name || 'Unknown Lead'}
      </h1>

      {/* Appointment Info Card */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Status">
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 12,
              fontSize: 13, fontWeight: 500, color: '#fff',
              background: statusStyle.color,
            }}>
              {statusStyle.label}
            </span>
          </Field>
          <Field label="Created" value={formatDate(appt.created_at)} />
          <Field label="Preferred Date" value={appt.preferred_date || '—'} />
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
