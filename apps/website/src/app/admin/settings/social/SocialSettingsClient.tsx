'use client'

import { useState, useEffect } from 'react'
import type { SocialConfig } from '@/app/api/admin/settings/social/route'

interface SocialConfigAPI {
  config: SocialConfig & {
    fb_webhook_callback_url?: string
    ig_webhook_callback_url?: string
  }
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
  background: '#f7f9f6', color: '#151a17', width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}

export default function SocialSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/settings/social', { credentials: 'include' })
        if (res.ok) {
          const data: SocialConfigAPI = await res.json()
          const c = data.config as any
          // Set form fields from config
          const form: Record<string, string> = {}
          for (const key of Object.keys(c)) {
            if (typeof c[key] === 'string') form[key] = c[key]
          }
          setConfig(form)
          if (c.fb_webhook_callback_url || c.ig_webhook_callback_url) {
            setWebhookUrls({
              fb: c.fb_webhook_callback_url || '',
              ig: c.ig_webhook_callback_url || '',
            })
          }
        }
      } catch (err) {
        console.error('Failed to load social settings:', err)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/settings/social', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Social channel settings saved!' })
      } else {
        const errData = await res.json()
        setMsg({ type: 'error', text: errData.error || 'Failed to save' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  function setField(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const FB_FIELDS = [
    { key: 'fb_app_id', label: 'Facebook App ID', placeholder: '123456789012345', secret: false },
    { key: 'fb_app_secret', label: 'Facebook App Secret', placeholder: 'a1b2c3d4e5f6...', secret: true },
    { key: 'fb_page_id', label: 'Facebook Page ID', placeholder: '123456789012345', secret: false },
    { key: 'fb_page_access_token', label: 'Facebook Page Access Token', placeholder: 'EAAB...', secret: true },
    { key: 'fb_webhook_verify_token', label: 'Webhook Verify Token', placeholder: 'your-verify-token', secret: true },
  ]

  const IG_FIELDS = [
    { key: 'ig_business_account_id', label: 'Instagram Business Account ID', placeholder: '178414...', secret: false },
    { key: 'ig_access_token', label: 'Instagram Access Token', placeholder: 'IGQVJ...', secret: true },
  ]

  function WebhookCard({ title, url, statusField, label }: { title: string; url: string; statusField: string; label: string }) {
    const isActive = config[statusField] === 'true'
    return (
      <div style={{ padding: 'var(--space-4)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--luxe-warm-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? '#059669' : '#d9e0d7', display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          <span className={`luxe-badge ${isActive ? 'success' : 'neutral'}`}>{isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={labelStyle}>Callback URL</div>
          <code style={{ fontSize: 11, wordBreak: 'break-all', color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: 4 }}>
            {url}
          </code>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setField(statusField, e.target.checked ? 'true' : 'false')}
            style={{ accentColor: '#1a6d3e' }}
          />
          Mark as active (webhook registered)
        </label>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        🌐 Social Channels
      </h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Connect Facebook Messenger and Instagram to receive messages in the Central Inbox
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

        {/* ── Setup Instructions ─────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f4ff, #e8f4fd)',
          border: '1px solid #b8d6ff', borderRadius: 12, padding: 20,
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e40af' }}>
            📋 Setup Instructions — Do this in Meta Developer Console
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#1e3a5f', lineHeight: 1.8 }}>
            <li><strong>Go to</strong> <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" style={{ color: '#2563eb' }}>Meta Developer Console</a> → Create App or select your existing app</li>
            <li><strong>Add Product:</strong> "Messenger" — then go to Settings → Webhooks</li>
            <li><strong>Add Product:</strong> "Instagram Graph API" — then go to Webhooks</li>
            <li><strong>Generate a Page Access Token:</strong> In Messenger → Tools → Access Tokens → select your Page</li>
            <li><strong>Find your Page ID:</strong> Go to your Facebook Page → About → Page ID (or use the Meta Business Suite)</li>
            <li><strong>Find Instagram Business Account ID:</strong> Use the Graph API Explorer with your IG Business account connected</li>
            <li>Fill in all the fields below with the values from Meta, then copy the callback URLs into Meta's webhook configuration</li>
          </ol>
        </div>

        {/* ── Facebook Messenger ─────────────────────────────── */}
        <div style={{
          background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>💬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#151a17' }}>Facebook Messenger</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#667168' }}>Requires a Meta App with Messenger product added</p>
            </div>
          </div>

          {FB_FIELDS.map(field => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.secret ? 'password' : 'text'}
                value={config[field.key] || ''}
                onChange={e => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </div>
          ))}

          {webhookUrls.fb && (
            <WebhookCard
              title="Facebook Webhook"
              url={webhookUrls.fb}
              statusField="fb_webhook_active"
              label="Facebook"
            />
          )}
        </div>

        {/* ── Instagram ──────────────────────────────────────── */}
        <div style={{
          background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📸</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#151a17' }}>Instagram Messaging</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#667168' }}>Requires Instagram Business Account connected to Facebook Page</p>
            </div>
          </div>

          {IG_FIELDS.map(field => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.secret ? 'password' : 'text'}
                value={config[field.key] || ''}
                onChange={e => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </div>
          ))}

          {webhookUrls.ig && (
            <WebhookCard
              title="Instagram Webhook"
              url={webhookUrls.ig}
              statusField="ig_webhook_active"
              label="Instagram"
            />
          )}
        </div>

        {/* ── Save Button ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 28px', background: '#151a17', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
