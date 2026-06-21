'use client'

import { useState, useEffect } from 'react'

interface MediaPickerProps {
  open: boolean
  currentUrl?: string
  onSelect: (url: string) => void
  onClose: () => void
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 16, width: 560, maxWidth: '94vw',
  maxHeight: '80vh', display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
}
const tabRow: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #eef1ed',
}
const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '12px', border: 'none', background: active ? '#f0f7f2' : '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  color: active ? '#1e7a47' : '#667168',
  borderBottom: active ? '2px solid #1e7a47' : '2px solid transparent',
})
const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #d9e0d7',
  borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa',
  boxSizing: 'border-box' as any,
}
const dropzone: React.CSSProperties = {
  border: '2px dashed #cfe3d6', borderRadius: 12, padding: '36px 20px',
  textAlign: 'center', color: '#9aa69c', cursor: 'pointer',
  transition: 'background 150ms',
}

/** Shared image picker — used everywhere in admin that needs to attach an
 *  image: theme editor, categories, collections, blog articles, products.
 *  Three ways in: browse the existing DO Spaces media library, upload a new
 *  file straight to it, or paste a URL. */
export function MediaPicker({ open, currentUrl, onSelect, onClose }: MediaPickerProps) {
  const [tab, setTab] = useState<'url' | 'upload' | 'browse'>('browse')
  const [url, setUrl] = useState(currentUrl || '')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [mediaList, setMediaList] = useState<string[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [q, setQ] = useState('')
  const [browseSource, setBrowseSource] = useState('')

  function loadBrowse(search: string, src: string) {
    setLoadingList(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (src) params.set('source', src)
    fetch(`/api/admin/media?${params}`)
      .then(r => r.json())
      .then(d => setMediaList(d.urls || []))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }

  useEffect(() => {
    if (open) {
      setUrl(currentUrl || '')
      setTab('browse')
    }
  }, [open, currentUrl])

  // (Re)load the library whenever the browse tab is shown or filters change.
  useEffect(() => {
    if (!open || tab !== 'browse') return
    const t = setTimeout(() => loadBrowse(q, browseSource), 200)
    return () => clearTimeout(t)
  }, [open, tab, q, browseSource])

  const BROWSE_SOURCES = [
    { key: '', label: 'All' }, { key: 'product', label: 'Products' },
    { key: 'category', label: 'Collections' }, { key: 'article', label: 'Blog' },
    { key: 'theme', label: 'Theme' }, { key: 'brand', label: 'Brand' },
    { key: 'upload', label: 'Uploads' },
  ]

  if (!open) return null

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        setUrl(data.url)
        onSelect(data.url)
      }
    } catch { /* silently fail */ }
    finally { setUploading(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleUpload(file)
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #eef1ed' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#151a17' }}>Choose image</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, color: '#9aa69c', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={tabRow}>
          <button style={tabBtn(tab === 'browse')} onClick={() => setTab('browse')}>Browse</button>
          <button style={tabBtn(tab === 'upload')} onClick={() => setTab('upload')}>Upload</button>
          <button style={tabBtn(tab === 'url')} onClick={() => setTab('url')}>Paste URL</button>
        </div>

        {/* Tab content */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          {tab === 'url' && (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#3a4339', display: 'block', marginBottom: 6 }}>Image URL</label>
              <input style={input} value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/image.jpg" autoFocus />
              {currentUrl && (
                <div style={{ marginTop: 10, padding: 10, background: '#fafbf9', borderRadius: 8, border: '1px solid #eef1ed', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={currentUrl} alt="Current" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                  <span style={{ fontSize: 12, color: '#9aa69c' }}>Current image</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                <button onClick={onClose}
                  style={{ padding: '8px 20px', border: '1.5px solid #d9e0d7', borderRadius: 8, background: '#fff', color: '#667168', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => url.trim() && onSelect(url.trim())}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Use this image
                </button>
              </div>
            </>
          )}

          {tab === 'upload' && (
            <div
              style={{ ...dropzone, background: dragOver ? '#f0f7f2' : '#fafbf9' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('media-upload-input')?.click()}
            >
              {uploading ? (
                <p style={{ margin: 0, color: '#1e7a47' }}>Uploading…</p>
              ) : (
                <>
                  <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#3a4339' }}>
                    {dragOver ? 'Drop image here' : 'Drag & drop an image'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12 }}>or click to browse files</p>
                </>
              )}
              <input id="media-upload-input" type="file" accept="image/*" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
            </div>
          )}

          {tab === 'browse' && (
            <>
              {/* Search + source filter */}
              <input style={{ ...input, marginBottom: 10 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search by filename…" />
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {BROWSE_SOURCES.map(s => (
                  <button key={s.key || 'all'} onClick={() => setBrowseSource(s.key)}
                    style={{
                      padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: browseSource === s.key ? 'none' : '1.5px solid #d9e0d7',
                      background: browseSource === s.key ? '#1a6d3e' : '#fff',
                      color: browseSource === s.key ? '#fff' : '#3a4339',
                    }}>{s.label}</button>
                ))}
              </div>
              {loadingList ? (
                <p style={{ color: '#9aa69c', textAlign: 'center', padding: 24 }}>Loading media library…</p>
              ) : mediaList.length === 0 ? (
                <p style={{ color: '#9aa69c', textAlign: 'center', padding: 24 }}>
                  No media found. Upload images first or paste a URL.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {mediaList.map((imgUrl, i) => (
                    <div key={i}
                      onClick={() => { setUrl(imgUrl); onSelect(imgUrl) }}
                      style={{
                        aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                        border: url === imgUrl ? '2px solid #1e7a47' : '1px solid #eef1ed',
                        cursor: 'pointer', transition: 'border 120ms',
                      }}>
                      <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
