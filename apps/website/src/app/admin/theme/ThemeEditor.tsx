'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { SECTION_META, SECTION_TYPES, type SectionType } from '@/lib/theme-types'
import { SECTION_SCHEMAS, type FieldDef } from './theme-schemas'

// ── Default content presets for new sections ─────────────────────────
const SECTION_PRESETS: Record<string, Record<string, any>> = {
  slideshow: {
    slides: [
      { image: '', heading: 'Welcome', subheading: 'Discover our collection', buttonText: 'Shop Now', buttonLink: '/products' },
      { image: '', heading: 'New Arrivals', subheading: 'Fresh designs for your space', buttonText: 'Explore', buttonLink: '/products' },
    ],
  },
  brand_text: { title: 'Our Story', body: 'Write your brand statement here...' },
  collection_grid: { heading: 'Shop by Collection', source: 'featured', limit: 8 },
  image_with_text: { image: '', title: 'Title', text: 'Describe this image...', buttonText: 'Learn More', buttonLink: '/products' },
  image_bar: { images: [{ image: '', link: '' }, { image: '', link: '' }, { image: '', link: '' }] },
  featured_products: { heading: 'Featured Pieces', source: 'auto', limit: 8 },
  reviews: { heading: 'What Our Customers Say' },
  instagram: { heading: 'Follow Us', handle: 'homeatelierph', tiles: 6 },
  cta: { heading: 'Get in Touch', text: 'We\'d love to hear from you', primaryText: 'Contact Us', primaryLink: '/contact', bgColor: '' },
  newsletter: { heading: 'Join our mailing list', subtext: 'Be the first to know about new arrivals.', buttonText: 'Subscribe', placeholder: 'Enter your email', bgColor: '', successMessage: 'Thanks for subscribing!' },
  logo_bar: { heading: 'As Seen In', logos: [{ image: '', link: '', alt: 'Brand' }] },
  testimonial: { heading: 'What Our Customers Say', testimonials: [{ quote: 'Amazing quality!', author: 'Happy Customer', role: '', avatar: '' }] },
  stats_counter: { heading: 'By the Numbers', stats: [{ number: '10,000+', label: 'Happy Customers', prefix: '⭐' }, { number: '500+', label: 'Products', prefix: '🏠' }] },
  blog_posts: { heading: 'From Our Journal', limit: 4, layout: 'grid' },
  promo_bar: { text: 'Free shipping on orders over ₱5,000', bgColor: '#151a17', textColor: '#ffffff' },
  video_hero: { videoUrl: '', posterImage: '', heading: 'Welcome', subheading: 'Discover your style', buttonText: 'Shop Now', buttonLink: '/products', overlayColor: 'rgba(0,0,0,0.3)' },
  lookbook: { heading: 'Our Collection', items: [{ image: '', title: 'Look 1', link: '', colSpan: '2', rowSpan: '2' }, { image: '', title: 'Look 2', link: '' }, { image: '', title: 'Look 3', link: '' }] },
  category_carousel: { heading: 'Shop by Category', source: 'featured', limit: 8 },
}

interface Section {
  id: number
  type: SectionType
  position: number
  enabled: boolean
  config: Record<string, any>
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa', color: '#151a17', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#3a4339', marginBottom: 5 }
const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12.5, lineHeight: 1.5 }

interface HeaderSettings { logoUrl: string; logoMaxWidth: number; bgColor: string; textColor: string; sticky: boolean; fontFamily: string; navFontSize: number }

const HEADER_FONT_OPTIONS: { label: string; stack: string }[] = [
  { label: 'Default (theme)', stack: '' },
  { label: 'Inter', stack: "'Inter', sans-serif" },
  { label: 'Playfair Display', stack: "'Playfair Display', serif" },
  { label: 'Poppins', stack: "'Poppins', sans-serif" },
  { label: 'Montserrat', stack: "'Montserrat', sans-serif" },
  { label: 'Cormorant Garamond', stack: "'Cormorant Garamond', serif" },
  { label: 'Georgia (web-safe)', stack: 'Georgia, serif' },
  { label: 'Helvetica (web-safe)', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
]

export default function ThemeEditor({ initial, initialCss, initialHeader }: { initial: Section[]; initialCss: string; initialHeader: HeaderSettings }) {
  const [sections, setSections] = useState<Section[]>(initial)
  const [header, setHeader] = useState<HeaderSettings>(initialHeader)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [headerSaving, setHeaderSaving] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [codeMode, setCodeMode] = useState<Set<number>>(new Set())
  const [codeText, setCodeText] = useState<Record<number, string>>({})
  const [codeErr, setCodeErr] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')
  const [previewKey, setPreviewKey] = useState(0)

  // ── Resizable section rail (gated behind "Resize" toggle) ──────────
  const [railWidth, setRailWidth] = useState(380)
  const [resizing, setResizing] = useState(false)   // toggle = handle visible
  const draggingRef = useRef(false)

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('theme-rail-width') || '', 10)
    if (saved >= 260 && saved <= 760) setRailWidth(saved)
  }, [])

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      setRailWidth(Math.min(760, Math.max(260, e.clientX)))
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.userSelect = ''
      setRailWidth(w => { localStorage.setItem('theme-rail-width', String(w)); return w })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizing])

  // ── Unsaved changes tracking ──────────────────────────────────────
  const [dirty, setDirty] = useState(false)
  const [isSavingAll, setIsSavingAll] = useState(false)

  // ── Collapse all ──────────────────────────────────────────────────
  const [allCollapsed, setAllCollapsed] = useState(false)

  // ── Preview viewport ──────────────────────────────────────────────
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  // ── Undo/redo history ─────────────────────────────────────────────
  const [history, setHistory] = useState<string[]>(() => [JSON.stringify(initial)])
  const [historyIdx, setHistoryIdx] = useState(0)
  const skipHistory = useRef(false)

  // ── Theme palette (brand colors, fonts) ───────────────────────────
  interface ThemePalette { primaryColor: string; secondaryColor: string; accentColor: string; headingFont: string; bodyFont: string; buttonRadius: number }
  const defaultPalette: ThemePalette = { primaryColor: '#1a6d3e', secondaryColor: '#d4a853', accentColor: '#151a17', headingFont: 'Playfair Display, serif', bodyFont: 'Inter, sans-serif', buttonRadius: 6 }
  const [palette, setPalette] = useState<ThemePalette>(defaultPalette)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteDirty, setPaletteDirty] = useState(false)

  // Push a snapshot into undo history (debounced via ref to avoid loops)
  function pushHistory(sections: Section[]) {
    if (skipHistory.current) { skipHistory.current = false; return }
    setHistory(prev => {
      const next = prev.slice(0, historyIdx + 1)
      next.push(JSON.stringify(sections))
      return next.slice(-50) // cap at 50 entries
    })
    setHistoryIdx(prev => Math.min(prev + 1, 49))
  }

  // Wrap setSections to auto-push undo history
  const setSectionsWithHistory = useCallback((updater: Section[] | ((prev: Section[]) => Section[])) => {
    setSections(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      pushHistory(next)
      return next
    })
  }, [historyIdx])

  function undo() {
    if (historyIdx <= 0) return
    const prevIdx = historyIdx - 1
    const prev = JSON.parse(history[prevIdx])
    skipHistory.current = true
    setSections(prev)
    setHistoryIdx(prevIdx)
  }

  function redo() {
    if (historyIdx >= history.length - 1) return
    const nextIdx = historyIdx + 1
    const next = JSON.parse(history[nextIdx])
    skipHistory.current = true
    setSections(next)
    setHistoryIdx(nextIdx)
  }

  // Custom CSS panel
  const [css, setCss] = useState(initialCss || '')
  const [cssDirty, setCssDirty] = useState(false)
  const [cssOpen, setCssOpen] = useState(false)
  const [cssSaving, setCssSaving] = useState(false)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }
  const refreshPreview = () => setPreviewKey(k => k + 1)

  // ── beforeunload guard ────────────────────────────────────────────
  useEffect(() => {
    if (!dirty && !cssDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, cssDirty])

  // ── Navigation guard for Next.js in-app navigation ────────────────
  const confirmLeave = useCallback((msg?: string): boolean => {
    if (!dirty && !cssDirty) return true
    return window.confirm(msg || 'You have unsaved theme changes. Are you sure you want to leave?')
  }, [dirty, cssDirty])

  // ── Click-to-edit: listen for section selections from the preview iframe ──
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.source !== 'homeu-preview' || d.kind !== 'select') return
      if (d.id === 'header') {
        setHeaderOpen(true)
        requestAnimationFrame(() => document.getElementById('header-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        return
      }
      const id = Number(d.id)
      setOpenId(id)
      requestAnimationFrame(() => {
        document.getElementById(`sec-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function setConfig(id: number, key: string, value: any) {
    setSectionsWithHistory(s => s.map(x => x.id === id ? { ...x, config: { ...x.config, [key]: value } } : x))
    setDirty(true)
  }

  async function patchSection(id: number, body: any) {
    await fetch(`/api/theme/sections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  async function saveSection(sec: Section) {
    setSavingId(sec.id)
    try {
      let config = sec.config
      // If in code mode, parse the JSON textarea first
      if (codeMode.has(sec.id)) {
        try {
          config = JSON.parse(codeText[sec.id] ?? '{}')
          setCodeErr(e => ({ ...e, [sec.id]: '' }))
          setSections(s => s.map(x => x.id === sec.id ? { ...x, config } : x))
        } catch (err: any) {
          setCodeErr(e => ({ ...e, [sec.id]: 'Invalid JSON: ' + err.message }))
          setSavingId(null)
          return
        }
      }
      await patchSection(sec.id, { config })
      flash('Saved'); refreshPreview()
    } finally { setSavingId(null) }
  }

  // ── Save all sections and CSS ────────────────────────────────────
  async function saveAll() {
    setIsSavingAll(true)
    try {
      const promises: Promise<void>[] = []

      // Save each section
      for (const sec of sections) {
        let config = sec.config
        if (codeMode.has(sec.id) && codeText[sec.id] !== undefined) {
          try {
            config = JSON.parse(codeText[sec.id])
            setCodeErr(e => ({ ...e, [sec.id]: '' }))
          } catch (err: any) {
            setCodeErr(e => ({ ...e, [sec.id]: 'Invalid JSON: ' + err.message }))
            flash('Fix JSON errors before saving all')
            setIsSavingAll(false)
            return
          }
        }
        promises.push(
          patchSection(sec.id, { config, enabled: sec.enabled })
            .then(() => {})
        )
      }

      // Save CSS if dirty
      if (cssDirty) {
        promises.push(
          fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'custom_css', value: css }) })
            .then(() => {})
        )
      }

      await Promise.all(promises)

      // Persist section order (config/enabled saved above; order saved here)
      await fetch('/api/theme/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: sections.map(s => s.id) }) })
      setDirty(false)
      setCssDirty(false)
      flash('All changes saved'); refreshPreview()
    } finally { setIsSavingAll(false) }
  }

  function toggleCode(sec: Section) {
    setCodeMode(prev => {
      const next = new Set(prev)
      if (next.has(sec.id)) { next.delete(sec.id) }
      else {
        next.add(sec.id)
        setCodeText(t => ({ ...t, [sec.id]: JSON.stringify(sec.config, null, 2) }))
      }
      return next
    })
  }

  function onCodeTextChange(id: number, value: string) {
    setCodeText(t => ({ ...t, [id]: value }))
    setDirty(true)
  }

  function toggleEnabled(sec: Section) {
    const enabled = !sec.enabled
    setSectionsWithHistory(s => s.map(x => x.id === sec.id ? { ...x, enabled } : x))
    setDirty(true)
    patchSection(sec.id, { enabled }) // immediate so the iframe preview reflects it
    refreshPreview()
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= sections.length) return
    setSectionsWithHistory(prev => {
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
    setDirty(true)
  }

  async function addSection(type: SectionType) {
    setAdding(false)
    const preset = SECTION_PRESETS[type] || {}
    const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, config: preset }) })
    const { id } = await res.json()
    setSectionsWithHistory(s => [...s, { id, type, position: (s.length + 1) * 10, enabled: true, config: { ...preset } }])
    setOpenId(id); setDirty(true); refreshPreview()
  }

  async function duplicate(sec: Section) {
    const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: sec.type, config: sec.config }) })
    const { id } = await res.json()
    setSectionsWithHistory(s => {
      const idx = s.findIndex(x => x.id === sec.id)
      const pos = idx >= 0 ? s[idx].position + 5 : (s.length + 1) * 10
      const copy = [...s]
      copy.splice(idx + 1, 0, { id, type: sec.type, position: pos, enabled: sec.enabled, config: { ...sec.config } })
      return copy
    })
    setOpenId(id); setDirty(true); refreshPreview(); flash('Section duplicated')
  }

  async function del(id: number) {
    if (!confirm('Delete this section?')) return
    setSectionsWithHistory(s => s.filter(x => x.id !== id))
    setDirty(true)
    await fetch(`/api/theme/sections/${id}`, { method: 'DELETE' })
    refreshPreview()
  }

  async function saveHeader() {
    setHeaderSaving(true)
    try {
      await fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'header_settings', value: header }) })
      flash('Header saved'); refreshPreview()
    } finally { setHeaderSaving(false) }
  }

  async function saveCss() {
    setCssSaving(true)
    try {
      await fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'custom_css', value: css }) })
      flash('CSS saved'); refreshPreview()
    } finally { setCssSaving(false) }
  }

  async function savePalette() {
    const entries = Object.entries(palette).map(([key, value]) =>
      fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `theme_${key}`, value }) })
    )
    await Promise.all(entries)
    setPaletteDirty(false)
    flash('Theme colors saved'); refreshPreview()
  }

  // ── Export/Import ─────────────────────────────────────────────────
  function exportTheme() {
    const data = JSON.stringify({ sections, css, header, palette, version: 1 }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `homeu-theme-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
    flash('Theme exported')
  }

  function importTheme() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.sections || !Array.isArray(data.sections)) { flash('Invalid theme file'); return }
        // Import by recreating sections via API
        for (const sec of sections) { await fetch(`/api/theme/sections/${sec.id}`, { method: 'DELETE' }) }
        const newSections: Section[] = []
        for (const s of data.sections) {
          const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: s.type, config: s.config, enabled: s.enabled }) })
          const { id } = await res.json()
          newSections.push({ ...s, id, position: (newSections.length + 1) * 10 })
        }
        setSections(newSections)
        if (data.css) { setCss(data.css); setCssDirty(true) }
        if (data.palette) { setPalette(data.palette); setPaletteDirty(true) }
        if (data.header) setHeader(data.header)
        setDirty(true)
        flash('Theme imported — review and save')
      } catch { flash('Failed to import theme') }
    }
    input.click()
  }

  // ── List-field item editing (slides, images) ──────────────────────
  function updateListItem(id: number, key: string, idx: number, itemKey: string, val: string) {
    setSectionsWithHistory(s => s.map(x => {
      if (x.id !== id) return x
      const arr = [...(x.config[key] || [])]
      arr[idx] = { ...arr[idx], [itemKey]: val }
      return { ...x, config: { ...x.config, [key]: arr } }
    }))
    setDirty(true)
  }
  function addListItem(id: number, key: string) {
    setSectionsWithHistory(s => s.map(x => x.id === id ? { ...x, config: { ...x.config, [key]: [...(x.config[key] || []), {}] } } : x))
    setDirty(true)
  }
  function removeListItem(id: number, key: string, idx: number) {
    setSectionsWithHistory(s => s.map(x => {
      if (x.id !== id) return x
      const arr = (x.config[key] || []).filter((_: any, i: number) => i !== idx)
      return { ...x, config: { ...x.config, [key]: arr } }
    }))
    setDirty(true)
  }

  function PaletteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div>
        <label style={lbl}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
            style={{ width: 36, height: 36, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
          <input style={{ ...input, flex: 1 }} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="#hex" />
        </div>
      </div>
    )
  }

  function renderField(sec: Section, f: FieldDef) {
    if (f.type === 'list') {
      const items: any[] = sec.config[f.key] || []
      return (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={lbl}>{f.label}</label>
          {items.map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #eef1ed', borderRadius: 8, padding: 12, marginBottom: 8, position: 'relative', background: '#fafbf9' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(f.itemFields || []).map(itf => (
                  <div key={itf.key} style={{ gridColumn: itf.type === 'url' ? '1 / -1' : 'auto' }}>
                    <label style={{ ...lbl, fontSize: 11 }}>{itf.label}</label>
                    <input style={input} value={item[itf.key] || ''} onChange={e => updateListItem(sec.id, f.key, idx, itf.key, e.target.value)} />
                  </div>
                ))}
              </div>
              <button onClick={() => removeListItem(sec.id, f.key, idx)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', color: '#b0392f', cursor: 'pointer', fontSize: 13 }}>Remove</button>
            </div>
          ))}
          <button onClick={() => addListItem(sec.id, f.key)} style={{ padding: '7px 14px', background: '#f0f7f2', border: '1.5px dashed #9cc4a9', color: '#1e7a47', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add item</button>
        </div>
      )
    }
    const val = sec.config[f.key] ?? ''
    return (
      <div key={f.key} style={{ marginBottom: 14 }}>
        <label style={lbl}>{f.label}</label>
        {f.type === 'textarea'
          ? <textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={val} onChange={e => setConfig(sec.id, f.key, e.target.value)} placeholder={f.placeholder} />
          : f.type === 'color'
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={val || '#000000'} onChange={e => setConfig(sec.id, f.key, e.target.value)}
                style={{ width: 40, height: 40, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
              <input style={{ ...input, flex: 1 }} type="text" value={val} onChange={e => setConfig(sec.id, f.key, e.target.value)} placeholder={f.placeholder || '#hex'} />
            </div>
          : <input style={input} type={f.type === 'number' ? 'number' : 'text'} value={val} onChange={e => setConfig(sec.id, f.key, f.type === 'number' ? (parseInt(e.target.value, 10) || 0) : e.target.value)} placeholder={f.placeholder} />}
        {f.help && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9aa69c' }}>{f.help}</p>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 0, fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 0px)' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#1e7a47', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14, zIndex: 100, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>{toast}</div>}

      {/* ── Left: editor (compact, resizable rail) ── */}
      <div style={{ flex: `0 0 ${railWidth}px`, width: railWidth, minWidth: railWidth, overflowY: 'auto', padding: '20px 16px', borderRight: resizing ? 'none' : '1px solid #e3e8e0' }}>
        {/* ── Header bar with Save All ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
          <div>
            <Link href="/admin/dashboard" style={{ color: '#667168', fontSize: 12, textDecoration: 'none', display: 'inline-block', marginBottom: 4 }}>← Dashboard</Link>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#151a17' }}>Theme · Homepage</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Undo / Redo */}
            <button onClick={undo} disabled={historyIdx <= 0} title="Undo (Ctrl+Z)"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: historyIdx > 0 ? 'pointer' : 'default', fontSize: 14, opacity: historyIdx > 0 ? 1 : 0.3 }}>↩</button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} title="Redo"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: historyIdx < history.length - 1 ? 'pointer' : 'default', fontSize: 14, opacity: historyIdx < history.length - 1 ? 1 : 0.3 }}>↪</button>
            {/* Collapse all */}
            <button onClick={() => { setAllCollapsed(c => !c); setOpenId(allCollapsed ? null : -1) }} title={allCollapsed ? 'Expand all' : 'Collapse all'}
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>{allCollapsed ? '⊞' : '⊟'}</button>
            {/* Resize rail */}
            <button onClick={() => setResizing(r => !r)} title="Drag the divider to resize this panel"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: resizing ? '#151a17' : '#fff', color: resizing ? '#fff' : '#3a4339', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {resizing ? '✓ Done' : '↔ Resize'}
            </button>
            {/* Export / Import */}
            <button onClick={exportTheme} title="Export theme as JSON"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>⬇</button>
            <button onClick={importTheme} title="Import theme from JSON"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>⬆</button>
            {(dirty || cssDirty) && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b0392f', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b0392f', display: 'inline-block' }} />
                Unsaved
              </span>
            )}
            <button onClick={saveAll} disabled={isSavingAll || (!dirty && !cssDirty)}
              style={{
                padding: '9px 22px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: (dirty || cssDirty) ? 'linear-gradient(180deg, #1e7a47, #0f4f2b)' : '#d9e0d7',
                color: (dirty || cssDirty) ? '#fff' : '#9aa69c',
                transition: 'all 150ms ease',
              }}>
              {isSavingAll ? 'Saving…' : (dirty || cssDirty) ? '★ Save Theme' : '★ Save Theme'}
            </button>
          </div>
        </div>

        {/* ── Theme Palette (brand colors, fonts) ── */}
        <div style={{ ...card, marginTop: 8 }}>
          <button onClick={() => setPaletteOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>🎨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>Theme Palette</div>
              <div style={{ fontSize: 12, color: '#9aa69c' }}>Brand colors, fonts, button styles</div>
            </div>
            <span style={{ color: '#9aa69c' }}>{paletteOpen ? '▲' : '▼'}</span>
          </button>
          {paletteOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eef1ed', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              <PaletteField label="Primary color" value={palette.primaryColor} onChange={v => { setPalette(p => ({ ...p, primaryColor: v })); setPaletteDirty(true) }} />
              <PaletteField label="Secondary color" value={palette.secondaryColor} onChange={v => { setPalette(p => ({ ...p, secondaryColor: v })); setPaletteDirty(true) }} />
              <PaletteField label="Accent color" value={palette.accentColor} onChange={v => { setPalette(p => ({ ...p, accentColor: v })); setPaletteDirty(true) }} />
              <div style={{ gridColumn: '1 / -1' }} />
              <div>
                <label style={lbl}>Heading font</label>
                <input style={input} value={palette.headingFont} onChange={e => { setPalette(p => ({ ...p, headingFont: e.target.value })); setPaletteDirty(true) }} placeholder="Playfair Display, serif" />
              </div>
              <div>
                <label style={lbl}>Body font</label>
                <input style={input} value={palette.bodyFont} onChange={e => { setPalette(p => ({ ...p, bodyFont: e.target.value })); setPaletteDirty(true) }} placeholder="Inter, sans-serif" />
              </div>
              <div>
                <label style={lbl}>Button radius (px)</label>
                <input style={input} type="number" value={palette.buttonRadius} onChange={e => { setPalette(p => ({ ...p, buttonRadius: parseInt(e.target.value) || 0 })); setPaletteDirty(true) }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button onClick={savePalette} style={{ padding: '9px 20px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Save Palette</button>
                {paletteDirty && <span style={{ fontSize: 11, color: '#b0392f' }}>Unsaved</span>}
              </div>
            </div>
          )}
        </div>

        {/* Header panel */}
        <div id="header-card" style={{ ...card, marginTop: 18 }}>
          <button onClick={() => setHeaderOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>🧭</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>Header</div>
              <div style={{ fontSize: 12, color: '#9aa69c' }}>Logo, colors & sticky behaviour (menu links live in Navigation)</div>
            </div>
            <span style={{ color: '#9aa69c' }}>{headerOpen ? '▲' : '▼'}</span>
          </button>
          {headerOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eef1ed' }}>
              <div style={{ marginTop: 12 }}>
                <label style={lbl}>Logo image URL</label>
                {header.logoUrl
                  ? <div style={{ background: '#f4f6f2', borderRadius: 8, padding: 12, marginBottom: 8, textAlign: 'center' }}><img src={header.logoUrl} alt="logo" style={{ maxWidth: header.logoMaxWidth, maxHeight: 80 }} /></div>
                  : null}
                <input style={input} value={header.logoUrl} onChange={e => setHeader(h => ({ ...h, logoUrl: e.target.value }))} placeholder="https://…/logo.png (blank = default)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={lbl}>Logo max width (px)</label>
                  <input style={input} type="number" value={header.logoMaxWidth} onChange={e => setHeader(h => ({ ...h, logoMaxWidth: parseInt(e.target.value, 10) || 0 }))} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3a4339', cursor: 'pointer', paddingBottom: 9 }}>
                    <input type="checkbox" checked={header.sticky} onChange={e => setHeader(h => ({ ...h, sticky: e.target.checked }))} />
                    Sticky header
                  </label>
                </div>
                <div>
                  <label style={lbl}>Background color</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" value={header.bgColor} onChange={e => setHeader(h => ({ ...h, bgColor: e.target.value }))} style={{ width: 40, height: 40, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                    <input style={{ ...input, flex: 1 }} value={header.bgColor} onChange={e => setHeader(h => ({ ...h, bgColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Text color</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" value={header.textColor} onChange={e => setHeader(h => ({ ...h, textColor: e.target.value }))} style={{ width: 40, height: 40, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 8, cursor: 'pointer', background: 'none' }} />
                    <input style={{ ...input, flex: 1 }} value={header.textColor} onChange={e => setHeader(h => ({ ...h, textColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Header font</label>
                  <select style={input} value={header.fontFamily} onChange={e => setHeader(h => ({ ...h, fontFamily: e.target.value }))}>
                    {HEADER_FONT_OPTIONS.map(f => <option key={f.label} value={f.stack}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Nav font size (px)</label>
                  <input style={input} type="number" value={header.navFontSize} onChange={e => setHeader(h => ({ ...h, navFontSize: parseInt(e.target.value, 10) || 0 }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
                <button onClick={saveHeader} disabled={headerSaving} style={{ padding: '9px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{headerSaving ? 'Saving…' : 'Save header'}</button>
                <a href="/admin/navigation" style={{ fontSize: 13, color: '#1a6d3e', textDecoration: 'none', fontWeight: 600 }}>Edit menu links →</a>
              </div>
            </div>
          )}
        </div>

        {/* Custom CSS panel */}
        <div style={{ ...card, marginTop: 18 }}>
          <button onClick={() => setCssOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>🎨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>Custom CSS</div>
              <div style={{ fontSize: 12, color: '#9aa69c' }}>Site-wide style overrides, injected into every page</div>
            </div>
            <span style={{ color: '#9aa69c' }}>{cssOpen ? '▲' : '▼'}</span>
          </button>
          {cssOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eef1ed' }}>
              <textarea value={css} onChange={e => { setCss(e.target.value); setCssDirty(true) }} spellCheck={false}
                style={{ ...input, ...mono, minHeight: 200, resize: 'vertical', marginTop: 12 }}
                placeholder={'/* e.g. */\n.site-header__logo-image { max-height: 56px; }'} />
              <button onClick={saveCss} disabled={cssSaving} style={{ marginTop: 10, padding: '9px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{cssSaving ? 'Saving…' : 'Save CSS'}</button>
            </div>
          )}
        </div>

        <div style={{ margin: '14px 0' }}>
          {sections.map((sec, idx) => {
            const meta = SECTION_META[sec.type]
            const open = openId === sec.id
            const schema = SECTION_SCHEMAS[sec.type] || []
            const inCode = codeMode.has(sec.id)
            // When allCollapsed is active, override open to false
            const isOpen = allCollapsed ? false : open
            return (
              <div key={sec.id} id={`sec-card-${sec.id}`} style={{ ...card, opacity: sec.enabled ? 1 : 0.6, outline: openId === sec.id ? '2px solid #1e7a47' : 'none', outlineOffset: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', color: '#9aa69c', fontSize: 12, lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} style={{ border: 'none', background: 'transparent', cursor: idx === sections.length - 1 ? 'default' : 'pointer', color: '#9aa69c', fontSize: 12, lineHeight: 1, opacity: idx === sections.length - 1 ? 0.3 : 1 }}>▼</button>
                  </div>
                  <span style={{ fontSize: 20 }}>{meta?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>{meta?.label || sec.type}</div>
                    <div style={{ fontSize: 12, color: '#9aa69c' }}>{meta?.description}</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#667168', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sec.enabled} onChange={() => toggleEnabled(sec)} />
                    {sec.enabled ? 'Shown' : 'Hidden'}
                  </label>
                  <button onClick={() => setOpenId(isOpen ? null : sec.id)} style={{ padding: '7px 16px', background: isOpen ? '#151a17' : '#f0f7f2', color: isOpen ? '#fff' : '#1e7a47', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {isOpen ? 'Close' : 'Edit'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ padding: '4px 16px 18px', borderTop: '1px solid #eef1ed' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                      <button onClick={() => toggleCode(sec)} style={{ padding: '5px 12px', background: inCode ? '#151a17' : '#f4f6f2', color: inCode ? '#fff' : '#3a4339', border: '1px solid #d9e0d7', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', ...mono }}>
                        {inCode ? 'Form view' : '</> Edit as code'}
                      </button>
                    </div>

                    {inCode ? (
                      <>
                        <textarea value={codeText[sec.id] ?? ''} onChange={e => onCodeTextChange(sec.id, e.target.value)} spellCheck={false}
                          style={{ ...input, ...mono, minHeight: 240, resize: 'vertical' }} />
                        {codeErr[sec.id] && <p style={{ color: '#b0392f', fontSize: 12, margin: '6px 0 0' }}>{codeErr[sec.id]}</p>}
                      </>
                    ) : (
                      schema.length === 0
                        ? <p style={{ color: '#9aa69c', fontSize: 13 }}>This section has no editable fields. Use “Edit as code”.</p>
                        : schema.map(f => renderField(sec, f))
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button onClick={() => saveSection(sec)} disabled={savingId === sec.id} style={{ padding: '9px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{savingId === sec.id ? 'Saving…' : 'Save section'}</button>
                      <button onClick={() => duplicate(sec)} style={{ padding: '9px 14px', background: '#fff', color: '#1e7a47', border: '1.5px solid #cfe3d6', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Duplicate</button>
                      <button onClick={() => del(sec.id)} style={{ padding: '9px 18px', background: '#fff', color: '#b0392f', border: '1.5px solid #e8c5c1', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add section */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAdding(!adding)} style={{ width: '100%', padding: '14px', background: '#fff', border: '2px dashed #c2cdbe', color: '#1e7a47', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Add section</button>
          {adding && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8, background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, zIndex: 20 }}>
              {SECTION_TYPES.map(t => (
                <button key={t} onClick={() => addSection(t)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #eef1ed', borderRadius: 8, background: '#fafbf9', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 16 }}>{SECTION_META[t].icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#151a17' }}>{SECTION_META[t].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p style={{ marginTop: 28, textAlign: 'center' }}>
          <Link
            href="/admin/dashboard"
            onClick={e => { if (!confirmLeave()) e.preventDefault() }}
            style={{ color: '#667168', fontSize: 14, textDecoration: 'none' }}
          >
            ← Back to Dashboard
          </Link>
        </p>
      </div>

      {/* ── Right: live preview ── */}
      {/* Drag handle — only when Resize is toggled on */}
      {resizing && (
        <div
          onMouseDown={() => { draggingRef.current = true; document.body.style.userSelect = 'none' }}
          title="Drag to resize"
          style={{ flex: '0 0 8px', width: 8, cursor: 'col-resize', background: 'linear-gradient(#1e7a47,#1e7a47) center/2px 100% no-repeat, #cfe3d6', alignSelf: 'stretch', position: 'sticky', top: 0, height: '100vh', zIndex: 5 }}
        />
      )}

      {/* ── Right: live preview ── */}
      <div style={{ flex: '1 1 auto', minWidth: 0, background: '#eef1ed', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e3e8e0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#151a17' }}>Live preview</span>
          <span style={{ fontSize: 12, color: '#9aa69c' }}>click a section to edit</span>
          {/* Viewport switcher */}
          <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
            {(['desktop', 'tablet', 'mobile'] as const).map(v => (
              <button key={v} onClick={() => setViewport(v)}
                style={{
                  padding: '5px 10px', border: '1px solid #d9e0d7', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: viewport === v ? '#151a17' : '#fff', color: viewport === v ? '#fff' : '#3a4339',
                  transition: 'all 120ms ease',
                }}>
                {v === 'desktop' ? '🖥' : v === 'tablet' ? '📱' : '📲'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={refreshPreview} style={{ padding: '6px 14px', background: '#f0f7f2', color: '#1e7a47', border: '1px solid #cfe3d6', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          <a href="/" target="_blank" rel="noreferrer" style={{ padding: '6px 12px', fontSize: 12, color: '#1a6d3e', textDecoration: 'none', fontWeight: 600 }}>Open ↗</a>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', background: '#e3e8e0', overflow: 'auto' }}>
          <iframe
            key={previewKey}
            src={`/?preview=${previewKey}`}
            title="Storefront preview"
            style={{
              flex: '0 0 auto', border: 'none', background: '#fff', height: '100%',
              width: viewport === 'mobile' ? 375 : viewport === 'tablet' ? 768 : '100%',
              maxWidth: '100%',
              transition: 'width 200ms ease',
              boxShadow: viewport !== 'desktop' ? '0 0 20px rgba(0,0,0,0.15)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
