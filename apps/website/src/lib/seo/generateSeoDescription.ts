/**
 * Auto-generates SEO title/description fallbacks for categories and products.
 *
 * Used by collection hooks (Categories.ts, Products.ts) so newly created or
 * imported records get a sensible meta description even if the editor /
 * import pipeline left seoTitle/seoDescription blank — same templating
 * approach used for the one-off migration backfill in
 * tools/shopify-import/generate-category-seo.mjs.
 */

const BRAND = 'HomeU.ph'
const MAX_LENGTH = 160

export function truncateAtWord(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim().replace(/[,—-]$/, '')
}

export function generateSeoTitle(title: string): string {
  const base = title.split('|')[0].trim()
  return truncateAtWord(base, 60)
}

// Keyword -> description builder, ordered (first match wins). `count` is the
// number of products in the category, if known.
const CATEGORY_RULES: Array<[RegExp, (title: string, count?: number) => string]> = [
  [/wall panel|wpc|wp panel|wp-panel|slat/i, (t, n) =>
    `Shop ${t} at ${BRAND} — ${countPhrase(n, 'premium wood-textured and grille wall panel design')} for accent walls and ceilings, with nationwide delivery in the Philippines.`],
  [/lighting|pendant|chandelier|wall light|table lamp|floor lamp|ceiling (light|fan)/i, (t, n) =>
    `${n != null ? `Browse ${n} ${t.toLowerCase()} pieces` : `Browse our ${t.toLowerCase()} collection`} at ${BRAND} — contemporary lighting fixtures to brighten modern Filipino homes, delivered nationwide.`],
  [/sofa|chaise|modular seating|ottoman/i, (t, n) =>
    `${n != null ? `Discover ${n} ${t.toLowerCase()} options` : `Discover our ${t.toLowerCase()} range`} at ${BRAND} — comfortable, contemporary upholstered seating for modern living rooms across the Philippines.`],
  [/dining (table|chair)|dining room/i, (t, n) =>
    `${n != null ? `Shop ${n} ${t.toLowerCase()} pieces` : `Shop our ${t.toLowerCase()} range`} at ${BRAND} — contemporary dining furniture built for modern Filipino homes, with nationwide delivery.`],
  [/(armchair|lounge chair|accent chair|bar stool|stools|bench)/i, (t, n) =>
    `${n != null ? `Explore ${n} ${t.toLowerCase()} designs` : `Explore our ${t.toLowerCase()} designs`} at ${BRAND} — stylish contemporary seating to complete your modern interior, delivered nationwide.`],
  [/center table|side table|console table|tv (stand|cabinet)|nightstand|sideboard/i, (t, n) =>
    `${n != null ? `Shop ${n} ${t.toLowerCase()} pieces` : `Shop our ${t.toLowerCase()} range`} at ${BRAND} — modern occasional furniture designed for contemporary Filipino interiors, with nationwide delivery.`],
  [/^table$/i, (_t, n) =>
    `${n != null ? `Browse ${n} table designs` : 'Browse our table designs'} at ${BRAND} — contemporary tables for living, dining, and workspaces, delivered nationwide across the Philippines.`],
  [/bed(room)?$/i, (t, n) =>
    `${n != null ? `Shop ${n} ${t.toLowerCase()} furniture` : `Shop our ${t.toLowerCase()} furniture`} at ${BRAND} — contemporary bedroom pieces designed for modern Filipino homes, with nationwide delivery.`],
  [/swatch|upholstery|fabric|leather/i, (t, n) =>
    `${n != null ? `Order ${n} fabric swatches` : 'Order fabric swatches'} from ${BRAND}'s ${t.toLowerCase()} range — preview the exact materials and finishes used on our contemporary furniture before you buy.`],
  [/stone|ceramic|sintered/i, (t, n) =>
    `${n != null ? `Explore ${n} ${t.toLowerCase()} surfaces` : `Explore our ${t.toLowerCase()} surfaces`} at ${BRAND} — durable sintered stone and natural stone finishes for countertops and modern interiors, delivered nationwide.`],
  [/rug|carpet/i, (_t, n) =>
    `${n != null ? `Shop ${n} rug designs` : 'Shop our rug designs'} at ${BRAND} — contemporary rugs and carpets to complete your modern interior, with nationwide delivery in the Philippines.`],
  [/pillow|decor/i, (t, n) =>
    `${n != null ? `Browse ${n} decorative pieces` : 'Browse our decorative pieces'} at ${BRAND} — pillows and decor accents that add the finishing touch to modern Filipino interiors, delivered nationwide.`],
  [/seating/i, (t, n) =>
    `${n != null ? `Discover ${n} seating options` : 'Discover our seating options'} at ${BRAND} — contemporary chairs and sofas for modern Filipino living spaces, with nationwide delivery.`],
  [/living room/i, (t, n) =>
    `${n != null ? `Shop ${n} living room pieces` : 'Shop our living room pieces'} at ${BRAND} — contemporary furniture and decor to design a modern Filipino living space, delivered nationwide.`],
  [/ready-?stock|48 hour|fast delivery|on ?stock|onsticj|onstock/i, (t, n) => {
    const label = t.toLowerCase().replace(/^ready-stock /, '')
    return `${n != null ? `Shop ${n} ready-stock ${label} items` : `Shop ready-stock ${label} items`} at ${BRAND} — in-stock contemporary furniture and decor with fast nationwide delivery in the Philippines.`
  }],
  [/new collection|latest collection|exclusive|sofa collection|mid-century/i, (t, n) =>
    `Explore ${BRAND}'s ${t.toLowerCase()} — ${n != null ? `${n} newly added` : 'newly added'} contemporary furniture and decor pieces for modern Filipino homes.`],
  [/^(home page|all|products|product|feature)/i, (_t, n) =>
    `Shop the full ${BRAND} collection — ${n != null ? `${n} contemporary` : 'contemporary'} furniture, lighting, decor, and home accent pieces, delivered nationwide across the Philippines.`],
  [/filter index|do not delete|smart product/i, () =>
    `Internal product index used to power ${BRAND}'s smart product filtering and recommendations — not intended for direct browsing.`],
]

function countPhrase(count: number | undefined, singular: string): string {
  if (count == null) return `${singular}s`
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

const CATEGORY_FALLBACK = (title: string, count?: number) =>
  `Shop ${title} at ${BRAND} — ${count != null ? `${count} contemporary` : 'contemporary'} furniture and home decor pieces for modern Filipino interiors, with nationwide delivery in the Philippines.`

/** Generate a meta description for a category, optionally including its product count. */
export function generateCategorySeoDescription(title: string, productsCount?: number): string {
  const base = title.split('|')[0].trim()
  for (const [pattern, build] of CATEGORY_RULES) {
    if (pattern.test(title) || pattern.test(base)) {
      return truncateAtWord(build(base, productsCount), MAX_LENGTH)
    }
  }
  return truncateAtWord(CATEGORY_FALLBACK(base, productsCount), MAX_LENGTH)
}

/**
 * Generate a meta description for a product. Prefers a trimmed version of
 * the product's own description; falls back to a templated summary built
 * from the title and (optional) category name.
 */
export function generateProductSeoDescription(opts: {
  title: string
  description?: string
  categoryTitle?: string
}): string {
  const { title, description, categoryTitle } = opts
  const plainDescription = (description || '').replace(/\s+/g, ' ').trim()

  if (plainDescription.length >= 40) {
    return truncateAtWord(plainDescription, MAX_LENGTH)
  }

  const category = categoryTitle?.split('|')[0].trim()
  const categoryPhrase = category ? ` from our ${category} collection` : ''
  return truncateAtWord(
    `${title}${categoryPhrase} — shop contemporary furniture and home decor at ${BRAND}, with nationwide delivery in the Philippines.`,
    MAX_LENGTH,
  )
}
