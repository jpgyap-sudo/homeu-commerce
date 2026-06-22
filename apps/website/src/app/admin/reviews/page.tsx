'use client'

import { useState, useEffect, useCallback } from 'react'

interface ReviewRow {
  id: string
  product_id: number | null
  product_title: string | null
  product_slug: string | null
  reviewer_name: string | null
  reviewer_email: string | null
  rating: number
  title: string | null
  body: string | null
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  fraud_score: number
  fraud_reasons: string[]
  verified_purchase: boolean
  source: string
  imported_from_judgeme: boolean
  review_date: string
  reply_count: number
  photos: string[] | null
}

const TABS: { key: string; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'flagged', label: 'Flagged' },
  { key: '', label: 'All' },
]

const FRAUD_LABELS: Record<string, string> = {
  disposable_email_domain: 'Disposable email',
  owner_self_review: 'Self-review',
  csv_source_admin: 'Admin-entered (legacy)',
  high_volume_reviewer: 'High-volume reviewer',
  empty_body: 'Empty body',
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#d9a04b', fontSize: 13, letterSpacing: 1 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function AdminReviewsPage() {
  const [tab, setTab] = useState('pending')
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [draftingId, setDraftingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/admin/reviews?limit=200${tab ? `&status=${tab}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { load(); setSelectedIds(new Set()) }, [load])

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    })
    load()
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev => prev.size === reviews.length ? new Set() : new Set(reviews.map(r => r.id)))
  }

  async function bulkSetStatus(status: string) {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/admin/reviews/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status }),
        })
      ))
      setSelectedIds(new Set())
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  async function draftReply(id: string) {
    setDraftingId(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ aiDraft: true }),
      })
      const data = await res.json()
      if (data.draft) setReplyDraft(prev => ({ ...prev, [id]: data.draft }))
    } finally {
      setDraftingId(null)
    }
  }

  async function submitReply(id: string) {
    const text = replyDraft[id]
    if (!text?.trim()) return
    await fetch(`/api/admin/reviews/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ body: text, aiDrafted: true }),
    })
    setReplyDraft(prev => ({ ...prev, [id]: '' }))
    load()
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#151a17' }}>⭐ Reviews</h1>
          <p style={{ fontSize: 13, color: '#667168', margin: 0 }}>
            Every review — submitted, imported, or chat-collected — needs your approval before it goes live. Nothing auto-publishes.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', background: '#151a17', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          + Add Review
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #d9e0d7' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none',
            cursor: 'pointer', color: tab === t.key ? '#151a17' : '#667168',
            borderBottom: tab === t.key ? '2px solid #151a17' : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#667168' }}>Loading...</div>
      ) : reviews.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9aa69c' }}>No reviews in this view.</div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, padding: '8px 4px',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#151a17', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === reviews.length}
                onChange={toggleSelectAll}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </label>

            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => bulkSetStatus('approved')} disabled={bulkBusy} style={btnStyle('#1a6d3e', '#fff')}>
                  {bulkBusy ? 'Working...' : `Approve ${selectedIds.size}`}
                </button>
                <button onClick={() => bulkSetStatus('rejected')} disabled={bulkBusy} style={btnStyle('#fff', '#991b1b', '#fecaca')}>
                  Decline {selectedIds.size}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: '#fff', border: selectedIds.has(r.id) ? '1.5px solid #1a6d3e' : '1px solid #d9e0d7', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleSelect(r.id)}
                  style={{ width: 16, height: 16, marginTop: 3, cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <StarRow rating={r.rating} />
                    <strong style={{ fontSize: 13, color: '#151a17' }}>{r.reviewer_name || 'Anonymous'}</strong>
                    {r.verified_purchase && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#1a6d3e', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>VERIFIED BUYER</span>
                    )}
                    <span style={{ fontSize: 11, color: '#9aa69c' }}>via {r.source}{r.imported_from_judgeme ? ' (Judge.me import)' : ''}</span>
                  </div>
                  {r.product_title && (
                    <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>
                      on <a href={`/products/${r.product_slug}`} target="_blank" rel="noreferrer" style={{ color: '#1a6d3e' }}>{r.product_title}</a>
                    </div>
                  )}
                  {!r.product_id && (
                    <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>⚠ Product not matched (discontinued/renamed) — won&apos;t display until linked</div>
                  )}
                  {r.title && <div style={{ fontSize: 13, fontWeight: 600, color: '#151a17', marginTop: 6 }}>{r.title}</div>}
                  <div style={{ fontSize: 13, color: '#3a4540', marginTop: 4, lineHeight: 1.5 }}>{r.body}</div>
                  {r.photos && r.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {r.photos.map((url: string, i: number) => (
                        <img key={i} src={url} alt={`Review photo ${i + 1}`} style={{
                          width: 56, height: 56, borderRadius: 6, objectFit: 'cover',
                          border: '1px solid #d9e0d7', cursor: 'pointer',
                        }} onClick={() => window.open(url, '_blank')} />
                      ))}
                    </div>
                  )}
                  {r.fraud_reasons?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {r.fraud_reasons.map(reason => (
                        <span key={reason} style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', background: '#fef2f2', padding: '2px 8px', borderRadius: 6 }}>
                          {FRAUD_LABELS[reason] || reason}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#9aa69c', marginTop: 6 }}>
                    {new Date(r.review_date).toLocaleDateString()} · admin-only: {r.reviewer_email || 'no email'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {r.status !== 'approved' && (
                    <button onClick={() => setStatus(r.id, 'approved')} style={btnStyle('#1a6d3e', '#fff')}>Approve</button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => setStatus(r.id, 'rejected')} style={btnStyle('#fff', '#991b1b', '#fecaca')}>Decline</button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} style={btnStyle('#fff', '#667168', '#d9e0d7')}>
                    Reply{r.reply_count > 0 ? ` (${r.reply_count})` : ''}
                  </button>
                </div>
              </div>

              {expandedId === r.id && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0f2ef' }}>
                  <textarea
                    value={replyDraft[r.id] || ''}
                    onChange={e => setReplyDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Write a reply, or generate an AI draft to edit..."
                    rows={3}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #d9e0d7', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => draftReply(r.id)} disabled={draftingId === r.id} style={btnStyle('#fff', '#151a17', '#d9e0d7')}>
                      {draftingId === r.id ? 'Drafting...' : '✨ AI Draft'}
                    </button>
                    <button onClick={() => submitReply(r.id)} style={btnStyle('#151a17', '#fff')}>Publish Reply</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        </>
      )}

      {showCreate && <CreateReviewModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}

function btnStyle(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
    background: bg, color, border: border ? `1.5px solid ${border}` : 'none', whiteSpace: 'nowrap',
  }
}

function CreateReviewModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<{ id: number; title: string }[]>([])
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/admin/products/picker?search=${encodeURIComponent(productQuery)}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setProductResults((d.products || d.docs || []).slice(0, 8)))
        .catch(() => setProductResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [productQuery])

  async function handleSubmit() {
    if (!productId || !reviewBody.trim()) { setError('Product and review text are required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, reviewerName, reviewerEmail, rating, title, reviewBody }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to create review')
      }
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#151a17' }}>Add Review (Backend Entry)</h2>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: '#667168' }}>
          Mirrors Judge.me&apos;s admin-entered reviews — no verification, published immediately since you&apos;re vouching for it.
        </p>

        {error && <div style={{ padding: 10, background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Product</label>
            <input value={productQuery} onChange={e => { setProductQuery(e.target.value); setProductId('') }} placeholder="Search product..." style={inputStyle} />
            {productResults.length > 0 && !productId && (
              <div style={{ border: '1px solid #d9e0d7', borderRadius: 8, marginTop: 4, maxHeight: 150, overflowY: 'auto' }}>
                {productResults.map(p => (
                  <div key={p.id} onClick={() => { setProductId(String(p.id)); setProductQuery(p.title) }}
                    style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f0f2ef' }}>
                    {p.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Reviewer Name</label>
              <input value={reviewerName} onChange={e => setReviewerName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Reviewer Email (admin-only, optional)</label>
              <input value={reviewerEmail} onChange={e => setReviewerEmail(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Rating</label>
            <select value={rating} onChange={e => setRating(parseInt(e.target.value, 10))} style={inputStyle}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Review Text</label>
            <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={btnStyle('#fff', '#667168', '#d9e0d7')}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={btnStyle('#151a17', '#fff')}>{saving ? 'Saving...' : 'Publish Review'}</button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' }
const inputStyle: React.CSSProperties = { padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', background: '#f7f9f6', color: '#151a17' }
