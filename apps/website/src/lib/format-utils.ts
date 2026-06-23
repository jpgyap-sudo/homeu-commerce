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

/**
 * Clean HTML markup to plain text, replacing block tags with newlines
 * to preserve list structure and line breaks.
 */
export function cleanHtmlToText(html: any): string {
  if (!html) return ''
  const htmlStr = typeof html === 'string' ? html : JSON.stringify(html)
  return htmlStr
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&middot;/gi, '·')
    .replace(/&times;/gi, 'x')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/**
 * Clean up extra keywords and metadata suffixes from parsed values
 */
export function cleanMetadataField(val: string | null | undefined): string {
  if (!val) return ''
  let s = val.trim()
  s = s.replace(/(?:MADE TO ORDER|CHECK OUT SWATCHES|COLLECTION ITEMS|CONTACT US FOR|DELIVERY IN|Note:).*$/i, '')
  s = s.replace(/(?:Dimensions|Dimension|Size)\s*:.*$/i, '')
  s = s.trim()
  s = s.replace(/[,;.\-\s·\/]+$/, '')
  s = s.trim()
  if (s.length > 255) {
    s = s.substring(0, 252) + '...'
  }
  return s
}

/**
 * Fallback parser to extract dimensions from a product description HTML
 */
export function extractDimensionsFromDescription(html: string | null | undefined): string {
  const text = cleanHtmlToText(html)
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 1. Colon pattern
    const colonMatch = line.match(/^(?:dimensions|dimension|size)\s*:\s*(.+)$/i)
    if (colonMatch) {
      return cleanMetadataField(colonMatch[1])
    }
    
    // 2. Line label-only pattern
    if (/^(?:dimensions|dimension|size)$/i.test(line)) {
      const dimLines = []
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim()
        // Break conditions
        if (/^(?:materials|material|bulb|light|ip|max|note|made to order|delivery)\b/i.test(nextLine)) {
          break
        }
        if (/^[a-z0-9\s]+:/i.test(nextLine) && !nextLine.match(/^(?:small|large|medium|W\d+|L\d+|H\d+|D\d+|dia|ø|diameter|width|height|depth)/i)) {
          break
        }
        dimLines.push(nextLine)
      }
      if (dimLines.length > 0) {
        return cleanMetadataField(dimLines.join(', '))
      }
    }
  }
  return ''
}

export function extractMaterialsFromDescription(html: string | null | undefined): string {
  const text = cleanHtmlToText(html)
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 1. Colon pattern
    const colonMatch = line.match(/^(?:materials|material)\s*:\s*(.+)$/i)
    if (colonMatch) {
      return cleanMetadataField(colonMatch[1])
    }
    
    // 2. Line label-only pattern
    if (/^(?:materials|material)$/i.test(line)) {
      const matLines = []
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim()
        if (/^(?:dimensions|dimension|size|bulb|light|ip|max|note|made to order|delivery)\b/i.test(nextLine)) {
          break
        }
        if (/^[a-z0-9\s]+:/i.test(nextLine)) {
          break
        }
        matLines.push(nextLine)
      }
      if (matLines.length > 0) {
        return cleanMetadataField(matLines.join(', '))
      }
    }
  }
  return ''
}
