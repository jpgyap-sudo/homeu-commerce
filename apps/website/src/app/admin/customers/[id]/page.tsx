/**
 * Admin Customer Detail/Edit Page
 *
 * Client component that loads customer data, displays info,
 * shows lead history and RFQ history, and allows editing
 * basic fields.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────

interface CustomerData {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  lead_status: string | null
  notes: string | null
  status: string | null
  created_at: string
  updated_at: string
}

interface LeadRecord {
  id: string
  name: string
  email: string
  mobile: string
  buyer_type: string | null
  company_name: string | null
  status: string
  score: number
  score_label: string | null
  source_page: string | null
  created_at: string
}

interface RFQRecord {
  id: string
  status: string
  delivery_location: string | null
  project_type: string | null
  estimated_total: number | null
  notes: string | null
  created_at: string
  submitted_at: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function leadStatusBadge(status: string): string {
  const map: Record<string, string> = {
    new: '🆕 New',
    contacted: '📞 Contacted',
    qualified: '✅ Qualified',
    quoted: '📄 Quoted',
    won: '🏆 Won',
    lost: '❌ Lost',
    linked: '🔗 Linked',
    spam: '🚫 Spam',
  }
  return map[status] || status
}

function scoreLabel(label: string | null, score: number): string {
  const labels: Record<string, string> = {
    hot: '🔥 Hot',
    warm: '🟡 Warm',
    cold: '🔵 Cold',
    qualified: '✅ Qualified',
  }
  if (label && labels[label]) return labels[label]
  if (score >= 70) return '🔥 Hot'
  if (score >= 40) return '🟡 Warm'
  return '🔵 Cold'
}

function rfqStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '📄 Draft',
    submitted: '📨 Submitted',
    quoted: '📋 Quoted',
    closed: '🔒 Closed',
  }
  return map[status] || status
}

// ── Component ────────────────────────────────────────────────────────

export default function EditCustomerPage() {
  const params = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Customer data
  const [customer, setCustomer] = useState<CustomerData | null>(null)

  // Lead history
  const [leads, setLeads] = useState<LeadRecord[]>([])

  // RFQ history
  const [rfqs, setRfqs] = useState<RFQRecord[]>([])

  // Form fields (editable)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const id = params?.id as string
        if (!id) throw new Error('Customer ID not found')

        // Load customer
        const custRes = await fetch(`/api/customers/${id}`, { credentials: 'include' })
        if (!custRes.ok) {
          const errData = await custRes.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to load customer')
        }

        const custData: CustomerData = await custRes.json()
        setCustomer(custData)
        setName(custData.name || '')
        setEmail(custData.email || '')
        setPhone(custData.phone || '')
        setCompany(custData.company || '')
        setAddress(custData.address || '')
        setNotes(custData.notes || '')

        // Load lead history (chatbot.leads linked via davincios_customer_id)
        const leadsRes = await fetch(`/api/customers/${id}/leads`, { credentials: 'include' })
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          setLeads(Array.isArray(leadsData) ? leadsData : [])
        }

        // Load RFQ history (rfq_requests linked via customer field)
        const rfqRes = await fetch(`/api/customers/${id}/rfqs`, { credentials: 'include' })
        if (rfqRes.ok) {
          const rfqData = await rfqRes.json()
          setRfqs(Array.isArray(rfqData) ? rfqData : [])
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load customer data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params?.id])

  // ── Save ──────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const id = params?.id as string
      if (!id) throw new Error('Customer ID not found')

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      }

      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update customer')
      }

      setSuccess('Customer updated successfully!')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#667168' }}>Loading customer...</p>
      </main>
    )
  }

  if (error && !customer) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#b42318', padding: '16px', borderRadius: 6 }}>{error}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/customers" style={{ color: '#667168' }}>&larr; Back to Customers</Link>
        </p>
      </main>
    )
  }

  // ── Render form ───────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/customers" style={{ color: '#667168' }}>Customers</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>{customer?.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Edit Customer</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            ID: {params?.id} · Created: {customer ? formatDate(customer.created_at) : '—'}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b42318', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#1a6d3e', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{success}</div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Section: Customer Info ── */}
        <Section title="Customer Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Name *" required>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="Email *" required>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="Phone">
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="+63 XXX XXX XXXX" />
            </Field>
            <Field label="Company">
              <input type="text" value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} placeholder="Company name" />
            </Field>
            <Field label="Address">
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} placeholder="Customer address" />
            </Field>
            <Field label="Lead Status">
              <input type="text" value={customer?.lead_status || ''} style={{ ...inputStyle, background: '#f5f5f5' }} disabled />
            </Field>
          </div>
        </Section>

        {/* ── Section: Notes ── */}
        <Section title="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Internal notes about this customer..."
          />
        </Section>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, paddingBottom: 40 }}>
          <Link
            href="/admin/customers"
            style={{
              padding: '10px 24px',
              background: '#f5f5f5',
              color: '#151a17',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              border: '1px solid #d9e0d7',
            }}
          >
            &larr; Back to List
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 32px',
              background: saving ? '#999' : 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 4px 14px rgba(26,109,62,0.35)',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* ── Lead History ── */}
      <Section title={`Lead History (${leads.length})`}>
        {leads.length === 0 ? (
          <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No leads linked to this customer.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #d9e0d7' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Buyer Type</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Score</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Source</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ padding: '8px 12px', color: '#667168' }}>{lead.email}</td>
                    <td style={{ padding: '8px 12px', color: '#667168' }}>{lead.buyer_type || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`status-badge status-${lead.status}`}>{leadStatusBadge(lead.status)}</span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`score-badge score-${lead.score_label || (lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold')}`}>
                        {scoreLabel(lead.score_label, lead.score)} {lead.score}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#667168' }}>{lead.source_page || '—'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#667168' }}>{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── RFQ History ── */}
      <Section title={`RFQ History (${rfqs.length})`}>
        {rfqs.length === 0 ? (
          <p style={{ color: '#667168', fontSize: 14, margin: 0 }}>No RFQ requests from this customer.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #d9e0d7' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Project Type</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Location</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Est. Total</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#667168', fontSize: 11, textTransform: 'uppercase' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map(rfq => (
                  <tr key={rfq.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <Link href={`/admin/rfq/${rfq.id}`} style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500, fontSize: 12 }}>
                        {rfq.id.substring(0, 8)}...
                      </Link>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={`status-badge status-${rfq.status === 'submitted' ? 'contacted' : rfq.status}`}>
                        {rfqStatusLabel(rfq.status)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#667168' }}>{rfq.project_type || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#667168' }}>{rfq.delivery_location || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                      {rfq.estimated_total != null
                        ? `₱${Number(rfq.estimated_total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: '#667168' }}>{formatDate(rfq.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  )
}

// ── Sub-components ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#f9f9f9',
      border: '1px solid #eef1ed',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#151a17' }}>
        {label}{required && <span style={{ color: '#b42318' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ── Shared styles ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #d9e0d7',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  color: '#151a17',
  boxSizing: 'border-box',
}
