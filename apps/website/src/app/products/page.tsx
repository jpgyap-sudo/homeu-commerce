'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

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
  tags?: string[]
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('title ASC')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Use refs so loadProducts always reads the latest values without stale closures
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
      // Categories are optional
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    // loadProducts reads from refs so it always gets the latest searchTerm
    loadProducts()
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value)
    setPage(0)
  }

  function handleSortChange(value: string) {
    setSortBy(value)
    setPage(0)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    // Scroll to top of grid on page change
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Re-fetch whenever a filter/page changes (after state settles)
  // Using a fetchKey counter to avoid stale closure issues
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (fetchKey > 0) loadProducts()
  }, [fetchKey])

  useEffect(() => {
    setFetchKey(k => k + 1)
  }, [page, selectedCategory, sortBy])

  // Also fetch on mount
  useEffect(() => {
    loadProducts()
  }, [])

  return (
    <main className="products-shell">
      {/* Header */}
      <div className="products-hero">
        <h1>Our Products</h1>
        <p>
          Browse our collection of furniture and home essentials.
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
            <option key={cat.id} value={cat.title}>{cat.title}</option>
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
                setSelectedCategory('')
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
                {/* Image */}
                <div
                  className="product-card-image"
                  style={product.imageUrl ? {
                    background: `url(${product.imageUrl}) center/cover`,
                  } : undefined}
                >
                  {!product.imageUrl && 'No image'}
                </div>

                {/* Info */}
                <div className="product-card-body">
                  <h3>{product.title}</h3>
                  {product.category && (
                    <p className="product-card-category">{product.category.title}</p>
                  )}
                  {product.price != null && (
                    <p className="product-card-price">
                      ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="product-card-price-original">
                          ₱{product.originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </p>
                  )}
                  {product.materials && (
                    <p className="product-card-materials">{product.materials}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="products-pagination">
              <button
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
              >
                &larr; Previous
              </button>
              <span>
                Page {page + 1} of {totalPages}
                &nbsp;({total} products)
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Chat prompt */}
      <div className="products-chat-prompt">
        <p>
          Can't find what you're looking for? Our design consultants can help.
        </p>
        <Link href="/quote-cart">
          Request a Quotation
        </Link>
      </div>
    </main>
  )
}
