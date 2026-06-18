'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { GridType } from '@/lib/grid-engine'

interface Post {
  id: number; image_url: string; caption: string; link: string; alt_text: string
  width: number; height: number; products: any[]; hotspots: any[]; tags: string[]
  sort_order: number; created_at: string
}

interface Grid {
  id: number; title: string; slug: string; grid_type: GridType
  columns: number; rows: number; gap: number; config: any
  published: boolean; created_at: string
}

const COLORS = ['#c9a050','#2563eb','#059669','#d97706','#e11d48','#8b5cf6','#ec4899','#06b6d4']

function toast(msg: string) {
  const el = document.getElementById('ig-toast')
  if (el) { el.textContent = msg; el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 2000) }
}

export default function InstagramAdminPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [grids, setGrids] = useState<Grid[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [addingPost, setAddingPost] = useState(false)
  const [creatingGrid, setCreatingGrid] = useState(false)
  const [gridType, setGridType] = useState<GridType>('masonry')
  const [gridCols, setGridCols] = useState(4)
  const [gridRows, setGridRows] = useState(4)
  const [gridTitle, setGridTitle] = useState('')
  const [gridGap, setGridGap] = useState(8)
  const [activeTab, setActiveTab] = useState<'posts'|'grids'>('posts')
  const [previewGrid, setPreviewGrid] = useState<any[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')

  const fetchPosts = useCallback(async () => {
    const r = await fetch('/api/admin/instagram/posts')
    if (r.ok) { const d = await r.json(); setPosts(d.posts) }
  }, [])

  const fetchGrids = useCallback(async () => {
    const r = await fetch('/api/admin/instagram/grids')
    if (r.ok) { const d = await r.json(); setGrids(d.grids) }
  }, [])

  useEffect(() => { fetchPosts(); fetchGrids() }, [fetchPosts, fetchGrids])

  const addPost = async () => {
    if (!imageUrl) return toast('Image URL required')
    const r = await fetch('/api/admin/instagram/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption: imageCaption, width: 800, height: 800 })
    })
    if (r.ok) { setImageUrl(''); setImageCaption(''); setAddingPost(false); fetchPosts(); toast('Post added!') }
    else toast('Failed to add post')
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const createGrid = async () => {
    if (!gridTitle) return toast('Grid title required')
    const ids = Array.from(selected)
    if (ids.length === 0) return toast('Select at least one post')
    const slug = gridTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const r = await fetch('/api/admin/instagram/grids', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: gridTitle, slug, grid_type: gridType, columns: gridCols, rows: gridRows, gap: gridGap, post_ids: ids })
    })
    if (r.ok) { setCreatingGrid(false); setGridTitle(''); setSelected(new Set()); fetchGrids(); toast('Grid created!') }
    else toast('Failed to create grid')
  }

  const previewLayout = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const r = await fetch('/api/admin/instagram/posts')
    if (!r.ok) return
    const { posts: allPosts } = await r.json()
    const selectedPosts = allPosts.filter((p: Post) => ids.includes(p.id))
    // Compute a quick preview client-side
    const cells = selectedPosts.map((p: Post, i: number) => ({
      url: p.image_url, id: p.id,
      colSpan: gridType === 'masonry' ? (p.width/p.height > 1.4 ? 2 : 1) : 1,
      rowSpan: gridType === 'masonry' ? Math.max(1, Math.round((p.width/(p.height||1)) * 2)) : 1,
      colStart: i % gridCols, rowStart: Math.floor(i / gridCols),
    }))
    setPreviewGrid(cells)
  }

  return (
    <div>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">
          <span style={{ marginRight: 'var(--space-3)' }}>📸</span>Instagram Feed
        </h1>
        <p className="luxe-page-subtitle">Smart grid collages. Shoppable hotspots. Auto-layout engine.</p>
      </header>

      {/* Toast */}
      <div id="ig-toast" style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: 'var(--luxe-navy-900)', color: '#fff', padding: '12px 20px',
        borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
        opacity: 0, transition: 'opacity 300ms ease', pointerEvents: 'none',
        boxShadow: 'var(--shadow-lg)',
      }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {(['posts','grids'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`luxe-btn ${activeTab === tab ? 'luxe-btn-primary' : 'luxe-btn-ghost'} luxe-btn-sm`}>
            {tab === 'posts' ? '🖼️ Posts' : '📐 Grids'}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <>
          <div className="luxe-toolbar">
            <div className="luxe-toolbar-left">
              <button onClick={() => setAddingPost(!addingPost)} className="luxe-btn luxe-btn-gold luxe-btn-sm">
                + Add Post
              </button>
              {selected.size > 0 && (
                <button onClick={() => setCreatingGrid(true)} className="luxe-btn luxe-btn-primary luxe-btn-sm">
                  Create Grid ({selected.size} selected)
                </button>
              )}
            </div>
          </div>

          {addingPost && (
            <div className="luxe-card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <input className="luxe-input" placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                <input className="luxe-input" placeholder="Caption (optional)" value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
              </div>
              <button onClick={addPost} className="luxe-btn luxe-btn-gold luxe-btn-sm">Save Post</button>
            </div>
          )}

          <div className="luxe-grid-3">
            {posts.map(post => (
              <div key={post.id}
                onClick={() => toggleSelect(post.id)}
                style={{
                  position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  cursor: 'pointer', border: selected.has(post.id) ? '3px solid var(--luxe-gold-500)' : '1px solid var(--luxe-warm-200)',
                  boxShadow: selected.has(post.id) ? '0 0 0 4px rgba(201,160,80,0.15)' : 'var(--shadow-sm)',
                  transition: 'all 200ms ease',
                }}>
                <img src={post.image_url} alt={post.alt_text || ''}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                {post.caption && (
                  <div style={{ padding: 'var(--space-3)', fontSize: 12, color: 'var(--luxe-slate-600)', background: '#fff' }}>
                    {post.caption.substring(0, 60)}{post.caption.length > 60 ? '...' : ''}
                  </div>
                )}
                {selected.has(post.id) && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--luxe-gold-500)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>✓</div>
                )}
              </div>
            ))}
          </div>
          {posts.length === 0 && (
            <div className="luxe-empty"><div className="luxe-empty-icon">📸</div><p className="luxe-empty-title">No posts yet</p><p className="luxe-empty-desc">Add Instagram posts to build your feed grid.</p></div>
          )}
        </>
      )}

      {/* Grids Tab */}
      {activeTab === 'grids' && (
        <>
          <div className="luxe-toolbar">
            <div className="luxe-toolbar-left">
              <Link href="/admin/apps/instagram/new" className="luxe-btn luxe-btn-gold luxe-btn-sm">+ New Grid</Link>
            </div>
          </div>
          {grids.map(grid => (
            <div key={grid.id} className="luxe-card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="luxe-card-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--luxe-navy-900)' }}>{grid.title}</h3>
                  <div style={{ fontSize: 11, color: 'var(--luxe-slate-400)', marginTop: 2 }}>
                    {grid.grid_type.toUpperCase()} · {grid.columns}×{grid.rows} · gap {grid.gap}px
                  </div>
                </div>
                <span className={`luxe-badge ${grid.published ? 'success' : 'neutral'}`}>
                  {grid.published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          ))}
          {grids.length === 0 && (
            <div className="luxe-empty"><div className="luxe-empty-icon">📐</div><p className="luxe-empty-title">No grids yet</p><p className="luxe-empty-desc">Select posts and create a grid collage.</p></div>
          )}
        </>
      )}

      {/* Create Grid Modal */}
      {creatingGrid && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setCreatingGrid(false)}>
          <div className="luxe-card" style={{ width: 600, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="luxe-card-header">
              <h2 className="luxe-card-title">Create Grid Collage</h2>
              <span className="luxe-badge info">{selected.size} posts</span>
            </div>
            <div className="luxe-card-body">
              {/* Grid Title */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-600)', marginBottom: 4 }}>Grid Title</div>
                <input className="luxe-input" placeholder="Summer Collection 2026" value={gridTitle} onChange={e => setGridTitle(e.target.value)} />
              </div>

              {/* Template */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-600)', marginBottom: 4 }}>Layout Type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {(['masonry','metro','classic','collage','spotlight','polaroid'] as GridType[]).map(t => (
                    <button key={t} onClick={() => setGridType(t)}
                      style={{
                        padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: gridType === t ? '2px solid var(--luxe-gold-500)' : '1px solid var(--luxe-warm-200)',
                        background: gridType === t ? 'rgba(201,160,80,0.08)' : '#fff', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: gridType === t ? 'var(--luxe-gold-500)' : 'var(--luxe-slate-600)',
                        textTransform: 'capitalize', transition: 'all 150ms ease',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-600)', marginBottom: 4 }}>Columns</div>
                  <input type="number" className="luxe-input" min={1} max={12} value={gridCols} onChange={e => setGridCols(Number(e.target.value))} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-600)', marginBottom: 4 }}>Rows</div>
                  <input type="number" className="luxe-input" min={1} max={12} value={gridRows} onChange={e => setGridRows(Number(e.target.value))} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--luxe-slate-600)', marginBottom: 4 }}>Gap (px)</div>
                  <input type="number" className="luxe-input" min={0} max={32} value={gridGap} onChange={e => setGridGap(Number(e.target.value))} />
                </div>
              </div>

              {/* Preview */}
              {previewGrid.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gap: `${gridGap}px`,
                  padding: 'var(--space-4)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                }}>
                  {previewGrid.map((cell, i) => (
                    <div key={i} style={{
                      gridColumn: `span ${cell.colSpan}`, gridRow: `span ${cell.rowSpan}`,
                      borderRadius: 4, overflow: 'hidden', background: '#ddd',
                    }}>
                      <img src={cell.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button onClick={previewLayout} className="luxe-btn luxe-btn-ghost luxe-btn-sm">🔄 Preview Layout</button>
                <button onClick={() => setCreatingGrid(false)} className="luxe-btn luxe-btn-ghost luxe-btn-sm">Cancel</button>
                <button onClick={createGrid} className="luxe-btn luxe-btn-gold luxe-btn-sm">✨ Create Grid</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
