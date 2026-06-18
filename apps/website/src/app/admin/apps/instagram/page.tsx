'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { GridType } from '@/lib/grid-engine'

interface Post {
  id: number; image_url: string; caption: string; permalink: string; alt_text: string
  media_type: string; width: number; height: number; products: any[]; hotspots: any[]
  tags: string[]; collection_ids: number[]; is_visible: boolean; is_pinned: boolean
  status: string; source: string; sort_order: number; created_at: string
}

interface Grid {
  id: number; title: string; slug: string; grid_type: string; columns: number
  rows: number; gap: number; published: boolean; status: string; display_on: string[]
  created_at: string
}

const CATEGORIES = [
  { id: 1, name: 'Living Room' }, { id: 2, name: 'Dining Room' }, { id: 3, name: 'Bedroom' },
  { id: 4, name: 'Office' }, { id: 5, name: 'Outdoor' },
]

function toast(msg: string) {
  const el = document.getElementById('ig-toast')
  if (el) { el.textContent = msg; el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 2000) }
}

export default function InstagramAdminPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [grids, setGrids] = useState<Grid[]>([])
  const [activeTab, setActiveTab] = useState<'posts'|'grids'|'settings'>('posts')
  const [loading, setLoading] = useState(true)

  // Post form
  const [addingPost, setAddingPost] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageCaption, setImageCaption] = useState('')
  const [imagePermalink, setImagePermalink] = useState('')
  const [postSource, setPostSource] = useState<'manual_upload'|'instagram'>('manual_upload')
  const [taggedProducts, setTaggedProducts] = useState<number[]>([])
  const [taggedCollections, setTaggedCollections] = useState<number[]>([])

  // Grid creation
  const [creatingGrid, setCreatingGrid] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [gridType, setGridType] = useState<GridType>('masonry')
  const [gridCols, setGridCols] = useState(4)
  const [gridRows, setGridRows] = useState(4)
  const [gridTitle, setGridTitle] = useState('')
  const [gridGap, setGridGap] = useState(8)
  const [gridDisplayOn, setGridDisplayOn] = useState<string[]>(['homepage'])
  const [previewGrid, setPreviewGrid] = useState<any[]>([])

  const fetchPosts = useCallback(async () => {
    const r = await fetch('/api/admin/instagram/posts')
    if (r.ok) { const d = await r.json(); setPosts(d.posts || []) }
  }, [])

  const fetchGrids = useCallback(async () => {
    const r = await fetch('/api/admin/instagram/grids')
    if (r.ok) { const d = await r.json(); setGrids(d.grids || []) }
  }, [])

  useEffect(() => { fetchPosts(); fetchGrids().finally(() => setLoading(false)) }, [fetchPosts, fetchGrids])

  // Actions
  const addPost = async () => {
    if (!imageUrl) return toast('Image URL required')
    const r = await fetch('/api/admin/instagram/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption: imageCaption, permalink: imagePermalink, width: 800, height: 800, source: postSource, products: taggedProducts.map(id => ({ id })), collection_ids: taggedCollections, status: 'approved' })
    })
    if (r.ok) { resetPostForm(); fetchPosts(); toast('Post added!') }
    else toast('Failed to add post')
  }

  const togglePin = async (post: Post) => {
    const r = await fetch('/api/admin/instagram/posts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, is_pinned: !post.is_pinned })
    })
    if (r.ok) { fetchPosts(); toast(post.is_pinned ? 'Unpinned' : '📌 Pinned!') }
  }

  const toggleVisibility = async (post: Post) => {
    const r = await fetch('/api/admin/instagram/posts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, is_visible: !post.is_visible })
    })
    if (r.ok) { fetchPosts(); toast(post.is_visible ? 'Hidden 👁️‍🗨️' : 'Visible 👁️') }
  }

  const updateStatus = async (post: Post, status: string) => {
    const r = await fetch('/api/admin/instagram/posts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, status })
    })
    if (r.ok) { fetchPosts(); toast(`Status: ${status}`) }
  }

  const resetPostForm = () => {
    setImageUrl(''); setImageCaption(''); setImagePermalink(''); setPostSource('manual_upload')
    setTaggedProducts([]); setTaggedCollections([]); setAddingPost(false)
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const createGrid = async () => {
    if (!gridTitle) return toast('Grid title required')
    const ids = Array.from(selected)
    if (ids.length === 0) return toast('Select posts first')
    const slug = gridTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const r = await fetch('/api/admin/instagram/grids', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: gridTitle, slug, grid_type: gridType, columns: gridCols, rows: gridRows, gap: gridGap, post_ids: ids, display_on: gridDisplayOn })
    })
    if (r.ok) { setCreatingGrid(false); setGridTitle(''); setSelected(new Set()); fetchGrids(); toast('Grid created!') }
    else toast('Failed to create grid')
  }

  const publishGrid = async (grid: Grid) => {
    const r = await fetch('/api/admin/instagram/grids', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: grid.id, published: !grid.published, status: grid.published ? 'draft' : 'published' })
    })
    if (r.ok) { fetchGrids(); toast(grid.published ? 'Unpublished' : '🚀 Published!') }
  }

  const deletePost = async (id: number) => {
    if (!confirm('Delete this post?')) return
    const r = await fetch(`/api/admin/instagram/posts?id=${id}`, { method: 'DELETE' })
    if (r.ok) { fetchPosts(); toast('Post deleted') }
  }

  const deleteGrid = async (id: number) => {
    if (!confirm('Delete this grid and all its cells?')) return
    const r = await fetch(`/api/admin/instagram/grids?id=${id}`, { method: 'DELETE' })
    if (r.ok) { fetchGrids(); toast('Grid deleted') }
  }

  const previewLayout = () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return toast('No posts selected')
    const selectedPosts = posts.filter(p => ids.includes(p.id))
    const cells = selectedPosts.map((p, i) => ({
      url: p.image_url, id: p.id,
      colSpan: gridType === 'masonry' ? (p.width / (p.height || 1) > 1.4 ? 2 : 1) : 1,
      rowSpan: gridType === 'masonry' ? Math.max(1, Math.round((p.width / (p.height || 1)) * 2)) : 1,
      colStart: i % gridCols, rowStart: Math.floor(i / gridCols),
    }))
    setPreviewGrid(cells)
  }

  if (loading) return <div className="luxe-empty"><div className="luxe-empty-icon">📸</div><p className="luxe-empty-title">Loading...</p></div>

  return (
    <div>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">📸 Instagram Feed</h1>
        <p className="luxe-page-subtitle">Smart collages · Shoppable hotspots · Auto-layout · Sync · Moderate</p>
      </header>

      <div id="ig-toast" style={{ position:'fixed',bottom:24,right:24,zIndex:9999,background:'var(--luxe-navy-900)',color:'#fff',padding:'12px 20px',borderRadius:'var(--radius-md)',fontSize:13,fontWeight:500,opacity:0,transition:'opacity 300ms ease',pointerEvents:'none',boxShadow:'var(--shadow-lg)' }} />

      {/* Tabs */}
      <div style={{ display:'flex',gap:'var(--space-2)',marginBottom:'var(--space-6)',flexWrap:'wrap' }}>
        {(['posts','grids','settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`luxe-btn ${activeTab===tab?'luxe-btn-primary':'luxe-btn-ghost'} luxe-btn-sm`}
            style={{ textTransform:'capitalize' }}>
            {tab==='posts'?'🖼️ Posts':tab==='grids'?'📐 Grids':'⚙️ Settings'}
          </button>
        ))}
        <div style={{ marginLeft:'auto',display:'flex',gap:'var(--space-2)' }}>
          <button onClick={() => setAddingPost(!addingPost)} className="luxe-btn luxe-btn-gold luxe-btn-sm">+ Add Post</button>
          {selected.size > 0 && (
            <button onClick={() => setCreatingGrid(true)} className="luxe-btn luxe-btn-primary luxe-btn-sm">
              ✨ Create Grid ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* Add Post Form */}
      {addingPost && (
        <div className="luxe-card" style={{ marginBottom:'var(--space-6)', padding:'var(--space-6)' }}>
          <h3 style={{ margin:'0 0 var(--space-4)',fontSize:16,fontWeight:600,color:'var(--luxe-navy-900)' }}>Add New Post</h3>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-4)',marginBottom:'var(--space-4)' }}>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',marginBottom:4,display:'block' }}>Image URL</label>
              <input className="luxe-input" placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',marginBottom:4,display:'block' }}>Instagram Permalink</label>
              <input className="luxe-input" placeholder="https://instagram.com/p/..." value={imagePermalink} onChange={e => setImagePermalink(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',marginBottom:4,display:'block' }}>Caption</label>
              <input className="luxe-input" placeholder="Product highlight..." value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',marginBottom:4,display:'block' }}>Source</label>
              <select className="luxe-select" value={postSource} onChange={e => setPostSource(e.target.value as any)} style={{ width:'100%' }}>
                <option value="manual_upload">Manual Upload</option>
                <option value="instagram">Instagram Sync</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex',gap:'var(--space-3)',justifyContent:'flex-end' }}>
            <button onClick={resetPostForm} className="luxe-btn luxe-btn-ghost luxe-btn-sm">Cancel</button>
            <button onClick={addPost} className="luxe-btn luxe-btn-gold luxe-btn-sm">💾 Save Post</button>
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="luxe-grid-3">
          {posts.map(post => (
            <div key={post.id} style={{
              position:'relative', borderRadius:'var(--radius-lg)', overflow:'hidden',
              border:'1px solid var(--luxe-warm-200)', background:'#fff',
              opacity: post.is_visible ? 1 : 0.4,
              boxShadow: post.is_pinned ? '0 0 0 2px var(--luxe-gold-500), var(--shadow-md)' : 'var(--shadow-sm)',
              transition:'all 200ms ease',
            }}>
              {/* Image */}
              <div style={{ position:'relative', cursor:'pointer' }} onClick={() => toggleSelect(post.id)}>
                <img src={post.image_url} alt={post.alt_text || ''} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }} />
                {selected.has(post.id) && (
                  <div style={{ position:'absolute',top:8,right:8,width:24,height:24,borderRadius:'50%',background:'var(--luxe-gold-500)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700 }}>✓</div>
                )}
                {!post.is_visible && (
                  <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24 }}>👁️‍🗨️</div>
                )}
              </div>

              {/* Info + Actions */}
              <div style={{ padding:'var(--space-3)' }}>
                {post.caption && <div style={{ fontSize:12,color:'var(--luxe-slate-600)',marginBottom:'var(--space-2)',lineHeight:1.4 }}>{post.caption.substring(0,80)}{post.caption.length>80?'...':''}</div>}
                <div style={{ display:'flex',gap:4,flexWrap:'wrap',marginBottom:'var(--space-2)' }}>
                  <span className={`luxe-badge ${post.status==='approved'?'success':post.status==='pending'?'warning':'neutral'}`} style={{ fontSize:10 }}>{post.status}</span>
                  {post.is_pinned && <span className="luxe-badge info" style={{ fontSize:10 }}>📌 Pinned</span>}
                  <span className="luxe-badge neutral" style={{ fontSize:10 }}>{post.source}</span>
                </div>
                <div style={{ display:'flex',gap:'var(--space-2)',flexWrap:'wrap' }}>
                  <button onClick={() => togglePin(post)} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 8px',fontSize:10 }}>
                    {post.is_pinned ? '📌 Unpin' : '📌 Pin'}
                  </button>
                    <button onClick={() => toggleVisibility(post)} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 8px',fontSize:10 }}>
                      {post.is_visible ? '🙈 Hide' : '👁️ Show'}
                    </button>
                    <button onClick={() => deletePost(post.id)} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 8px',fontSize:10,color:'var(--luxe-merlot)' }}>
                      🗑️ Delete
                    </button>
                  {post.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(post, 'approved')} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 8px',fontSize:10,color:'var(--luxe-emerald)' }}>✅ Approve</button>
                      <button onClick={() => updateStatus(post, 'rejected')} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ padding:'2px 8px',fontSize:10,color:'var(--luxe-merlot)' }}>❌ Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && <div className="luxe-empty" style={{ gridColumn:'1/-1' }}><div className="luxe-empty-icon">📸</div><p className="luxe-empty-title">No posts yet</p><p className="luxe-empty-desc">Add Instagram posts manually or connect your Instagram account to auto-sync.</p></div>}
        </div>
      )}

      {/* Grids Tab */}
      {activeTab === 'grids' && (
        <>
          {grids.map(grid => (
            <div key={grid.id} className="luxe-card" style={{ marginBottom:'var(--space-4)' }}>
              <div className="luxe-card-header">
                <div>
                  <h3 style={{ margin:0,fontSize:15,fontWeight:600,color:'var(--luxe-navy-900)' }}>{grid.title}</h3>
                  <div style={{ fontSize:11,color:'var(--luxe-slate-400)',marginTop:2 }}>
                    {grid.grid_type.toUpperCase()} · {grid.columns}×{grid.rows} · gap {grid.gap}px · {grid.slug}
                  </div>
                </div>
                <div style={{ display:'flex',gap:'var(--space-2)',alignItems:'center' }}>
                  {grid.display_on?.map((loc: string) => (
                    <span key={loc} className="luxe-badge info" style={{ fontSize:10 }}>{loc}</span>
                  ))}
                  <span className={`luxe-badge ${grid.published?'success':'neutral'}`}>{grid.published?'● Live':'○ Draft'}</span>
                  <button onClick={() => publishGrid(grid)} className="luxe-btn luxe-btn-ghost luxe-btn-sm">
                    {grid.published ? '⬇ Unpublish' : '🚀 Publish'}
                  </button>
                  <button onClick={() => deleteGrid(grid.id)} className="luxe-btn luxe-btn-ghost luxe-btn-sm" style={{ color:'var(--luxe-merlot)' }}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          {grids.length === 0 && <div className="luxe-empty"><div className="luxe-empty-icon">📐</div><p className="luxe-empty-title">No grids yet</p><p className="luxe-empty-desc">Select posts and create a grid collage. Choose from 7 layout algorithms.</p></div>}
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="luxe-card" style={{ padding:'var(--space-6)' }}>
          <h3 style={{ margin:'0 0 var(--space-4)',fontSize:16,fontWeight:600,color:'var(--luxe-navy-900)' }}>⚙️ Instagram Integration</h3>
          <div style={{ fontSize:13,color:'var(--luxe-slate-600)',marginBottom:'var(--space-4)' }}>
            Connect your Instagram Business account to auto-sync posts every 1–6 hours.
            Posts will appear in the moderation queue for approval before publishing.
          </div>
          <div className="luxe-input" style={{ marginBottom:'var(--space-4)',fontFamily:'var(--font-mono)',fontSize:12 }}>
            Instagram App ID: not configured
          </div>
          <div style={{ display:'flex',gap:'var(--space-3)' }}>
            <button className="luxe-btn luxe-btn-gold luxe-btn-sm">🔗 Connect Instagram</button>
            <button className="luxe-btn luxe-btn-ghost luxe-btn-sm">🔄 Sync Now</button>
          </div>
        </div>
      )}

      {/* Create Grid Modal */}
      {creatingGrid && (
        <div style={{ position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center' }} onClick={() => setCreatingGrid(false)}>
          <div className="luxe-card" style={{ width:640,maxWidth:'90vw',maxHeight:'85vh',overflow:'auto' }} onClick={e => e.stopPropagation()}>
            <div className="luxe-card-header">
              <h2 className="luxe-card-title">✨ Create Grid Collage</h2>
              <span className="luxe-badge info">{selected.size} posts</span>
            </div>
            <div className="luxe-card-body">
              <div style={{ marginBottom:'var(--space-4)' }}>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',display:'block',marginBottom:4 }}>Grid Title</label>
                <input className="luxe-input" placeholder="Summer Collection 2026" value={gridTitle} onChange={e => setGridTitle(e.target.value)} />
              </div>

              <div style={{ marginBottom:'var(--space-4)' }}>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',display:'block',marginBottom:4 }}>Layout Algorithm</label>
                <div style={{ display:'flex',flexWrap:'wrap',gap:'var(--space-2)' }}>
                  {(['masonry','metro','classic','collage','spotlight','polaroid','carousel'] as GridType[]).map(t => (
                    <button key={t} onClick={() => setGridType(t)}
                      style={{ padding:'8px 14px',borderRadius:'var(--radius-sm)',border:gridType===t?'2px solid var(--luxe-gold-500)':'1px solid var(--luxe-warm-200)',background:gridType===t?'rgba(201,160,80,0.08)':'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:gridType===t?'var(--luxe-gold-500)':'var(--luxe-slate-600)',textTransform:'capitalize',transition:'all 150ms ease' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'var(--space-4)',marginBottom:'var(--space-4)' }}>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',display:'block',marginBottom:4 }}>Columns</label><input type="number" className="luxe-input" min={1} max={12} value={gridCols} onChange={e => setGridCols(Number(e.target.value))} /></div>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',display:'block',marginBottom:4 }}>Rows</label><input type="number" className="luxe-input" min={1} max={12} value={gridRows} onChange={e => setGridRows(Number(e.target.value))} /></div>
                <div><label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',display:'block',marginBottom:4 }}>Gap (px)</label><input type="number" className="luxe-input" min={0} max={32} value={gridGap} onChange={e => setGridGap(Number(e.target.value))} /></div>
              </div>

              <div style={{ marginBottom:'var(--space-4)' }}>
                <label style={{ fontSize:11,fontWeight:600,color:'var(--luxe-slate-400)',textTransform:'uppercase',display:'block',marginBottom:4 }}>Display On</label>
                <div style={{ display:'flex',gap:'var(--space-2)',flexWrap:'wrap' }}>
                  {['homepage','products','collections','blog','custom'].map(loc => (
                    <button key={loc} onClick={() => setGridDisplayOn(prev => prev.includes(loc) ? prev.filter(x => x!==loc) : [...prev, loc])}
                      style={{ padding:'6px 12px',borderRadius:999,border:gridDisplayOn.includes(loc)?'2px solid var(--luxe-gold-500)':'1px solid var(--luxe-warm-200)',background:gridDisplayOn.includes(loc)?'rgba(201,160,80,0.08)':'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:gridDisplayOn.includes(loc)?'var(--luxe-gold-500)':'var(--luxe-slate-600)',textTransform:'capitalize',transition:'all 150ms ease' }}>
                      {gridDisplayOn.includes(loc) ? '✓ ' : ''}{loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              {previewGrid.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: `${gridGap}px`,
                  padding: 'var(--space-4)', background: 'var(--luxe-warm-50)', borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                }}>
                  {previewGrid.map((cell: any, i: number) => (
                    <div key={i} style={{
                      gridColumn: `span ${cell.colSpan}`, gridRow: `span ${cell.rowSpan}`,
                      borderRadius: 4, overflow: 'hidden', background: '#ddd',
                    }}>
                      <img src={cell.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:'flex',gap:'var(--space-3)',justifyContent:'flex-end' }}>
                <button onClick={previewLayout} className="luxe-btn luxe-btn-ghost luxe-btn-sm">🔄 Preview</button>
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
