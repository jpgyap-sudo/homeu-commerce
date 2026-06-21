'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: number
  title: string
  slug: string
  price: number | null
  image_url: string | null
  category_title: string | null
}

interface Props {
  onAdd: (product: { productId: string; title: string; slug: string; price: number | null; imageUrl: string | null }) => void
}

export default function InlineProductBrowser({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<{ id: number; title: string }[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetch('/api/categories?limit=50').then(r => r.ok ? r.json() : { categories: [] }),
      fetch(`/api/products?limit=12${category ? `&category=${category}` : ''}${search ? `&search=${search}` : ''}`)
        .then(r => r.ok ? r.json() : { products: [] }),
    ]).then(([catData, prodData]) => {
      setCategories(catData.categories || [])
      setProducts(prodData.products || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open, category, search])

  const handleAdd = (p: Product) => {
    onAdd({
      productId: String(p.id),
      title: p.title,
      slug: p.slug,
      price: p.price,
      imageUrl: p.image_url,
    })
    setAdded(prev => new Set(prev).add(p.slug))
    setTimeout(() => setAdded(prev => { const next = new Set(prev); next.delete(p.slug); return next }), 2000)
  }

  return (
    <div style={{ marginTop: 16 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
          background: '#f4f6f2', border: '1.5px dashed #b7d4c2', borderRadius: 10,
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1a6d3e',
          width: '100%', justifyContent: 'center', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e8f2ec'; e.currentTarget.style.borderColor = '#1a6d3e' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f4f6f2'; e.currentTarget.style.borderColor = '#b7d4c2' }}
        >
          ➕ Add More Items
        </button>
      ) : (
        <div style={{ border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', background: '#faf9f6', borderBottom: '1px solid #e3e8e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#151a17' }}>🔍 Browse & Add Products</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#667168', padding: 4 }}>✕</button>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e3e8e0' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#f7f9f6' }} />
          </div>

          {/* Category chips */}
          <div style={{ padding: '8px 18px', borderBottom: '1px solid #e3e8e0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setCategory('')} style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: !category ? '#151a17' : '#f4f6f2', color: !category ? '#fff' : '#667168',
              border: 'none', transition: 'all 0.1s',
            }}>All</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setCategory(category === String(c.id) ? '' : String(c.id))} style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: category === String(c.id) ? '#151a17' : '#f4f6f2', color: category === String(c.id) ? '#fff' : '#667168',
                border: 'none', transition: 'all 0.1s',
              }}>{c.title}</button>
            ))}
          </div>

          {/* Product grid */}
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {loading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: '#667168', fontSize: 13 }}>Loading products...</div>
            ) : products.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: '#9aa69c', fontSize: 13 }}>No products found.</div>
            ) : products.map(p => (
              <div key={p.id} style={{ border: '1px solid #e3e8e0', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 120, background: '#f4f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <span style={{ fontSize: 28 }}>🛋️</span>
                  )}
                </div>
                <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#151a17', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: '#667168' }}>{p.category_title || ''}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6d3e' }}>
                    {p.price ? `₱${p.price.toLocaleString()}` : 'Price varies'}
                  </div>
                  <button onClick={() => handleAdd(p)} style={{
                    marginTop: 'auto', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: added.has(p.slug) ? '#e8f2ec' : '#1a6d3e', color: added.has(p.slug) ? '#1a6d3e' : '#fff',
                    border: added.has(p.slug) ? '1.5px solid #b7d4c2' : 'none', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                    {added.has(p.slug) ? '✓ Added!' : 'Add to RFQ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
