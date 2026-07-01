'use client'

import { useState, useEffect } from 'react'

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d9e0d7',
  borderRadius: 12,
  marginBottom: 14,
  overflow: 'hidden',
}

const sectionTitle: React.CSSProperties = {
  padding: '16px 20px',
  fontSize: 14,
  fontWeight: 700,
  color: '#151a17',
  borderBottom: '1px solid #d9e0d7',
  background: '#fafbf9',
}

interface QuotationTheme {
  template: 'modern' | 'classic' | 'minimal'
  brandColor: string
  accentColor: string
  fontFamily: string
  headerLogo: string
  showHeaderLogo: boolean
  showCompanyName: boolean
  showAddress: boolean
  showTerms: boolean
  termsText: string
  footerText: string
  showPageNumbers: boolean
  showWatermark: boolean
  watermarkText: string
}

const DEFAULT_QUOTATION: QuotationTheme = {
  template: 'modern',
  brandColor: '#1a6d3e',
  accentColor: '#b88935',
  fontFamily: 'Inter, sans-serif',
  headerLogo: '',
  showHeaderLogo: true,
  showCompanyName: true,
  showAddress: true,
  showTerms: true,
  termsText: 'This quotation is valid for 15 days from the date of issue. Prices are subject to change without prior notice.',
  footerText: 'Thank you for choosing Home Atelier',
  showPageNumbers: true,
  showWatermark: false,
  watermarkText: 'DRAFT',
}

export default function QuotationThemePage() {
  const [settings, setSettings] = useState<QuotationTheme>(DEFAULT_QUOTATION)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/theme/quotation')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setSettings({ ...DEFAULT_QUOTATION, ...data })
        }
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/theme/quotation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {}
    setSaving(false)
  }

  function update(key: keyof QuotationTheme, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>📄 Quotation Template</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--luxe-slate-400)' }}>
            Customize the look and branding of PDF quotation documents sent to customers
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="luxe-btn luxe-btn-primary"
          style={{ textDecoration: 'none', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* ── Template ─────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>📋 Template Style</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 4 }}>PDF Template Design</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { value: 'modern', label: 'Modern', desc: 'Clean, minimal with brand accent bar' },
              { value: 'classic', label: 'Classic', desc: 'Traditional formal quotation layout' },
              { value: 'minimal', label: 'Minimal', desc: 'Stripped-down, no-frills design' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => update('template', opt.value)}
                style={{
                  padding: '14px 12px',
                  border: settings.template === opt.value ? '2px solid var(--luxe-sapphire)' : '1.5px solid #d9e0d7',
                  borderRadius: 10,
                  background: settings.template === opt.value ? '#eef6ff' : '#fbfcfa',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  fontSize: 24,
                  marginBottom: 6,
                  opacity: settings.template === opt.value ? 1 : 0.5,
                }}>
                  {opt.value === 'modern' ? '📄' : opt.value === 'classic' ? '📜' : '📋'}
                </div>
                <div style={{ fontSize: 13, fontWeight: settings.template === opt.value ? 700 : 500, color: '#151a17' }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: '#667168', marginTop: 4 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 4 }}>Font Family</label>
          <select
            value={settings.fontFamily}
            onChange={e => update('fontFamily', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1.5px solid #d9e0d7',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              background: '#fbfcfa',
              color: '#151a17',
              outline: 'none',
            }}
          >
            <option value="Inter, sans-serif">Inter</option>
            <option value="Playfair Display, serif">Playfair Display</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
          </select>
        </div>
      </div>

      {/* ── Colors ────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🎨 Brand Colors</div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ColorRow label="Brand Color" value={settings.brandColor} onChange={v => update('brandColor', v)} />
          <ColorRow label="Accent Color" value={settings.accentColor} onChange={v => update('accentColor', v)} />
        </div>
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>📌 Header</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow label="Show Company Logo" value={settings.showHeaderLogo} onChange={v => update('showHeaderLogo', v)} />
          <ToggleRow label="Show Company Name" value={settings.showCompanyName} onChange={v => update('showCompanyName', v)} />
          <ToggleRow label="Show Address" value={settings.showAddress} onChange={v => update('showAddress', v)} />
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🔻 Footer & Terms</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow label="Show Terms & Conditions" value={settings.showTerms} onChange={v => update('showTerms', v)} />
          {settings.showTerms && (
            <textarea
              value={settings.termsText}
              onChange={e => update('termsText', e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1.5px solid #d9e0d7',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                background: '#fbfcfa',
                color: '#151a17',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          )}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#3a4339', marginBottom: 4 }}>Footer Text</label>
          <input
            type="text"
            value={settings.footerText}
            onChange={e => update('footerText', e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1.5px solid #d9e0d7',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              background: '#fbfcfa',
              color: '#151a17',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <ToggleRow label="Show Page Numbers" value={settings.showPageNumbers} onChange={v => update('showPageNumbers', v)} />
        </div>
      </div>

      {/* ── Watermark ─────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🏷️ Watermark</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow label="Show Watermark" value={settings.showWatermark} onChange={v => update('showWatermark', v)} />
          {settings.showWatermark && (
            <input
              type="text"
              value={settings.watermarkText}
              onChange={e => update('watermarkText', e.target.value)}
              placeholder="DRAFT"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1.5px solid #d9e0d7',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                background: '#fbfcfa',
                color: '#151a17',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#3a4339' }}>{label}</label>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          border: 'none',
          background: value ? '#1a6d3e' : '#d9e0d7',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: value ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#3a4339', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid #d9e0d7', cursor: 'pointer', padding: 0 }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '7px 10px',
            border: '1.5px solid #d9e0d7',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
            background: '#fbfcfa',
            color: '#151a17',
            outline: 'none',
          }}
        />
      </div>
    </div>
  )
}
