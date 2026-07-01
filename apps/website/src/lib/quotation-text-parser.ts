/**
 * quotation-text-parser.ts
 * =========================
 * Smart text parser that converts free-text revision requests into
 * structured DetectedChange[] objects the system can act on.
 *
 * Example:
 *   "remove augustin pouf and make sofa 2 pcs"
 *   → [{ type: 'remove', keyword: 'augustin pouf', confidence: 0.95 },
 *      { type: 'change_qty', keyword: 'sofa', value: 2, confidence: 0.85 }]
 *
 * Used by:
 *   - Customer quotation page (auto-parse when free-text is typed)
 *   - Admin revision workspace (pre-fill suggested changes)
 */

export type DetectedActionType =
  | 'remove'
  | 'change_qty'
  | 'change_finish'
  | 'swap'
  | 'lower_price'
  | 'lead_time'
  | 'unknown'

export interface DetectedChange {
  type: DetectedActionType
  rawMatch: string
  keyword?: string      // Matched product name fragment
  value?: number | string
  confidence: number     // 0-1
}

// ── Regex Patterns (ordered by priority) ─────────────────────────────

const PATTERNS: Array<{
  type: DetectedActionType
  regex: RegExp
  extractValue?: (match: RegExpMatchArray) => number | string | undefined
  extractKeyword?: (match: RegExpMatchArray) => string | undefined
  baseConfidence: number
}> = [
  // REMOVE: "remove X", "delete X", "take out X", "drop X"
  {
    type: 'remove',
    regex: /(?:remove|delete|take\s+out|drop)\s+(.+?)(?:\.|,|$|\sand\s)/i,
    extractKeyword: m => m[1].trim(),
    baseConfidence: 0.90,
  },
  // REMOVE (passive): "X removed", "X deleted"
  {
    type: 'remove',
    regex: /(.+?)\s+(?:removed|deleted)(?:\.|,|$)/i,
    extractKeyword: m => m[1].trim(),
    baseConfidence: 0.75,
  },
  // CHANGE QTY: "make X N pcs", "set X to N", "change X qty to N"
  {
    type: 'change_qty',
    regex: /(?:make|set|change|update)\s+(.+?)\s+(?:to|from\s+\d+\s+to)\s+(\d+)\s*(?:pcs?|pieces?|qty|units?)?/i,
    extractKeyword: m => m[1].trim(),
    extractValue: m => parseInt(m[2], 10),
    baseConfidence: 0.85,
  },
  // CHANGE QTY (short): "X from N to N", "X N pcs"
  {
    type: 'change_qty',
    regex: /(.+?)\s+from\s+\d+\s+to\s+(\d+)/i,
    extractKeyword: m => m[1].trim(),
    extractValue: m => parseInt(m[2], 10),
    baseConfidence: 0.80,
  },
  // CHANGE FINISH/COLOR: "change X to Y color/finish", "switch X to Y"
  {
    type: 'change_finish',
    regex: /(?:change|switch)\s+(.+?)\s+(?:to\s+|color|finish|fabric)\s*(.+?)(?:\.|,|$)/i,
    extractKeyword: m => m[1].trim(),
    extractValue: m => m[2].trim(),
    baseConfidence: 0.80,
  },
  // CHANGE COLOR (short): "X in beige", "X beige color"
  {
    type: 'change_finish',
    regex: /(.+?)\s+(?:in|as)\s+(.+?)(?:color|finish|fabric)?(?:\.|,|$)/i,
    extractKeyword: m => m[1].trim(),
    extractValue: m => m[2].trim(),
    baseConfidence: 0.65,
  },
  // SWAP: "swap X with Y", "replace X with Y"
  {
    type: 'swap',
    regex: /(?:swap|replace|substitute)\s+(.+?)\s+(?:with|for)\s+(.+?)(?:\.|,|$)/i,
    extractKeyword: m => m[1].trim(),
    extractValue: m => m[2].trim(),
    baseConfidence: 0.85,
  },
  // LOWER PRICE: "lower X price", "cheaper X", "discount on X"
  {
    type: 'lower_price',
    regex: /(?:lower|reduce|cheaper|discount)\s+(?:price\s+)?(?:(?:on|for)\s+)?(.+?)(?:\.|,|$|to\s|by\s)/i,
    extractKeyword: m => m[1].trim(),
    baseConfidence: 0.75,
  },
  // LOWER PRICE (amount): "X to Y pesos", "X price Y"
  {
    type: 'lower_price',
    regex: /(?:lower|reduce|make)\s+(.+?)\s+(?:to|₱|php)\s*(\d+[kK]?)/i,
    extractKeyword: m => m[1].trim(),
    extractValue: m => m[2].trim(),
    baseConfidence: 0.80,
  },
  // LEAD TIME: "lead time for X", "delivery date X", "how long X"
  {
    type: 'lead_time',
    regex: /(?:lead\s*time|delivery|how\s+long|when)\s+(?:for|of|)\s*(.+?)(?:\.|,|$|\?)/i,
    extractKeyword: m => m[1].trim(),
    baseConfidence: 0.70,
  },
  // LEAD TIME (generic): just "lead time", "delivery date"
  {
    type: 'lead_time',
    regex: /(?:lead\s*time|delivery\s+date|when\s+will|how\s+long)/i,
    baseConfidence: 0.50,
  },
]

/**
 * Parse free-text revision request into structured detected changes.
 * Returns detected changes sorted by confidence (highest first).
 * If nothing is detected, returns an 'unknown' type entry.
 */
export function parseRevisionText(text: string): DetectedChange[] {
  const results: DetectedChange[] = []
  const matchedRanges: Array<{ start: number; end: number }> = []

  for (const pattern of PATTERNS) {
    // Use a single match per pattern since these are not global regexes
    const match = text.match(pattern.regex)
    if (match) {
      // Avoid overlapping matches
      const start = match.index ?? 0
      const range = { start, end: start + match[0].length }
      if (matchedRanges.some(r => rangesOverlap(r, range))) continue
      matchedRanges.push(range)

      const change: DetectedChange = {
        type: pattern.type,
        rawMatch: match[0].trim(),
        keyword: pattern.extractKeyword ? pattern.extractKeyword(match) : undefined,
        value: pattern.extractValue ? pattern.extractValue(match) : undefined,
        confidence: pattern.baseConfidence,
      }

      // Boost confidence if keyword matches known product-ish pattern (starts with uppercase or multi-word)
      if (change.keyword && /^[A-Z]/.test(change.keyword)) {
        change.confidence = Math.min(1, change.confidence + 0.1)
      }

      results.push(change)
    }
  }

  // If nothing detected, return a single unknown entry
  if (results.length === 0 && text.trim()) {
    results.push({
      type: 'unknown',
      rawMatch: text.trim(),
      confidence: 0.3,
    })
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence)
  return results
}

/**
 * Match detected changes against actual quotation items.
 * Returns array of matches with item indices and confidence.
 */
export function matchChangesToItems(
  changes: DetectedChange[],
  items: Array<{ title: string; sku?: string }>
): Array<{ change: DetectedChange; itemIndex: number; matchConfidence: number }> {
  const matches: Array<{ change: DetectedChange; itemIndex: number; matchConfidence: number }> = []

  for (const change of changes) {
    if (!change.keyword) continue

    const keyword = change.keyword.toLowerCase()
    let bestIndex = -1
    let bestScore = 0

    for (let i = 0; i < items.length; i++) {
      const title = (items[i].title || '').toLowerCase()
      const sku = (items[i].sku || '').toLowerCase()

      // Exact match on title
      if (title === keyword) {
        bestIndex = i
        bestScore = 1.0
        break
      }
      // Title contains keyword (or vice versa)
      if (title.includes(keyword) || keyword.includes(title)) {
        const score = Math.min(title.length, keyword.length) / Math.max(title.length, keyword.length)
        if (score > bestScore) {
          bestIndex = i
          bestScore = score
        }
      }
      // SKU match
      if (sku && (sku === keyword || keyword.includes(sku))) {
        bestIndex = i
        bestScore = 0.9
        break
      }
    }

    if (bestIndex >= 0) {
      matches.push({ change, itemIndex: bestIndex, matchConfidence: bestScore })
    }
  }

  return matches
}

function rangesOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end
}
