'use client'

import { useState, useEffect } from 'react'
import SettingsField from '@/components/admin/SettingsField'

export default function CdnSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConfig(d.config?.cdn || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/config?namespace=cdn', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'CDN settings saved!' })
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
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>☁️ CDN / Storage</h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        DigitalOcean Spaces configuration for media storage and CDN delivery
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
        <SettingsField label="Spaces Key" fieldKey="doSpacesKey" type="password" value={config.doSpacesKey || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="DO00..." hint="DigitalOcean Spaces access key ID" />
        <SettingsField label="Spaces Secret" fieldKey="doSpacesSecret" type="password" value={config.doSpacesSecret || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="..." hint="DigitalOcean Spaces secret access key" />
        <SettingsField label="Bucket Name" fieldKey="doSpacesBucket" type="text" value={config.doSpacesBucket || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="homeatelierspaces" hint="Your DO Spaces bucket name" />
        <SettingsField label="Endpoint" fieldKey="doSpacesEndpoint" type="text" value={config.doSpacesEndpoint || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="sgp1.digitaloceanspaces.com" hint="Spaces endpoint hostname (without https://)" />
        <SettingsField label="CDN Endpoint" fieldKey="doSpacesCdnEndpoint" type="text" value={config.doSpacesCdnEndpoint || ''} onChange={(k, v) => setConfig(prev => ({ ...prev, [k]: v }))} placeholder="https://..." hint="Full CDN URL (with https://)" />

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
