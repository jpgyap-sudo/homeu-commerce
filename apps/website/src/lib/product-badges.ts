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

export function getProductBadges({ tags, price, originalPrice }: BadgeInput): ProductBadges {
  const tagSet = new Set((tags || []).map(t => String(t).toLowerCase()))
  return {
    isNew: tagSet.has('new'),
    is3D: tagSet.has('3dmodel') || tagSet.has('3d') || tagSet.has('3d-view'),
    isSale: originalPrice != null && price != null && originalPrice > price,
  }
}
