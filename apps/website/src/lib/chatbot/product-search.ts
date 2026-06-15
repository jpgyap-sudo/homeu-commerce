/**
 * Product Search Engine (MVP)
 *
 * Searches the DaVinciOS product catalog by text, tags, category,
 * materials, colors, and style. MVP uses keyword matching.
 * Phase 2 will add pgvector embeddings for semantic + visual search.
 *
 * Usage:
 *   const results = await searchProducts({ query: 'modern dining chair', limit: 6 })
 *   const results = await searchByAttributes({ category: 'Dining Chair', style: ['modern'], color: ['beige'] })
 */

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export interface ProductResult {
  id: string
  title: string
  slug: string
  url: string
  category?: { id: string; title: string }
  description?: string
  price?: number
  salePrice?: number
  imageUrl?: string
  materials?: string
  tags?: string[]
  matchType: MatchType
  matchReason: string
  confidence: number
}

export type MatchType = 'closest_match' | 'style_alternative' | 'budget_alternative' | 'premium_alternative' | 'category_match'

export interface SearchOptions {
  query?: string
  category?: string
  style?: string[]
  material?: string[]
  color?: string[]
  roomType?: string
  maxPrice?: number
  minPrice?: number
  limit?: number
  excludeIds?: string[]
}

// ── Search from DaVinciOS API ─────────────────────────────────

async function fetchProducts(searchParams?: string): Promise<any[]> {
  try {
    const url = `${API_BASE}/api/products${searchParams || ''}?limit=50&depth=1`
    const res = await fetch(url, { next: { revalidate: 30 } })
    if (!res.ok) return []
    const data = await res.json()
    return data?.docs || data || []
  } catch {
    return []
  }
}

// ── Text Search ───────────────────────────────────────────────

export async function searchProducts(options: SearchOptions): Promise<ProductResult[]> {
  const { query, limit = 6, excludeIds = [] } = options
  const products = await fetchProducts()

  if (!products || products.length === 0) return []

  const results: ProductResult[] = []
  const lowerQuery = query?.toLowerCase() || ''

  for (const product of products) {
    if (excludeIds.includes(product.id)) continue

    const title = product.title || ''
    const materials = (product.materials || '').toLowerCase()
    const desc = stripHtml(product.description || '')
    const tags = extractTags(product)

    let score = 0
    let matchType: MatchType = 'category_match'
    let matchReason = ''

    // Exact title match
    if (lowerQuery && title.toLowerCase().includes(lowerQuery)) {
      score += 30
      matchReason = `Matches "${query}"`
    }

    // Category match
    if (options.category) {
      const catTitle = product.category?.title?.toLowerCase() || ''
      if (catTitle.includes(options.category.toLowerCase())) {
        score += 20
        matchReason = matchReason || `In ${product.category.title} category`
      }
    }

    // Material match
    if (options.material?.length && materials) {
      for (const mat of options.material) {
        if (materials.includes(mat.toLowerCase())) {
          score += 15
          matchReason = matchReason || `Similar material: ${mat}`
          break
        }
      }
    }

    // Style match from tags/metadata
    if (options.style?.length) {
      for (const style of options.style) {
        if (title.toLowerCase().includes(style.toLowerCase()) || desc.toLowerCase().includes(style.toLowerCase())) {
          score += 10
          matchReason = matchReason || `Similar style: ${style}`
          break
        }
      }
    }

    // Color match
    if (options.color?.length) {
      for (const color of options.color) {
        if (title.toLowerCase().includes(color.toLowerCase())) {
          score += 10
          matchReason = matchReason || `Similar color: ${color}`
          break
        }
      }
    }

    // Description keyword match
    if (lowerQuery && desc.toLowerCase().includes(lowerQuery)) {
      score += 10
      matchReason = matchReason || `Related to "${query}"`
    }

    // Tag match
    if (lowerQuery && tags.some(t => t.includes(lowerQuery))) {
      score += 10
      matchReason = matchReason || `Tagged: ${query}`
    }

    if (score > 0) {
      // Determine match type
      if (score >= 30) matchType = 'closest_match'
      else if (score >= 20) matchType = 'style_alternative'
      else matchType = 'category_match'

      // Budget/premium classification based on price
      if (product.price && options.minPrice !== undefined && product.price < options.minPrice) {
        matchType = 'budget_alternative'
        matchReason = `Budget-friendly option — ${matchReason}`
      } else if (product.price && options.maxPrice !== undefined && product.price > options.maxPrice) {
        matchType = 'premium_alternative'
        matchReason = `Premium option — ${matchReason}`
      }

      results.push({
        id: product.id,
        title,
        slug: product.slug,
        url: `/products/${product.slug}`,
        category: product.category,
        price: product.salePrice || product.price,
        imageUrl: product.images?.[0]?.url || product.imageUrl,
        materials: product.materials,
        matchType,
        matchReason,
        confidence: Math.min(score / 40, 0.99),
      })
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence)

  // Return top N with diversity: ensure different match types
  const seen = new Set<MatchType>()
  const diversified: ProductResult[] = []
  for (const r of results) {
    if (diversified.length >= limit) break
    if (!seen.has(r.matchType) || diversified.length < 3) {
      diversified.push(r)
      seen.add(r.matchType)
    }
  }

  // Fill remaining slots
  for (const r of results) {
    if (diversified.length >= limit) break
    if (!diversified.find(d => d.id === r.id)) {
      diversified.push(r)
    }
  }

  return diversified.slice(0, limit)
}

// ── Search by Extracted Attributes ────────────────────────────

export async function searchByAttributes(attrs: {
  category?: string
  style?: string[]
  material?: string[]
  color?: string[]
}): Promise<ProductResult[]> {
  if (!attrs.category && !attrs.style?.length && !attrs.material?.length && !attrs.color?.length) {
    return []
  }

  return searchProducts({
    category: attrs.category,
    style: attrs.style,
    material: attrs.material,
    color: attrs.color,
    limit: 6,
  })
}

// ── Helpers ───────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

function extractTags(product: any): string[] {
  const tags: string[] = []
  if (product.tags) {
    if (Array.isArray(product.tags)) tags.push(...product.tags)
    else if (typeof product.tags === 'string') tags.push(...product.tags.split(',').map((t: string) => t.trim()))
  }
  if (product.productType) tags.push(product.productType)
  if (product.category?.title) tags.push(product.category.title)
  if (product.materials) tags.push(...product.materials.split(',').map((m: string) => m.trim()))
  return tags.map(t => t.toLowerCase())
}
