'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { StoreTheme } from '@/lib/store-themes'

type SnapshotSection = StoreTheme['snapshot']['sections'][number]

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d9e0d7',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
}

const codeStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 180,
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.5,
}

export default function ThemeSnapshotEditor({ initialTheme }: { initialTheme: StoreTheme }) {
  const [theme, setTheme] = useState(initialTheme)
  const [name, setName] = useState(initialTheme.name)
  const [sections, setSections] = useState<SnapshotSection[]>(initialTheme.snapshot.sections || [])
  const [settingsText, setSettingsText] = useState(JSON.stringify(initialTheme.snapshot.settings || {}, null, 2))
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [configText, setConfigText] = useState<Record<number, string>>(() => {
    const out: Record<number, string> = {}
    ;(initialTheme.snapshot.sections || []).forEach((section, index) => {
      out[index] = JSON.stringify(section.config || {}, null, 2)
    })
    return out
  })
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ section: SnapshotSection; index: number }>>()
    sections.forEach((section, index) => {
      const template = section.template || 'index'
      const list = map.get(template) || []
      list.push({ section, index })
      map.set(template, list)
    })
    return Array.from(map.entries())
  }, [sections])

  function flash(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 2600)
  }

  function updateSection(index: number, patch: Partial<SnapshotSection>) {
    setSections(prev => prev.map((section, i) => i === index ? { ...section, ...patch } : section))
  }

  function saveConfig(index: number) {
    try {
      const parsed = JSON.parse(configText[index] || '{}')
      updateSection(index, { config: parsed })
      flash('Section config applied')
    } catch (err: any) {
      flash(err.message || 'Invalid section JSON')
    }
  }

  async function saveTheme() {
    setSaving(true)
    try {
      const settings = JSON.parse(settingsText || '{}')
      const snapshot = {
        ...theme.snapshot,
        capturedAt: new Date().toISOString(),
        sections,
        settings,
      }
      const res = await fetch(`/api/admin/online-store/themes/${theme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, snapshot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setTheme(data.theme)
      flash('Theme snapshot saved')
    } catch (err: any) {
      flash(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ maxWidth: 1180, margin: '34px auto', padding: '0 24px 56px', fontFamily: 'Inter, sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50, padding: '10px 14px', background: '#151a17', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px' }}>
          <Link href="/admin/online-store" style={{ color: '#667168', fontSize: 13, textDecoration: 'none' }}>Back to Online Store</Link>
          <h1 style={{ margin: '10px 0 8px', fontSize: 28, fontWeight: 850, color: '#151a17' }}>Edit theme snapshot</h1>
          <input value={name} onChange={event => setName(event.target.value)} style={{ ...inputStyle, maxWidth: 520, fontWeight: 800 }} />
          <p style={{ margin: '10px 0 0', color: '#667168', fontSize: 14 }}>
            {theme.role === 'mobile_live' ? 'This is the current live mobile theme used for phone visitors.' : 'This draft is saved separately from the live storefront.'}
          </p>
        </div>
        <button onClick={saveTheme} disabled={saving} className="luxe-btn luxe-btn-primary">
          {saving ? 'Saving' : 'Save theme'}
        </button>
      </div>

      <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: 18, borderBottom: '1px solid #eef1ed' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#151a17' }}>Theme settings</h2>
          <p style={{ margin: '5px 0 0', color: '#667168', fontSize: 13 }}>Header, palette, CSS, and navigation values stored with this snapshot.</p>
        </div>
        <div style={{ padding: 18 }}>
          <textarea value={settingsText} onChange={event => setSettingsText(event.target.value)} style={{ ...codeStyle, minHeight: 220 }} />
        </div>
      </section>

      <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 18, borderBottom: '1px solid #eef1ed' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#151a17' }}>Sections</h2>
          <p style={{ margin: '5px 0 0', color: '#667168', fontSize: 13 }}>Edit section config JSON, visibility, template, and ordering data for this saved theme only.</p>
        </div>

        {grouped.map(([template, items]) => (
          <div key={template} style={{ borderBottom: '1px solid #eef1ed' }}>
            <div style={{ padding: '12px 18px', background: '#f7f9f6', color: '#3a4339', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
              {template}
            </div>
            {items.map(({ section, index }) => {
              const open = openIndex === index
              return (
                <div key={`${template}-${index}`} style={{ borderTop: '1px solid #eef1ed', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <strong style={{ minWidth: 170, color: '#151a17' }}>{section.type}</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#667168' }}>
                      <input type="checkbox" checked={section.enabled !== false} onChange={event => updateSection(index, { enabled: event.target.checked })} />
                      {section.enabled !== false ? 'Shown' : 'Hidden'}
                    </label>
                    <input
                      value={section.template || 'index'}
                      onChange={event => updateSection(index, { template: event.target.value })}
                      style={{ ...inputStyle, width: 140 }}
                    />
                    <input
                      type="number"
                      value={section.position}
                      onChange={event => updateSection(index, { position: Number(event.target.value) || 0 })}
                      style={{ ...inputStyle, width: 100 }}
                    />
                    <button onClick={() => setOpenIndex(open ? null : index)} className="luxe-btn luxe-btn-ghost">
                      {open ? 'Close' : 'Edit config'}
                    </button>
                  </div>
                  {open && (
                    <div style={{ marginTop: 14 }}>
                      <textarea value={configText[index] || '{}'} onChange={event => setConfigText(prev => ({ ...prev, [index]: event.target.value }))} style={codeStyle} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button onClick={() => saveConfig(index)} className="luxe-btn luxe-btn-ghost">Apply config</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </section>
    </main>
  )
}
