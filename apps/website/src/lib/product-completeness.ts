/**
 * Product Completeness Score
 *
 * Calculates a 0-100 score based on which product fields are filled.
 * Used to show a color-coded badge in the admin product list and edit page,
 * and to power the ?missing= filter query.
 *
 * Usage:
 *   import { scoreProduct, MISSING_FILTERS } from '@/lib/product-completeness'
 *   const result = scoreProduct(product)
 *   // { score: 85, totalFields: 14, filledFields: 12, missingFields: ['seo_title', 'seo_description'] }
 */

export interface CompletenessResult {
  score: number           // 0-100
  totalFields: number
  filledFields: number
  missingFields: string[]
  label: 'excellent' | 'good' | 'fair' | 'poor'
  labelColor: string      // hex color for badge
}

interface ProductData {
  title?: string | null
  price?: number | null
  description?: string | null
  short_description?: string | null
  images_count?: number    // number of product_images
  category_id?: number | null
  dimensions?: string | null
  materials?: string | null
  tags?: string[] | null
  colors?: string[] | null
  seo_title?: string | null
  seo_description?: string | null
  status?: string | null
  slug?: string | null
}

// Weighted fields — total: 100
const FIELDS: { key: keyof ProductData; label: string; weight: number }[] = [
  { key: 'title',              label: 'Title',              weight: 10 },
  { key: 'price',              label: 'Price',              weight: 10 },
  { key: 'description',        label: 'Description',        weight: 10 },
  { key: 'short_description',  label: 'Short description',  weight: 5  },
  { key: 'images_count',       label: 'Images',             weight: 15 },
  { key: 'category_id',        label: 'Category',           weight: 10 },
  { key: 'dimensions',         label: 'Dimensions',         weight: 7  },
  { key: 'materials',          label: 'Materials',          weight: 7  },
  { key: 'tags',               label: 'Tags',               weight: 5  },
  { key: 'colors',             label: 'Colors',             weight: 5  },
  { key: 'seo_title',          label: 'SEO title',          weight: 5  },
  { key: 'seo_description',    label: 'SEO description',    weight: 5  },
  { key: 'status',             label: 'Published',          weight: 6  },
]

/** Filter names supported by ?missing= query param */
export const MISSING_FILTERS = ['image', 'seo', 'price', 'category', 'description', 'dimensions', 'materials', 'tags', 'colors']

function isFilled(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'number' && value <= 0) return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}

export function scoreProduct(product: ProductData): CompletenessResult {
  let filled = 0
  let total = 0
  const missingFields: string[] = []

  for (const field of FIELDS) {
    total += field.weight
    if (isFilled(product[field.key])) {
      filled += field.weight
    } else {
      missingFields.push(field.label)
    }
  }

  // Special: status 'draft' counts as incomplete
  if (product.status === 'draft') {
    filled -= FIELDS.find(f => f.key === 'status')!.weight
    if (!missingFields.includes('Published')) missingFields.push('Published')
  }

  const score = total > 0 ? Math.round((filled / total) * 100) : 0

  let label: CompletenessResult['label']
  let labelColor: string
  if (score >= 90)      { label = 'excellent'; labelColor = '#1e7a47' }
  else if (score >= 65) { label = 'good';      labelColor = '#d4a853' }
  else if (score >= 35) { label = 'fair';      labelColor = '#c97a20' }
  else                  { label = 'poor';      labelColor = '#b0392f' }

  return {
    score: Math.max(0, Math.min(100, score)),
    totalFields: FIELDS.length,
    filledFields: FIELDS.length - missingFields.length,
    missingFields,
    label,
    labelColor,
  }
}

/** Map a ?missing= value to a SQL WHERE clause fragment */
export function missingFilterToSQL(filter: string): string | null {
  switch (filter) {
    case 'image':       return `NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)`
    case 'seo':         return `(p.seo_title IS NULL OR p.seo_title = '' OR p.seo_description IS NULL OR p.seo_description = '')`
    case 'price':       return `(p.price IS NULL OR p.price <= 0)`
    case 'category':    return `(p.category_id IS NULL)`
    case 'description': return `(p.description IS NULL OR p.description = '')`
    case 'dimensions':  return `(p.dimensions IS NULL OR p.dimensions = '')`
    case 'materials':   return `(p.materials IS NULL OR p.materials = '')`
    case 'tags':        return `(p.tags IS NULL OR array_length(p.tags, 1) IS NULL)`
    case 'colors':      return `(p.colors IS NULL OR array_length(p.colors, 1) IS NULL)`
    default:            return null
  }
}

/** Get all supported missing-data SQL filters */
export function buildMissingFilters(filters: string[]): string {
  const clauses = filters.map(f => missingFilterToSQL(f)).filter(Boolean) as string[]
  return clauses.length > 0 ? `AND (${clauses.join(' OR ')})` : ''
}
