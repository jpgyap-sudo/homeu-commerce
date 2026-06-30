'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { SECTION_META, SECTION_TYPES, type SectionType } from '@/lib/theme-types'
import { getSectionSettings } from '@/lib/theme-builder-settings'
import DynamicSettingsForm from '@/components/admin/DynamicSettingsForm'
import { MediaPicker } from '@/components/admin/MediaPicker'
import { ProductPicker } from '@/components/admin/ProductPicker'
import { CollectionPicker } from '@/components/admin/CollectionPicker'
import { HOMEU_CURATED_COLLECTION_SLUGS } from '@/lib/homepage-collections'

// ── Default content presets for new sections ─────────────────────────
const SECTION_PRESETS: Record<string, Record<string, any>> = {
  slideshow: {
    slides: [
      { image: '', heading: 'Welcome', subheading: 'Discover our collection', buttonText: 'Shop Now', buttonLink: '/products' },
      { image: '', heading: 'New Arrivals', subheading: 'Fresh designs for your space', buttonText: 'Explore', buttonLink: '/products' },
    ],
  },
  brand_text: { title: 'Our Story', body: 'Write your brand statement here...' },
  collection_grid: { heading: '', source: 'curated', curatedSlugs: [...HOMEU_CURATED_COLLECTION_SLUGS] },
  image_with_text: { image: '', title: 'Title', text: 'Describe this image...', buttonText: 'Learn More', buttonLink: '/products' },
  image_bar: { images: [{ image: '', link: '' }, { image: '', link: '' }, { image: '', link: '' }] },
  featured_products: { heading: 'Featured Pieces', source: 'auto', limit: 8, curatedIds: [] },
  reviews: { heading: 'Let Customers Speak For Us', columns: 3, autoScroll: true, scrollInterval: 2, maxReviews: 12 },
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

// The theme editor is served on the admin domain (admin.homeatelier.ph), which
// 301-redirects "/" to "/admin/login" — so a relative "/" preview src/link
// just loads the login page (and gets blocked in the iframe). Point at the
// actual storefront domain instead.
const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || ''

const card: React.CSSProperties = { background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa', color: '#151a17', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#3a4339', marginBottom: 5 }
const mono: React.CSSProperties = { fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12.5, lineHeight: 1.5 }

interface HeaderSettings { logoUrl: string; logoMaxWidth: number; bgColor: string; textColor: string; sticky: boolean; fontFamily: string; navFontSize: number; iconsPosition: 'right' | 'left' | 'top-bar'; layout: 'logo-center' | 'logo-left'; announcement: { enabled: boolean; text: string; link: string; bgColor: string; textColor: string } }

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

export default function ThemeEditor({
  initial,
  initialCss,
  initialHeader,
  initialViewport = 'desktop',
}: {
  initial: Section[]
  initialCss: string
  initialHeader: HeaderSettings
  initialViewport?: 'desktop' | 'tablet' | 'mobile'
}) {
  const [sections, setSections] = useState<Section[]>(initial)
  const [currentTemplate, setCurrentTemplate] = useState<'index' | 'product' | 'collection'>('index')
  const [previewProductSlug, setPreviewProductSlug] = useState('outline-chaise-sofa')

  // Load first active product slug on mount for preview
  useEffect(() => {
    fetch('/api/products?limit=1')
      .then(r => r.json())
      .then(data => {
        const first = data?.docs?.[0]
        if (first?.slug) {
          setPreviewProductSlug(first.slug)
        }
      })
      .catch(() => {})
  }, [])

  // Load sections when template changes
  useEffect(() => {
    if (currentTemplate === 'index') {
      setSections(initial)
      setOpenedSectionConfig(null)
      setOpenId(null)
      return
    }
    fetch(`/api/theme/sections?template=${currentTemplate}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.sections)) {
          setSections(data.sections)
          setOpenedSectionConfig(null)
          setOpenId(null)
        }
      })
      .catch(() => {})
  }, [currentTemplate])
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
  const sectionsRef = useRef<Section[]>(initial)

  // ── Reorder confirmation ─────────────────────────────────────────
  const [pendingMove, setPendingMove] = useState<{
    bodyIdx: number; dir: -1 | 1; fromId: number; toId: number; sectionName: string
  } | null>(null)

  // Keep sectionsRef in sync with sections state (for message handlers that need latest)
  useEffect(() => { sectionsRef.current = sections }, [sections])

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
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>(initialViewport)

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
  const [paletteLoaded, setPaletteLoaded] = useState(false)

  // Load palette and favicon from DB on mount
  useEffect(() => {
    fetch('/api/theme/settings')
      .then(r => r.json())
      .then(data => {
        const s = data.settings || {}
        if (s.theme_primaryColor || s.theme_secondaryColor || s.theme_accentColor) {
          setPalette({
            primaryColor: s.theme_primaryColor || defaultPalette.primaryColor,
            secondaryColor: s.theme_secondaryColor || defaultPalette.secondaryColor,
            accentColor: s.theme_accentColor || defaultPalette.accentColor,
            headingFont: s.theme_headingFont || defaultPalette.headingFont,
            bodyFont: s.theme_bodyFont || defaultPalette.bodyFont,
            buttonRadius: s.theme_buttonRadius ? Number(s.theme_buttonRadius) : defaultPalette.buttonRadius,
          })
        }
        if (typeof s.favicon === 'string' && s.favicon) {
          setFavicon(s.favicon)
        }
      })
      .catch(() => {})
      .finally(() => setPaletteLoaded(true))
  }, [])

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
  const [favicon, setFavicon] = useState('')
  const [faviconDirty, setFaviconDirty] = useState(false)
  const [footerOpen, setFooterOpen] = useState(false)
  const FOOTER_SECTION_TYPES = new Set<string>(['footer_brand', 'footer_quick_links', 'footer_newsletter', 'footer_social'])

  // ── Navigation editor (mega menu builder) ─────────────────────────
  interface NavChild { title: string; href: string; image?: string }
  interface NavColumn { title?: string; width?: number; image?: string; imageLink?: string; items: NavChild[] }
  interface NavItem { title: string; href: string; children: NavChild[]; columns?: NavColumn[] }
  const [navOpen, setNavOpen] = useState(false)
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [navDirty, setNavDirty] = useState(false)
  const [navSaving, setNavSaving] = useState(false)
  const [navLoaded, setNavLoaded] = useState(false)
  const navRef = useRef(navItems)
  useEffect(() => { navRef.current = navItems }, [navItems])

  // Load navigation from DB on mount
  useEffect(() => {
    fetch('/api/theme/settings')
      .then(r => r.json())
      .then(data => {
        const s = data.settings || {}
        if (Array.isArray(s.nav_main)) {
          setNavItems(s.nav_main.map((i: any) => ({
            title: i.title || '', href: i.href || '#',
            children: (i.children || []).map((c: any) => ({ title: c.title || '', href: c.href || '#', image: c.image || '' })),
            columns: i.columns,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setNavLoaded(true))
  }, [])

  // ── Backups / Version History State ────────────────────────────────
  const [backups, setBackups] = useState<any[]>([])
  const [backupsOpen, setBackupsOpen] = useState(false)

  async function loadBackups() {
    try {
      const res = await fetch('/api/theme/backups').then(r => r.json())
      setBackups(res.backups || [])
    } catch {}
  }

  useEffect(() => {
    loadBackups()
  }, [])

  function restoreBackup(backup: any) {
    const timestampStr = new Date(backup.timestamp).toLocaleString()
    if (!confirm(`Restore theme to version from ${timestampStr}? This will overwrite your current draft configuration in the editor.`)) return
    
    const { sections: bSec, header: bHead, css: bCss, palette: bPal } = backup.data
    
    if (bSec) setSectionsWithHistory(bSec)
    if (bHead) setHeader(bHead)
    if (bCss) setCss(bCss)
    if (bPal) setPalette(bPal)

    setDirty(true)
    setCssDirty(true)
    setPaletteDirty(true)
    flash('Backup loaded. Click Save Theme to publish.')
    setBackupsOpen(false)
  }

  async function saveNav() {
    setNavSaving(true)
    try {
      await fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'nav_main', value: navItems }) })
      setNavDirty(false)
      flash('Navigation saved'); refreshPreview()
    } finally { setNavSaving(false) }
  }

  // ── Media picker state ────────────────────────────────────────────
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mediaCurrentUrl, setMediaCurrentUrl] = useState('')
  const mediaResolveRef = useRef<((url: string | null) => void) | null>(null)

  /** Open the shared media picker (Browse library / Upload / Paste URL) for
   *  any single image field — settings rail fields, repeater items, header
   *  logo, etc. — not just the live-preview click-to-edit flow. */
  function openMediaPicker(currentUrl: string, onPicked: (url: string) => void) {
    setMediaCurrentUrl(currentUrl)
    setMediaOpen(true)
    mediaResolveRef.current = (chosenUrl: string | null) => {
      if (!chosenUrl) return
      onPicked(chosenUrl.trim())
    }
  }

  // ── Product picker state ──────────────────────────────────────────
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [productPickerSectionId, setProductPickerSectionId] = useState<number | null>(null)
  const productPickerResolveRef = useRef<((ids: number[]) => void) | null>(null)

  // Collection picker state
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false)
  const [collectionPickerSelected, setCollectionPickerSelected] = useState<string[]>([])
  const [collectionPickerMulti, setCollectionPickerMulti] = useState(false)
  const collectionPickerResolveRef = useRef<((slugs: string[]) => void) | null>(null)

  function openCollectionPicker(selected: string[], multiSelect: boolean, onSelect: (slugs: string[]) => void) {
    setCollectionPickerSelected(selected)
    setCollectionPickerMulti(multiSelect)
    collectionPickerResolveRef.current = onSelect
    setCollectionPickerOpen(true)
  }

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000) }
  const refreshPreview = () => setPreviewKey(k => k + 1)

  // ── Section dirty close/switch warning ────────────────────────────
  const [openedSectionConfig, setOpenedSectionConfig] = useState<{ id: number; config: any } | null>(null)
  const [pendingClose, setPendingClose] = useState<{ currentId: number; nextId: number | null; nextTemplate?: 'index' | 'product' | 'collection' } | null>(null)

  function isSectionDirty(secId: number): boolean {
    if (!openedSectionConfig || openedSectionConfig.id !== secId) return false
    const current = sections.find(s => s.id === secId)
    if (!current) return false
    return JSON.stringify(current.config) !== JSON.stringify(openedSectionConfig.config)
  }

  function handleSectionToggle(nextId: number | null) {
    if (openId !== null && openId !== nextId && isSectionDirty(openId)) {
      setPendingClose({ currentId: openId, nextId })
    } else {
      setOpenId(nextId)
      const nextSec = sections.find(x => x.id === nextId)
      if (nextSec) {
        setOpenedSectionConfig({ id: nextSec.id, config: JSON.parse(JSON.stringify(nextSec.config)) })
      } else {
        setOpenedSectionConfig(null)
      }
    }
  }

  function discardAndClose() {
    if (pendingClose && openedSectionConfig) {
      const { currentId, nextId, nextTemplate } = pendingClose
      // Revert in state
      setSections(s => s.map(x => x.id === currentId ? { ...x, config: JSON.parse(JSON.stringify(openedSectionConfig.config)) } : x))
      
      // Now close/switch
      if (nextTemplate) {
        setCurrentTemplate(nextTemplate)
        setOpenId(null)
        setOpenedSectionConfig(null)
      } else if (nextId === -1) {
        setAllCollapsed(true)
        setOpenId(null)
        setOpenedSectionConfig(null)
      } else {
        setOpenId(nextId)
        const nextSec = sections.find(x => x.id === nextId)
        if (nextSec) {
          setOpenedSectionConfig({ id: nextSec.id, config: JSON.parse(JSON.stringify(nextSec.config)) })
        } else {
          setOpenedSectionConfig(null)
        }
      }
      setPendingClose(null)
    }
  }

  async function saveAndClose() {
    if (pendingClose) {
      const { currentId, nextId, nextTemplate } = pendingClose
      const sec = sections.find(x => x.id === currentId)
      if (sec) {
        await saveSection(sec)
      }
      // Now close/switch
      if (nextTemplate) {
        setCurrentTemplate(nextTemplate)
        setOpenId(null)
        setOpenedSectionConfig(null)
      } else if (nextId === -1) {
        setAllCollapsed(true)
        setOpenId(null)
        setOpenedSectionConfig(null)
      } else {
        setOpenId(nextId)
        const nextSec = sections.find(x => x.id === nextId)
        if (nextSec) {
          setOpenedSectionConfig({ id: nextSec.id, config: JSON.parse(JSON.stringify(nextSec.config)) })
        } else {
          setOpenedSectionConfig(null)
        }
      }
      setPendingClose(null)
    }
  }

  // Debounce saving draft to server
  useEffect(() => {
    if (!dirty && !cssDirty && !paletteDirty && !navDirty) return

    const timer = setTimeout(async () => {
      try {
        await fetch('/api/theme/preview-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: currentTemplate,
            sections,
            header,
            css,
            palette,
          }),
        })
        refreshPreview()
      } catch (err) {
        console.error('Failed to save preview draft:', err)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [sections, header, css, palette, dirty, cssDirty, paletteDirty, navDirty])

  // ── beforeunload guard ────────────────────────────────────────────
  useEffect(() => {
    if (!dirty && !cssDirty && !paletteDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, cssDirty])

  // ── Navigation guard for Next.js in-app navigation ────────────────
  const confirmLeave = useCallback((msg?: string): boolean => {
    if (!dirty && !cssDirty && !paletteDirty) return true
    return window.confirm(msg || 'You have unsaved theme changes. Are you sure you want to leave?')
  }, [dirty, cssDirty, paletteDirty])

  // ── Click-to-edit + in-preview actions from the preview iframe ──
  useEffect(() => {
    const openAndScroll = (id: number) => {
      handleSectionToggle(id)
      requestAnimationFrame(() => document.getElementById(`sec-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }

    /** Deep set a config value at a dot-path, e.g. "slides.0.heading" */
    function setByPath(obj: Record<string, any>, path: string, value: any): Record<string, any> {
      const keys = path.split('.')
      const clone = JSON.parse(JSON.stringify(obj))
      let current: any = clone
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        const n = Number(k)
        // Array index or object key
        if (!isNaN(n) && Array.isArray(current)) {
          if (!current[n]) current[n] = {}
          current = current[n]
        } else {
          if (!current[k] || typeof current[k] !== 'object') current[k] = {}
          current = current[k]
        }
      }
      const lastKey = keys[keys.length - 1]
      const lastNum = Number(lastKey)
      if (!isNaN(lastNum) && Array.isArray(current)) {
        current[lastNum] = value
      } else {
        current[lastKey] = value
      }
      return clone
    }

    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.source !== 'homeu-preview') return

      // ── Inline text edit (Phase 2: dblclick → contentEditable) ──
      if (d.kind === 'edit-text') {
        const id = Number(d.id)
        const path = d.path as string
        const value = d.value as string
        setSections(prev => {
          const idx = prev.findIndex(s => s.id === id)
          if (idx === -1) return prev
          const updated = { ...prev[idx], config: setByPath(prev[idx].config, path, value) }
          const next = [...prev]
          next[idx] = updated
          return next
        })
        setDirty(true)
        // Auto-save the edited section immediately so the preview stays consistent
        const sec = sectionsRef.current.find(x => x.id === id)
        if (sec) {
          const newConfig = setByPath(sec.config, path, value)
          fetch(`/api/theme/sections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: newConfig }) })
        }
        return
      }

      // ── Product picker: click product in preview → open ProductPicker ──
      if (d.kind === 'pick-product') {
        const id = Number(d.id)
        const productIndex = d.productIndex !== undefined ? Number(d.productIndex) : undefined

        // If we have a specific slot AND the section is already curated, do slot replacement
        if (productIndex !== undefined && !isNaN(productIndex)) {
          const sec = sectionsRef.current.find(x => x.id === id)
          const existingIds: number[] = sec?.config?.curatedIds || []
          if (existingIds.length > productIndex) {
            // Slot replacement — route to pick-product-slot logic
            setProductPickerSectionId(id)
            setProductPickerOpen(true)
            productPickerResolveRef.current = (chosenIds: number[]) => {
              if (!chosenIds || chosenIds.length === 0) return
              const chosenId = chosenIds[0]
              setSections(prev => {
                const idx = prev.findIndex(s => s.id === id)
                if (idx === -1) return prev
                const ids: number[] = [...(prev[idx].config?.curatedIds || [])]
                if (productIndex < ids.length) ids[productIndex] = chosenId
                else ids.push(chosenId)
                const next = [...prev]
                next[idx] = { ...next[idx], config: { ...next[idx].config, curatedIds: ids, source: 'curated' } }
                return next
              })
              setDirty(true)
              const secData = sectionsRef.current.find(x => x.id === id)
              if (secData) {
                const ids: number[] = [...(secData.config?.curatedIds || [])]
                if (productIndex < ids.length) ids[productIndex] = chosenId
                else ids.push(chosenId)
                fetch(`/api/theme/sections/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ config: { ...secData.config, curatedIds: ids, source: 'curated' } }),
                })
              }
              refreshPreview()
            }
            return
          }
        }

        // Full replacement (no slot or section not yet curated)
        setProductPickerSectionId(id)
        setProductPickerOpen(true)
        productPickerResolveRef.current = (chosenIds: number[]) => {
          if (!chosenIds) return
          setSections(prev => {
            const idx = prev.findIndex(s => s.id === id)
            if (idx === -1) return prev
            const next = [...prev]
            next[idx] = { ...next[idx], config: { ...next[idx].config, curatedIds: chosenIds, source: 'curated' } }
            return next
          })
          setDirty(true)
          const secData = sectionsRef.current.find(x => x.id === id)
          if (secData) {
            const newConfig = { ...secData.config, curatedIds: chosenIds, source: 'curated' }
            fetch(`/api/theme/sections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: newConfig }) })
          }
          refreshPreview()
        }
        return
      }

      // ── Per-slot product replace: click a single product box's swap button ──
      if (d.kind === 'pick-product-slot') {
        const id = Number(d.id)
        const productIndex = Number(d.productIndex)
        if (isNaN(productIndex)) return
        setProductPickerSectionId(id)
        setProductPickerOpen(true)
        const sec = sectionsRef.current.find(x => x.id === id)
        const currentIds: number[] = sec?.config?.curatedIds || []

        productPickerResolveRef.current = (chosenIds: number[]) => {
          if (!chosenIds || chosenIds.length === 0) return
          const chosenId = chosenIds[0] // single select

          setSections(prev => {
            const idx = prev.findIndex(s => s.id === id)
            if (idx === -1) return prev
            const existingIds: number[] = prev[idx].config?.curatedIds || []
            let newIds: number[]
            if (existingIds.length > 0) {
              newIds = [...existingIds]
              if (productIndex < newIds.length) {
                newIds[productIndex] = chosenId
              } else {
                newIds.push(chosenId)
              }
            } else {
              newIds = [chosenId]
            }
            const next = [...prev]
            next[idx] = { ...next[idx], config: { ...next[idx].config, curatedIds: newIds, source: 'curated' } }
            return next
          })
          setDirty(true)
          const secData = sectionsRef.current.find(x => x.id === id)
          if (secData) {
            const existingIds: number[] = secData.config?.curatedIds || []
            let newIds: number[]
            if (existingIds.length > 0) {
              newIds = [...existingIds]
              if (productIndex < newIds.length) {
                newIds[productIndex] = chosenId
              } else {
                newIds.push(chosenId)
              }
            } else {
              newIds = [chosenId]
            }
            fetch(`/api/theme/sections/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ config: { ...secData.config, curatedIds: newIds, source: 'curated' } }),
            })
          }
          refreshPreview()
        }
        return
      }

      // ── Image picker (Phase 3: click image → open media picker) ──
      if (d.kind === 'pick-image') {
        const id = Number(d.id)
        const path = d.path as string
        const sec = sectionsRef.current.find(x => x.id === id)
        const currentUrl = sec ? (() => {
          const keys = path.split('.')
          let v: any = sec.config
          for (const k of keys) { v = v?.[k] }
          return typeof v === 'string' ? v : ''
        })() : ''
        setMediaCurrentUrl(currentUrl)
        setMediaOpen(true)
        // The MediaPicker will call onSelect when user picks, or onClose when cancelled.
        // We store a resolver to PATCH the chosen URL.
        mediaResolveRef.current = (chosenUrl: string | null) => {
          if (chosenUrl === null || chosenUrl === undefined) return // cancelled
          const trimmedUrl = chosenUrl.trim()
          if (!trimmedUrl) return
          setSections(prev => {
            const idx = prev.findIndex(s => s.id === id)
            if (idx === -1) return prev
            const newConfig = setByPath(prev[idx].config, path, trimmedUrl)
            const updated = { ...prev[idx], config: newConfig }
            const next = [...prev]
            next[idx] = updated
            return next
          })
          setDirty(true)
          fetch(`/api/theme/sections/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: setByPath(sec?.config || {}, path, trimmedUrl) }),
          })
          refreshPreview()
        }
        return
      }

      // ── Drag reorder (Phase 4: drag section in preview) ──
      if (d.kind === 'reorder') {
        const fromId = Number(d.id)
        const toIndex = d.toIndex as number
        setSections(prev => {
          const fromIdx = prev.findIndex(s => s.id === fromId)
          if (fromIdx === -1 || toIndex < 0 || toIndex >= prev.length) return prev
          const next = [...prev]
          const [moved] = next.splice(fromIdx, 1)
          next.splice(toIndex, 0, moved)
          return next
        })
        setDirty(true)
        return
      }

      // ── Insert section between sections (preview "+" buttons) ──
      if (d.kind === 'insert-section') {
        const beforeIndex = d.beforeIndex as number
        setAdding(true) // opens the type picker
        // Store the insertion index so addSection can use it
        ;(window as any).__insertBeforeIndex = beforeIndex
        return
      }

      // Toolbar buttons in the preview: edit / move up / move down
      if (d.kind === 'action') {
        if (d.id === 'header') { setHeaderOpen(true); return }
        const id = Number(d.id)
        if (d.action === 'edit') { openAndScroll(id); return }
        if (d.action === 'up' || d.action === 'down') {
          const dir = d.action === 'up' ? -1 : 1
          const idx = sectionsRef.current.findIndex(s => s.id === id)
          const j = idx + dir
          if (idx === -1 || j < 0 || j >= sectionsRef.current.length) return
          const sec = sectionsRef.current[idx]
          const meta = SECTION_META[sec.type]
          setPendingMove({
            bodyIdx: idx, dir, fromId: id,
            toId: sectionsRef.current[j].id,
            sectionName: meta?.label || sec.type,
          })
        }
        return
      }

      if (d.kind === 'select') {
        if (d.id === 'header') {
          setHeaderOpen(true)
          requestAnimationFrame(() => document.getElementById('header-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
          return
        }
        openAndScroll(Number(d.id))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function setConfig(id: number, key: string, value: any) {
    setSectionsWithHistory(s => s.map(x => x.id === id ? { ...x, config: { ...x.config, [key]: value } } : x))
    setDirty(true)
  }
async function patchSection(id: number, body: any) {
  const res = await fetch(`/api/theme/sections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Save failed (${res.status}): ${(await res.json().catch(() => ({}))).error || res.statusText}`)
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
      setOpenedSectionConfig({ id: sec.id, config: JSON.parse(JSON.stringify(config)) })
      flash('Saved'); refreshPreview()
    } catch (err: any) {
      flash('Error: ' + (err.message || 'Failed to save'))
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

      // Save palette if dirty
      if (paletteDirty) {
        Object.entries(palette).forEach(([key, value]) => {
          promises.push(
            fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `theme_${key}`, value }) })
              .then(() => {})
          )
        })
      }

      // Save favicon if dirty
      if (faviconDirty && favicon) {
        promises.push(
          fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'favicon', value: favicon }) })
            .then(() => {})
        )
      }

      // Save header if dirty (tracked by its own save, but included for completeness)
      promises.push(
        fetch('/api/theme/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'header_settings', value: header }) })
          .then(r => { if (!r.ok) throw new Error(`Header save failed (${r.status})`) })
      )

      await Promise.all(promises)

      // Persist section order (config/enabled saved above; order saved here)
      const orderRes = await fetch('/api/theme/sections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: sections.map(s => s.id) }) })
      if (!orderRes.ok) throw new Error(`Order save failed (${orderRes.status})`)
      setDirty(false)
      setCssDirty(false)
      setPaletteDirty(false)
      setFaviconDirty(false)
      if (openId !== null) {
        const currentSec = sections.find(x => x.id === openId)
        if (currentSec) {
          setOpenedSectionConfig({ id: openId, config: JSON.parse(JSON.stringify(currentSec.config)) })
        }
      }
      
      // Save backup snapshot
      fetch('/api/theme/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, header, css, palette }),
      }).then(() => loadBackups()).catch(err => console.warn('[ThemeEditor] Backup save failed:', err))

      flash('All changes saved'); refreshPreview()
    } catch (err: any) {
      flash('Error: ' + (err.message || 'Failed to save all'))
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

  function move(bodyIdx: number, dir: -1 | 1) {
    const bodySections = sections.filter(s => !FOOTER_SECTION_TYPES.has(s.type))
    const j = bodyIdx + dir
    if (j < 0 || j >= bodySections.length) return
    const sec = bodySections[bodyIdx]
    const meta = SECTION_META[sec.type]
    setPendingMove({
      bodyIdx, dir, fromId: sec.id,
      toId: bodySections[j].id,
      sectionName: meta?.label || sec.type,
    })
  }

  function executeMove(fromId: number, toId: number) {
    setSectionsWithHistory(prev => {
      const next = [...prev]
      const fromGlobalIdx = next.findIndex(s => s.id === fromId)
      const toGlobalIdx = next.findIndex(s => s.id === toId)
      if (fromGlobalIdx === -1 || toGlobalIdx === -1) return prev
      ;[next[fromGlobalIdx], next[toGlobalIdx]] = [next[toGlobalIdx], next[fromGlobalIdx]]
      return next
    })
    setDirty(true)
    // Persist immediately and refresh preview
    fetch('/api/theme/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: sections.map(s => s.id === fromId ? toId : s.id === toId ? fromId : s.id) }),
    }).then(r => { if (!r.ok) console.error('[ThemeEditor] Move reorder failed:', r.status) }).catch(err => console.error('[ThemeEditor] Move reorder error:', err))
    refreshPreview()
    flash('Section moved')
    setPendingMove(null)
  }

  async function addSection(type: SectionType) {
    if (openId !== null && isSectionDirty(openId)) {
      if (!confirm('You have unsaved changes in the open section. Discard changes and add section?')) return
      setSections(s => s.map(x => x.id === openId ? { ...x, config: JSON.parse(JSON.stringify(openedSectionConfig?.config || {})) } : x))
    }
    setAdding(false)
    const preset = SECTION_PRESETS[type] || {}
    const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, config: preset, template: currentTemplate }) })
    const { id } = await res.json()
    const insertIdx: number | undefined = (window as any).__insertBeforeIndex
    delete (window as any).__insertBeforeIndex
    setSectionsWithHistory(s => {
      const bodySections = s.filter(x => !FOOTER_SECTION_TYPES.has(x.type))
      let globalPos: number
      if (insertIdx !== undefined && insertIdx < bodySections.length) {
        // Insert before the specified body section
        const targetId = bodySections[insertIdx].id
        const targetGlobalIdx = s.findIndex(x => x.id === targetId)
        globalPos = targetGlobalIdx >= 0 ? targetGlobalIdx : s.length
      } else {
        globalPos = s.length
      }
      const newSec = { id, type, position: (s.length + 1) * 10, enabled: true, config: { ...preset } }
      const next = [...s]
      next.splice(globalPos, 0, newSec)
      return next
    })
    setOpenId(id)
    setOpenedSectionConfig({ id, config: JSON.parse(JSON.stringify(preset)) })
    setDirty(true)
    refreshPreview()
  }

  async function duplicate(sec: Section) {
    if (openId !== null && isSectionDirty(openId) && openId !== sec.id) {
      if (!confirm('You have unsaved changes in the open section. Discard changes and duplicate?')) return
      setSections(s => s.map(x => x.id === openId ? { ...x, config: JSON.parse(JSON.stringify(openedSectionConfig?.config || {})) } : x))
    }
    const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: sec.type, config: sec.config, template: currentTemplate }) })
    const { id } = await res.json()
    setSectionsWithHistory(s => {
      const idx = s.findIndex(x => x.id === sec.id)
      const pos = idx >= 0 ? s[idx].position + 5 : (s.length + 1) * 10
      const copy = [...s]
      copy.splice(idx + 1, 0, { id, type: sec.type, position: pos, enabled: sec.enabled, config: { ...sec.config } })
      return copy
    })
    setOpenId(id)
    setOpenedSectionConfig({ id, config: JSON.parse(JSON.stringify(sec.config)) })
    setDirty(true)
    refreshPreview()
    flash('Section duplicated')
  }

  async function del(id: number) {
    if (openId !== id && openId !== null && isSectionDirty(openId)) {
      if (!confirm('You have unsaved changes in the open section. Discard changes and delete?')) return
      setSections(s => s.map(x => x.id === openId ? { ...x, config: JSON.parse(JSON.stringify(openedSectionConfig?.config || {})) } : x))
    }
    if (!confirm('Delete this section?')) return
    setSectionsWithHistory(s => s.filter(x => x.id !== id))
    setDirty(true)
    if (openId === id) {
      setOpenId(null)
      setOpenedSectionConfig(null)
    }
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

  async function importTheme() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.sections || !Array.isArray(data.sections)) { flash('Invalid theme file'); return }

        // Validate all section types before touching anything
        for (const s of data.sections) {
          if (!SECTION_TYPES.includes(s.type)) {
            flash(`Invalid section type "${s.type}" — import cancelled`)
            return
          }
        }

        // Create new sections first (non-destructive)
        const newSections: Section[] = []
        for (const s of data.sections) {
          const res = await fetch('/api/theme/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: s.type, config: s.config || {}, enabled: s.enabled !== false, template: currentTemplate }) })
          if (!res.ok) throw new Error(`Failed to create section "${s.type}" (${res.status})`)
          const { id } = await res.json()
          newSections.push({ ...s, id, position: (newSections.length + 1) * 10 })
        }

        // Only after all new sections are created, delete old ones
        const fresh = await fetch(`/api/theme/sections?template=${currentTemplate}`).then(r => r.json())
        const currentSections: Section[] = fresh.sections || []
        for (const sec of currentSections) {
          if (!newSections.some(ns => ns.id === sec.id)) {
            const delRes = await fetch(`/api/theme/sections/${sec.id}`, { method: 'DELETE' })
            if (!delRes.ok) console.warn(`[ThemeEditor] Delete old section ${sec.id} failed: ${delRes.status}`)
          }
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

  /** Thumbnail + "Browse media" button — replaces hand-typed image URLs
   *  everywhere with the same library/upload/paste-URL picker. */
  function ImageField({ label, value, onChange, compact }: { label?: string; value: string; onChange: (v: string) => void; compact?: boolean }) {
    return (
      <div>
        {label && <label style={lbl}>{label}</label>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: compact ? 36 : 52, height: compact ? 36 : 52, flexShrink: 0, borderRadius: 7,
            background: '#f4f6f2', border: '1px solid #e4e9e2', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {value
              ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 16, color: '#c3cdc1' }}>🖼</span>}
          </div>
          <button
            type="button"
            onClick={() => openMediaPicker(value, (url) => onChange(url))}
            style={{
              flex: 1, padding: '8px 12px', border: '1.5px dashed #9cc4a9', borderRadius: 8,
              background: '#f0f7f2', color: '#1e7a47', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
            {value ? 'Change image…' : 'Browse media…'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} title="Remove image"
              style={{ border: 'none', background: 'transparent', color: '#b0392f', cursor: 'pointer', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>
              ×
            </button>
          )}
        </div>
      </div>
    )
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

  // Scale the rail's contents to fit its width (380px = 100%, floor 62%)
  const railScale = Math.min(1, Math.max(0.62, railWidth / 380))

  return (
    <div style={{ display: 'flex', gap: 0, fontFamily: 'Inter, sans-serif', height: 'calc(100vh - 0px)' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#1e7a47', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14, zIndex: 100, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>{toast}</div>}

      <MediaPicker
        open={mediaOpen}
        currentUrl={mediaCurrentUrl}
        onSelect={(url) => {
          setMediaOpen(false)
          mediaResolveRef.current?.(url)
          mediaResolveRef.current = null
        }}
        onClose={() => {
          setMediaOpen(false)
          mediaResolveRef.current?.(null)
          mediaResolveRef.current = null
        }}
      />

      {/* ── Product picker modal ── */}
      <ProductPicker
        open={productPickerOpen}
        selectedIds={(() => {
          const sec = productPickerSectionId ? sectionsRef.current.find(x => x.id === productPickerSectionId) : null
          return sec?.config?.curatedIds || []
        })()}
        multiSelect={true}
        onSelect={(ids) => {
          setProductPickerOpen(false)
          productPickerResolveRef.current?.(ids)
          productPickerResolveRef.current = null
          setProductPickerSectionId(null)
        }}
        onClose={() => {
          setProductPickerOpen(false)
          productPickerResolveRef.current?.([])
          productPickerResolveRef.current = null
          setProductPickerSectionId(null)
        }}
      />

      <CollectionPicker
        open={collectionPickerOpen}
        selectedSlugs={collectionPickerSelected}
        multiSelect={collectionPickerMulti}
        maxSelections={15}
        onSelect={(slugs) => {
          setCollectionPickerOpen(false)
          collectionPickerResolveRef.current?.(slugs)
          collectionPickerResolveRef.current = null
        }}
        onClose={() => {
          setCollectionPickerOpen(false)
          collectionPickerResolveRef.current = null
        }}
      />

      {/* ── Reorder confirmation bar ── */}
      {pendingMove && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: '#151a17', color: '#fff', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.25)',
          fontFamily: 'Inter, sans-serif', fontSize: 14,
        }}>
          <span>Move <strong>{pendingMove.sectionName}</strong> {pendingMove.dir === -1 ? 'up' : 'down'} one position?</span>
          <button onClick={() => executeMove(pendingMove.fromId, pendingMove.toId)}
            style={{
              padding: '8px 22px', border: 'none', borderRadius: 8,
              background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>✓ Confirm</button>
          <button onClick={() => setPendingMove(null)}
            style={{
              padding: '8px 18px', border: '1.5px solid #667168', borderRadius: 8,
              background: 'transparent', color: '#c2cdbe',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>✕ Cancel</button>
        </div>
      )}

      {/* ── Left: editor (compact, resizable rail) ── */}
      <div style={{ flex: `0 0 ${railWidth}px`, width: railWidth, minWidth: railWidth, overflowY: 'auto', padding: '20px 16px', borderRight: resizing ? 'none' : '1px solid #e3e8e0' }}>
       <div style={{ zoom: railScale } as React.CSSProperties}>
        {/* ── Header bar with Save All ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
          <div>
            <Link href="/admin/dashboard" style={{ color: '#667168', fontSize: 12, textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>← Dashboard</Link>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Page Template</span>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={currentTemplate}
                  onChange={(e) => {
                    const nextTemplate = e.target.value as 'index' | 'product' | 'collection'
                    if (openId !== null && isSectionDirty(openId)) {
                      setPendingClose({ currentId: openId, nextId: null, nextTemplate })
                    } else {
                      setCurrentTemplate(nextTemplate)
                    }
                  }}
                  style={{
                    padding: '6px 28px 6px 10px',
                    border: '1.5px solid #d9e0d7',
                    borderRadius: 7,
                    background: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#151a17',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23667168' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                  }}
                >
                  <option value="index">Homepage</option>
                  <option value="product">Product Page</option>
                  <option value="collection">Collection Page</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Undo / Redo */}
            <button onClick={undo} disabled={historyIdx <= 0} title="Undo (Ctrl+Z)"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: historyIdx > 0 ? 'pointer' : 'default', fontSize: 14, opacity: historyIdx > 0 ? 1 : 0.3 }}>↩</button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} title="Redo"
              style={{ padding: '6px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: '#fff', cursor: historyIdx < history.length - 1 ? 'pointer' : 'default', fontSize: 14, opacity: historyIdx < history.length - 1 ? 1 : 0.3 }}>↪</button>
            {/* Collapse all */}
            <button onClick={() => {
              if (openId !== null && isSectionDirty(openId)) {
                setPendingClose({ currentId: openId, nextId: -1 })
              } else {
                setAllCollapsed(c => !c)
                setOpenId(allCollapsed ? null : -1)
              }
            }} title={allCollapsed ? 'Expand all' : 'Collapse all'}
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
            {/* Backups / History */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setBackupsOpen(o => !o)} title="Theme Backups / Version History"
                style={{
                  padding: '6px 10px', border: '1.5px solid #1e7a47', borderRadius: 6,
                  background: backupsOpen ? '#1e7a47' : '#fff',
                  color: backupsOpen ? '#fff' : '#1e7a47',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4
                }}>
                ⏳ Backups {backups.length > 0 && `(${backups.length})`}
              </button>
              {backupsOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10,
                  padding: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  width: 240, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#667168', padding: '2px 4px', borderBottom: '1px solid #eef1ed' }}>RESTORE BACKUP</div>
                  {backups.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9aa69c', padding: '6px 4px', textAlign: 'center' }}>No backups saved yet</div>
                  ) : (
                    backups.map((b, i) => (
                      <button key={i} onClick={() => restoreBackup(b)}
                        style={{
                          width: '100%', padding: '6px 8px', background: '#f9faf8', border: '1px solid #eef1ed',
                          borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                          transition: 'all 100ms ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f7f2'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f9faf8'}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#151a17' }}>Version {i + 1}</div>
                        <div style={{ fontSize: 10, color: '#667168', marginTop: 2 }}>{new Date(b.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {(dirty || cssDirty || paletteDirty) && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b0392f', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b0392f', display: 'inline-block' }} />
                Unsaved
              </span>
            )}
            <button onClick={() => {
              if (!dirty && !cssDirty && !paletteDirty) {
                flash('Theme settings are already up to date!')
              } else {
                saveAll()
              }
            }} disabled={isSavingAll}
              style={{
                padding: '9px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: (dirty || cssDirty || paletteDirty) ? 'none' : '1.5px solid #1e7a47',
                background: (dirty || cssDirty || paletteDirty) ? 'linear-gradient(180deg, #1e7a47, #0f4f2b)' : '#fff',
                color: (dirty || cssDirty || paletteDirty) ? '#fff' : '#1e7a47',
                transition: 'all 150ms ease',
              }}>
              {isSavingAll ? 'Saving…' : (dirty || cssDirty || paletteDirty) ? '★ Save Theme' : '★ Theme Saved'}
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
              <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>Header & Favicon</div>
              <div style={{ fontSize: 12, color: '#9aa69c' }}>Logo, favicon, colors & sticky behaviour (menu links live in Navigation)</div>
            </div>
            <span style={{ color: '#9aa69c' }}>{headerOpen ? '▲' : '▼'}</span>
          </button>
          {headerOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eef1ed' }}>
              <div style={{ marginTop: 12 }}>
                <ImageField label="Logo" value={header.logoUrl} onChange={v => setHeader(h => ({ ...h, logoUrl: v }))} />
              </div>
              <div style={{ marginTop: 8 }}>
                <ImageField label="Favicon" value={favicon} onChange={v => { setFavicon(v); setFaviconDirty(true) }} />
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
                  <label style={lbl}>Icons position</label>
                  <select style={input} value={header.iconsPosition || 'right'} onChange={e => setHeader(h => ({ ...h, iconsPosition: e.target.value as 'right' | 'left' | 'top-bar' }))}>
                    <option value="right">Right of logo</option>
                    <option value="left">Left of logo</option>
                    <option value="top-bar">Top utility bar</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Logo layout</label>
                  <select style={input} value={header.layout || 'logo-center'} onChange={e => setHeader(h => ({ ...h, layout: e.target.value as 'logo-center' | 'logo-left' }))}>
                    <option value="logo-center">Center aligned</option>
                    <option value="logo-left">Left aligned</option>
                  </select>
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
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                <button onClick={saveHeader} disabled={headerSaving} style={{ padding: '9px 24px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{headerSaving ? 'Saving…' : 'Save header'}</button>
                <button onClick={() => setNavOpen(o => !o)} style={{ padding: '9px 18px', background: navOpen ? '#151a17' : '#f0f7f2', color: navOpen ? '#fff' : '#1e7a47', border: '1.5px solid #cfe3d6', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  ☰ {navOpen ? 'Close nav' : 'Edit navigation'}
                </button>
              </div>

              {/* ── Inline navigation editor (mega menu builder) ── */}
              {navOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #eef1ed' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#151a17' }}>Main navigation</span>
                    {navDirty && <span style={{ fontSize: 11, color: '#b0392f', fontWeight: 600 }}>Unsaved</span>}
                  </div>
                  {navItems.map((item, i) => (
                    <div key={i} style={{ border: '1px solid #eef1ed', borderRadius: 8, padding: 10, marginBottom: 8, background: '#fafbf9' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <input style={{ ...input, flex: 1, minWidth: 100 }} value={item.title} placeholder="Menu title"
                          onChange={e => { const next = [...navItems]; next[i] = { ...next[i], title: e.target.value }; setNavItems(next); setNavDirty(true) }} />
                        <input style={{ ...input, flex: 1, minWidth: 100 }} value={item.href} placeholder="Link (e.g. /products)"
                          onChange={e => { const next = [...navItems]; next[i] = { ...next[i], href: e.target.value }; setNavItems(next); setNavDirty(true) }} />
                        <button onClick={() => {
                          const next = [...navItems]
                          next[i] = { ...next[i], columns: item.columns ? undefined : [{ title: '', width: 1, image: '', imageLink: '', items: [] }] }
                          setNavItems(next); setNavDirty(true)
                        }} title={item.columns ? 'Switch to simple dropdown' : 'Switch to mega menu columns'}
                          style={{ padding: '4px 10px', border: '1px solid #d9e0d7', borderRadius: 6, background: item.columns ? '#151a17' : '#fff', color: item.columns ? '#fff' : '#667168', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {item.columns ? 'Mega ✓' : '+ Mega'}
                        </button>
                        <button onClick={() => { const next = [...navItems]; next.splice(i, 1); setNavItems(next); setNavDirty(true) }}
                          style={{ padding: '4px 10px', border: '1px solid #e8c5c1', borderRadius: 6, background: '#fff', color: '#b0392f', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>×</button>
                      </div>

                      {/* Mega menu columns */}
                      {item.columns && item.columns.map((col, ci) => (
                        <div key={ci} style={{ marginLeft: 8, marginTop: 6, padding: 8, border: '1px dashed #cfe3d6', borderRadius: 6, background: '#fff' }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <input style={{ ...input, flex: 1, minWidth: 80 }} value={col.title || ''} placeholder="Column title"
                              onChange={e => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; cols[ci] = { ...cols[ci], title: e.target.value }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }} />
                            <input style={{ ...input, flex: 1, minWidth: 80 }} value={col.image || ''} placeholder="Promo image URL"
                              onChange={e => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; cols[ci] = { ...cols[ci], image: e.target.value }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }} />
                            <input style={{ ...input, width: 60, minWidth: 60 }} type="number" value={col.width || 1} min={1} max={4} placeholder="Width"
                              onChange={e => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; cols[ci] = { ...cols[ci], width: parseInt(e.target.value) || 1 }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }} />
                          </div>
                          {col.items.map((child, cci) => (
                            <div key={cci} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              <input style={{ ...input, flex: 1 }} value={child.title} placeholder="Link text"
                                onChange={e => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; const items = [...cols[ci].items]; items[cci] = { ...items[cci], title: e.target.value }; cols[ci] = { ...cols[ci], items }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }} />
                              <input style={{ ...input, flex: 1 }} value={child.href} placeholder="Link URL"
                                onChange={e => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; const items = [...cols[ci].items]; items[cci] = { ...items[cci], href: e.target.value }; cols[ci] = { ...cols[ci], items }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }} />
                              <button onClick={() => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; const items = cols[ci].items.filter((_, ii) => ii !== cci); cols[ci] = { ...cols[ci], items }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }}
                                style={{ padding: '4px 8px', border: '1px solid #e8c5c1', borderRadius: 6, background: '#fff', color: '#b0392f', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>×</button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <button onClick={() => { const next = [...navItems]; const cols = [...(next[i].columns || [])]; cols[ci] = { ...cols[ci], items: [...cols[ci].items, { title: '', href: '', image: '' }] }; next[i] = { ...next[i], columns: cols }; setNavItems(next); setNavDirty(true) }}
                              style={{ padding: '4px 10px', border: '1px dashed #9cc4a9', borderRadius: 6, background: '#f0f7f2', color: '#1e7a47', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Link</button>
                            <button onClick={() => { const next = [...navItems]; const cols = (next[i].columns || []).filter((_, ii) => ii !== ci); next[i] = { ...next[i], columns: cols.length > 0 ? cols : undefined }; setNavItems(next); setNavDirty(true) }}
                              style={{ padding: '4px 10px', border: '1px solid #e8c5c1', borderRadius: 6, background: '#fff', color: '#b0392f', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Remove column</button>
                          </div>
                        </div>
                      ))}
                      {item.columns && (
                        <button onClick={() => { const next = [...navItems]; next[i] = { ...next[i], columns: [...(next[i].columns || []), { title: '', width: 1, image: '', imageLink: '', items: [] }] }; setNavItems(next); setNavDirty(true) }}
                          style={{ marginTop: 6, marginLeft: 8, padding: '5px 12px', border: '1px dashed #9cc4a9', borderRadius: 6, background: '#f0f7f2', color: '#1e7a47', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add column</button>
                      )}

                      {/* Simple children (non-mega) */}
                      {!item.columns && item.children.map((child, ci) => (
                        <div key={ci} style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 8 }}>
                          <input style={{ ...input, flex: 1 }} value={child.title} placeholder="Child title"
                            onChange={e => { const next = [...navItems]; const ch = [...next[i].children]; ch[ci] = { ...ch[ci], title: e.target.value }; next[i] = { ...next[i], children: ch }; setNavItems(next); setNavDirty(true) }} />
                          <input style={{ ...input, flex: 1 }} value={child.href} placeholder="Child link"
                            onChange={e => { const next = [...navItems]; const ch = [...next[i].children]; ch[ci] = { ...ch[ci], href: e.target.value }; next[i] = { ...next[i], children: ch }; setNavItems(next); setNavDirty(true) }} />
                          <button onClick={() => { const next = [...navItems]; next[i] = { ...next[i], children: next[i].children.filter((_, ii) => ii !== ci) }; setNavItems(next); setNavDirty(true) }}
                            style={{ padding: '4px 8px', border: '1px solid #e8c5c1', borderRadius: 6, background: '#fff', color: '#b0392f', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>×</button>
                        </div>
                      ))}
                      {!item.columns && (
                        <button onClick={() => { const next = [...navItems]; next[i] = { ...next[i], children: [...next[i].children, { title: '', href: '', image: '' }] }; setNavItems(next); setNavDirty(true) }}
                          style={{ marginTop: 4, marginLeft: 8, padding: '4px 10px', border: '1px dashed #9cc4a9', borderRadius: 6, background: '#f0f7f2', color: '#1e7a47', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Child link</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setNavItems([...navItems, { title: '', href: '#', children: [] }]); setNavDirty(true) }}
                      style={{ padding: '7px 16px', border: '1px dashed #9cc4a9', borderRadius: 8, background: '#f0f7f2', color: '#1e7a47', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add menu item</button>
                    <button onClick={saveNav} disabled={navSaving}
                      style={{ padding: '7px 20px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{navSaving ? 'Saving…' : 'Save navigation'}</button>
                  </div>
                </div>
              )}

              {/* ── Announcement bar ── */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #eef1ed' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3a4339', cursor: 'pointer', marginBottom: 12 }}>
                  <input type="checkbox" checked={header.announcement?.enabled || false} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { text: '', link: '', bgColor: '#151a17', textColor: '#ffffff' }), enabled: e.target.checked } }))} />
                  <strong>Announcement bar</strong> — promo strip above the header
                </label>
                {(header.announcement?.enabled) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Announcement text</label>
                      <input style={input} value={header.announcement?.text || ''} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { enabled: true, link: '', bgColor: '#151a17', textColor: '#ffffff' }), text: e.target.value } }))} placeholder="Free shipping on orders over ₱5,000" />
                    </div>
                    <div>
                      <label style={lbl}>Link (optional)</label>
                      <input style={input} value={header.announcement?.link || ''} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { enabled: true, text: '', bgColor: '#151a17', textColor: '#ffffff' }), link: e.target.value } }))} placeholder="/products" />
                    </div>
                    <div>
                      <label style={lbl}>Background color</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="color" value={header.announcement?.bgColor || '#151a17'} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { enabled: true, text: '', link: '', textColor: '#ffffff' }), bgColor: e.target.value } }))} style={{ width: 36, height: 36, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                        <input style={{ ...input, flex: 1 }} value={header.announcement?.bgColor || '#151a17'} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { enabled: true, text: '', link: '', textColor: '#ffffff' }), bgColor: e.target.value } }))} />
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Text color</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="color" value={header.announcement?.textColor || '#ffffff'} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { enabled: true, text: '', link: '', bgColor: '#151a17' }), textColor: e.target.value } }))} style={{ width: 36, height: 36, padding: 2, border: '1.5px solid #d9e0d7', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                        <input style={{ ...input, flex: 1 }} value={header.announcement?.textColor || '#ffffff'} onChange={e => setHeader(h => ({ ...h, announcement: { ...(h.announcement || { enabled: true, text: '', link: '', bgColor: '#151a17' }), textColor: e.target.value } }))} />
                      </div>
                    </div>
                  </div>
                )}
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

        {/* ── Footer panel ── */}
        <div style={{ ...card, marginTop: 18 }}>
          <button onClick={() => setFooterOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>👣</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#151a17' }}>Footer</div>
              <div style={{ fontSize: 12, color: '#9aa69c' }}>Brand info, quick links, newsletter, social</div>
            </div>
            <span style={{ color: '#9aa69c' }}>{footerOpen ? '▲' : '▼'}</span>
          </button>
          {footerOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid #eef1ed' }}>
              <p style={{ fontSize: 12, color: '#9aa69c', marginTop: 10 }}>
                Footer sections are edited like any other section below. Click Edit to configure.
              </p>
              {sections.filter(s => FOOTER_SECTION_TYPES.has(s.type)).map(sec => {
                const meta = SECTION_META[sec.type]
                const open = openId === sec.id
                const schema = getSectionSettings(sec.type as SectionType) || []
                const isOpen = allCollapsed ? false : open
                return (
                  <div key={sec.id} style={{ marginTop: 10, border: '1px solid #eef1ed', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fafbf9' }}>
                      <span style={{ fontSize: 18 }}>{meta?.icon}</span>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#151a17' }}>{meta?.label || sec.type}</div>
                      <button onClick={() => handleSectionToggle(isOpen ? null : sec.id)} style={{ padding: '6px 14px', background: isOpen ? '#151a17' : '#f0f7f2', color: isOpen ? '#fff' : '#1e7a47', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {isOpen ? 'Close' : 'Edit'}
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid #eef1ed' }}>
                        <DynamicSettingsForm
                          settings={schema}
                          config={sec.config}
                          onChange={(key, value) => setConfig(sec.id, key, value)}
                          onOpenMediaPicker={(url) => new Promise(resolve => {
                            setMediaCurrentUrl(url)
                            mediaResolveRef.current = resolve
                            setMediaOpen(true)
                          })}
                          onOpenProductPicker={(ids) => new Promise(resolve => {
                            setProductPickerSectionId(sec.id)
                            productPickerResolveRef.current = (chosenIds: number[]) => resolve(chosenIds)
                            setProductPickerOpen(true)
                          })}
                          onOpenCollectionPicker={(slugs) => new Promise(resolve => {
                            openCollectionPicker(slugs, true, (chosen: string[]) => resolve(chosen))
                          })}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button onClick={() => saveSection(sec)} disabled={savingId === sec.id} style={{ padding: '8px 20px', background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{savingId === sec.id ? 'Saving…' : 'Save'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {sections.filter(s => FOOTER_SECTION_TYPES.has(s.type)).length < 4 && (
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SECTION_TYPES.filter(t => FOOTER_SECTION_TYPES.has(t) && !sections.some(s => s.type === t)).map(t => (
                    <button key={t} onClick={() => addSection(t)} style={{ padding: '7px 14px', background: '#f0f7f2', border: '1.5px dashed #9cc4a9', color: '#1e7a47', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      + {SECTION_META[t].label}
                    </button>
                  ))}
                </div>
              )}
              {sections.filter(s => FOOTER_SECTION_TYPES.has(s.type)).length === 0 && (
                <p style={{ fontSize: 12, color: '#9aa69c', marginTop: 8 }}>No footer sections yet. Add one above.</p>
              )}
            </div>
          )}
        </div>

        <div style={{ margin: '14px 0' }}>
          {sections.filter(s => !FOOTER_SECTION_TYPES.has(s.type)).length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9aa69c' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#3a4339', marginBottom: 6 }}>No sections on your homepage yet</p>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>Click <strong>+ Add section</strong> below to build your homepage layout.<br />Sections appear in the live preview on the right.</p>
            </div>
          )}
          {sections.filter(s => !FOOTER_SECTION_TYPES.has(s.type)).map((sec, idx) => {
            const bodySections = sections.filter(s => !FOOTER_SECTION_TYPES.has(s.type))
            const meta = SECTION_META[sec.type]
            const open = openId === sec.id
            const schema = getSectionSettings(sec.type as SectionType) || []
            const inCode = codeMode.has(sec.id)
            // When allCollapsed is active, override open to false
            const isOpen = allCollapsed ? false : open
            return (
              <div key={sec.id} id={`sec-card-${sec.id}`} style={{ ...card, opacity: sec.enabled ? 1 : 0.6, outline: openId === sec.id ? '2px solid #1e7a47' : 'none', outlineOffset: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', color: '#9aa69c', fontSize: 12, lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => move(idx, 1)} disabled={idx === bodySections.length - 1} style={{ border: 'none', background: 'transparent', cursor: idx === bodySections.length - 1 ? 'default' : 'pointer', color: '#9aa69c', fontSize: 12, lineHeight: 1, opacity: idx === bodySections.length - 1 ? 0.3 : 1 }}>▼</button>
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
                  <button onClick={() => handleSectionToggle(isOpen ? null : sec.id)} style={{ padding: '7px 16px', background: isOpen ? '#151a17' : '#f0f7f2', color: isOpen ? '#fff' : '#1e7a47', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
                        : <DynamicSettingsForm
                            settings={schema}
                            config={sec.config}
                            onChange={(key, value) => setConfig(sec.id, key, value)}
                            onOpenMediaPicker={(url) => new Promise(resolve => {
                              setMediaCurrentUrl(url)
                              mediaResolveRef.current = resolve
                              setMediaOpen(true)
                            })}
                            onOpenProductPicker={(ids) => new Promise(resolve => {
                              setProductPickerSectionId(sec.id)
                              productPickerResolveRef.current = (chosenIds: number[]) => resolve(chosenIds)
                              setProductPickerOpen(true)
                            })}
                            onOpenCollectionPicker={(slugs) => new Promise(resolve => {
                              openCollectionPicker(slugs, true, (chosen: string[]) => resolve(chosen))
                            })}
                          />
                    )}

                    {/* Universal spacing control — separates sections so they never run together */}
                    {!inCode && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e3e8e0' }}>
                        <label style={lbl}>Spacing (px)</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: '#9aa69c' }}>Above</span>
                            <input style={input} type="number" value={sec.config.spacingTop ?? ''} placeholder="0"
                              onChange={e => setConfig(sec.id, 'spacingTop', e.target.value ? parseInt(e.target.value, 10) : 0)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: '#9aa69c' }}>Below</span>
                            <input style={input} type="number" value={sec.config.spacingBottom ?? ''} placeholder="0"
                              onChange={e => setConfig(sec.id, 'spacingBottom', e.target.value ? parseInt(e.target.value, 10) : 0)} />
                          </div>
                        </div>
                      </div>
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
              {SECTION_TYPES.filter(t => {
                if (FOOTER_SECTION_TYPES.has(t)) return false
                if (currentTemplate === 'index') {
                  return t !== 'product_details' && t !== 'collection_header' && t !== 'product_grid'
                }
                if (currentTemplate === 'product') {
                  return t !== 'collection_header' && t !== 'product_grid'
                }
                if (currentTemplate === 'collection') {
                  return t !== 'product_details'
                }
                return true
              }).map(t => (
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
          <a href={
            currentTemplate === 'product'
              ? `${STOREFRONT_BASE_URL || ''}/products/${previewProductSlug}`
              : currentTemplate === 'collection'
              ? `${STOREFRONT_BASE_URL || ''}/products`
              : `${STOREFRONT_BASE_URL || ''}/`
          } target="_blank" rel="noreferrer" style={{ padding: '6px 12px', fontSize: 12, color: '#1a6d3e', textDecoration: 'none', fontWeight: 600 }}>Open ↗</a>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', background: '#e3e8e0', overflow: 'auto' }}>
          <iframe
            key={previewKey}
            src={
              currentTemplate === 'product'
                ? `${STOREFRONT_BASE_URL}/products/${previewProductSlug}?preview=${previewKey}&suppressChat=1`
                : currentTemplate === 'collection'
                ? `${STOREFRONT_BASE_URL}/products?preview=${previewKey}&suppressChat=1`
                : `${STOREFRONT_BASE_URL}/?preview=${previewKey}&suppressChat=1`
            }
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

      {pendingClose && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(21, 26, 23, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            border: '1px solid #eef1ed',
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 18, fontWeight: 700, color: '#151a17' }}>Unsaved Section Changes</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#667168', lineHeight: 1.5 }}>
              You have modified settings in this section. Do you want to save your changes before closing?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={saveAndClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save changes
              </button>
              <button
                onClick={discardAndClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#fcf8f8',
                  color: '#b0392f',
                  border: '1px solid #f2dede',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Discard changes
              </button>
              <button
                onClick={() => setPendingClose(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#fff',
                  color: '#667168',
                  border: '1.5px solid #d9e0d7',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Keep editing (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
