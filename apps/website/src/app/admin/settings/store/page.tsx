'use client'

import { useState, useEffect } from 'react'
import SettingsField from '@/components/admin/SettingsField'

export default function StoreSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConfig(d.config?.store || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/config?namespace=store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Store settings saved!' })
      } else {
        const d = await res.json()
        setMsg({ type: 'error', text: d.error || 'Failed to save' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const FIELDS: { key: string; label: string; type: 'text' | 'textarea' | 'password'; hint?: string }[] = [
    { key: 'name', label: 'Store Name', type: 'text' },
    { key: 'displayName', label: 'Display Name', type: 'text' },
    { key: 'email', label: 'Contact Email', type: 'text' },
    { key: 'phone', label: 'Phone Number', type: 'text' },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'currency', label: 'Currency', type: 'text', hint: 'e.g. PHP (₱)' },
    { key: 'timezone', label: 'Timezone', type: 'text', hint: 'e.g. Asia/Manila (UTC+8)' },
    { key: 'bankDetails', label: 'Bank Details (for quotations)', type: 'textarea', hint: 'Appears on all quotation PDFs' },
  ]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>🏪 Store Profile</h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Branding, contact info, and business details
      </p>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: msg.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: 13, fontWeight: 500,
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {FIELDS.map(f => (
          <SettingsField
            key={f.key}
            label={f.label}
            fieldKey={f.key}
            type={f.type}
            value={config[f.key] || ''}
            onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))}
            hint={f.hint}
          />
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '12px 28px', background: '#151a17', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
