'use client'

import { useState, useEffect } from 'react'

/**
 * Admin Email/SMTP Settings page.
 *
 * SMTP credentials are stored in DaVinciOS_kv table (key-value store).
 * Only accessible by admin users. Fields are masked for security.
 */

const KV_KEYS = {
  SMTP_HOST: 'smtp_host',
  SMTP_PORT: 'smtp_port',
  SMTP_SECURE: 'smtp_secure',
  SMTP_USER: 'smtp_user',
  SMTP_PASS: 'smtp_pass',
  SMTP_FROM: 'smtp_from',
  SALES_EMAIL: 'smtp_sales_email',
}

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/settings/email', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config || {})
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  function updateField(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessageType('success')
        setMessage('SMTP settings saved successfully!')
      } else {
        setMessageType('error')
        setMessage(data.error || 'Failed to save')
      }
    } catch (err: any) {
      setMessageType('error')
      setMessage(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTestSending(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessageType('success')
        setMessage('✅ Test email sent! Check the inbox.')
      } else {
        setMessageType('error')
        setMessage(data.error || 'Test failed')
      }
    } catch (err: any) {
      setMessageType('error')
      setMessage(err.message || 'Test failed')
    } finally {
      setTestSending(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 20, color: '#999' }}>Loading email settings...</div>
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        📧 Email Configuration
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#667168' }}>
        Configure both outgoing (SMTP) and incoming (IMAP) mail servers.
        These settings replace .env variables at runtime.
      </p>

      {message && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 500,
          background: messageType === 'success' ? '#e8f5e9' : '#fef2f2',
          color: messageType === 'success' ? '#2e7d32' : '#dc2626',
        }}>
          {message}
        </div>
      )}

      {/* Outgoing Mail (SMTP) */}
      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📤</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#151a17' }}>Outgoing Mail (SMTP)</h3>
          <span style={{ fontSize: 11, color: '#667168' }}>Sends notifications, OTPs, and replies</span>
        </div>

        <Field
          label="SMTP Host"
          value={config[KV_KEYS.SMTP_HOST] || ''}
          placeholder="smtp.zoho.com"
          onChange={(v) => updateField(KV_KEYS.SMTP_HOST, v)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field
            label="SMTP Port"
            value={config[KV_KEYS.SMTP_PORT] || '587'}
            placeholder="587"
            onChange={(v) => updateField(KV_KEYS.SMTP_PORT, v)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: '#667168',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              SMTP Secure (TLS)
            </label>
            <select
              value={config[KV_KEYS.SMTP_SECURE] || 'false'}
              onChange={(e) => updateField(KV_KEYS.SMTP_SECURE, e.target.value)}
              style={{
                padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
                background: '#f7f9f6', color: '#151a17',
              }}
            >
              <option value="false">No (STARTTLS, port 587)</option>
              <option value="true">Yes (SSL/TLS, port 465)</option>
            </select>
          </div>
        </div>
        <Field
          label="SMTP Username"
          value={config[KV_KEYS.SMTP_USER] || ''}
          placeholder="sales@homeatelier.ph"
          onChange={(v) => updateField(KV_KEYS.SMTP_USER, v)}
          type="text"
        />
        <Field
          label="SMTP Password"
          value={config[KV_KEYS.SMTP_PASS] || ''}
          placeholder="Enter SMTP password"
          onChange={(v) => updateField(KV_KEYS.SMTP_PASS, v)}
          type="password"
          masked={true}
        />
        <Field
          label="From Email Address"
          value={config[KV_KEYS.SMTP_FROM] || ''}
          placeholder='"Home Atelier" <sales@homeatelier.ph>'
          onChange={(v) => updateField(KV_KEYS.SMTP_FROM, v)}
        />
      </div>

      {/* Incoming Mail (IMAP) */}
      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📥</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#151a17' }}>Incoming Mail (IMAP)</h3>
          <span style={{ fontSize: 11, color: '#667168' }}>Receives and syncs emails to the central inbox</span>
        </div>

        <Field
          label="IMAP Host"
          value={config['imap_host'] || ''}
          placeholder="imap.zoho.com"
          onChange={(v) => updateField('imap_host', v)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field
            label="IMAP Port"
            value={config['imap_port'] || '993'}
            placeholder="993"
            onChange={(v) => updateField('imap_port', v)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{
              fontSize: 12, fontWeight: 600, color: '#667168',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              IMAP Secure (SSL/TLS)
            </label>
            <select
              value={config['imap_secure'] ?? 'true'}
              onChange={(e) => updateField('imap_secure', e.target.value)}
              style={{
                padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
                background: '#f7f9f6', color: '#151a17',
              }}
            >
              <option value="true">Yes (SSL/TLS, port 993)</option>
              <option value="false">No (STARTTLS, port 143)</option>
            </select>
          </div>
        </div>
        <Field
          label="IMAP Username (Sales Email)"
          value={config['sales_email'] || config[KV_KEYS.SALES_EMAIL] || ''}
          placeholder="sales@homeatelier.ph"
          onChange={(v) => updateField('sales_email', v)}
        />
        <Field
          label="IMAP Password"
          value={config['sales_email_pass'] || ''}
          placeholder="Enter IMAP password (or app password)"
          onChange={(v) => updateField('sales_email_pass', v)}
          type="password"
          masked={true}
        />
        <div style={{ padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, fontSize: 12, color: '#1e40af', border: '1px solid #b8d6ff' }}>
          💡 For Zoho with MFA enabled, use an <strong>App Password</strong> generated from your Zoho account settings.
          The email sync runs on-demand via the "Sync Now" button in the Email Inbox app.
        </div>
      </div>

      {/* Sales Email (CC) */}
      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24,
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#151a17' }}>📋 Notification Recipients</h3>
        <Field
          label="Sales Notification Email"
          value={config[KV_KEYS.SALES_EMAIL] || ''}
          placeholder="sales@homeu.ph"
          onChange={(v) => updateField(KV_KEYS.SALES_EMAIL, v)}
        />
        <Field
          label="Admin Notification Email"
          value={config['notification_email'] || ''}
          placeholder="admin@homeu.ph"
          onChange={(v) => updateField('notification_email', v)}
        />
      </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 28px', background: saving ? '#999' : '#151a17', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={handleTest}
            disabled={testSending}
            style={{
              padding: '12px 28px', background: testSending ? '#ccc' : '#fff',
              color: '#151a17', border: '1.5px solid #d9e0d7', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              cursor: testSending ? 'not-allowed' : 'pointer',
            }}
          >
            {testSending ? 'Testing...' : '🔍 Send Test Email'}
          </button>
        </div>

    </div>
  )
}

function Field({
  label, value, placeholder, onChange, type = 'text', masked,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
  type?: string
  masked?: boolean
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 600, color: '#667168',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={masked && !showPassword ? 'password' : type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1.5px solid #d9e0d7', borderRadius: 10,
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            background: '#f7f9f6', color: '#151a17',
            boxSizing: 'border-box',
          }}
        />
        {masked && value && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#666',
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  )
}
