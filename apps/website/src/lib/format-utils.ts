/**
 * format-utils.ts
 * ================
 * Shared formatting utilities for prices, dates, and quantities.
 * All price formatting in one place for consistency.
 * Uses minimalist formatting: commas, no decimals for whole numbers,
 * 2 decimals for precise amounts.
 */

/**
 * Format a price with peso sign, commas, and appropriate decimal places.
 * - Whole numbers → no decimals (₱1,500)
 * - With cents → 2 decimals (₱1,500.75)
 * - null/undefined → empty string
 */
export function formatPrice(price: number | null | undefined, decimals?: 'auto' | 'always' | 'never'): string {
  if (price == null) return ''
  
  const opts: Intl.NumberFormatOptions = {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }

  if (decimals === 'always') {
    opts.minimumFractionDigits = 2
    opts.maximumFractionDigits = 2
  } else if (decimals === 'never') {
    opts.minimumFractionDigits = 0
    opts.maximumFractionDigits = 0
  } else {
    // auto: show decimals only when there are cents
    const hasCents = price % 1 !== 0
    opts.minimumFractionDigits = hasCents ? 2 : 0
    opts.maximumFractionDigits = hasCents ? 2 : 0
  }

  return `₱${price.toLocaleString('en-PH', opts)}`
}

/**
 * Format a price range (e.g., "₱1,500 – ₱3,000")
 */
export function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return ''
  if (min == null) return formatPrice(max)
  if (max == null) return formatPrice(min)
  if (min === max) return formatPrice(min)
  return `${formatPrice(min)} – ${formatPrice(max)}`
}

/**
 * Format quantity with proper pluralization
 */
export function formatQuantity(count: number, singular: string = 'item', plural?: string): string {
  if (count === 0) return `0 ${plural || singular + 's'}`
  if (count === 1) return `1 ${singular}`
  return `${count.toLocaleString()} ${plural || singular + 's'}`
}

/**
 * Format a number with commas
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-PH')
}

/**
 * Shorten a number for display (1.2K, 3.5M)
 */
export function formatShortNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-PH')
}
