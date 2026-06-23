'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/format-utils'
import { getProductBadges, isOnSale } from '@/lib/product-badges'

interface Product {
  id: string
  title: string
  slug: string
  description?: string
  price?: number
  originalPrice?: number
  showPrice?: boolean
  imageUrl?: string
  category?: { id: string; title: string; slug: string }
  materials?: string
  tags?: string[]
  reviewCount?: number
  avgRating?: number
}

function ProductStars({ rating, count, showRating }: { rating: number; count: number; showRating?: boolean }) {
  if (showRating === false || !count) return null
  return (
    <div className="product-card__rating">
      <span className="product-card__stars" aria-label={`${rating} out of 5 stars`}>
        {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      </span>
      <span className="product-card__review-count">{count} review{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

interface Category {
  id: string
  title: string
  slug: string
  productCount?: number
  imageUrl?: string | null
  description?: string | null
}

const SORT_OPTIONS = [
  { value: 'title ASC', label: 'Name: A-Z' },
  { value: 'title DESC', label: 'Name: Z-A' },
  { value: 'price ASC', label: 'Price: Low to High' },
  { value: 'price DESC', label: 'Price: High to Low' },
  { value: 'created_at DESC', label: 'Newest First' },
  { value: 'created_at ASC', label: 'Oldest First' },
] as const

// Swatches/sample collections
const SWATCH_CATEGORY_SLUGS = new Set([
  'veratti-sinteredstone', 'sintered-stone', 'natural-stone',
  'fabric-swatches-linen', 'fabric-swatches-velvet', 'swatches-tech-cloth',
  'fabric-swatches-leather', 'fabric-swatches-leatherette',
])

function ProductsContentInner({ config = {} }: { config?: any }) {
  const columns = config.columns || 4
  const pageSize = config.pageSize || 24
  const gridGap = config.gridGap !== undefined ? config.gridGap : 36
  const showFilters = config.showFilters !== false
  const showSort = config.showSort !== false
  const showRating = config.showRating !== false
  const spacingTop = config.spacingTop !== undefined ? config.spacingTop : 12
  const spacingBottom = config.spacingBottom !== undefined ? config.spacingBottom : 48

  const searchParams = useSearchParams()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [sortBy, setSortBy] = useState('title ASC')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchRef = useRef(searchTerm)
  const categoryRef = useRef(selectedCategory)
  const sortRef = useRef(sortBy)
  const pageRef = useRef(page)

  useEffect(() => { searchRef.current = searchTerm }, [searchTerm])
  useEffect(() => { categoryRef.current = selectedCategory }, [selectedCategory])
  useEffect(() => { sortRef.current = sortBy }, [sortBy])
  useEffect(() => { pageRef.current = page }, [page])

  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    loadCategories()
  }, [])

  // Sync category from URL param when it changes (e.g. nav link click)
  useEffect(() => {
    const urlCat = searchParams.get('category') || ''
    if (urlCat !== selectedCategory) {
      setSelectedCategory(urlCat)
      setPage(0)
    }
  }, [searchParams])

  async function loadProducts() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      params.set('orderBy', sortRef.current)
      if (pageRef.current > 0) params.set('offset', String(pageRef.current * pageSize))
      if (categoryRef.current) params.set('category', categoryRef.current)
      if (searchRef.current.trim()) params.set('search', searchRef.current.trim())

      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data.docs || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories?limit=100')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.docs || [])
      }
    } catch {
      // Categories are optional for UI
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setShowSuggestions(false)
    loadProducts()
  }

  function handleSearchInput(value: string) {
    setSearchTerm(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(value.trim())}&limit=8&orderBy=title ASC`)
        if (res.ok) {
          const data = await res.json()
          const titles = (data.docs || []).map((p: Product) => p.title).filter(Boolean)
          setSuggestions(titles)
          setShowSuggestions(titles.length > 0)
        }
      } catch { /* best-effort */ }
    }, 250)
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value)
    setPage(0)
    const params = new URLSearchParams()
    if (value) params.set('category', value)
    router.replace(value ? `/products?category=${value}` : '/products', { scroll: false })
  }

  function handleSortChange(value: string) {
    setSortBy(value)
    setPage(0)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (fetchKey > 0) loadProducts()
  }, [fetchKey])

  useEffect(() => {
    setFetchKey(k => k + 1)
  }, [page, selectedCategory, sortBy])

  useEffect(() => {
    loadProducts()
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="collection-inner" style={{ paddingTop: spacingTop, paddingBottom: spacingBottom }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 990px) {
          .products-debut-grid, .products-loading {
            grid-template-columns: repeat(${columns}, minmax(0, 1fr)) !important;
            gap: ${gridGap}px !important;
          }
        }
        @media (max-width: 989px) {
          .products-debut-grid, .products-loading {
            gap: ${Math.round(gridGap * 30 / 36)}px ${Math.round(gridGap * 24 / 36)}px !important;
          }
        }
        @media (max-width: 749px) {
          .products-debut-grid, .products-loading {
            gap: ${Math.round(gridGap * 28 / 36)}px ${Math.round(gridGap * 18 / 36)}px !important;
          }
        }
      ` }} />
      {/* Search with autocomplete */}
      <form onSubmit={handleSearch} className="products-search" style={{ position: 'relative', marginBottom: 16 }}>
        <input
          ref={searchInputRef}
          type="search"
          value={searchTerm}
          onChange={e => handleSearchInput(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          autoComplete="off"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
        <button type="submit" style={{ position: 'absolute', right: 8, top: 8, padding: '6px 14px', background: '#151a17', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Search</button>
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: '#fff', border: '1px solid #d9e0d7', borderRadius: 8, marginTop: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 240, overflow: 'auto',
          }}>
            {suggestions.map((title, i) => (
              <button key={i} type="button" onClick={() => { setSearchTerm(title); setShowSuggestions(false); loadProducts() }}
                style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 13, borderBottom: i < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f7f9f6'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                {title}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Filter / sort bar */}
      {(showFilters || showSort) && (
        <div className="collection-toolbar">
          <div className="collection-toolbar__filters">
            {showFilters && (
              <label className="collection-toolbar__group">
                <span className="collection-toolbar__label">Filter by</span>
                <select value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} aria-label="Filter by collection">
                  <option value="">All products</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.title}</option>
                  ))}
                </select>
              </label>
            )}
            {showSort && (
              <label className="collection-toolbar__group">
                <span className="collection-toolbar__label">Sort by</span>
                <select value={sortBy} onChange={e => handleSortChange(e.target.value)} aria-label="Sort products">
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {total > 0 && <div className="collection-toolbar__count">{total} products</div>}
        </div>
      )}

      {/* Error */}
      {error && <div className="products-error">{error}</div>}

      {/* Loading Skeleton */}
      {loading && (
        <div className="products-loading" style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '36px 24px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-image" />
              <div className="skeleton-body">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-line xshort" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="products-empty">
          <p>No products found</p>
          <p className="sub">
            {searchTerm || selectedCategory
              ? 'Try adjusting your search, category, or filters.'
              : 'Products are being added. Check back soon!'}
          </p>
          {(searchTerm || selectedCategory) && (
            <button
              onClick={() => {
                setSearchTerm('')
                handleCategoryChange('')
                setSortBy('title ASC')
                setPage(0)
                if (searchInputRef.current) searchInputRef.current.focus()
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!loading && products.length > 0 && (
        <>
          <div className="products-debut-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: '36px 24px' }}>
            {products.map(product => {
              const onSale = isOnSale(product.price, product.originalPrice)
              const badges = getProductBadges(product)
              const href = `/products/${product.slug}`
              return (
                <div key={product.id} className="grid-view-item product-card">
                  <Link href={href} className="grid-view-item__link grid-view-item__image-container">
                    {(badges.isNew || badges.isSale || badges.is3D) && (
                      <div className="grid-view-item__badges">
                        {badges.isNew && <span className="product-badge product-badge--new">New</span>}
                        {badges.isSale && <span className="product-badge product-badge--sale">Sale</span>}
                        {badges.is3D && <span className="product-badge product-badge--3d">3D</span>}
                      </div>
                    )}
                    {product.imageUrl ? (
                      <img
                        className="grid-view-item__image"
                        src={product.imageUrl}
                        alt={product.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid-view-item__image grid-view-item__image--placeholder">No image</div>
                    )}
                  </Link>
                  <div className="grid-view-item__meta">
                    <Link href={href} className="grid-view-item__link">
                      <div className="grid-view-item__title product-card__title">{product.title}</div>
                    </Link>
                     <ProductStars rating={product.avgRating || 0} count={product.reviewCount || 0} showRating={showRating} />
                    {product.showPrice !== false && product.price != null && (
                      <div className={`price${onSale ? ' price--on-sale' : ''}`}>
                        <dl>
                          <div className="price__regular">
                            <dd>
                              <span className="price-item price-item--regular">{formatPrice(product.price)}</span>
                            </dd>
                          </div>
                          <div className="price__sale">
                            <dd>
                              <span className="price-item price-item--sale">{formatPrice(product.price)}</span>
                            </dd>
                            <dd>
                              <s className="price-item price-item--regular">
                                {onSale ? formatPrice(product.originalPrice) : ''}
                              </s>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="products-pagination">
              <button disabled={page === 0} onClick={() => handlePageChange(page - 1)}>
                &larr; Previous
              </button>
              <span>Page {page + 1} of {totalPages} &nbsp;({total} products)</span>
              <button disabled={page >= totalPages - 1} onClick={() => handlePageChange(page + 1)}>
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}

      <div className="products-chat-prompt">
        <p>Can't find what you're looking for? Our design consultants can help.</p>
        <Link href="/quote-cart">Request a Quotation</Link>
      </div>
    </div>
  )
}

export default function ProductGridClient({ config = {} }: { config?: any; products?: any[]; total?: number; page?: number }) {
  return (
    <Suspense fallback={
      <div className="products-loading" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '36px 24px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-body">
              <div className="skeleton-line" /><div className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    }>
      <ProductsContentInner config={config} />
    </Suspense>
  )
}
