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

export default function ProductThemePage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/theme/product')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') setSettings(data)
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/theme/product', {
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

  function update(key: string, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>📦 Product Page Theme</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--luxe-slate-400)' }}>
            Customize product details page, gallery, and collection grid appearance
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

      {/* ── Product Details ──────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>📋 Product Details Page</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            label="Show Breadcrumbs"
            value={settings.showBreadcrumbs !== false}
            onChange={v => update('showBreadcrumbs', v)}
          />
          <ToggleRow
            label="Show SKU"
            value={settings.showSku !== false}
            onChange={v => update('showSku', v)}
          />
          <ToggleRow
            label="Show Materials"
            value={settings.showMaterials !== false}
            onChange={v => update('showMaterials', v)}
          />
          <ToggleRow
            label="Show Dimensions"
            value={settings.showDimensions !== false}
            onChange={v => update('showDimensions', v)}
          />
          <ToggleRow
            label="Enable Image Zoom"
            value={settings.enableZoom !== false}
            onChange={v => update('enableZoom', v)}
          />
          <SliderRow
            label="Gallery Width"
            value={settings.galleryWidth ?? 50}
            min={30}
            max={70}
            step={5}
            unit="%"
            onChange={v => update('galleryWidth', v)}
          />
          <SliderRow
            label="Layout Spacing"
            value={settings.layoutGap ?? 40}
            min={20}
            max={80}
            step={4}
            unit="px"
            onChange={v => update('layoutGap', v)}
          />
          <TextInputRow
            label="Request Quote Button Text"
            value={settings.buttonText ?? 'Request Quote'}
            onChange={v => update('buttonText', v)}
          />
        </div>
      </div>

      {/* ── Collection / Product Grid ────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🔲 Collection / Product Grid</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SliderRow
            label="Grid Columns"
            value={settings.columns ?? 4}
            min={2}
            max={5}
            step={1}
            onChange={v => update('columns', v)}
          />
          <SliderRow
            label="Products Per Page"
            value={settings.pageSize ?? 24}
            min={8}
            max={48}
            step={4}
            onChange={v => update('pageSize', v)}
          />
          <SliderRow
            label="Grid Spacing"
            value={settings.gridGap ?? 36}
            min={12}
            max={72}
            step={4}
            unit="px"
            onChange={v => update('gridGap', v)}
          />
          <ToggleRow
            label="Show Sidebar Filters"
            value={settings.showFilters !== false}
            onChange={v => update('showFilters', v)}
          />
          <ToggleRow
            label="Show Sorting Dropdown"
            value={settings.showSort !== false}
            onChange={v => update('showSort', v)}
          />
          <ToggleRow
            label="Show Reviews / Ratings"
            value={settings.showRating !== false}
            onChange={v => update('showRating', v)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Reusable helpers ─────────────────────────────────────────────────

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

function TextInputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#3a4339', marginBottom: 4 }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
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
