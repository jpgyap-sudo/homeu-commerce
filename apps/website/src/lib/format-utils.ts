/**
 * format-utils.ts
 * ================
 * Shared formatting utilities for prices, dates, and quantities.
 * All price formatting in one place for consistency.
 * Uses minimalist formatting: commas, no decimals for whole numbers,
 * 2 decimals for precise amounts.
 */

/** Insert thousands separators — locale-independent (works under the container's
 *  small-ICU node:alpine, where toLocaleString('en-PH') drops grouping). */
function groupThousands(intStr: string): string {
  const neg = intStr.startsWith('-')
  const digits = neg ? intStr.slice(1) : intStr
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format a price with peso sign and thousands commas.
 * Whole pesos, NO decimals by default (₱54,478) — matches homeu.ph.
 * Pass 'always' to force 2 decimals (₱54,478.00) if ever needed.
 * - null/undefined → empty string
 */
export function formatPrice(price: number | null | undefined, decimals?: 'auto' | 'always' | 'never'): string {
  if (price == null) return ''

  if (decimals === 'always') {
    const [intPart, decPart] = Math.abs(price).toFixed(2).split('.')
    return `₱${price < 0 ? '-' : ''}${groupThousands(intPart)}.${decPart}`
  }

  // Default: whole pesos, no decimals (rounded).
  return `₱${groupThousands(String(Math.round(price)))}`
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
