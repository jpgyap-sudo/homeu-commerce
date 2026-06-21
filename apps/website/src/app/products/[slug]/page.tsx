'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { renderLexical } from '@/lib/renderLexical'
import { formatPrice } from '@/lib/format-utils'
import { QuickRFQ } from '@/components/QuoteCart'
import { getProductBadges, isOnSale } from '@/lib/product-badges'
import ReviewsSection from '@/components/ReviewsSection'

interface ProductImage {
  id?: string
  url: string
  alt?: string
  sort_order?: number
}

interface Product {
  id: string
  title: string
  slug: string
  sku?: string
  description?: any
  price?: number
  originalPrice?: number
  salePrice?: number
  showPrice?: boolean
  priceNote?: string
  imageUrl?: string
  category?: { id: string; title: string; slug: string }
  images?: ProductImage[]
  materials?: string
  dimensions?: string
  seoTitle?: string
  seoDescription?: string
  tags?: string[]
}

interface RelatedProduct {
  id: string
  title: string
  slug: string
  price?: number
  originalPrice?: number
  imageUrl?: string
  category?: { title: string; slug: string }
  tags?: string[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [related, setRelated] = useState<RelatedProduct[]>([])
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError('')
    setSelectedImage(0)
    setZoomed(false)

    fetch(`/api/products/${slug}`)
      .then(res => {
        if (res.status === 404) throw new Error('Product not found')
        if (!res.ok) throw new Error('Failed to load product')
        return res.json()
      })
      .then((data: Product) => {
        setProduct(data)
        // Load related products from same category
        if (data.category?.slug) {
          fetch(`/api/products?category=${data.category.slug}&limit=5`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (d?.docs) {
                setRelated(d.docs.filter((p: any) => p.slug !== slug).slice(0, 4))
              }
            })
            .catch(() => {})
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-width" style={{ padding: '40px 24px' }}>
        <div className="product-detail-loading">
          <div className="product-detail-loading__gallery" />
          <div className="product-detail-loading__info">
            {[180, 120, 80, 80, 200].map((w, i) => (
              <div key={i} className="skeleton-line" style={{ width: w, marginBottom: 16 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="page-width" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--debut-font-heading)', fontSize: 32, marginBottom: 16 }}>
          {error || 'Product not found'}
        </h1>
        <Link href="/products" className="btn btn--primary">Browse Products</Link>
      </div>
    )
  }

  const images: ProductImage[] = product.images?.length
    ? product.images
    : product.imageUrl ? [{ url: product.imageUrl }] : []
  const activeImg = images[selectedImage]

  const badges = getProductBadges(product)

  const descHtml = product.description
    ? renderLexical(
        typeof product.description === 'string'
          ? product.description
          : JSON.stringify(product.description)
      )
    : ''

  // ── Detail layout ──────────────────────────────────────────────────
  return (
    <>
      {/* Breadcrumb */}
      <nav className="breadcrumb page-width" aria-label="Breadcrumb">
        <ol className="breadcrumb__list">
          <li><Link href="/">Home</Link></li>
          <li aria-hidden>/</li>
          {product.category && (
            <>
              <li>
                <Link href={`/products?category=${product.category.slug}`}>
                  {product.category.title}
                </Link>
              </li>
              <li aria-hidden>/</li>
            </>
          )}
          <li aria-current="page">{product.title}</li>
        </ol>
      </nav>

      {/* Main layout */}
      <div className="page-width product-detail">
        {/* Gallery */}
        <div className="product-detail__gallery">
          <div
            className="product-detail__main-image"
            onClick={() => activeImg?.url && setZoomed(true)}
            role={activeImg?.url ? 'button' : undefined}
            aria-label={activeImg?.url ? 'Click to zoom' : undefined}
          >
            {activeImg?.url ? (
              <>
                <Image
                  src={activeImg.url}
                  alt={activeImg.alt || product.title}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                  priority
                />
                <span className="product-detail__zoom-hint" aria-hidden>⊕</span>
              </>
            ) : (
              <div className="product-detail__no-image">No image available</div>
            )}
          </div>

          {zoomed && activeImg?.url && (
            <div className="product-detail__lightbox" onClick={() => setZoomed(false)}>
              <button
                className="product-detail__lightbox-close"
                onClick={() => setZoomed(false)}
                aria-label="Close zoom"
              >
                &times;
              </button>
              <div className="product-detail__lightbox-image">
                <Image
                  src={activeImg.url}
                  alt={activeImg.alt || product.title}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="90vw"
                  unoptimized
                />
              </div>
            </div>
          )}

          {images.length > 1 && (
            <div className="product-detail__thumbnails">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`product-detail__thumb${idx === selectedImage ? ' active' : ''}`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.title} ${idx + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="80px"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="product-detail__info">
          {product.category && (
            <p className="product-detail__vendor">
              <Link href={`/products?category=${product.category.slug}`}>
                {product.category.title}
              </Link>
            </p>
          )}

          <h1 className="product-detail__title">{product.title}</h1>

          {(badges.isNew || badges.isSale || badges.is3D) && (
            <div className="product-detail__badges">
              {badges.isNew && <span className="product-badge product-badge--new">New</span>}
              {badges.isSale && <span className="product-badge product-badge--sale">Sale</span>}
              {badges.is3D && <span className="product-badge product-badge--3d">3D</span>}
            </div>
          )}

          {/* Price */}
          {product.showPrice !== false && product.price != null && (
            <div className={`product-detail__price${isOnSale(product.price, product.originalPrice) ? ' is-sale' : ''}`}>
              <span className="product-detail__price-current">
                {formatPrice(product.price)}
              </span>
              {isOnSale(product.price, product.originalPrice) && (
                <span className="product-detail__price-compare">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          )}
          {product.priceNote && (
            <p className="product-detail__price-note">{product.priceNote}</p>
          )}

          {/* THE GENIUS: QuickRFQ with per-item notes */}
          <div style={{ marginTop: 20 }}>
            <QuickRFQ
              product={{
                id: product.id,
                title: product.title,
                slug: product.slug,
                price: product.price,
                sku: product.sku,
                imageUrl: product.imageUrl || product.images?.[0]?.url,
              }}
            />
          </div>

          <p className="product-detail__disclaimer">
            Prices shown are reference only and may vary. The HomeU team will confirm final pricing in your formal quotation.
          </p>

          {/* Meta */}
          {(product.materials || product.dimensions) && (
            <div className="product-detail__meta">
              {product.materials && (
                <div className="product-detail__meta-row">
                  <span className="product-detail__meta-label">Materials</span>
                  <span>{product.materials}</span>
                </div>
              )}
              {product.dimensions && (
                <div className="product-detail__meta-row">
                  <span className="product-detail__meta-label">Dimensions</span>
                  <span>{product.dimensions}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {descHtml && (
            <div
              className="product-detail__description rte"
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          )}
        </div>
      </div>

      <div className="page-width">
        <ReviewsSection
          productId={product.id}
          productSlug={product.slug}
          productTitle={product.title}
          productImage={product.imageUrl}
        />
      </div>

      {/* Related Products — same Debut cards as the collection grid */}
      {related.length > 0 && (
        <section className="collection-inner" style={{ paddingTop: 8 }}>
          <div className="collection-related-header">
            <h2>You may also like</h2>
          </div>
          <div className="products-debut-grid">
            {related.map(rp => {
              const rpBadges = getProductBadges(rp)
              return (
              <div key={rp.id} className="grid-view-item product-card">
                <Link href={`/products/${rp.slug}`} className="grid-view-item__link grid-view-item__image-container">
                  {(rpBadges.isNew || rpBadges.isSale || rpBadges.is3D) && (
                    <div className="grid-view-item__badges">
                      {rpBadges.isNew && <span className="product-badge product-badge--new">New</span>}
                      {rpBadges.isSale && <span className="product-badge product-badge--sale">Sale</span>}
                      {rpBadges.is3D && <span className="product-badge product-badge--3d">3D</span>}
                    </div>
                  )}
                  {rp.imageUrl ? (
                    <img className="grid-view-item__image" src={rp.imageUrl} alt={rp.title} loading="lazy" />
                  ) : (
                    <div className="grid-view-item__image grid-view-item__image--placeholder">No image</div>
                  )}
                </Link>
                <div className="grid-view-item__meta">
                  <Link href={`/products/${rp.slug}`} className="grid-view-item__link">
                    <div className="grid-view-item__title product-card__title">{rp.title}</div>
                  </Link>
                  {rp.price != null && (
                    <div className="price">
                      <dl>
                        <div className="price__regular">
                          <dd><span className="price-item price-item--regular">{formatPrice(rp.price)}</span></dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Footer nav */}
      <div className="page-width product-detail__nav">
        <Link href="/products">← Back to Products</Link>
        <Link href="/quote-cart">View RFQ Cart →</Link>
      </div>
    </>
  )
}
