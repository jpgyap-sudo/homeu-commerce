'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/format-utils'
import { addToQuoteCart, getQuoteCart } from '@/components/QuoteCart'

interface BundleVariant {
  id: number
  title: string
  price: number
  salePrice?: number | null
}

interface BundleData {
  id: number
  discountType: 'percent' | 'fixed'
  discountValue: number
  mainProduct: {
    id: number | string
    title: string
    slug: string
    imageUrl: string | null
    price: number
    discountedPrice: number
  }
  bundledProduct: {
    id: number
    title: string
    slug: string
    imageUrl: string | null
    quantity: number
    unitPrice: number
    price: number
    discountedPrice: number
    variants: BundleVariant[]
    selectedVariantId: number | null
  }
  subtotal: number
  discountedTotal: number
}

interface BundleOfferProps {
  productSlug: string
}

export default function BundleOffer({ productSlug }: BundleOfferProps) {
  const [bundle, setBundle] = useState<BundleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/products/${productSlug}/bundle`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.bundle) {
          setBundle(data.bundle)
          setVariantId(data.bundle.bundledProduct.selectedVariantId)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productSlug])

  useEffect(() => {
    if (!bundle) return
    const inCart = getQuoteCart().some(
      item => item.productId === String(bundle.bundledProduct.id)
    )
    setAdded(inCart)
  }, [bundle])

  if (loading || !bundle) return null

  const selectedVariant = bundle.bundledProduct.variants.find(v => v.id === variantId) || null
  const bundledUnitPrice = selectedVariant
    ? (selectedVariant.salePrice || selectedVariant.price)
    : bundle.bundledProduct.unitPrice
  const bundledLinePrice = bundledUnitPrice * bundle.bundledProduct.quantity
  const discountedBundledLine = bundle.discountType === 'percent'
    ? bundledLinePrice * (1 - bundle.discountValue / 100)
    : bundledLinePrice

  const mainLinePrice = bundle.mainProduct.price
  const discountedMainLine = bundle.discountType === 'percent'
    ? mainLinePrice * (1 - bundle.discountValue / 100)
    : mainLinePrice

  const subtotal = mainLinePrice + bundledLinePrice
  const discountedTotal = bundle.discountType === 'percent'
    ? discountedMainLine + discountedBundledLine
    : Math.max(0, subtotal - bundle.discountValue)

  const hasDiscount = discountedTotal < subtotal - 0.01

  function handleAddToCart() {
    addToQuoteCart({
      productId: String(bundle!.mainProduct.id),
      title: bundle!.mainProduct.title,
      slug: bundle!.mainProduct.slug,
      price: discountedMainLine,
      imageUrl: bundle!.mainProduct.imageUrl || undefined,
      quantity: 1,
      notes: 'Bundle offer',
    })
    addToQuoteCart({
      productId: String(bundle!.bundledProduct.id),
      title: selectedVariant ? `${bundle!.bundledProduct.title} — ${selectedVariant.title}` : bundle!.bundledProduct.title,
      slug: bundle!.bundledProduct.slug,
      price: discountedBundledLine / bundle!.bundledProduct.quantity,
      imageUrl: bundle!.bundledProduct.imageUrl || undefined,
      quantity: bundle!.bundledProduct.quantity,
      notes: 'Bundle offer',
    })
    setAdded(true)
  }

  return (
    <section className="bundle-offer">
      <div className="bundle-offer__header">
        <h2>Get a Discount!</h2>
        <p>Buy these products together and get a discount!</p>
      </div>

      <div className="bundle-offer__items">
        <div className="bundle-offer__item">
          <div className="bundle-offer__image">
            {bundle.mainProduct.imageUrl ? (
              <img src={bundle.mainProduct.imageUrl} alt={bundle.mainProduct.title} loading="lazy" />
            ) : (
              <div className="bundle-offer__image-placeholder">No image</div>
            )}
          </div>
          <div className="bundle-offer__item-title">{bundle.mainProduct.title}</div>
          <div className="bundle-offer__item-price">
            {hasDiscount && <span className="bundle-offer__price-compare">{formatPrice(mainLinePrice, 'always')}</span>}
            <span className="bundle-offer__price-current">{formatPrice(discountedMainLine, 'always')}</span>
          </div>
        </div>

        <div className="bundle-offer__plus" aria-hidden>+</div>

        <div className="bundle-offer__item">
          <div className="bundle-offer__image">
            {bundle.bundledProduct.imageUrl ? (
              <img src={bundle.bundledProduct.imageUrl} alt={bundle.bundledProduct.title} loading="lazy" />
            ) : (
              <div className="bundle-offer__image-placeholder">No image</div>
            )}
          </div>
          <div className="bundle-offer__item-title">
            {bundle.bundledProduct.quantity > 1 && (
              <span className="bundle-offer__qty">{bundle.bundledProduct.quantity}x</span>
            )}
            {' '}{bundle.bundledProduct.title}
          </div>
          <div className="bundle-offer__item-price">
            {hasDiscount && <span className="bundle-offer__price-compare">{formatPrice(bundledLinePrice, 'always')}</span>}
            <span className="bundle-offer__price-current">{formatPrice(discountedBundledLine, 'always')}</span>
          </div>
          {bundle.bundledProduct.variants.length > 1 && (
            <select
              className="bundle-offer__variant-select"
              value={variantId ?? ''}
              onChange={e => setVariantId(Number(e.target.value))}
            >
              {bundle.bundledProduct.variants.map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="bundle-offer__total">
        Total:{' '}
        {hasDiscount && <span className="bundle-offer__price-compare">{formatPrice(subtotal, 'always')}</span>}
        <span className="bundle-offer__price-current">{formatPrice(discountedTotal, 'always')}</span>
      </div>

      {added ? (
        <a href="/quote-cart" className="bundle-offer__add-btn bundle-offer__add-btn--added">
          ✓ Added — View RFQ Cart
        </a>
      ) : (
        <button type="button" className="bundle-offer__add-btn" onClick={handleAddToCart}>
          Add to cart
        </button>
      )}

      <p className="bundle-offer__disclaimer">
        Discount will be confirmed in your quotation.
      </p>
    </section>
  )
}
