/**
 * Admin Redirect Detail/Edit Page
 *
 * Client component that loads redirect data and allows editing
 * source, target, type, and other fields.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────

interface RedirectData {
  id: string
  source: string
  target: string
  type: number
  status: string | null
  source_type: string | null
  priority: string | null
  verified: boolean | null
  notes: string | null
  created_at: string
  updated_at: string
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

// ── Component ────────────────────────────────────────────────────────

export default function EditRedirectPage() {
  const params = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Redirect data
  const [redirect, setRedirect] = useState<RedirectData | null>(null)

  // Form fields (editable)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [type, setType] = useState('301')
  const [status, setStatus] = useState('pending')
  const [sourceType, setSourceType] = useState('manual')
  const [priority, setPriority] = useState('medium')
  const [verified, setVerified] = useState(false)
  const [notes, setNotes] = useState('')

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const id = params?.id as string
        if (!id) throw new Error('Redirect ID not found')

        const res = await fetch(`/api/redirects/${id}`, { credentials: 'include' })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to load redirect')
        }

        const data: RedirectData = await res.json()
        setRedirect(data)
        setSource(data.source || '')
        setTarget(data.target || '')
        setType(String(data.type || 301))
        setStatus(data.status || 'pending')
        setSourceType(data.source_type || 'manual')
        setPriority(data.priority || 'medium')
        setVerified(data.verified || false)
        setNotes(data.notes || '')
      } catch (err: any) {
        setError(err.message || 'Failed to load redirect data')
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
      if (!id) throw new Error('Redirect ID not found')

      const payload: Record<string, any> = {
        source: source.trim(),
        target: target.trim(),
        type: parseInt(type),
      }

      // API PATCH only accepts source/target/type, but send extras
      // for future-proofing if the API is expanded
      if (status) payload.status = status
      if (sourceType) payload.source_type = sourceType
      if (priority) payload.priority = priority
      payload.verified = verified
      if (notes.trim()) payload.notes = notes.trim()

      const res = await fetch(`/api/redirects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update redirect')
      }

      setSuccess('Redirect updated successfully!')
      setTimeout(() => router.refresh(), 500)
    } catch (err: any) {
      setError(err.message || 'Failed to update redirect')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this redirect? This action cannot be undone.')) {
      return
    }

    setError('')
    setSuccess('')
    setDeleting(true)

    try {
      const id = params?.id as string
      if (!id) throw new Error('Redirect ID not found')

      const res = await fetch(`/api/redirects/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete redirect')
      }

      setSuccess('Redirect deleted! Redirecting...')
      setTimeout(() => {
        router.push('/admin/redirects')
        router.refresh()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to delete redirect')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────
  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: '#667168' }}>Loading redirect...</p>
      </main>
    )
  }

  if (error && !redirect) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#fee', color: '#b42318', padding: '16px', borderRadius: 6 }}>{error}</div>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/admin/redirects" style={{ color: '#667168' }}>&larr; Back to Redirects</Link>
        </p>
      </main>
    )
  }

  // ── Render form ───────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/redirects" style={{ color: '#667168' }}>Redirects</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>{redirect?.source}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#151a17' }}>Edit Redirect</h1>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 14 }}>
            ID: {params?.id} · Created: {redirect ? formatDate(redirect.created_at) : '—'}
          </p>
        </div>
        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: '10px 24px',
            background: deleting ? '#999' : '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: deleting ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting ? 'Deleting...' : '🗑️ Delete'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b42318', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#1a6d3e', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{success}</div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Section: URL Mapping ── */}
        <Section title="URL Mapping">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Source Path *" required>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                required
                style={inputStyle}
                placeholder="/old-products/chair-123"
              />
            </Field>
            <Field label="Target Path *" required>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                required
                style={inputStyle}
                placeholder="/products/ergonomic-chair"
              />
            </Field>
            <Field label="Redirect Type" required>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                style={inputStyle}
              >
                <option value="301">301 (Permanent)</option>
                <option value="302">302 (Temporary)</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="ignored">Ignored</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Section: Classification ── */}
        <Section title="Classification">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Source Type">
              <select
                value={sourceType}
                onChange={e => setSourceType(e.target.value)}
                style={inputStyle}
              >
                <option value="manual">Manual</option>
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="page">Page</option>
              </select>
            </Field>
            <Field label="SEO Priority">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={inputStyle}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Verified on Staging">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="verified"
                  checked={verified}
                  onChange={e => setVerified(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="verified" style={{ fontSize: 13, color: '#667168', cursor: 'pointer' }}>
                  Confirmed working on staging
                </label>
              </div>
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
            placeholder="Internal notes about this redirect..."
          />
        </Section>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, paddingBottom: 40 }}>
          <Link
            href="/admin/redirects"
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
