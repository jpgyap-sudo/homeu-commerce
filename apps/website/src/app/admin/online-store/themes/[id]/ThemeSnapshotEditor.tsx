'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { StoreTheme } from '@/lib/store-themes'

type SnapshotSection = StoreTheme['snapshot']['sections'][number]
type TemplateKey = 'index' | 'product' | 'collection'

const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d9e0d7',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const codeStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 160,
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.5,
}

const sectionPriority: Record<string, number> = {
  promo_bar: 0,
  slideshow: 10,
  video_hero: 12,
  category_carousel: 20,
  collection_grid: 22,
  featured_products: 30,
  image_bar: 40,
  image_with_text: 50,
  brand_text: 60,
  lookbook: 70,
  reviews: 80,
  testimonial: 82,
  instagram: 90,
  newsletter: 100,
  cta: 110,
  footer_brand: 900,
  footer_quick_links: 910,
  footer_newsletter: 920,
  footer_social: 930,
}

function parseJsonObject(text: string): Record<string, any> {
  const parsed = JSON.parse(text || '{}')
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

function paletteFromSettings(settings: Record<string, any>) {
  const palette: Record<string, any> = {}
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith('theme_')) continue
    palette[key.replace('theme_', '')] = value
  }
  return palette
}

function previewUrl(template: TemplateKey, key: number, baseUrl: string) {
  const suffix = `preview=${key}&suppressChat=1`
  if (template === 'product') return `${baseUrl}/products/outline-chaise-sofa?${suffix}`
  if (template === 'collection') return `${baseUrl}/products?${suffix}`
  return `${baseUrl}/?${suffix}`
}

export default function ThemeSnapshotEditor({ initialTheme }: { initialTheme: StoreTheme }) {
  const [theme, setTheme] = useState(initialTheme)
  const [name, setName] = useState(initialTheme.name)
  const [sections, setSections] = useState<SnapshotSection[]>(initialTheme.snapshot.sections || [])
  const [settingsText, setSettingsText] = useState(JSON.stringify(initialTheme.snapshot.settings || {}, null, 2))
  const [currentTemplate, setCurrentTemplate] = useState<TemplateKey>('index')
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [configText, setConfigText] = useState<Record<number, string>>(() => {
    const out: Record<number, string> = {}
    ;(initialTheme.snapshot.sections || []).forEach((section, index) => {
      out[index] = JSON.stringify(section.config || {}, null, 2)
    })
    return out
  })
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const settings = useMemo(() => {
    try { return parseJsonObject(settingsText) } catch { return {} }
  }, [settingsText])

  const templateItems = useMemo(() => {
    return sections
      .map((section, index) => ({ section, index }))
      .filter(item => (item.section.template || 'index') === currentTemplate)
      .sort((a, b) => (a.section.position || 0) - (b.section.position || 0) || a.index - b.index)
  }, [sections, currentTemplate])

  const previewRoot = mounted && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? window.location.origin
    : STOREFRONT_BASE_URL

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const nextSettings = parseJsonObject(settingsText)
        const res = await fetch('/api/theme/preview-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: currentTemplate,
            sections: sections
              .filter(section => (section.template || 'index') === currentTemplate)
              .map((section, index) => ({ id: index + 1, ...section })),
            header: nextSettings.header_settings || null,
            css: typeof nextSettings.custom_css === 'string' ? nextSettings.custom_css : '',
            palette: paletteFromSettings(nextSettings),
            mobileNavStyle: nextSettings.mobile_nav_style === 'debut' ? 'debut' : 'tabs',
          }),
        })
        if (!cancelled && res.ok) setPreviewKey(key => key + 1)
      } catch {
        // Invalid JSON should not break the editor; Save will surface the error.
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sections, settingsText, currentTemplate])

  function flash(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 2600)
  }

  function updateSettings(mutator: (settings: Record<string, any>) => Record<string, any>) {
    try {
      const current = parseJsonObject(settingsText)
      setSettingsText(JSON.stringify(mutator(current), null, 2))
    } catch {
      flash('Fix settings JSON before using quick controls')
    }
  }

  function updateHeader(key: string, value: any) {
    updateSettings(current => ({
      ...current,
      header_settings: {
        ...(current.header_settings || {}),
        [key]: value,
      },
    }))
  }

  function updateSection(index: number, patch: Partial<SnapshotSection>) {
    setSections(prev => prev.map((section, i) => i === index ? { ...section, ...patch } : section))
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections(prev => {
      const ordered = prev
        .map((section, i) => ({ section, index: i }))
        .filter(item => (item.section.template || 'index') === currentTemplate)
        .sort((a, b) => (a.section.position || 0) - (b.section.position || 0) || a.index - b.index)
      const current = ordered.findIndex(item => item.index === index)
      const next = current + direction
      if (current < 0 || next < 0 || next >= ordered.length) return prev
      const reordered = [...ordered]
      const [item] = reordered.splice(current, 1)
      reordered.splice(next, 0, item)
      return prev.map((section, i) => {
        const order = reordered.findIndex(item => item.index === i)
        return order === -1 ? section : { ...section, position: (order + 1) * 10 }
      })
    })
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

  function applyShopifyMobileFormat() {
    setSections(prev => prev.map(section => {
      const priority = sectionPriority[section.type] ?? 500
      const mobileConfig =
        section.type === 'slideshow'
          ? { ...section.config, autoRotate: true, rotateInterval: 3, height: 'adapt', contentPosition: 'bottom', showDots: true, showArrows: false }
          : section.type === 'category_carousel'
          ? { ...section.config, source: section.config?.source || 'featured', limit: section.config?.limit || 12 }
          : section.type === 'collection_grid'
          ? { ...section.config, source: section.config?.source || 'curated' }
          : section.type === 'featured_products'
          ? { ...section.config, heading: section.config?.heading || 'More Featured pieces', limit: section.config?.limit || 8 }
          : section.config
      return {
        ...section,
        enabled: section.template === 'index' ? section.enabled !== false : section.enabled,
        position: priority,
        config: mobileConfig,
      }
    }))
    updateSettings(current => ({
      ...current,
      header_settings: {
        ...(current.header_settings || {}),
        layout: 'logo-center',
        logoMaxWidth: 200,
        sticky: true,
        iconsPosition: 'right',
        navFontSize: 12,
      },
      theme_headingFont: current.theme_headingFont || 'Crimson Text, Georgia, serif',
      theme_bodyFont: current.theme_bodyFont || 'Cardo, Georgia, serif',
      theme_buttonRadius: current.theme_buttonRadius ?? 6,
    }))
    flash('Shopify mobile format applied')
  }

  async function saveTheme(): Promise<StoreTheme | null> {
    setSaving(true)
    try {
      const nextSettings = parseJsonObject(settingsText)
      const snapshot = {
        ...theme.snapshot,
        capturedAt: new Date().toISOString(),
        sections,
        settings: nextSettings,
      }
      const res = await fetch(`/api/admin/online-store/themes/${theme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, snapshot }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setTheme(data.theme)
      flash('Theme saved')
      return data.theme
    } catch (err: any) {
      flash(err.message || 'Save failed')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function publishMobile() {
    const saved = await saveTheme()
    if (!saved) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/online-store/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_mobile', id: saved.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      flash('Mobile theme is live')
      setTheme({ ...saved, role: 'mobile_live', published_at: new Date().toISOString() })
    } catch (err: any) {
      flash(err.message || 'Publish failed')
    } finally {
      setSaving(false)
    }
  }

  async function duplicateBackup() {
    setSaving(true)
    try {
      const stamp = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
      const res = await fetch('/api/admin/online-store/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', id: theme.id, name: `${name} backup ${stamp}` }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Backup failed')
      flash('Backup draft created')
    } catch (err: any) {
      flash(err.message || 'Backup failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#eef2f6', fontFamily: 'Inter, sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 50, padding: '10px 14px', background: '#151a17', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#fff', borderBottom: '1px solid #d9e0d7' }}>
        <Link href="/admin/online-store" style={{ color: '#667168', fontSize: 13, textDecoration: 'none' }}>Back to Online Store</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input value={name} onChange={event => setName(event.target.value)} style={{ ...inputStyle, maxWidth: 460, fontWeight: 850, fontSize: 16 }} />
        </div>
        <button onClick={applyShopifyMobileFormat} className="luxe-btn luxe-btn-ghost">Use Shopify mobile format</button>
        <button onClick={duplicateBackup} disabled={saving} className="luxe-btn luxe-btn-ghost">Duplicate backup</button>
        {theme.device_scope === 'mobile' && theme.role !== 'mobile_live' && (
          <button onClick={publishMobile} disabled={saving} className="luxe-btn luxe-btn-primary">Make mobile live</button>
        )}
        <button onClick={saveTheme} disabled={saving} className="luxe-btn luxe-btn-primary">
          {saving ? 'Saving' : 'Save theme'}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(360px, 520px) minmax(420px, 1fr)', overflow: 'hidden' }}>
        <aside style={{ overflow: 'auto', padding: 18 }}>
          <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eef1ed' }}>
              <h1 style={{ margin: 0, color: '#151a17', fontSize: 21, fontWeight: 900 }}>Mobile Theme Studio</h1>
              <p style={{ margin: '6px 0 0', color: '#667168', fontSize: 13 }}>
                {theme.role === 'mobile_live' ? 'Current live mobile theme' : 'Mobile draft theme'}
              </p>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: '#3a4339' }}>Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(['index', 'product', 'collection'] as TemplateKey[]).map(template => (
                  <button
                    key={template}
                    onClick={() => setCurrentTemplate(template)}
                    style={{
                      padding: '9px 10px',
                      border: '1px solid #d9e0d7',
                      borderRadius: 8,
                      background: currentTemplate === template ? '#151a17' : '#fff',
                      color: currentTemplate === template ? '#fff' : '#3a4339',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eef1ed' }}>
              <h2 style={{ margin: 0, color: '#151a17', fontSize: 16, fontWeight: 900 }}>Mobile header</h2>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
                Logo width
                <input
                  type="number"
                  value={Number(settings.header_settings?.logoMaxWidth || 200)}
                  onChange={event => updateHeader('logoMaxWidth', Number(event.target.value) || 200)}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
                Header layout
                <select value={settings.header_settings?.layout || 'logo-center'} onChange={event => updateHeader('layout', event.target.value)} style={inputStyle}>
                  <option value="logo-center">Logo center</option>
                  <option value="logo-left">Logo left</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3a4339', fontWeight: 800 }}>
                <input type="checkbox" checked={settings.header_settings?.sticky !== false} onChange={event => updateHeader('sticky', event.target.checked)} />
                Sticky header
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
                Mobile navigation
                <select
                  value={settings.mobile_nav_style || 'tabs'}
                  onChange={event => updateSettings(current => ({ ...current, mobile_nav_style: event.target.value }))}
                  style={inputStyle}
                >
                  <option value="tabs">Custom mobile UX (welcome hero + quick-action pills + bottom tabs)</option>
                  <option value="debut">Debut clone (homeu.ph 1:1 — real sections only, drawer nav, no bottom bar)</option>
                </select>
              </label>
            </div>
          </section>

          <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eef1ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, color: '#151a17', fontSize: 16, fontWeight: 900 }}>Sections</h2>
              <span style={{ color: '#667168', fontSize: 12 }}>{templateItems.length} items</span>
            </div>

            {templateItems.length === 0 ? (
              <div style={{ padding: 22, color: '#667168', fontSize: 13 }}>No sections saved for this template.</div>
            ) : templateItems.map(({ section, index }, order) => {
              const open = openIndex === index
              return (
                <div key={`${section.type}-${index}`} style={{ padding: 14, borderTop: order === 0 ? 0 : '1px solid #eef1ed' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#151a17', fontSize: 14 }}>{section.type.replace(/_/g, ' ')}</strong>
                      <span style={{ color: '#8a958d', fontSize: 12 }}>Position {section.position}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => moveSection(index, -1)} disabled={order === 0} className="luxe-btn luxe-btn-ghost" style={{ padding: '7px 9px' }}>Up</button>
                      <button onClick={() => moveSection(index, 1)} disabled={order === templateItems.length - 1} className="luxe-btn luxe-btn-ghost" style={{ padding: '7px 9px' }}>Down</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#667168' }}>
                      <input type="checkbox" checked={section.enabled !== false} onChange={event => updateSection(index, { enabled: event.target.checked })} />
                      {section.enabled !== false ? 'Shown' : 'Hidden'}
                    </label>
                    <button onClick={() => setOpenIndex(open ? null : index)} className="luxe-btn luxe-btn-ghost" style={{ padding: '7px 10px' }}>
                      {open ? 'Close' : 'Edit content'}
                    </button>
                  </div>
                  {open && (
                    <div style={{ marginTop: 12 }}>
                      <textarea value={configText[index] || '{}'} onChange={event => setConfigText(prev => ({ ...prev, [index]: event.target.value }))} style={codeStyle} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button onClick={() => saveConfig(index)} className="luxe-btn luxe-btn-ghost">Apply content</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
            <button onClick={() => setAdvancedOpen(open => !open)} style={{ width: '100%', padding: 16, border: 0, background: '#fff', textAlign: 'left', fontWeight: 900, color: '#151a17', cursor: 'pointer' }}>
              Advanced JSON
            </button>
            {advancedOpen && (
              <div style={{ padding: 16, borderTop: '1px solid #eef1ed' }}>
                <textarea value={settingsText} onChange={event => setSettingsText(event.target.value)} style={{ ...codeStyle, minHeight: 240 }} />
              </div>
            )}
          </section>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: '#dfe6df', borderLeft: '1px solid #cfd8cc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #d9e0d7' }}>
            <strong style={{ fontSize: 13, color: '#151a17' }}>Live phone preview</strong>
            <span style={{ color: '#667168', fontSize: 12, textTransform: 'capitalize' }}>{currentTemplate}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setPreviewKey(key => key + 1)} className="luxe-btn luxe-btn-ghost" style={{ padding: '7px 10px' }}>Refresh</button>
            {mounted && <a href={previewUrl(currentTemplate, previewKey, previewRoot)} target="_blank" rel="noreferrer" className="luxe-btn luxe-btn-ghost" style={{ padding: '7px 10px', textDecoration: 'none' }}>Open</a>}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'stretch', overflow: 'auto', padding: 22 }}>
            <div style={{ width: 390, maxWidth: '100%', minHeight: 680, background: '#111', borderRadius: 28, padding: 10, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
              {mounted ? (
                <iframe
                  key={previewKey}
                  src={previewUrl(currentTemplate, previewKey, previewRoot)}
                  title="Mobile theme preview"
                  style={{ width: '100%', height: '100%', minHeight: 660, border: 0, borderRadius: 20, background: '#fff' }}
                />
              ) : (
                <div style={{ width: '100%', minHeight: 660, borderRadius: 20, background: '#fff' }} />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
