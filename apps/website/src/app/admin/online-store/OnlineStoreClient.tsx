'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { StoreTheme } from '@/lib/store-themes'

type Action = 'duplicate' | 'publish' | 'rename' | 'delete'

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

export default function OnlineStoreClient({ initialThemes }: { initialThemes: StoreTheme[] }) {
  const [themes, setThemes] = useState<StoreTheme[]>(initialThemes)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [editingName, setEditingName] = useState<number | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  const liveTheme = useMemo(() => themes.find(theme => theme.role === 'live') || themes[0], [themes])
  const draftThemes = useMemo(() => themes.filter(theme => theme.role !== 'live'), [themes])

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
        action === 'duplicate' ? 'Theme duplicated' :
        action === 'publish' ? 'Theme is live' :
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
            {themes.length} themes, {draftThemes.length} backups, {liveTheme ? sectionCount(liveTheme, 'index') : 0} homepage sections
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href={storefrontUrl} target="_blank" rel="noreferrer" className="luxe-btn luxe-btn-ghost" style={{ textDecoration: 'none' }}>View store</a>
          <Link href="/admin/theme" className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Customize</Link>
        </div>
      </div>

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
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => duplicate(liveTheme)} disabled={busy === `duplicate:${liveTheme.id}`} className="luxe-btn luxe-btn-ghost">
                {busy === `duplicate:${liveTheme.id}` ? 'Duplicating' : 'Duplicate'}
              </button>
              <button onClick={() => startRename(liveTheme)} className="luxe-btn luxe-btn-ghost">Rename</button>
              <Link href="/admin/theme" className="luxe-btn luxe-btn-primary" style={{ textDecoration: 'none' }}>Customize</Link>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#151a17', fontWeight: 800 }}>Draft themes</h2>
        {liveTheme && (
          <button onClick={() => duplicate(liveTheme)} disabled={busy === `duplicate:${liveTheme.id}`} className="luxe-btn luxe-btn-ghost">
            Add backup
          </button>
        )}
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
                {sectionCount(theme, 'index')} home - {sectionCount(theme, 'product')} product - {sectionCount(theme, 'collection')} collection sections
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => run('publish', theme.id)} disabled={busy === `publish:${theme.id}`} className="luxe-btn luxe-btn-primary">
                {busy === `publish:${theme.id}` ? 'Publishing' : 'Publish'}
              </button>
              <button onClick={() => duplicate(theme)} disabled={busy === `duplicate:${theme.id}`} className="luxe-btn luxe-btn-ghost">Duplicate</button>
              <button onClick={() => startRename(theme)} className="luxe-btn luxe-btn-ghost">Rename</button>
              <button onClick={() => run('delete', theme.id)} disabled={busy === `delete:${theme.id}`} className="luxe-btn luxe-btn-ghost" style={{ color: '#b0392f' }}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 24 }}>
        <IdeaCard title="Preview modes" body="Desktop, tablet, mobile previews are already in Customize." />
        <IdeaCard title="Theme backups" body="Duplicate before seasonal edits or major homepage changes." />
        <IdeaCard title="Future import" body="A later step can package snapshots as JSON files." />
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

function ThemePreview({ theme, large = false }: { theme: StoreTheme; large?: boolean }) {
  const firstImage = theme.snapshot?.sections
    ?.flatMap(section => {
      const config = section.config || {}
      const slides = Array.isArray(config.slides) ? config.slides.map((slide: any) => slide.image) : []
      return [config.image, config.posterImage, ...slides].filter(Boolean)
    })?.[0]

  return (
    <div style={{
      height: large ? 260 : 86,
      minHeight: large ? 260 : 86,
      background: '#f6f7f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRight: large ? 0 : '1px solid #eef1ed',
      overflow: 'hidden',
    }}>
      <div style={{
        width: large ? '74%' : 96,
        height: large ? 190 : 62,
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

function IdeaCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#151a17', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#667168', lineHeight: 1.45 }}>{body}</div>
    </div>
  )
}
