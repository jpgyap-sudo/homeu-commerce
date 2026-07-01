'use client'

import { useState, useEffect } from 'react'
import { getGlobalSettings } from '@/lib/theme-builder-settings'
import DynamicSettingsForm from '@/components/admin/DynamicSettingsForm'

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

export default function GlobalThemePage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [customCss, setCustomCss] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const globalSettingsDefs = getGlobalSettings()

  useEffect(() => {
    fetch('/api/admin/theme/global')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          // Extract customCss from the settings object
          if (data.customCss !== undefined) {
            setCustomCss(typeof data.customCss === 'string' ? data.customCss : '')
            delete data.customCss
          }
          setSettings(data)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/theme/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, customCss }),
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>🎨 Global Theme Settings</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--luxe-slate-400)' }}>
            Colors, typography, button styles, layout, and custom CSS that apply site-wide
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="luxe-btn luxe-btn-primary"
          style={{ textDecoration: 'none', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* ── Palette ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🎨 Color Palette</div>
        <div style={{ padding: 20 }}>
          <DynamicSettingsForm
            settings={globalSettingsDefs.filter(s => s.group === 'Palette')}
            config={settings}
            onChange={update}
          />
        </div>
      </div>

      {/* ── Typography ────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🔤 Typography</div>
        <div style={{ padding: 20 }}>
          <DynamicSettingsForm
            settings={globalSettingsDefs.filter(s => s.group === 'Typography')}
            config={settings}
            onChange={update}
          />
        </div>
      </div>

      {/* ── Buttons ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🔘 Buttons</div>
        <div style={{ padding: 20 }}>
          <DynamicSettingsForm
            settings={globalSettingsDefs.filter(s => s.group === 'Buttons')}
            config={settings}
            onChange={update}
          />
        </div>
      </div>

      {/* ── Layout ────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>📐 Layout</div>
        <div style={{ padding: 20 }}>
          <DynamicSettingsForm
            settings={globalSettingsDefs.filter(s => s.group === 'Layout')}
            config={settings}
            onChange={update}
          />
        </div>
      </div>

      {/* ── SEO ───────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🔍 SEO</div>
        <div style={{ padding: 20 }}>
          <DynamicSettingsForm
            settings={globalSettingsDefs.filter(s => s.group === 'SEO')}
            config={settings}
            onChange={update}
          />
        </div>
      </div>

      {/* ── Custom CSS ────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>⚙️ Custom CSS</div>
        <div style={{ padding: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#667168', marginBottom: 8 }}>
            Advanced: inject custom CSS rules that apply site-wide. Use with caution.
          </label>
          <textarea
            value={customCss}
            onChange={e => setCustomCss(e.target.value)}
            rows={12}
            style={{
              width: '100%',
              padding: '12px',
              border: '1.5px solid #d9e0d7',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              background: '#1a1a2e',
              color: '#e4e4e4',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
            placeholder="/* Add custom CSS rules here */"
          />
        </div>
      </div>
    </div>
  )
}
