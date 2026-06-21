'use client'

import { useState, useEffect } from 'react'
import SettingsField from '@/components/admin/SettingsField'

export default function UrlsSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConfig(d.config?.urls || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/config?namespace=urls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'URL settings saved!' })
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>🔗 Site URLs</h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Public URLs used throughout the platform for links and redirects
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

      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <SettingsField label="Storefront URL" fieldKey="siteUrl" type="text" value={config.siteUrl || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="https://store.homeu.ph" hint="Public storefront URL" />
        <SettingsField label="Main Website URL" fieldKey="appUrl" type="text" value={config.appUrl || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="https://homeu.ph" hint="Main website URL" />
        <SettingsField label="Admin Server URL" fieldKey="serverUrl" type="text" value={config.serverUrl || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="https://admin.homeu.ph" hint="Admin backend URL (for webhooks)" />

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '12px 28px', background: '#151a17', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
