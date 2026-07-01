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

interface MobileTheme {
  mobileNavStyle: 'tabs' | 'debut'
  showBottomBar: boolean
  bottomBarStyle: 'modern' | 'classic'
  showSearch: boolean
  heroStyle: 'default' | 'minimal'
  quickActionPills: boolean
  categoryChips: boolean
  stickyHeader: boolean
}

const DEFAULT_MOBILE: MobileTheme = {
  mobileNavStyle: 'tabs',
  showBottomBar: true,
  bottomBarStyle: 'modern',
  showSearch: true,
  heroStyle: 'default',
  quickActionPills: true,
  categoryChips: true,
  stickyHeader: true,
}

export default function MobileThemePage() {
  const [settings, setSettings] = useState<MobileTheme>(DEFAULT_MOBILE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/theme/mobile')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setSettings({ ...DEFAULT_MOBILE, ...data })
        }
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/theme/mobile', {
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

  function update(key: keyof MobileTheme, value: any) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>📱 Mobile Theme</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--luxe-slate-400)' }}>
            Customize the mobile browsing experience — navigation, bottom bar, search
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

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🧭 Navigation</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 4 }}>Mobile Navigation Style</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { value: 'tabs', label: '📱 Tabs', desc: '5-tab bottom bar (Home, Products, RFQ, Account, Menu) + custom mobile hero' },
              { value: 'debut', label: '🏪 Debut', desc: 'Classic Shopify Debut-style — hamburger drawer, real homepage sections' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => update('mobileNavStyle', opt.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: settings.mobileNavStyle === opt.value ? '2px solid var(--luxe-sapphire)' : '1.5px solid #d9e0d7',
                  borderRadius: 10,
                  background: settings.mobileNavStyle === opt.value ? '#eef6ff' : '#fbfcfa',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: settings.mobileNavStyle === opt.value ? 700 : 500, color: '#151a17' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#667168', marginTop: 4 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <ToggleRow label="Sticky Header on Mobile" value={settings.stickyHeader} onChange={v => update('stickyHeader', v)} />
          <ToggleRow label="Show Search Bar" value={settings.showSearch} onChange={v => update('showSearch', v)} />
        </div>
      </div>

      {/* ── Bottom Bar ────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🔘 Bottom Tab Bar</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow label="Show Bottom Tab Bar" value={settings.showBottomBar} onChange={v => update('showBottomBar', v)} />

          {settings.showBottomBar && (
            <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 4 }}>Bottom Bar Style</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { value: 'modern', label: 'Modern', desc: 'Rounded floating bar with icons + labels' },
                  { value: 'classic', label: 'Classic', desc: 'Traditional fixed bottom bar' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => update('bottomBarStyle', opt.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: settings.bottomBarStyle === opt.value ? '2px solid var(--luxe-sapphire)' : '1.5px solid #d9e0d7',
                      borderRadius: 8,
                      background: settings.bottomBarStyle === opt.value ? '#eef6ff' : '#fbfcfa',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#151a17' }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: '#667168', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile Hero ───────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionTitle}>🖼️ Mobile Homepage Hero</div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4339', marginBottom: 4 }}>Hero Style (tabs mode only)</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { value: 'default', label: 'Default', desc: 'Welcome hero + quick-action pills + category chips' },
              { value: 'minimal', label: 'Minimal', desc: 'Clean, compact hero with just the essentials' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => update('heroStyle', opt.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: settings.heroStyle === opt.value ? '2px solid var(--luxe-sapphire)' : '1.5px solid #d9e0d7',
                  borderRadius: 8,
                  background: settings.heroStyle === opt.value ? '#eef6ff' : '#fbfcfa',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#151a17' }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: '#667168', marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <ToggleRow label="Show Quick-Action Pills" value={settings.quickActionPills} onChange={v => update('quickActionPills', v)} />
          <ToggleRow label="Show Category Chips" value={settings.categoryChips} onChange={v => update('categoryChips', v)} />
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
