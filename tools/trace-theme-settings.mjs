/**
 * trace-theme-settings.mjs
 * =========================
 * Finds theme settings that are DEFINED in theme-builder-settings.ts but
 * NOT CONSUMED by either theme-styles.ts (CSS generation) or
 * HomeSections.tsx (renderer).
 *
 * Usage: node tools/trace-theme-settings.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function read(path) {
  return readFileSync(resolve(ROOT, path), 'utf-8')
}

// Section-to-group mapping
const SECTION_GROUPS = {
  slideshow:          'Body',
  brand_text:         'Body',
  collection_grid:    'Body',
  image_with_text:    'Body',
  image_bar:          'Body',
  featured_products:  'Body',
  reviews:            'Body',
  instagram:          'Body',
  cta:                'Body',
  newsletter:         'Body',
  logo_bar:           'Body',
  testimonial:        'Body',
  stats_counter:      'Body',
  blog_posts:         'Body',
  promo_bar:          'Body',
  video_hero:         'Body',
  lookbook:           'Body',
  category_carousel:  'Body',
  footer_brand:       'Footer',
  footer_quick_links: 'Footer',
  footer_newsletter:  'Footer',
  footer_social:      'Footer',
}

// ---- Parse all setting keys from theme-builder-settings.ts ----
// Collect them by section type
const settingsSource = read('apps/website/src/lib/theme-builder-settings.ts')

// Find section-specific setting arrays
// Match patterns like: const SLIDESHOW_SETTINGS = [ ... ]
// Each entry: { key: 'xxx', label: '...', type: '...', group: '...', ... }
const sections = {
  slideshow:          [],
  brand_text:         [],
  collection_grid:    [],
  image_with_text:    [],
  image_bar:          [],
  featured_products:  [],
  reviews:            [],
  instagram:          [],
  cta:                [],
  newsletter:         [],
  logo_bar:           [],
  testimonial:        [],
  stats_counter:      [],
  blog_posts:         [],
  promo_bar:          [],
  video_hero:         [],
  lookbook:           [],
  category_carousel:  [],
  footer_brand:       [],
  footer_quick_links: [],
  footer_newsletter:  [],
  footer_social:      [],
}

// Find all key definitions with their section context
const keyRegex = /const ([A-Z_]+)_SETTINGS[\s\S]*?(?=const |$)/g
let sectionMatch
while ((sectionMatch = keyRegex.exec(settingsSource)) !== null) {
  const varName = sectionMatch[1].toLowerCase()
  const body = sectionMatch[0]
  
  // Find which section type this maps to
  const sectionType = Object.keys(sections).find(st => {
    const upper = st.toUpperCase().replace(/-/g, '_')
    const upperVar = varName.replace(/-/g, '_')
    // Match: SLIDESHOW_SETTINGS -> slideshow, BRAND_TEXT -> brand_text
    return upperVar.includes(upper.replace(/_/g, '')) || upper.replace(/_/g, '').includes(upperVar)
  })
  
  if (!sectionType) continue

  // Extract all key definitions from this block
  const keyDefRegex = /\{\s*key:\s*'([^']+)'/g
  let keyMatch
  while ((keyMatch = keyDefRegex.exec(body)) !== null) {
    // Extract group if available
    const groupMatch = body.substring(keyMatch.index, keyMatch.index + 120).match(/group:\s*'([^']+)'/)
    const group = groupMatch ? groupMatch[1] : 'Uncategorized'
    sections[sectionType].push({ key: keyMatch[1], group })
  }
}

// Also get global settings
const globals = []
const globalMatch = settingsSource.match(/getGlobalSettings[\s\S]*?\][\s\n]*\]/)
if (globalMatch) {
  const globalKeyRegex = /\{\s*key:\s*'([^']+)'/g
  let m
  while ((m = globalKeyRegex.exec(globalMatch[0])) !== null) {
    const gm = globalMatch[0].substring(m.index, m.index + 120).match(/group:\s*'([^']+)'/)
    globals.push({ key: m[1], group: gm ? gm[1] : 'Global' })
  }
}

// ---- Collect all keys used in CSS and renderer ----
function extractCfgRefs(content) {
  const used = new Set()
  const regex = /cfg\.([a-zA-Z]+)/g
  let m
  while ((m = regex.exec(content)) !== null) {
    used.add(m[1])
  }
  return used
}

const cssContent = read('apps/website/src/lib/theme-styles.ts')
const rendererContent = read('apps/website/src/components/home/HomeSections.tsx')

const cssKeys = extractCfgRefs(cssContent)
const rendererKeys = extractCfgRefs(rendererContent)

const allUsed = new Set([...cssKeys, ...rendererKeys])

// Common keys to skip (not real user-facing settings)
const SKIP = new Set(['customClass', 'spacingTop', 'spacingBottom', 'hideMobile', 'hideDesktop',
  'animation', 'animationDelay', 'sectionMaxWidth', 'bgColor', 'textColor',
  'heading', 'headingFontSize', 'headingAlign', 'titleSize', 'bodySize',
  'imageMaxWidth', 'imageAspectRatio', 'objectFit', 'focalPoint',
])

// ---- Report ----
console.log('\n╔══════════════════════════════════════════════════════════════════╗')
console.log('║  THEME SETTING TRACE — Defined vs Consumed                      ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

let totalDefined = 0
let totalConsumed = 0
let totalInert = 0

for (const [sectionType, keys] of Object.entries(sections)) {
  if (keys.length === 0) continue
  const inert = keys.filter(k => !allUsed.has(k.key) && !SKIP.has(k.key) && k.key.length > 0)
  const consumed = keys.filter(k => allUsed.has(k.key))
  
  totalDefined += keys.length
  totalConsumed += consumed.length
  totalInert += inert.length

  if (inert.length > 0) {
    console.log(`  📦 ${sectionType} (${SECTION_GROUPS[sectionType] || 'Body'}):`)
    for (const k of inert) {
      console.log(`      ⚠️  ${k.key.padEnd(24)}  group: ${k.group}`)
    }
    console.log()
  }
}

// Global settings
const globalInert = globals.filter(k => !allUsed.has(k.key) && !SKIP.has(k.key))
if (globalInert.length > 0) {
  console.log('  🌐 Global Settings:')
  for (const k of globalInert) {
    console.log(`      ⚠️  ${k.key.padEnd(24)}  group: ${k.group}`)
  }
  console.log()
}

console.log('═══════════════════════════════════════════════════════════════════')
console.log(`  Total settings defined: ${totalDefined + globals.length}`)
console.log(`  Total consumed (CSS+Renderer): ${totalConsumed}`)
console.log(`  Total inert (defined but not consumed): ${totalInert + globalInert.filter(k => !allUsed.has(k.key) && !SKIP.has(k.key)).length}`)
console.log(`  Keys skipped (common/internal): ${SKIP.size}`)
console.log('═══════════════════════════════════════════════════════════════════\n')
