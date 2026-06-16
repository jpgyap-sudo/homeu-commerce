/**
 * Admin Redirect Create Page
 *
 * Client component for creating a new redirect.
 * Saves via POST /api/redirects and redirects to the edit page on success.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Component ────────────────────────────────────────────────────────

export default function NewRedirectPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [type, setType] = useState('301')
  const [status, setStatus] = useState('pending')
  const [sourceType, setSourceType] = useState('manual')
  const [priority, setPriority] = useState('medium')
  const [verified, setVerified] = useState(false)
  const [notes, setNotes] = useState('')

  // ── Save ───────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      if (!source.trim()) {
        throw new Error('Source path is required.')
      }
      if (!target.trim()) {
        throw new Error('Target path is required.')
      }

      const body: Record<string, any> = {
        source: source.trim(),
        target: target.trim(),
        type: parseInt(type),
      }

      // API only accepts source/target/type, but we send extras
      // so the DB insert can include all columns if the API supports it
      if (status) body.status = status
      if (sourceType) body.source_type = sourceType
      if (priority) body.priority = priority
      body.verified = verified
      if (notes.trim()) body.notes = notes.trim()

      const res = await fetch('/api/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create redirect')
      }

      const result = await res.json()
      const redirectId = result.redirect?.id

      if (redirectId) {
        setSuccess(`Redirect "${result.redirect?.source}" → "${result.redirect?.target}" created!`)
        setTimeout(() => {
          router.push(`/admin/redirects/${redirectId}`)
          router.refresh()
        }, 800)
      } else {
        setTimeout(() => {
          router.push('/admin/redirects')
          router.refresh()
        }, 800)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create redirect')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/redirects" style={{ color: '#667168' }}>Redirects</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>New Redirect</span>
      </div>

      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#151a17' }}>Create New Redirect</h1>
      <p style={{ color: '#667168', marginBottom: 32, fontSize: 14 }}>
        Map an old URL path to a new one. Required fields are marked with an asterisk (*).
      </p>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b42318', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#e8f5e9', color: '#1a6d3e', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>{success}</div>
      )}

      <form onSubmit={handleSave}>
        {/* ── Section: Redirect Mapping ── */}
        <Section title="URL Mapping">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Source Path *" required>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                required
                placeholder="e.g. /old-products/chair-123"
                style={inputStyle}
              />
            </Field>
            <Field label="Target Path *" required>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                required
                placeholder="e.g. /products/ergonomic-chair"
                style={inputStyle}
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
            placeholder="Any notes about this redirect (e.g. why it was set up, traffic estimates)..."
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
            Cancel
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
            {saving ? 'Creating...' : 'Create Redirect'}
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
