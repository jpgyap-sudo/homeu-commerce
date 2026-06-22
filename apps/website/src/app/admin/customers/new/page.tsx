/**
 * Admin Customer Create Page
 *
 * Client component for creating a new customer.
 * Saves via POST /api/customers and redirects to the edit page on success.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Component ────────────────────────────────────────────────────────

export default function NewCustomerPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  // Quick tag toggles
  const QUICK_TAGS = ['designer', 'vip', 'wholesale', 'architect', 'contractor']
  function toggleQuickTag(tag: string) {
    const current = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : []
    const idx = current.indexOf(tag)
    if (idx >= 0) current.splice(idx, 1)
    else current.push(tag)
    setTagsInput(current.join(', '))
  }

  // ── Save ───────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      if (!name.trim()) {
        throw new Error('Customer name is required.')
      }
      if (!email.trim()) {
        throw new Error('Email address is required.')
      }

      const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : []
      const body = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        notes: notes.trim() || null,
        tags: tags.length > 0 ? tags : null,
      }

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create customer')
      }

      const result = await res.json()
      const customerId = result.customer?.id

      if (customerId) {
        setSuccess(`Customer "${result.customer?.name}" created!`)
        setTimeout(() => {
          router.push(`/admin/customers/${customerId}`)
          router.refresh()
        }, 800)
      } else {
        setTimeout(() => {
          router.push('/admin/customers')
          router.refresh()
        }, 800)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <Link href="/admin/customers" style={{ color: '#667168' }}>Customers</Link>
        <span style={{ color: '#999', margin: '0 8px' }}>/</span>
        <span style={{ color: '#151a17', fontWeight: 600 }}>New Customer</span>
      </div>

      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#151a17' }}>Create New Customer</h1>
      <p style={{ color: '#667168', marginBottom: 32, fontSize: 14 }}>
        Fill in the customer details below. Required fields are marked with an asterisk (*).
      </p>

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
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Juan Dela Cruz"
                style={inputStyle}
              />
            </Field>
            <Field label="Email *" required>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="e.g. juan@example.com"
                style={inputStyle}
              />
            </Field>
            <Field label="Phone">
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="+63 XXX XXX XXXX"
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                style={inputStyle}
                placeholder="Company name (optional)"
              />
            </Field>
          </div>
        </Section>

        {/* ── Section: Tags ── */}
        <Section title="Tags">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {QUICK_TAGS.map(tag => {
                const active = (tagsInput || '').split(',').map(t => t.trim()).includes(tag)
                return (
                  <button key={tag} type="button" onClick={() => toggleQuickTag(tag)} style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: active ? '2px solid #1a6d3e' : '1.5px solid #d9e0d7',
                    background: active ? '#e8f2ec' : '#fff',
                    color: active ? '#1a6d3e' : '#667168',
                    transition: 'all 0.1s',
                  }}>
                    {active ? '✓ ' : ''}{tag}
                  </button>
                )
              })}
            </div>
            <Field label="Custom Tags (comma-separated)">
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="e.g. designer, vip, contractor"
                style={inputStyle}
              />
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
            placeholder="Any notes about this customer..."
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
            {saving ? 'Creating...' : 'Create Customer'}
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
