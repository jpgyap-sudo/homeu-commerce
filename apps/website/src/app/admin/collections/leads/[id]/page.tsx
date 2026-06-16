'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface LeadDetail {
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
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

interface Appointment {
  id: string
  preferred_date: string
  preferred_time: string
  visitor_count: number
  categories_of_interest: string[]
  status: string
  notes: string
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  new: '🆕 New', contacted: '📞 Contacted', qualified: '✅ Qualified',
  quoted: '📄 Quoted', won: '🏆 Won', lost: '❌ Lost', spam: '🚫 Spam',
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3498db', contacted: '#f39c12', qualified: '#27ae60',
  quoted: '#9b59b6', won: '#2ecc71', lost: '#e74c3c', spam: '#95a5a6',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default function LeadDetailPage() {
  const params = useParams()
  const leadId = params.id as string

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!leadId) return
    loadLead()
  }, [leadId])

  async function loadLead() {
    setLoading(true)
    setError('')
    try {
      const leadRes = await fetch(`/api/leads?search=${encodeURIComponent(leadId)}&limit=1`)
      if (!leadRes.ok) throw new Error('Failed to load lead')
      const leadData = await leadRes.json()
      const found = (leadData.docs || []).find((l: any) => l.id === leadId)
      if (!found) throw new Error('Lead not found')
      setLead(found)

      // Fetch related appointments
      const apptRes = await fetch(`/api/appointments?search=${encodeURIComponent(leadId)}&limit=20`)
      if (apptRes.ok) {
        const apptData = await apptRes.json()
        setAppointments((apptData.docs || []).filter((a: any) => a.lead_id === leadId))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lead')
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

  if (error || !lead) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h3 style={{ margin: '0 0 8px', color: '#151a17' }}>Lead not found</h3>
          <p style={{ color: '#667168', marginBottom: 16 }}>{error || 'The requested lead does not exist.'}</p>
          <Link href="/admin/collections/leads" style={{ color: '#1a6d3e' }}>&larr; Back to Leads</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/dashboard" style={{ color: '#667168', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: '#667168', margin: '0 8px' }}>/</span>
        <Link href="/admin/collections/leads" style={{ color: '#667168', textDecoration: 'none' }}>Leads</Link>
        <span style={{ color: '#667168', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 500 }}>{lead.name}</span>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>{lead.name}</h1>

      {/* Lead Info Card */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Email" value={lead.email} />
          <Field label="Mobile" value={lead.mobile} />
          <Field label="Buyer Type" value={lead.buyer_type || '—'} />
          <Field label="Company" value={lead.company_name || '—'} />
          <Field label="Project Location" value={lead.project_location || '—'} />
          <Field label="Source Page" value={lead.source_page || '—'} />
          <Field label="Referrer" value={lead.referrer || '—'} />
          <Field label="Created" value={formatDate(lead.created_at)} />
          <Field label="Updated" value={formatDate(lead.updated_at)} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</div>
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 12,
              fontSize: 13, fontWeight: 500, color: '#fff',
              background: STATUS_COLORS[lead.status] || '#667168',
            }}>
              {STATUS_LABELS[lead.status] || lead.status}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Score</div>
            <span style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 12,
              fontSize: 13, fontWeight: 500, color: '#fff',
              background: lead.score >= 70 ? '#e74b16' : lead.score >= 40 ? '#d4a017' : '#667168',
            }}>
              {lead.score_label || (lead.score >= 70 ? '🔥 Hot' : lead.score >= 40 ? '🟡 Warm' : '🔵 Cold')} — {lead.score}/100
            </span>
          </div>
        </div>

        {/* Metadata JSON */}
        {lead.metadata && Object.keys(lead.metadata).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Metadata</div>
            <pre style={{
              background: '#f4f6f4', padding: 16, borderRadius: 8, fontSize: 12,
              overflow: 'auto', maxHeight: 300, margin: 0,
            }}>
              {JSON.stringify(lead.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Related Appointments */}
      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>📅 Appointments ({appointments.length})</h2>
        {appointments.length === 0 ? (
          <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No appointments for this lead.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f6f4' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Visitors</th>
                <th style={thStyle}>Categories</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid #d9e0d7' }}>
                  <td style={{ padding: 12, fontSize: 13 }}>{a.preferred_date || '—'}</td>
                  <td style={{ padding: 12, fontSize: 13 }}>{a.preferred_time || '—'}</td>
                  <td style={{ padding: 12, fontSize: 13 }}>{a.visitor_count || '—'}</td>
                  <td style={{ padding: 12, fontSize: 13 }}>{(a.categories_of_interest || []).join(', ') || '—'}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                      fontSize: 12, fontWeight: 500, color: '#fff',
                      background: a.status === 'confirmed' ? '#27ae60' : a.status === 'completed' ? '#2ecc71' : a.status === 'cancelled' ? '#e74c3c' : '#3498db',
                    }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Back link */}
      <Link href="/admin/collections/leads" style={{ color: '#1a6d3e', textDecoration: 'none', fontSize: 14 }}>
        &larr; Back to Leads
      </Link>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#151a17' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
}
