import { query } from '@/lib/db'

export interface DNAProduct {
  id: number; title: string; slug: string; score: number; grade: string
  visuals: { score: number; max: number; detail: string }
  descriptive: { score: number; max: number; detail: string }
  commercial: { score: number; max: number; detail: string }
  seo: { score: number; max: number; detail: string }
  performance: { score: number; max: number; detail: string }
  fixes: string[]
}

export interface DNASummary {
  total: number; avg: number
  grades: { S: number; A: number; B: number; C: number; D: number }
}

export async function computeDNAScores(): Promise<{ summary: DNASummary; products: DNAProduct[] }> {
  const { rows } = await query(`
    SELECT
      p.id, p.title, p.slug,
      p.price, p.dimensions, p.materials,
      p.description, p.category_id,
      p.seo_title, p.seo_description,
      pi.image_count,
      COALESCE(pv.total_views, 0) AS total_views,
      COALESCE(rfq.rfq_count, 0) AS rfq_count,
      COALESCE(q.quote_count, 0) AS quote_count
    FROM products p
    LEFT JOIN (
      SELECT product_id, COUNT(*)::int AS image_count
      FROM product_images GROUP BY product_id
    ) pi ON pi.product_id = p.id
    LEFT JOIN (
      SELECT REPLACE(path, '/products/', '') AS slug, COUNT(*)::int AS total_views
      FROM page_views WHERE path LIKE '/products/%' GROUP BY path
    ) pv ON pv.slug = p.slug
    LEFT JOIN (
      SELECT rfq_requests_items.product_id, COUNT(DISTINCT rfq_requests_items._parent_id)::int AS rfq_count
      FROM rfq_requests_items
      GROUP BY rfq_requests_items.product_id
    ) rfq ON rfq.product_id = p.id
    LEFT JOIN (
      SELECT product_id, COUNT(*)::int AS quote_count
      FROM quotations_items GROUP BY product_id
    ) q ON q.product_id = p.id
    ORDER BY p.id
  `)

  const scored: DNAProduct[] = rows.map((r: any) => scoreProduct(r))
  scored.sort((a, b) => b.score - a.score)

  const total = scored.length
  const avg = Math.round(scored.reduce((s, x) => s + x.score, 0) / (total || 1))

  return {
    summary: {
      total,
      avg,
      grades: {
        S: scored.filter(x => x.score >= 90).length,
        A: scored.filter(x => x.score >= 75 && x.score < 90).length,
        B: scored.filter(x => x.score >= 60 && x.score < 75).length,
        C: scored.filter(x => x.score >= 40 && x.score < 60).length,
        D: scored.filter(x => x.score < 40).length,
      },
    },
    products: scored,
  }
}

function scoreProduct(r: any): DNAProduct {
  const id = r.id; const title = r.title; const slug = r.slug
  const imageCount = r.image_count || 0
  const hasDimensions = !!(r.dimensions)
  const hasMaterials = !!(r.materials)
  const hasDescription = !!(r.description)
  const hasPrice = !!(r.price)
  const hasCategory = !!(r.category_id)
  const hasSeoTitle = !!(r.seo_title)
  const hasSeoDesc = !!(r.seo_description)
  const views = Number(r.total_views) || 0
  const rfqs = Number(r.rfq_count) || 0
  const quotes = Number(r.quote_count) || 0

  // Visual (25)
  let visualScore = 0
  if (imageCount >= 3) visualScore = 25
  else if (imageCount === 2) visualScore = 18
  else if (imageCount === 1) visualScore = 10
  const visualDetail = imageCount === 0 ? 'No photos' : imageCount >= 3 ? `${imageCount} photos` : `${imageCount} photo — add more`

  // Descriptive (25)
  let descScore = 0
  if (hasDimensions) descScore += 9
  if (hasMaterials) descScore += 8
  if (hasDescription) descScore += 8
  const descMissing = ['dimensions', 'materials', 'description'].filter(x => !{ dimensions: hasDimensions, materials: hasMaterials, description: hasDescription }[x])
  const descDetail = descScore === 25 ? 'Complete' : `Missing: ${descMissing.join(', ') || 'all fields'}`

  // Commercial (20)
  let comScore = 0
  if (hasPrice) comScore += 12
  if (hasCategory) comScore += 8
  const comMissing: string[] = []
  if (!hasPrice) comMissing.push('price')
  if (!hasCategory) comMissing.push('category')
  const comDetail = comScore === 20 ? 'Price + category set' : `Missing: ${comMissing.join(', ')}`

  // SEO (15)
  let seoScore = 0
  if (hasSeoTitle) seoScore += 8
  if (hasSeoDesc) seoScore += 7
  const seoMissing: string[] = []
  if (!hasSeoTitle) seoMissing.push('title')
  if (!hasSeoDesc) seoMissing.push('description')
  const seoDetail = seoScore === 15 ? 'SEO title + description' : seoMissing.length ? `Missing: ${seoMissing.join(', ')}` : 'No SEO fields'

  // Performance (15)
  let perfScore = 0
  const perfBits: string[] = []
  if (views > 100) { perfScore += 5; perfBits.push(`${views} views`) }
  else if (views > 10) { perfScore += 3; perfBits.push(`${views} views`) }
  else if (views > 0) { perfScore += 1; perfBits.push(`${views} views`) }
  if (rfqs > 5) { perfScore += 6 }
  else if (rfqs > 0) { perfScore += 3 }
  if (rfqs > 0) perfBits.push(`${rfqs} RFQ${rfqs>1?'s':''}`)
  if (quotes > 0) { perfScore += 4; perfBits.push(`${quotes} quote${quotes>1?'s':''}`) }
  const perfDetail = perfBits.length > 0 ? perfBits.join(' · ') : 'No traffic yet'

  const score = visualScore + descScore + comScore + seoScore + perfScore
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'

  const fixes: string[] = []
  if (imageCount < 2) fixes.push(`${3 - imageCount} more photo${imageCount !== 1 ? 's' : ''}`)
  if (!hasDimensions) fixes.push('Add dimensions')
  if (!hasMaterials) fixes.push('Add materials')
  if (!hasDescription) fixes.push('Add description')
  if (!hasPrice) fixes.push('Set price')
  if (!hasCategory) fixes.push('Add category')
  if (!hasSeoTitle) fixes.push('SEO title')
  if (!hasSeoDesc) fixes.push('SEO description')

  return {
    id, title, slug, score, grade,
    visuals: { score: visualScore, max: 25, detail: visualDetail },
    descriptive: { score: descScore, max: 25, detail: descDetail },
    commercial: { score: comScore, max: 20, detail: comDetail },
    seo: { score: seoScore, max: 15, detail: seoDetail },
    performance: { score: perfScore, max: 15, detail: perfDetail },
    fixes,
  }
}
