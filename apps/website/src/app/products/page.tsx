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

const PAGE_SIZE = 24

function ProductsContent() {
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

  const searchRef = useRef(searchTerm)
  const categoryRef = useRef(selectedCategory)
  const sortRef = useRef(sortBy)
  const pageRef = useRef(page)

  useEffect(() => { searchRef.current = searchTerm }, [searchTerm])
  useEffect(() => { categoryRef.current = selectedCategory }, [selectedCategory])
  useEffect(() => { sortRef.current = sortBy }, [sortBy])
  useEffect(() => { pageRef.current = page }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
      params.set('limit', String(PAGE_SIZE))
      params.set('orderBy', sortRef.current)
      if (pageRef.current > 0) params.set('offset', String(pageRef.current * PAGE_SIZE))
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
    loadProducts()
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value)
    setPage(0)
    // Reflect in URL so nav links stay in sync
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

  const activeCategory = categories.find(c => c.slug === selectedCategory)
  const activeCategoryTitle = activeCategory?.title
  const collectionTitle = activeCategoryTitle || 'Our Products'

  return (
    <main className="collection-page">
      {/* ── Collection hero banner — collage of the collection's own product
          photos when there are enough to build one (richer and avoids the
          extreme crop a single tall image gets at this height), falling
          back to the category's own image, then a plain banner. ── */}
      {(() => {
        const collageImages = [...new Set(products.map(p => p.imageUrl).filter(Boolean))].slice(0, 4) as string[]
        if (collageImages.length >= 3) {
          return (
            <section className="collection-banner collection-banner--collage">
              <div className="collection-banner__collage-grid">
                {collageImages.map((url, i) => (
                  <div key={i} className="collection-banner__collage-tile" style={{ backgroundImage: `url(${url})` }} />
                ))}
              </div>
              <div className="collection-banner__overlay" />
              <p className="collection-banner__eyebrow">Collection</p>
              <h1 className="collection-banner__title">{collectionTitle}</h1>
            </section>
          )
        }
        if (activeCategory?.imageUrl) {
          return (
            <section
              className="collection-banner"
              style={{ backgroundImage: `url(${activeCategory.imageUrl})` }}
            >
              <div className="collection-banner__overlay" />
              <h1 className="collection-banner__title">{collectionTitle}</h1>
            </section>
          )
        }
        return (
          <section className="collection-banner collection-banner--plain">
            <h1 className="collection-banner__title">{collectionTitle}</h1>
          </section>
        )
      })()}

      <div className="collection-inner">
        {/* Collection description */}
        {activeCategory?.description && (
          <div className="collection-description">
            <p>{activeCategory.description}</p>
          </div>
        )}

        {/* Filter / sort bar */}
        <div className="collection-toolbar">
          <div className="collection-toolbar__filters">
            <label className="collection-toolbar__group">
              <span className="collection-toolbar__label">Filter by</span>
              <select value={selectedCategory} onChange={e => handleCategoryChange(e.target.value)} aria-label="Filter by collection">
                <option value="">All products</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.slug}>{cat.title}</option>
                ))}
              </select>
            </label>
            <label className="collection-toolbar__group">
              <span className="collection-toolbar__label">Sort by</span>
              <select value={sortBy} onChange={e => handleSortChange(e.target.value)} aria-label="Sort products">
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
          {total > 0 && <div className="collection-toolbar__count">{total} products</div>}
        </div>

      {/* Error */}
      {error && <div className="products-error">{error}</div>}

      {/* Loading Skeleton */}
      {loading && (
        <div className="products-loading">
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
          {/* Collection grid — Debut grid-view-item cards in a 4-up grid (homeu.ph) */}
          <div className="products-debut-grid">
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
    </main>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="products-shell">
        <div className="products-hero"><h1>Our Products</h1></div>
        <div className="products-loading">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-image" />
              <div className="skeleton-body">
                <div className="skeleton-line" /><div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      </main>
    }>
      <ProductsContent />
    </Suspense>
  )
}
