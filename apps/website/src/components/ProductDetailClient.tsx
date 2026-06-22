'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { renderLexical } from '@/lib/renderLexical'
import { formatPrice } from '@/lib/format-utils'
import { QuickRFQ } from '@/components/QuoteCart'
import BundleOffer from '@/components/BundleOffer'
import { getProductBadges, isOnSale } from '@/lib/product-badges'
import ReviewsSection from '@/components/ReviewsSection'

interface ProductImage {
  id?: string
  url: string
  alt?: string
  sort_order?: number
}

interface ProductVariant {
  id: number
  title: string
  sku?: string | null
  price: number
  salePrice?: number | null
  inventoryQuantity?: number
  isDefault?: boolean
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
  variants?: ProductVariant[]
}

export default function ProductDetailClient({ product, config = {} }: { product: Product; config?: any }) {
  const showBreadcrumbs = config.showBreadcrumbs !== false
  const showSku = config.showSku !== false
  const showMaterials = config.showMaterials !== false
  const showDimensions = config.showDimensions !== false
  const galleryWidth = config.galleryWidth || 50
  const layoutGap = config.layoutGap || 40
  const enableZoom = config.enableZoom !== false
  const buttonText = config.buttonText || 'Request Quote'
  const spacingTop = config.spacingTop !== undefined ? config.spacingTop : 60
  const spacingBottom = config.spacingBottom !== undefined ? config.spacingBottom : 60

  const [selectedImage, setSelectedImage] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const defaultVariant = product.variants && product.variants.length > 0
    ? product.variants.find(v => v.isDefault) || product.variants[0]
    : null
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(defaultVariant ? defaultVariant.id : null)

  const images: ProductImage[] = product.images?.length
    ? product.images
    : product.imageUrl ? [{ url: product.imageUrl }] : []
  const activeImg = images[selectedImage]

  const badges = getProductBadges(product)

  const hasVariants = Boolean(product.variants && product.variants.length > 1)
  const selectedVariant = hasVariants
    ? product.variants!.find(v => v.id === selectedVariantId) || product.variants![0]
    : null
  const displayPrice = selectedVariant ? (selectedVariant.salePrice || selectedVariant.price) : product.price
  const displayOriginalPrice = selectedVariant ? selectedVariant.price : product.originalPrice

  const descHtml = product.description
    ? renderLexical(
        typeof product.description === 'string'
          ? product.description
          : JSON.stringify(product.description)
      )
    : ''

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 769px) {
          .product-detail {
            grid-template-columns: ${galleryWidth}% 1fr !important;
            gap: ${layoutGap}px !important;
          }
        }
        .product-detail {
          padding-top: ${spacingTop}px !important;
          padding-bottom: ${spacingBottom}px !important;
        }
      ` }} />

      {/* Breadcrumb */}
      {showBreadcrumbs && (
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
      )}

      {/* Main layout */}
      <div className="page-width product-detail">
        {/* Gallery */}
        <div className="product-detail__gallery">
          <div
            className="product-detail__main-image"
            onClick={() => enableZoom && activeImg?.url && setZoomed(true)}
            role={enableZoom && activeImg?.url ? 'button' : undefined}
            aria-label={enableZoom && activeImg?.url ? 'Click to zoom' : undefined}
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
                {enableZoom && <span className="product-detail__zoom-hint" aria-hidden>⊕</span>}
              </>
            ) : (
              <div className="product-detail__no-image">No image available</div>
            )}
          </div>

          {zoomed && enableZoom && activeImg?.url && (
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

          {showSku && (selectedVariant?.sku || product.sku) && (
            <div className="product-detail__sku" style={{ fontSize: 13, color: '#888', marginTop: 4, marginBottom: 8 }}>
              SKU: {selectedVariant?.sku || product.sku}
            </div>
          )}

          {(badges.isNew || badges.isSale || badges.is3D) && (
            <div className="product-detail__badges">
              {badges.isNew && <span className="product-badge product-badge--new">New</span>}
              {badges.isSale && <span className="product-badge product-badge--sale">Sale</span>}
              {badges.is3D && <span className="product-badge product-badge--3d">3D</span>}
            </div>
          )}

          {/* Price */}
          {product.showPrice !== false && displayPrice != null && (
            <div className={`product-detail__price${isOnSale(displayPrice, displayOriginalPrice) ? ' is-sale' : ''}`}>
              <span className="product-detail__price-current">
                {formatPrice(displayPrice)}
              </span>
              {isOnSale(displayPrice, displayOriginalPrice) && (
                <span className="product-detail__price-compare">
                  {formatPrice(displayOriginalPrice)}
                </span>
              )}
            </div>
          )}

          {/* Model / variant selector */}
          {hasVariants && (
            <div className="product-detail__variants">
              <label className="product-detail__variants-label" htmlFor="variant-select">Model</label>
              <select
                id="variant-select"
                className="product-detail__variants-select"
                value={selectedVariantId ?? ''}
                onChange={e => setSelectedVariantId(Number(e.target.value))}
              >
                {product.variants!.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.title} — {formatPrice(v.salePrice || v.price)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {product.priceNote && (
            <p className="product-detail__price-note">{product.priceNote}</p>
          )}

          {/* QuickRFQ with per-item notes */}
          <div style={{ marginTop: 20 }}>
            <QuickRFQ
              buttonText={buttonText}
              product={{
                id: product.id,
                title: selectedVariant ? `${product.title} — ${selectedVariant.title}` : product.title,
                slug: product.slug,
                price: displayPrice,
                sku: selectedVariant?.sku || product.sku,
                imageUrl: product.imageUrl || product.images?.[0]?.url,
              }}
            />
          </div>

          <p className="product-detail__disclaimer">
            Prices shown are reference only and may vary. The HomeU team will confirm final pricing in your formal quotation.
          </p>

          {/* Meta */}
          {((product.materials && showMaterials) || (product.dimensions && showDimensions)) && (
            <div className="product-detail__meta">
              {product.materials && showMaterials && (
                <div className="product-detail__meta-row">
                  <span className="product-detail__meta-label">Materials</span>
                  <span>{product.materials}</span>
                </div>
              )}
              {product.dimensions && showDimensions && (
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
        <BundleOffer productSlug={product.slug} />
      </div>

      <div className="page-width">
        <ReviewsSection
          productId={product.id}
          productSlug={product.slug}
          productTitle={product.title}
          productImage={product.imageUrl}
        />
      </div>

      {/* Footer nav */}
      <div className="page-width product-detail__nav">
        <Link href="/products">← Back to Products</Link>
        <Link href="/quote-cart">View RFQ Cart →</Link>
      </div>
    </>
  )
}
