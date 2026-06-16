'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
  images?: { id: string; url: string; alt?: string; sort_order?: number }[]
  materials?: string
  tags?: string[]
  status?: string
}

interface RelatedProduct {
  id: string
  title: string
  slug: string
  price?: number
  imageUrl?: string
  category?: { id: string; title: string; slug: string }
}

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  useEffect(() => {
    async function loadProduct() {
      try {
        const slug = params?.slug
        if (!slug) throw new Error('Product not found')

        const res = await fetch(`/api/products/${slug}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('Product not found')
          throw new Error('Failed to load product')
        }

        const data: Product = await res.json()
        setProduct(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [params?.slug])

  // Load related products once product data is available
  useEffect(() => {
    const currentProduct = product
    if (!currentProduct) return

    async function loadRelated() {
      setRelatedLoading(true)
      try {
        const res = await fetch('/api/products/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: currentProduct!.title,
            limit: 4,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const recs = (data.recommendations || [])
            .filter((r: any) => r.productId !== currentProduct!.id)
            .slice(0, 4)
          // Fetch full product data for each recommendation
          if (recs.length > 0) {
            const fetched = await Promise.all(
              recs.map(async (r: any) => {
                try {
                  const pr = await fetch(`/api/products/${r.productId}`)
                  if (pr.ok) return pr.json()
                } catch { /* skip */ }
                return null
              })
            )
            setRelatedProducts(fetched.filter(Boolean))
          }
        }
      } catch {
        // Related products are optional
      } finally {
        setRelatedLoading(false)
      }
    }

    loadRelated()
  }, [product])

  function handleAddToCart() {
    if (!product) return

    try {
      const existing = JSON.parse(localStorage.getItem('quoteCart') || '[]')
      const existingIds = new Set(existing.map((i: any) => i.productId))
      if (!existingIds.has(product.id)) {
        existing.push({
          productId: product.id,
          title: product.title,
          slug: product.slug,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity,
        })
        localStorage.setItem('quoteCart', JSON.stringify(existing))
      }
      setAddedToCart(true)
      // Dispatch custom event for cart badge update
      window.dispatchEvent(new CustomEvent('quote-cart-update'))
    } catch {
      // localStorage not available
    }
  }

  if (loading) {
    return (
      <main className="product-detail-shell">
        <div className="detail-loading">
          <div className="detail-loading-image" />
          <div className="detail-loading-info">
            <div className="skeleton-line" />
            <div className="skeleton-line medium" />
            <div className="skeleton-line small" />
            <div className="skeleton-line small" />
            <div className="skeleton-line small" />
            <div style={{ height: 24 }} />
            <div className="skeleton-line" style={{ width: 200 }} />
          </div>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 20 }}>
          Loading product...
        </p>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="product-detail-shell">
        <div className="products-empty">
          <p>{error || 'Product not found'}</p>
          <p className="sub">
            The product you're looking for may have been removed or is not yet available.
          </p>
          <Link href="/products" style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--brand)',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 700,
          }}>
            &larr; Browse Products
          </Link>
        </div>
      </main>
    )
  }

  const images = product.images?.length
    ? product.images
    : (product.imageUrl ? [{ url: product.imageUrl }] : [])
  const currentImage = images[selectedImage]

  return (
    <main className="product-detail-shell">
      {/* Breadcrumb */}
      <div className="product-breadcrumb">
        <Link href="/">Home</Link>
        <span className="product-breadcrumb-sep">/</span>
        <Link href="/products">Products</Link>
        <span className="product-breadcrumb-sep">/</span>
        <span className="product-breadcrumb-current">{product.title}</span>
      </div>

      {/* Product Detail */}
      <div className="product-detail-layout">
        {/* Image Gallery */}
        <div>
          <div
            className="product-detail-image"
            style={currentImage?.url ? {
              background: `url(${currentImage.url}) center/cover`,
            } : undefined}
          >
            {!currentImage?.url && 'No image available'}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`product-thumbnail${idx === selectedImage ? ' active' : ''}`}
                  style={img.url ? {
                    background: `url(${img.url}) center/cover`,
                  } : undefined}
                  aria-label={`View image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.category && (
            <p className="product-detail-category">{product.category.title}</p>
          )}

          <h1 className="product-detail-title">{product.title}</h1>

          {product.price != null && (
            <p className="product-detail-price">
              ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              {product.originalPrice && product.originalPrice > product.price && (
                <span style={{
                  fontSize: 18,
                  color: 'var(--muted)',
                  fontWeight: 400,
                  textDecoration: 'line-through',
                  marginLeft: 12,
                }}>
                  ₱{product.originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              )}
            </p>
          )}

          {/* Description */}
          {product.description && (
            <div className="product-detail-description">
              {product.description.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {/* Materials */}
          {product.materials && (
            <div className="product-detail-materials">
              <strong>Materials:</strong>{' '}
              <span>{product.materials}</span>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="product-detail-tags">
              {product.tags.map((tag, i) => (
                <span key={i} className="product-tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Price disclaimer */}
          <p className="product-detail-disclaimer">
            * Prices shown are for reference only and may vary. Contact our sales team for a formal quotation.
          </p>

          {/* Actions */}
          <div className="product-detail-actions">
            {/* Quantity Selector */}
            <div className="product-qty-selector">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(99, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {addedToCart ? (
              <Link href="/quote-cart" className="product-detail-action-btn primary">
                View RFQ Cart &rarr;
              </Link>
            ) : (
              <button
                onClick={handleAddToCart}
                className="product-detail-action-btn primary"
              >
                Add to RFQ Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="related-section">
          <h2>You May Also Like</h2>
          <div className="products-grid">
            {relatedProducts.map(rp => (
              <Link
                key={rp.id}
                href={`/products/${rp.slug}`}
                className="product-card"
              >
                <div
                  className="product-card-image"
                  style={rp.imageUrl ? {
                    background: `url(${rp.imageUrl}) center/cover`,
                  } : undefined}
                >
                  {!rp.imageUrl && 'No image'}
                </div>
                <div className="product-card-body">
                  <h3>{rp.title}</h3>
                  {rp.category && (
                    <p className="product-card-category">{rp.category.title}</p>
                  )}
                  {rp.price != null && (
                    <p className="product-card-price">
                      ₱{rp.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="product-detail-footer">
        <Link href="/products">&larr; Back to Products</Link>
        <Link href="/quote-cart">View RFQ Cart &rarr;</Link>
      </div>
    </main>
  )
}
