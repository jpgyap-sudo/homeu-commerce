'use client'

import { useState, useEffect, useRef } from 'react'
import RfqChatProductCard from './RfqChatProductCard'

interface RfqChatProductSearchProps {
  onSelectProduct: (product: ProductData) => void
  open: boolean
  onClose: () => void
}

interface ProductData {
  id: number | string
  title: string
  price: number
  imageUrl?: string | null
  slug?: string
  categoryTitle?: string | null
}

export default function RfqChatProductSearch({
  onSelectProduct,
  open,
  onClose,
}: RfqChatProductSearchProps) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [categories, setCategories] = useState<{ id: string; title: string }[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch products when query or category changes
  useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchProducts()
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selectedCategory, open])

  // Focus search input when panel opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])

  async function fetchProducts() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('search', query.trim())
      params.set('limit', '12')
      if (selectedCategory) params.set('category', selectedCategory)

      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const docs = (data.docs || data.products || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          price: p.sale_price || p.price || p.originalPrice || 0,
          imageUrl: p.imageUrl || p.images?.[0]?.url || null,
          slug: p.slug,
          categoryTitle: p.category?.title || p.categoryTitle || null,
        }))
        setProducts(docs)

        // Extract categories from results
        if (data.categories && !selectedCategory) {
          setCategories(data.categories.map((c: any) => ({ id: String(c.id), title: c.title })))
        }
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div style={{
      borderTop: '1px solid #e0e0e0',
      background: '#fafafa',
    }}>
      {/* Search header */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 16px',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1.5px solid #d9e0d7',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            background: '#fff',
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#999',
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Category chips */}
      {categories.length > 0 && !query && (
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '0 16px 8px',
          overflowX: 'auto',
        }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
              border: '1px solid #d9e0d7',
              background: !selectedCategory ? '#151a17' : '#fff',
              color: !selectedCategory ? '#fff' : '#555',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            All
          </button>
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              style={{
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 11,
                border: '1px solid #d9e0d7',
                background: selectedCategory === cat.id ? '#151a17' : '#fff',
                color: selectedCategory === cat.id ? '#fff' : '#555',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div style={{
        maxHeight: 280,
        overflowY: 'auto',
        padding: '4px 16px 12px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>
            Searching...
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>
            {query ? 'No products found' : 'Loading products...'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <RfqChatProductCard product={product} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
