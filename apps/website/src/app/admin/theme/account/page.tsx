'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_CUSTOMER_ACCOUNT_THEME, type CustomerAccountTheme } from '@/lib/customer-account-theme'

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

const LAYOUT_OPTIONS = [
  { value: 'concierge', label: 'Concierge', desc: 'Modern sidebar layout with panels' },
  { value: 'classic', label: 'Classic', desc: 'Traditional dashboard layout' },
]

const NAV_OPTIONS = [
  { value: 'sidebar', label: 'Sidebar', desc: 'Vertical navigation sidebar' },
  { value: 'tabs', label: 'Tabs', desc: 'Horizontal tab navigation' },
]

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable', desc: 'More padding, relaxed spacing' },
  { value: 'compact', label: 'Compact', desc: 'Tighter spacing, denser layout' },
]

const CARD_OPTIONS = [
  { value: 'soft', label: 'Soft', desc: 'Rounded corners with subtle shadow' },
  { value: 'flat', label: 'Flat', desc: 'No shadow, clean flat design' },
]

export default function AccountThemePage() {
  const [theme, setTheme] = useState<CustomerAccountTheme>(DEFAULT_CUSTOMER_ACCOUNT_THEME)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/theme/account')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setTheme({ ...DEFAULT_CUSTOMER_ACCOUNT_THEME, ...data })
        }
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/theme/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {}
    setSaving(false)
  }

  function update(key: keyof CustomerAccountTheme, value: any) {
    setTheme(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>👤 Customer Account Theme</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--luxe-slate-400)' }}>
            Customize the look and feel of your customer account portal
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

      {/* ── Layout ───────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>📐 Layout & Navigation</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChipGroup label="Dashboard Layout" options={LAYOUT_OPTIONS} value={theme.layout} onChange={v => update('layout', v)} />
          <ChipGroup label="Navigation Style" options={NAV_OPTIONS} value={theme.navStyle} onChange={v => update('navStyle', v)} />
          <ChipGroup label="Density" options={DENSITY_OPTIONS} value={theme.density} onChange={v => update('density', v)} />
          <ChipGroup label="Card Style" options={CARD_OPTIONS} value={theme.cardStyle} onChange={v => update('cardStyle', v)} />
          <SliderRow label="Border Radius" value={theme.radius} min={0} max={24} step={2} unit="px" onChange={v => update('radius', v)} />
          <TextInputRow label="Welcome Label" value={theme.welcomeLabel} onChange={v => update('welcomeLabel', v)} placeholder="My HomeU" />
        </div>
      </div>

      {/* ── Colors ────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🎨 Color Scheme</div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ColorRow label="Surface Color" value={theme.surfaceColor} onChange={v => update('surfaceColor', v)} />
          <ColorRow label="Panel Color" value={theme.panelColor} onChange={v => update('panelColor', v)} />
          <ColorRow label="Text Color" value={theme.textColor} onChange={v => update('textColor', v)} />
          <ColorRow label="Muted Text Color" value={theme.mutedColor} onChange={v => update('mutedColor', v)} />
          <ColorRow label="Accent Color" value={theme.accentColor} onChange={v => update('accentColor', v)} />
          <ColorRow label="Secondary Accent" value={theme.secondaryAccentColor} onChange={v => update('secondaryAccentColor', v)} />
          <ColorRow label="Border Color" value={theme.borderColor} onChange={v => update('borderColor', v)} />
        </div>
      </div>
    </div>
  )
}

// ── Helper Components ─────────────────────────────────────────────────

function ChipGroup({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string; desc: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 8 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '8px 16px',
              border: value === opt.value ? '2px solid var(--luxe-sapphire)' : '1.5px solid #d9e0d7',
              borderRadius: 8,
              background: value === opt.value ? '#eef6ff' : '#fbfcfa',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: value === opt.value ? 700 : 500, color: '#151a17' }}>{opt.label}</div>
            <div style={{ fontSize: 10, color: '#667168', marginTop: 2 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
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

function SliderRow({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#3a4339' }}>{label}</label>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#151a17', fontFamily: 'monospace' }}>{value}{unit || ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#1a6d3e' }}
      />
    </div>
  )
}

function TextInputRow({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#3a4339', marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
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
    </div>
  )
}
