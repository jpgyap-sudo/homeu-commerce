'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/format-utils'

interface Product {
  id: string
  title: string
  slug: string
  description?: string
  price?: number
  originalPrice?: number
  imageUrl?: string
  category?: { id: string; title: string; slug: string }
  materials?: string
}

interface Category {
  id: string
  title: string
  slug: string
  productCount?: number
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

  const activeCategoryTitle = categories.find(c => c.slug === selectedCategory)?.title

  return (
    <main className="products-shell">
      {/* Header */}
      <div className="products-hero">
        <h1>{activeCategoryTitle || 'Our Products'}</h1>
        <p>
          {activeCategoryTitle
            ? `Browsing ${activeCategoryTitle}.`
            : 'Browse our collection of furniture and home essentials.'}
          {total > 0 && (
            <span> Showing {products.length} of {total} products.</span>
          )}
        </p>
      </div>

      {/* Toolbar */}
      <div className="products-toolbar">
        <form onSubmit={handleSearch} className="products-search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <select
          value={selectedCategory}
          onChange={e => handleCategoryChange(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.slug}>{cat.title}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={e => handleSortChange(e.target.value)}
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
          <div className="products-grid">
            {products.map(product => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="product-card"
              >
                <div
                  className="product-card-image"
                  style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined}
                >
                  {!product.imageUrl && <span className="product-card-noimg">No image</span>}
                </div>

                <div className="product-card-body">
                  <h3>{product.title}</h3>
                  {product.price != null && (() => {
                    const onSale = product.originalPrice != null && product.originalPrice > product.price
                    return (
                      <p className="product-card-price">
                        <span className={onSale ? 'product-card-price-sale' : undefined}>
                          {formatPrice(product.price)}
                        </span>
                        {onSale && (
                          <span className="product-card-price-original">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </p>
                    )
                  })()}
                </div>
              </Link>
            ))}
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
