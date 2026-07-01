'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { StoreTheme } from '@/lib/store-themes'
import type { ThemeDiffEntry } from '@/lib/theme-diff'
import { computeThemeDiff } from '@/lib/theme-diff'

type Action = 'create' | 'import' | 'duplicate' | 'publish' | 'publish_mobile' | 'rename' | 'delete'

const storefrontUrl = process.env.NEXT_PUBLIC_SITE_URL || '/'

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not yet'
  try {
    return new Date(value).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function sectionCount(theme: StoreTheme, template: string) {
  return theme.snapshot?.sections?.filter(section => section.template === template).length || 0
}

function accountThemeSummary(theme: StoreTheme) {
  const account = theme.snapshot?.settings?.customer_account_theme || {}
  const label = account.welcomeLabel || 'My HomeU'
  const layout = account.layout === 'classic' ? 'classic' : 'concierge'
  return `${label} - ${layout} account portal`
}

const pageSpeed = [
  { label: 'LCP P75', value: '2213 milliseconds', delta: '7%', status: 'Good' },
  { label: 'INP P75', value: '144 milliseconds', delta: '20%', status: 'Good' },
]

export default function OnlineStoreClient({ initialThemes }: { initialThemes: StoreTheme[] }) {
  const [themes, setThemes] = useState<StoreTheme[]>(initialThemes)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [editingName, setEditingName] = useState<number | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [showDiffId, setShowDiffId] = useState<number | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const liveTheme = useMemo(() => themes.find(theme => theme.role === 'live') || themes[0], [themes])
  const draftThemes = useMemo(() => themes.filter(theme => theme.role !== 'live' && theme.device_scope !== 'mobile'), [themes])
  const mobileLiveTheme = useMemo(() => themes.find(theme => theme.role === 'mobile_live'), [themes])
  const mobileThemes = useMemo(() => themes.filter(theme => theme.device_scope === 'mobile' && theme.role !== 'mobile_live'), [themes])

  async function refresh(message?: string) {
    const res = await fetch('/api/admin/online-store/themes')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to refresh themes')
    setThemes(data.themes || [])
    if (message) {
      setToast(message)
      setTimeout(() => setToast(''), 2400)
    }
  }

  async function run(action: Action, id: number, payload: Record<string, any> = {}) {
    const key = `${action}:${id}`
    setBusy(key)
    try {
      const res = await fetch('/api/admin/online-store/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Theme action failed')
      const message =
        action === 'create' ? 'Theme draft created' :
        action === 'import' ? 'Theme imported' :
        action === 'duplicate' ? 'Theme duplicated' :
        action === 'publish' ? 'Theme is live' :
        action === 'publish_mobile' ? 'Mobile theme is live' :
        action === 'rename' ? 'Theme renamed' :
        'Theme deleted'
      await refresh(message)
    } catch (err: any) {
      setToast(err.message || 'Theme action failed')
      setTimeout(() => setToast(''), 3200)
    } finally {
      setBusy(null)
    }
  }

  function duplicate(theme: StoreTheme) {
    const stamp = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    run('duplicate', theme.id, { name: `${theme.name} backup ${stamp}` })
  }

  async function createTheme(deviceScope: 'desktop' | 'mobile' = 'desktop') {
    const stamp = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    const name = deviceScope === 'mobile' ? `Mobile theme draft ${stamp}` : `Theme draft ${stamp}`
    setBusy('create:0')
    try {
      const res = await fetch('/api/admin/online-store/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, deviceScope }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Theme creation failed')
      if (deviceScope === 'mobile' && data.theme?.id) {
        window.location.href = `/admin/online-store/themes/${data.theme.id}`
        return
      }
      await refresh('Theme draft created')
    } catch (err: any) {
      setToast(err.message || 'Theme creation failed')
      setTimeout(() => setToast(''), 3200)
    } finally {
      setBusy(null)
    }
  }

  function exportTheme(theme: StoreTheme | undefined) {
    if (!theme) return
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'theme'}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setToast('Theme JSON exported')
    setTimeout(() => setToast(''), 2400)
  }

  async function importThemeFile(file: File | undefined) {
    if (!file) return
    setBusy('import:0')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const res = await fetch('/api/admin/online-store/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', theme: parsed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Import failed')
      await refresh('Theme imported as draft')
    } catch (err: any) {
      setToast(err.message || 'Import failed')
      setTimeout(() => setToast(''), 3200)
    } finally {
      setBusy(null)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function startRename(theme: StoreTheme) {
    setEditingName(theme.id)
    setNameDraft(theme.name)
  }

  function commitRename(theme: StoreTheme) {
    if (!nameDraft.trim() || nameDraft.trim() === theme.name) {
      setEditingName(null)
      return
    }
    run('rename', theme.id, { name: nameDraft.trim() })
    setEditingName(null)
  }

  function cancelRename() {
    setEditingName(null)
    setNameDraft('')
  }

  return (
    <main style={{ maxWidth: 1180, margin: '36px auto', padding: '0 24px 56px', fontFamily: 'Inter, sans-serif' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 50, padding: '10px 14px',
          background: '#151a17', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700,
          boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: '#e9f4ec', color: '#1a6d3e', display: 'grid', placeItems: 'center', fontWeight: 900 }}>OS</span>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#151a17', letterSpacing: 0 }}>Online Store</h1>
          </div>
          <p style={{ margin: 0, color: '#667168', fontSize: 14 }}>
            {themes.length} themes, {draftThemes.length} desktop drafts, {mobileThemes.length} mobile drafts, account portal synced
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={event => importThemeFile(event.target.files?.[0])}
            style={{ display: 'none' }}
          />
          <button onClick={() => createTheme('desktop')} disabled={busy === 'create:0'} className="luxe-btn luxe-btn-primary">
            {busy === 'create:0' ? 'Creating' : 'Create new theme'}
          </button>
          <button onClick={() => createTheme('mobile')} disabled={busy === 'create:0'} className="luxe-btn luxe-btn-ghost">
            New mobile theme
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={busy === 'import:0'} className="luxe-btn luxe-btn-ghost">
            {busy === 'import:0' ? 'Importing' : 'Import theme'}
          </button>
          <button onClick={() => exportTheme(liveTheme)} disabled={!liveTheme} className="luxe-btn luxe-btn-ghost">
            Export live
          </button>
          <a href={storefrontUrl} target="_blank" rel="noreferrer" className="luxe-btn luxe-btn-ghost" style={{ textDecoration: 'none' }}>View store</a>
          <Link href="/admin/theme" className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Customize</Link>
        </div>
      </div>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        background: '#fff',
        border: '1px solid #d9e0d7',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 22,
      }}>
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 10, borderRight: '1px solid #eef1ed' }}>
          <span style={{ fontSize: 20 }}>Calendar</span>
          <strong style={{ fontSize: 14, color: '#151a17' }}>30 days</strong>
        </div>
        {pageSpeed.map(metric => (
          <div key={metric.label} style={{ padding: '18px 24px', borderRight: metric.label === 'LCP P75' ? '1px solid #eef1ed' : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#151a17', marginBottom: 8 }}>{metric.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 17, color: '#151a17' }}>{metric.value}</strong>
              <span style={{ color: '#667168', fontSize: 13 }}>up {metric.delta}</span>
              <StatusBadge label={metric.status} tone="green" />
            </div>
          </div>
        ))}
      </section>

      {liveTheme && (
        <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden', marginBottom: 34, boxShadow: '0 8px 22px rgba(21,26,23,0.06)' }}>
          <ThemePreview theme={liveTheme} large />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '20px 24px', borderTop: '1px solid #eef1ed', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <ThemeName theme={liveTheme} editingName={editingName} nameDraft={nameDraft} setNameDraft={setNameDraft} startRename={startRename} commitRename={commitRename} cancelRename={cancelRename} />
                <StatusBadge label="Live" tone="green" />
              </div>
              <div style={{ color: '#667168', fontSize: 14 }}>Published {formatDate(liveTheme.published_at)} - Version {liveTheme.version}</div>
              <div style={{ color: '#8a958d', fontSize: 12, marginTop: 5 }}>Account - {accountThemeSummary(liveTheme)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => duplicate(liveTheme)} disabled={busy === `duplicate:${liveTheme.id}`} className="luxe-btn luxe-btn-ghost">
                {busy === `duplicate:${liveTheme.id}` ? 'Duplicating' : 'Duplicate'}
              </button>
              <button onClick={() => startRename(liveTheme)} className="luxe-btn luxe-btn-ghost">Rename</button>
              <Link href="/admin/theme" className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Customize</Link>
              <Link href={`/admin/online-store/themes/${liveTheme.id}`} className="luxe-btn luxe-btn-ghost" style={{ textDecoration: 'none' }}>Account theme</Link>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#151a17', fontWeight: 800 }}>Draft themes</h2>
        <button onClick={() => createTheme('desktop')} disabled={busy === 'create:0'} className="luxe-btn luxe-btn-ghost">
          Create draft
        </button>
      </div>

      <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
        {draftThemes.length === 0 ? (
          <div style={{ padding: 34, textAlign: 'center', color: '#667168' }}>No draft themes yet.</div>
        ) : draftThemes.map((theme, index) => (
          <div key={theme.id} style={{ display: 'grid', gridTemplateColumns: '118px minmax(0, 1fr) auto', gap: 18, alignItems: 'center', padding: 20, borderTop: index === 0 ? 0 : '1px solid #eef1ed' }}>
            <ThemePreview theme={theme} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                <ThemeName theme={theme} editingName={editingName} nameDraft={nameDraft} setNameDraft={setNameDraft} startRename={startRename} commitRename={commitRename} cancelRename={cancelRename} />
                <StatusBadge label="Draft" tone="gray" />
              </div>
              <div style={{ color: '#667168', fontSize: 14 }}>Saved {formatDate(theme.updated_at)} - Version {theme.version}</div>
              <div style={{ color: '#8a958d', fontSize: 12, marginTop: 5 }}>
                Desktop - {sectionCount(theme, 'index')} home - {sectionCount(theme, 'product')} product - {sectionCount(theme, 'collection')} collection sections
              </div>
              <div style={{ color: '#8a958d', fontSize: 12, marginTop: 3 }}>
                Account - {accountThemeSummary(theme)}
              </div>
              {showDiffId === theme.id && liveTheme && (
                <ThemeDiffView diff={computeThemeDiff(liveTheme.snapshot, theme.snapshot)} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDiffId(showDiffId === theme.id ? null : theme.id)} className="luxe-btn luxe-btn-ghost">
                {showDiffId === theme.id ? 'Hide changes' : 'Show changes'}
              </button>
              <button onClick={() => run('publish', theme.id)} disabled={busy === `publish:${theme.id}`} className="luxe-btn luxe-btn-primary">
                {busy === `publish:${theme.id}` ? 'Publishing' : 'Publish'}
              </button>
              <Link href={`/admin/theme?themeId=${theme.id}`} className="luxe-btn luxe-btn-ghost" style={{ textDecoration: 'none' }}>Customize</Link>
              <Link href={`/admin/online-store/themes/${theme.id}`} className="luxe-btn luxe-btn-ghost" style={{ textDecoration: 'none' }}>Account theme</Link>
              <button onClick={() => duplicate(theme)} disabled={busy === `duplicate:${theme.id}`} className="luxe-btn luxe-btn-ghost">Duplicate</button>
              <button onClick={() => startRename(theme)} className="luxe-btn luxe-btn-ghost">Rename</button>
              <button onClick={() => run('delete', theme.id)} disabled={busy === `delete:${theme.id}`} className="luxe-btn luxe-btn-ghost" style={{ color: '#b0392f' }}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '32px 0 14px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#151a17', fontWeight: 800 }}>Customer Account Theme</h2>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 13 }}>Branding, layout style, spacing density, and color palette of the customer portal.</p>
        </div>
      </div>

      <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', marginBottom: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#151a17' }}>Customer Account Portal Settings</h3>
          <p style={{ margin: '6px 0 0', color: '#667168', fontSize: 13, lineHeight: 1.5 }}>
            Adjust buttons, rounded corners, sidebar layout modes, and spacing density for the client portal. Changes are synced instantly with storefront user dashboards.
          </p>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#8a958d' }}>
            <span>Density: <strong>Comfortable / Compact</strong></span>
            <span>Nav layout: <strong>Concierge Sidebar / Tabs</strong></span>
            <span>Card style: <strong>Soft shadow / Flat</strong></span>
          </div>
        </div>
        <div>
          {liveTheme && (
            <Link href={`/admin/online-store/themes/${liveTheme.id}`} className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              🎨 Customize Account Theme
            </Link>
          )}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '26px 0 14px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: '#151a17', fontWeight: 800 }}>Live mobile theme</h2>
          <p style={{ margin: '4px 0 0', color: '#667168', fontSize: 13 }}>Phone visitors use this mobile theme snapshot. Edit it without touching the desktop live theme.</p>
        </div>
        <button onClick={() => createTheme('mobile')} disabled={busy === 'create:0'} className="luxe-btn luxe-btn-ghost">
          Create mobile theme
        </button>
      </div>

      <section style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden' }}>
        {mobileLiveTheme && (
          <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) auto', gap: 18, alignItems: 'center', padding: 20, borderBottom: '1px solid #eef1ed' }}>
            <ThemePreview theme={mobileLiveTheme} mobile />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                <ThemeName theme={mobileLiveTheme} editingName={editingName} nameDraft={nameDraft} setNameDraft={setNameDraft} startRename={startRename} commitRename={commitRename} cancelRename={cancelRename} />
                <StatusBadge label="Mobile live" tone="green" />
              </div>
              <div style={{ color: '#667168', fontSize: 14 }}>Active for mobile visitors - {sectionCount(mobileLiveTheme, 'index')} home sections</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link href={`/admin/online-store/themes/${mobileLiveTheme.id}`} className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Edit mobile theme</Link>
              <button onClick={() => duplicate(mobileLiveTheme)} disabled={busy === `duplicate:${mobileLiveTheme.id}`} className="luxe-btn luxe-btn-ghost">Duplicate</button>
              <button onClick={() => exportTheme(mobileLiveTheme)} className="luxe-btn luxe-btn-ghost">Export</button>
            </div>
          </div>
        )}
        {mobileThemes.length === 0 ? (
          <div style={{ padding: 34, textAlign: 'center', color: '#667168' }}>No extra mobile draft themes yet.</div>
        ) : mobileThemes.map((theme, index) => (
          <div key={theme.id} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) auto', gap: 18, alignItems: 'center', padding: 20, borderTop: index === 0 && !mobileLiveTheme ? 0 : '1px solid #eef1ed' }}>
            <ThemePreview theme={theme} mobile />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                <ThemeName theme={theme} editingName={editingName} nameDraft={nameDraft} setNameDraft={setNameDraft} startRename={startRename} commitRename={commitRename} cancelRename={cancelRename} />
                <StatusBadge label="Mobile draft" tone="gray" />
              </div>
              <div style={{ color: '#667168', fontSize: 14 }}>Saved {formatDate(theme.updated_at)} - independent from live desktop</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link href={`/admin/online-store/themes/${theme.id}`} className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Edit draft</Link>
              <button onClick={() => run('publish_mobile', theme.id)} disabled={busy === `publish_mobile:${theme.id}`} className="luxe-btn luxe-btn-ghost">Make mobile live</button>
              <button onClick={() => duplicate(theme)} disabled={busy === `duplicate:${theme.id}`} className="luxe-btn luxe-btn-ghost">Duplicate</button>
              <button onClick={() => startRename(theme)} className="luxe-btn luxe-btn-ghost">Rename</button>
              <button onClick={() => run('delete', theme.id)} disabled={busy === `delete:${theme.id}`} className="luxe-btn luxe-btn-ghost" style={{ color: '#b0392f' }}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 24 }}>
        <IdeaCard title="Preview modes" body="Open the customizer directly in mobile preview." actionLabel="Open mobile preview" href="/admin/theme?viewport=mobile" />
        <IdeaCard title="Theme backups" body="Create a desktop draft before seasonal edits or major homepage changes." actionLabel="Create backup draft" onClick={() => liveTheme && duplicate(liveTheme)} />
        <IdeaCard title="Import / export" body="Export the live snapshot as JSON for off-platform backup." actionLabel="Export live JSON" onClick={() => exportTheme(liveTheme)} />
      </section>
    </main>
  )
}

function ThemeName({
  theme,
  editingName,
  nameDraft,
  setNameDraft,
  startRename,
  commitRename,
  cancelRename,
}: {
  theme: StoreTheme
  editingName: number | null
  nameDraft: string
  setNameDraft: (value: string) => void
  startRename: (theme: StoreTheme) => void
  commitRename: (theme: StoreTheme) => void
  cancelRename: () => void
}) {
  if (editingName === theme.id) {
    return (
      <input
        value={nameDraft}
        autoFocus
        onChange={event => setNameDraft(event.target.value)}
        onBlur={() => commitRename(theme)}
        onKeyDown={event => {
          if (event.key === 'Enter') commitRename(theme)
          if (event.key === 'Escape') cancelRename()
        }}
        style={{ fontSize: 18, fontWeight: 800, border: '1.5px solid #9cc4a9', borderRadius: 8, padding: '6px 9px', minWidth: 220 }}
      />
    )
  }

  return <h3 style={{ margin: 0, fontSize: 18, color: '#151a17', fontWeight: 800, overflowWrap: 'anywhere' }}>{theme.name}</h3>
}

function ThemePreview({ theme, large = false, mobile = false }: { theme: StoreTheme; large?: boolean; mobile?: boolean }) {
  const firstImage = theme.snapshot?.sections
    ?.flatMap(section => {
      const config = section.config || {}
      const slides = Array.isArray(config.slides) ? config.slides.map((slide: any) => slide.image) : []
      return [config.image, config.posterImage, ...slides].filter(Boolean)
    })?.[0]

  return (
    <div style={{
      height: large ? 260 : mobile ? 112 : 86,
      minHeight: large ? 260 : mobile ? 112 : 86,
      background: '#f6f7f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: large ? 0 : '1px solid #eef1ed',
      overflow: 'hidden',
    }}>
      <div style={{
        width: large ? '74%' : mobile ? 54 : 96,
        height: large ? 190 : mobile ? 96 : 62,
        borderRadius: 8,
        background: '#fff',
        border: '1px solid #d9e0d7',
        boxShadow: large ? '0 12px 36px rgba(21,26,23,0.13)' : '0 5px 12px rgba(21,26,23,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ height: large ? 50 : 18, borderBottom: '1px solid #eef1ed', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: large ? 132 : 36, height: large ? 10 : 4, borderRadius: 99, background: '#1b1f1d' }} />
        </div>
        <div style={{
          height: large ? 140 : 44,
          backgroundImage: firstImage ? `url(${firstImage})` : 'linear-gradient(135deg, #dfe7df, #f7f8f4 45%, #c3bcbc)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
      </div>
    </div>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'gray' }) {
  return (
    <span style={{
      padding: '4px 9px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      background: tone === 'green' ? '#d9f8e4' : '#eef1ed',
      color: tone === 'green' ? '#126b39' : '#667168',
    }}>
      {label}
    </span>
  )
}

function IdeaCard({
  title,
  body,
  actionLabel,
  href,
  onClick,
}: {
  title: string
  body: string
  actionLabel: string
  href?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#151a17', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#667168', lineHeight: 1.45, marginBottom: 14 }}>{body}</div>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1a6d3e' }}>{actionLabel}</span>
    </>
  )

  if (href) {
    return (
      <Link href={href} style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, padding: 16, textDecoration: 'none' }}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, padding: 16, textAlign: 'left', cursor: 'pointer' }}>
      {content}
    </button>
  )
}

function ThemeDiffView({ diff }: { diff: ThemeDiffEntry[] }) {
  if (diff.length === 0) {
    return <div style={{ color: '#667168', fontSize: 12, marginTop: 6 }}>No changes from live theme.</div>
  }
  const added = diff.filter(d => d.type === 'added')
  const removed = diff.filter(d => d.type === 'removed')
  const changed = diff.filter(d => d.type === 'changed')
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {added.length > 0 && <div style={{ fontSize: 12, color: '#126b39' }}>+ {added.length} section(s) added</div>}
      {removed.length > 0 && <div style={{ fontSize: 12, color: '#b0392f' }}>- {removed.length} section(s) removed</div>}
      {changed.length > 0 && <div style={{ fontSize: 12, color: '#b88935' }}>~ {changed.length} section(s) modified</div>}
      <details style={{ marginTop: 4 }}>
        <summary style={{ fontSize: 11, color: '#8a958d', cursor: 'pointer' }}>Details</summary>
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
          {added.map((d, i) => <span key={`a-${i}`} style={{ fontSize: 11, color: '#126b39' }}>+ [{d.template}] {d.sectionType} — {d.detail}</span>)}
          {removed.map((d, i) => <span key={`r-${i}`} style={{ fontSize: 11, color: '#b0392f' }}>− [{d.template}] {d.sectionType} — {d.detail}</span>)}
          {changed.map((d, i) => <span key={`c-${i}`} style={{ fontSize: 11, color: '#b88935' }}>~ [{d.template}] {d.sectionType} — {d.detail}</span>)}
        </div>
      </details>
    </div>
  )
}
