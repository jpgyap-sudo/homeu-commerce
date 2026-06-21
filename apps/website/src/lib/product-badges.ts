/**
 * Derives product badges (NEW / SALE / 3D) from existing admin-editable
 * fields — no separate badge data to maintain. NEW/3D come from the
 * Shopify-imported `tags` (editable on the product edit page); SALE is
 * computed from price vs sale_price.
 */
export interface BadgeInput {
  tags?: string[] | null
  price?: number | null
  originalPrice?: number | null
}

export interface ProductBadges {
  isNew: boolean
  isSale: boolean
  is3D: boolean
}

// Single switch for the whole site's "Sale" presentation (badge + struck-
// through original price on grid cards, PDP, and related products). Most of
// the 124 products with sale_price < price are ~1% currency-rounding noise
// from the original Shopify import, not real discounts — flip this back to
// true once sale pricing is deliberately curated again.
const SALE_BADGES_ENABLED = false

/** Single source of truth for "is this product discounted" — used by the
 *  SALE badge and every struck-through-price display. */
export function isOnSale(price?: number | null, originalPrice?: number | null): boolean {
  if (!SALE_BADGES_ENABLED) return false
  return originalPrice != null && price != null && originalPrice > price
}

export function getProductBadges({ tags, price, originalPrice }: BadgeInput): ProductBadges {
  const tagSet = new Set((tags || []).map(t => String(t).toLowerCase()))
  return {
    isNew: tagSet.has('new'),
    is3D: tagSet.has('3dmodel') || tagSet.has('3d') || tagSet.has('3d-view'),
    isSale: isOnSale(price, originalPrice),
  }
}
