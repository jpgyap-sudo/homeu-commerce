'use client'

import { useState } from 'react'

const FIELD_STYLE: React.CSSProperties = {
  padding: '12px 14px', border: '1.5px solid #d9e0d7', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
}
const LABEL_STYLE: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }

export default function DesignerClubForm() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', position: '', email: '',
    companyName: '', companyAddress: '', contactNumber: '', companySocials: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const res = await fetch('/api/designer-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to submit')
      }
      setStatus('success')
    } catch (err: any) {
      setStatus('error')
      setError(err.message)
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f7f9f6', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 8px' }}>Thank you for applying!</h3>
        <p style={{ margin: 0, color: '#667168' }}>Our team will review your application and get back to you shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 8px' }}>Join the Designer Club</h2>
      <p style={{ textAlign: 'center', color: '#667168', margin: '0 0 16px' }}>
        For interior designers, architects, and trade professionals.
      </p>

      {error && <div style={{ padding: 12, background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>First Name *</label>
          <input required value={form.firstName} onChange={e => update('firstName', e.target.value)} style={FIELD_STYLE} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>Last Name *</label>
          <input required value={form.lastName} onChange={e => update('lastName', e.target.value)} style={FIELD_STYLE} />
        </div>
      </div>

      <div>
        <label style={LABEL_STYLE}>Position *</label>
        <input required value={form.position} onChange={e => update('position', e.target.value)} style={FIELD_STYLE} placeholder="e.g. Interior Designer, Architect" />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>Email *</label>
          <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} style={FIELD_STYLE} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={LABEL_STYLE}>Company Name *</label>
          <input required value={form.companyName} onChange={e => update('companyName', e.target.value)} style={FIELD_STYLE} />
        </div>
      </div>

      <div>
        <label style={LABEL_STYLE}>Company Address *</label>
        <input required value={form.companyAddress} onChange={e => update('companyAddress', e.target.value)} style={FIELD_STYLE} />
      </div>

      <div>
        <label style={LABEL_STYLE}>Contact Number *</label>
        <input required value={form.contactNumber} onChange={e => update('contactNumber', e.target.value)} style={FIELD_STYLE} />
      </div>

      <div>
        <label style={LABEL_STYLE}>Company Socials (Website, Instagram, Facebook, etc.) *</label>
        <input required value={form.companySocials} onChange={e => update('companySocials', e.target.value)} style={FIELD_STYLE} />
      </div>

      <button type="submit" disabled={status === 'submitting'} style={{
        padding: '14px 28px', background: '#151a17', color: '#fff', border: 'none',
        borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
        opacity: status === 'submitting' ? 0.7 : 1, marginTop: 8,
      }}>
        {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  )
}
