'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { StoreTheme } from '@/lib/store-themes'
import {
  DEFAULT_CUSTOMER_ACCOUNT_THEME,
  normalizeCustomerAccountTheme,
  type CustomerAccountTheme,
} from '@/lib/customer-account-theme'

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
  const [editorTab, setEditorTab] = useState<'mobile' | 'account'>('mobile')

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
            customerAccountTheme: normalizeCustomerAccountTheme(nextSettings.customer_account_theme),
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

  function updateAccountTheme(key: keyof CustomerAccountTheme, value: any) {
    updateSettings(current => ({
      ...current,
      customer_account_theme: normalizeCustomerAccountTheme({
        ...(current.customer_account_theme || DEFAULT_CUSTOMER_ACCOUNT_THEME),
        [key]: value,
      }),
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
          ? { ...section.config, autoRotate: true, rotateInterval: 3, height: 70, contentPosition: 'bottom', showDots: true, showArrows: false }
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
          {theme.device_scope !== 'mobile' && (
            <Link href={`/admin/theme?themeId=${theme.id}`} className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Open in Theme Builder</Link>
          )}
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
          {/* Section Tab Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16, background: '#f0f2f0', padding: 4, borderRadius: 10 }}>
            <button
              onClick={() => setEditorTab('mobile')}
              style={{
                padding: '10px',
                border: 0,
                borderRadius: 8,
                background: editorTab === 'mobile' ? '#fff' : 'transparent',
                color: '#151a17',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 100ms ease',
                boxShadow: editorTab === 'mobile' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              📱 Mobile Storefront
            </button>
            <button
              onClick={() => setEditorTab('account')}
              style={{
                padding: '10px',
                border: 0,
                borderRadius: 8,
                background: editorTab === 'account' ? '#fff' : 'transparent',
                color: '#151a17',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 100ms ease',
                boxShadow: editorTab === 'account' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              👤 Customer Account Portal
            </button>
          </div>

          {editorTab === 'mobile' ? (
            <>
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
            </>
          ) : (
            <AccountThemeStudio
              value={normalizeCustomerAccountTheme(settings.customer_account_theme)}
              onChange={updateAccountTheme}
            />
          )}

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
          {editorTab === 'mobile' ? (
            <>
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
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #d9e0d7' }}>
                <strong style={{ fontSize: 13, color: '#151a17' }}>Customer Account Portal Live Mockup Preview</strong>
                <span style={{ color: '#667168', fontSize: 12 }}>Responsive Design Dashboard</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', padding: 24, background: '#f6f7f5' }}>
                <AccountPortalFullPreview value={normalizeCustomerAccountTheme(settings.customer_account_theme)} />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function AccountThemeStudio({
  value,
  onChange,
}: {
  value: CustomerAccountTheme
  onChange: (key: keyof CustomerAccountTheme, value: any) => void
}) {
  const colorFields: Array<{ key: keyof CustomerAccountTheme; label: string }> = [
    { key: 'surfaceColor', label: 'Canvas' },
    { key: 'panelColor', label: 'Panels' },
    { key: 'textColor', label: 'Text' },
    { key: 'mutedColor', label: 'Muted' },
    { key: 'accentColor', label: 'Primary' },
    { key: 'secondaryAccentColor', label: 'Gold' },
    { key: 'borderColor', label: 'Border' },
  ]

  return (
    <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #eef1ed' }}>
        <h2 style={{ margin: 0, color: '#151a17', fontSize: 16, fontWeight: 900 }}>Account Theme Studio</h2>
        <p style={{ margin: '5px 0 0', color: '#667168', fontSize: 12, lineHeight: 1.45 }}>
          Customer dashboard, RFQs, addresses, orders, and profile pages inherit these settings when this theme is published.
        </p>
      </div>

      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
          Portal label
          <input
            value={value.welcomeLabel}
            onChange={event => onChange('welcomeLabel', event.target.value)}
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
            Layout
            <select value={value.layout} onChange={event => onChange('layout', event.target.value)} style={inputStyle}>
              <option value="concierge">Concierge</option>
              <option value="classic">Classic</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
            Navigation
            <select value={value.navStyle} onChange={event => onChange('navStyle', event.target.value)} style={inputStyle}>
              <option value="sidebar">Sidebar</option>
              <option value="tabs">Tabs</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
            Card style
            <select value={value.cardStyle} onChange={event => onChange('cardStyle', event.target.value)} style={inputStyle}>
              <option value="soft">Soft shadow</option>
              <option value="flat">Flat</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
            Density
            <select value={value.density} onChange={event => onChange('density', event.target.value)} style={inputStyle}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
          Radius: {value.radius}px
          <input
            type="range"
            min={0}
            max={24}
            value={value.radius}
            onChange={event => onChange('radius', Number(event.target.value))}
            className="theme-range-input"
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {colorFields.map(field => (
            <label key={field.key} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 800, color: '#3a4339' }}>
              <input
                type="color"
                value={String(value[field.key])}
                onChange={event => onChange(field.key, event.target.value)}
                style={{ width: 34, height: 34, padding: 0, border: '1px solid #d9e0d7', borderRadius: 8, background: '#fff' }}
                aria-label={field.label}
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>

        <AccountThemePreview value={value} />
      </div>
    </section>
  )
}

function AccountThemePreview({ value }: { value: CustomerAccountTheme }) {
  const shadow = value.cardStyle === 'soft' ? '0 12px 30px rgba(21,26,23,0.10)' : 'none'
  const compact = value.density === 'compact'
  return (
    <div style={{
      background: value.surfaceColor,
      border: `1px solid ${value.borderColor}`,
      borderRadius: value.radius + 6,
      padding: compact ? 12 : 16,
      display: 'grid',
      gap: compact ? 10 : 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ color: value.accentColor, fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{value.welcomeLabel}</div>
          <div style={{ color: value.textColor, fontSize: 20, fontWeight: 900, marginTop: 3 }}>Welcome back, Maria</div>
        </div>
        <div style={{ background: value.accentColor, color: '#fff', borderRadius: value.radius, padding: '8px 10px', fontSize: 11, fontWeight: 900 }}>New RFQ</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {['Active Projects', 'Awaiting Decision'].map((label, index) => (
          <div key={label} style={{ background: value.panelColor, border: `1px solid ${value.borderColor}`, borderRadius: value.radius, boxShadow: shadow, padding: compact ? 10 : 13 }}>
            <div style={{ color: value.textColor, fontSize: 22, fontWeight: 900 }}>{index === 0 ? '3' : '1'}</div>
            <div style={{ color: value.mutedColor, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: value.panelColor, border: `1px solid ${value.borderColor}`, borderRadius: value.radius, boxShadow: shadow, padding: compact ? 11 : 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ color: value.textColor, fontWeight: 900, fontSize: 13 }}>RFQ #A18F2C</div>
            <div style={{ color: value.mutedColor, fontSize: 11, marginTop: 2 }}>Dining room set - updated 2h ago</div>
          </div>
          <div style={{ color: value.secondaryAccentColor, fontWeight: 900, fontSize: 11 }}>Quoted</div>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: value.borderColor, marginTop: 12, overflow: 'hidden' }}>
          <div style={{ width: '68%', height: '100%', background: value.accentColor }} />
        </div>
      </div>
    </div>
  )
}

function AccountPortalFullPreview({ value }: { value: CustomerAccountTheme }) {
  const compact = value.density === 'compact'
  const isTabs = value.navStyle === 'tabs'
  const isClassic = value.layout === 'classic'
  const shadow = value.cardStyle === 'soft' ? '0 10px 25px rgba(0,0,0,0.04)' : 'none'

  return (
    <div style={{
      width: '100%',
      maxWidth: 800,
      background: value.surfaceColor,
      border: `1px solid ${value.borderColor}`,
      borderRadius: value.radius + 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: isClassic ? 'column' : 'row',
      minHeight: 500,
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Sidebar Navigation */}
      {!isClassic && !isTabs && (
        <div style={{ width: 200, borderRight: `1px solid ${value.borderColor}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 20, background: value.panelColor }}>
          <div style={{ fontWeight: 900, color: value.accentColor, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {value.welcomeLabel || 'CONCIERGE'}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {['Dashboard', 'My RFQ Requests', 'Quotations', 'Showroom Visits', 'My Addresses', 'Sign Out'].map((item, idx) => (
              <div key={item} style={{
                padding: '8px 12px',
                borderRadius: value.radius,
                background: idx === 0 ? value.surfaceColor : 'transparent',
                color: idx === 0 ? value.accentColor : value.mutedColor,
                fontWeight: 600,
                fontSize: 13,
                border: idx === 0 ? `1px solid ${value.borderColor}` : '1px solid transparent'
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: compact ? 24 : 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Top Header / Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            {(isClassic || isTabs) && (
              <div style={{ color: value.accentColor, fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                {value.welcomeLabel}
              </div>
            )}
            <h1 style={{ color: value.textColor, fontSize: 24, fontWeight: 900, margin: 0 }}>Welcome back, Maria Dela Cruz</h1>
            <p style={{ color: value.mutedColor, fontSize: 13, margin: '4px 0 0' }}>Designer Member · Approved Account</p>
          </div>
          <button style={{ background: value.accentColor, color: '#fff', border: 0, borderRadius: value.radius, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'default' }}>
            + Create New RFQ
          </button>
        </div>

        {/* Tab Navigation */}
        {isTabs && (
          <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${value.borderColor}`, paddingBottom: 8 }}>
            {['Dashboard', 'RFQ Requests', 'Quotations', 'Showroom Appointments', 'Profile Settings'].map((tab, idx) => (
              <div key={tab} style={{
                padding: '6px 12px',
                color: idx === 0 ? value.accentColor : value.mutedColor,
                fontWeight: 600,
                fontSize: 13,
                borderBottom: idx === 0 ? `2px solid ${value.accentColor}` : 'none',
                cursor: 'default'
              }}>
                {tab}
              </div>
            ))}
          </div>
        )}

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { value: '3', label: 'Active Projects', sub: '2 items pending review' },
            { value: '1', label: 'Awaiting Decision', sub: 'Quotation ready' },
            { value: '₱120,500', label: 'Total Ordered', sub: '4 items delivered' }
          ].map(card => (
            <div key={card.label} style={{ background: value.panelColor, border: `1px solid ${value.borderColor}`, borderRadius: value.radius, boxShadow: shadow, padding: compact ? 14 : 18 }}>
              <div style={{ color: value.textColor, fontSize: 26, fontWeight: 900 }}>{card.value}</div>
              <div style={{ color: value.textColor, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{card.label}</div>
              <div style={{ color: value.mutedColor, fontSize: 11, marginTop: 2 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Detailed List Card */}
        <div style={{ background: value.panelColor, border: `1px solid ${value.borderColor}`, borderRadius: value.radius, boxShadow: shadow, padding: compact ? 16 : 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${value.borderColor}`, paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ color: value.textColor, fontWeight: 800, fontSize: 14 }}>Latest RFQ Activity</div>
            <span style={{ color: value.accentColor, fontSize: 12, fontWeight: 600 }}>View All RFQs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'RFQ #A18F2C', desc: 'Dining room set for Makati Project', date: 'Updated 2 hours ago', status: 'Quoted', color: value.secondaryAccentColor },
              { id: 'RFQ #B89C3F', desc: 'Custom sectional and lounge chairs', date: 'Created on Jun 28, 2026', status: 'In Review', color: value.mutedColor }
            ].map((rfq, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: idx > 0 ? `1px solid ${value.borderColor}` : 'none' }}>
                <div>
                  <div style={{ color: value.textColor, fontWeight: 700, fontSize: 13 }}>{rfq.id}</div>
                  <div style={{ color: value.textColor, fontSize: 12, marginTop: 2 }}>{rfq.desc}</div>
                  <div style={{ color: value.mutedColor, fontSize: 11, marginTop: 1 }}>{rfq.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: rfq.color, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rfq.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
