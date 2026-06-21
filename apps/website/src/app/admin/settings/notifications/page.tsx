'use client'

import { useState, useEffect } from 'react'
import SettingsField from '@/components/admin/SettingsField'

export default function NotificationsSettingsPage() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setConfig(d.config?.messaging || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/config?namespace=messaging', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Notification settings saved!' })
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

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
    padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
  }
  const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600, color: '#151a17' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>🔔 Notifications</h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Configure messaging channels and chatbot preferences
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Telegram */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>🤖 Telegram Bot</h3>
          <p style={{ margin: '-8px 0 4px', fontSize: 12, color: '#667168' }}>
            Real-time alerts for new leads, RFQs, and escalations
          </p>
          <SettingsField label="Bot Token" fieldKey="telegramBotToken" type="password" value={config.telegramBotToken || ''} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} placeholder="123456:ABC-DEF..." />
          <SettingsField label="Chat ID" fieldKey="telegramChatId" type="text" value={config.telegramChatId || ''} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} placeholder="-1001234567890" />
        </div>

        {/* Viber */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>💬 Viber</h3>
          <p style={{ margin: '-8px 0 4px', fontSize: 12, color: '#667168' }}>
            Sales contact number for customer handoff
          </p>
          <SettingsField label="Viber Number" fieldKey="viberNumber" type="text" value={config.viberNumber || ''} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} placeholder="+639171234567" />
          <SettingsField label="Display Name" fieldKey="viberName" type="text" value={config.viberName || ''} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} placeholder="HomeU Sales Team" />
        </div>

        {/* Chat Widget */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>🌐 Website Chat Widget</h3>
          <SettingsField label="Enable Chat Widget" fieldKey="enableChat" type="checkbox" value={config.enableChat !== false} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} />
          <SettingsField label="Greeting Delay (ms)" fieldKey="greetingDelay" type="number" value={config.greetingDelay || 4000} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} hint="How long before the chat greeting appears" />
          <SettingsField label="Product Page Delay (ms)" fieldKey="productPageDelay" type="number" value={config.productPageDelay || 7000} onChange={(k, v) => setConfig((p: any) => ({ ...p, [k]: v }))} hint="Delay before product suggestions on product pages" />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
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
