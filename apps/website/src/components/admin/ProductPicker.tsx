'use client'

import { useState, useEffect } from 'react'

interface PickerProduct {
  id: number
  title: string
  slug: string
  price: number | null
  originalPrice: number | null
  imageUrl: string | null
  categoryTitle: string | null
  categoryId: number | null
}

interface PickerCategory {
  id: number
  title: string
  slug: string
}

interface ProductPickerProps {
  open: boolean
  selectedIds: number[]
  multiSelect?: boolean
  onSelect: (ids: number[]) => void
  onClose: () => void
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 16, width: 680, maxWidth: '94vw',
  maxHeight: '85vh', display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
}
const input: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #d9e0d7',
  borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fbfcfa',
  boxSizing: 'border-box',
}

export function ProductPicker({ open, selectedIds, multiSelect = false, onSelect, onClose }: ProductPickerProps) {
  const [products, setProducts] = useState<PickerProduct[]>([])
  const [categories, setCategories] = useState<PickerCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedIds))

  // Reset selected when opened
  useEffect(() => {
    if (open) {
      setSelected(new Set(selectedIds))
      setQ('')
      setActiveCategoryId(null)
    }
  }, [open, selectedIds])

  // Fetch products when search or category changes
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (activeCategoryId) params.set('category_id', String(activeCategoryId))
    params.set('limit', '50')
    fetch(`/api/admin/products/picker?${params}`)
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || [])
        // Only set categories on first load (when no filter active)
        if (!q && !activeCategoryId) setCategories(data.categories || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, q, activeCategoryId])

  function toggleProduct(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiSelect) {
          // Single-select: replace all
          next.clear()
          next.add(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
  }

  if (!open) return null

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #eef1ed' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#151a17' }}>
            {multiSelect ? 'Choose products' : 'Pick a product'}
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, color: '#9aa69c', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #eef1ed' }}>
          <input style={input} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search products by name…" autoFocus />
        </div>

        {/* Category filter tabs */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #eef1ed', display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveCategoryId(null)}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              border: activeCategoryId === null ? 'none' : '1.5px solid #d9e0d7',
              background: activeCategoryId === null ? '#1a6d3e' : '#fff',
              color: activeCategoryId === null ? '#fff' : '#3a4339',
            }}>All</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                border: activeCategoryId === cat.id ? 'none' : '1.5px solid #d9e0d7',
                background: activeCategoryId === cat.id ? '#1a6d3e' : '#fff',
                color: activeCategoryId === cat.id ? '#fff' : '#3a4339',
              }}>{cat.title}</button>
          ))}
        </div>

        {/* Product grid */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ color: '#9aa69c', textAlign: 'center', padding: 24 }}>Loading products…</p>
          ) : products.length === 0 ? (
            <p style={{ color: '#9aa69c', textAlign: 'center', padding: 24 }}>No products found. Try a different search or category.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {products.map(p => {
                const isSelected = selected.has(p.id)
                return (
                  <div key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    style={{
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: isSelected ? '2.5px solid #1e7a47' : '1.5px solid #eef1ed',
                      background: isSelected ? '#f0f7f2' : '#fff',
                      transition: 'all 120ms ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(30,122,71,0.15)' : 'none',
                      display: 'flex', flexDirection: 'column',
                    }}>
                    {/* Image */}
                    <div style={{ aspectRatio: '1', background: '#f4f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#c2cdbe', fontSize: 28 }}>📦</span>}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#151a17', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.title}
                      </span>
                      {p.categoryTitle && (
                        <span style={{ fontSize: 10, color: '#9aa69c' }}>{p.categoryTitle}</span>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a6d3e', marginTop: 'auto' }}>
                        {p.price != null ? `₱${Number(p.price).toLocaleString('en-PH', { maximumFractionDigits: 0 })}` : ''}
                      </span>
                    </div>
                    {/* Check indicator */}
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: '#1e7a47', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with selection count and action */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eef1ed', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#667168' }}>
            {selected.size > 0
              ? `${selected.size} product${selected.size > 1 ? 's' : ''} selected`
              : 'No products selected'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '8px 20px', border: '1.5px solid #d9e0d7', borderRadius: 8, background: '#fff', color: '#667168', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => onSelect(Array.from(selected))}
              disabled={selected.size === 0}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: selected.size > 0 ? 'pointer' : 'default',
                background: selected.size > 0 ? 'linear-gradient(180deg, #1e7a47, #0f4f2b)' : '#d9e0d7',
                color: selected.size > 0 ? '#fff' : '#9aa69c',
              }}>
              {multiSelect ? `Select (${selected.size})` : 'Select product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
