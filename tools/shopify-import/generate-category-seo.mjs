#!/usr/bin/env node

/**
 * Generate SEO meta descriptions for the 83 categories in
 * tools/shopify-import/output/DaVinciOS-categories.json (all currently empty).
 *
 * Templates are keyed by keywords found in the category title/slug so each
 * description stays specific to the product type instead of one generic
 * blurb repeated 83 times (duplicate meta descriptions hurt SEO).
 *
 * Usage: node tools/shopify-import/generate-category-seo.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, 'output', 'categories.json')

const BRAND = 'HomeU.ph'

// Ordered keyword -> description builder. First match wins.
const RULES = [
  [/wall panel|wpc|wp panel|wp-panel|slat/i, (t, n) => `Shop ${t} at ${BRAND} — ${n} premium wood-textured and grille wall panel designs for accent walls and ceilings, with nationwide delivery in the Philippines.`],
  [/lighting|pendant|chandelier|wall light|table lamp|floor lamp|ceiling (light|fan)/i, (t, n) => `Browse ${n} ${t.toLowerCase()} pieces at ${BRAND} — contemporary lighting fixtures to brighten modern Filipino homes, delivered nationwide.`],
  [/sofa|chaise|modular seating|ottoman/i, (t, n) => `Discover ${n} ${t.toLowerCase()} options at ${BRAND} — comfortable, contemporary upholstered seating for modern living rooms across the Philippines.`],
  [/dining (table|chair)|dining room/i, (t, n) => `Shop ${n} ${t.toLowerCase()} pieces at ${BRAND} — contemporary dining furniture built for modern Filipino homes, with nationwide delivery.`],
  [/(armchair|lounge chair|accent chair|bar stool|stools|bench)/i, (t, n) => `Explore ${n} ${t.toLowerCase()} designs at ${BRAND} — stylish contemporary seating to complete your modern interior, delivered nationwide.`],
  [/center table|side table|console table|tv (stand|cabinet)|nightstand|sideboard/i, (t, n) => `Shop ${n} ${t.toLowerCase()} pieces at ${BRAND} — modern occasional furniture designed for contemporary Filipino interiors, with nationwide delivery.`],
  [/^table$/i, (t, n) => `Browse ${n} table designs at ${BRAND} — contemporary tables for living, dining, and workspaces, delivered nationwide across the Philippines.`],
  [/bed(room)?$/i, (t, n) => `Shop ${n} ${t.toLowerCase()} furniture at ${BRAND} — contemporary bedroom pieces designed for modern Filipino homes, with nationwide delivery.`],
  [/swatch|upholstery|fabric|leather/i, (t, n) => `Order ${n} fabric swatches from ${BRAND}'s ${t.toLowerCase()} range — preview the exact materials and finishes used on our contemporary furniture before you buy.`],
  [/stone|ceramic|sintered/i, (t, n) => `Explore ${n} ${t.toLowerCase()} surfaces at ${BRAND} — durable sintered stone and natural stone finishes for countertops and modern interiors, delivered nationwide.`],
  [/rug|carpet/i, (t, n) => `Shop ${n} rug designs at ${BRAND} — contemporary rugs and carpets to complete your modern interior, with nationwide delivery in the Philippines.`],
  [/pillow|decor/i, (t, n) => `Browse ${n} decorative pieces at ${BRAND} — pillows and decor accents that add the finishing touch to modern Filipino interiors, delivered nationwide.`],
  [/seating/i, (t, n) => `Discover ${n} seating options at ${BRAND} — contemporary chairs and sofas for modern Filipino living spaces, with nationwide delivery.`],
  [/living room/i, (t, n) => `Shop ${n} living room pieces at ${BRAND} — contemporary furniture and decor to design a modern Filipino living space, delivered nationwide.`],
  [/ready-?stock|48 hour|fast delivery|on ?stock|onsticj|onstock/i, (t, n) => `Shop ${n} ready-stock ${t.toLowerCase().replace(/^ready-stock /, '')} items at ${BRAND} — in-stock contemporary furniture and decor with fast nationwide delivery in the Philippines.`],
  [/new collection|latest collection|exclusive|sofa collection|mid-century/i, (t, n) => `Explore ${BRAND}'s ${t.toLowerCase()} — ${n} newly added contemporary furniture and decor pieces for modern Filipino homes.`],
  [/^(home page|all|products|product|feature)/i, (t, n) => `Shop the full ${BRAND} collection — ${n} contemporary furniture, lighting, decor, and home accent pieces, delivered nationwide across the Philippines.`],
  [/filter index|do not delete|smart product/i, () => `Internal product index used to power ${BRAND}'s smart product filtering and recommendations — not intended for direct browsing.`],
]

const FALLBACK = (t, n) => `Shop ${t} at ${BRAND} — ${n} contemporary furniture and home decor pieces for modern Filipino interiors, with nationwide delivery in the Philippines.`

function truncate(s, max) {
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim().replace(/[,—-]$/, '')
}

function generate(title, count) {
  const t = title.split('|')[0].trim()
  for (const [re, build] of RULES) {
    if (re.test(title) || re.test(t)) return truncate(build(t, count), 160)
  }
  return truncate(FALLBACK(t, count), 160)
}

function main() {
  const categories = JSON.parse(fs.readFileSync(FILE, 'utf-8'))

  let updated = 0
  for (const c of categories) {
    c.seoDescription = generate(c.title, c.productsCount ?? 0)
    if (!c.seoTitle || !c.seoTitle.trim()) c.seoTitle = c.title.split('|')[0].trim()
    updated++
  }

  fs.writeFileSync(FILE, JSON.stringify(categories, null, 2))
  console.log(`✅ Generated SEO descriptions for ${updated}/${categories.length} categories`)
}

main()
