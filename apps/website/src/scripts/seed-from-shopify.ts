/**
 * Seed Payload CMS (Categories -> Pages -> Products) from the
 * transformed Shopify export in tools/shopify-import/output/.
 *
 * Usage: npx tsx src/scripts/seed-from-shopify.ts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../../../')
const OUTPUT_DIR = path.join(REPO_ROOT, 'tools', 'shopify-import', 'output')

// Load apps/website/.env into process.env (no dotenv dependency available)
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('../payload.config')

function loadJSON(filename: string) {
  const filepath = path.join(OUTPUT_DIR, filename)
  if (!fs.existsSync(filepath)) return null
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
}

// ── Minimal HTML -> Lexical converter ──────────────────────────────

function decodeEntities(str: string) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
}

function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim(),
  )
}

function textNode(text: string) {
  return { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }
}

function paragraphNode(children: unknown[]) {
  return {
    type: 'paragraph',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    textFormat: 0,
    textStyle: '',
  }
}

function headingNode(tag: string, children: unknown[]) {
  return { type: 'heading', tag, children, direction: 'ltr', format: '', indent: 0, version: 1 }
}

function listNode(listType: string, tag: string, children: unknown[]) {
  return {
    type: 'list',
    tag,
    listType,
    start: 1,
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

function listItemNode(children: unknown[], value: number) {
  return { type: 'listitem', value, children, direction: 'ltr', format: '', indent: 0, version: 1 }
}

function rootNode(children: unknown[]) {
  return {
    root: {
      type: 'root',
      children: children.length ? children : [paragraphNode([])],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function htmlToLexical(html: string | undefined) {
  if (!html || !html.trim()) return rootNode([])

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')

  const children: unknown[] = []
  const blockRegex =
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<(ul|ol)[^>]*>([\s\S]*?)<\/\3>|<p[^>]*>([\s\S]*?)<\/p>|<div[^>]*>([\s\S]*?)<\/div>/gi

  let match: RegExpExecArray | null
  let found = false
  while ((match = blockRegex.exec(cleaned)) !== null) {
    found = true
    if (match[1]) {
      const text = stripTags(match[2])
      if (text) children.push(headingNode(`h${match[1]}`, [textNode(text)]))
    } else if (match[3]) {
      const listType = match[3].toLowerCase() === 'ol' ? 'number' : 'bullet'
      const items = [...match[4].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => stripTags(m[1]))
        .filter(Boolean)
      if (items.length) {
        children.push(
          listNode(
            listType,
            match[3].toLowerCase(),
            items.map((t, i) => listItemNode([textNode(t)], i + 1)),
          ),
        )
      }
    } else if (match[5] !== undefined) {
      const text = stripTags(match[5])
      if (text) children.push(paragraphNode([textNode(text)]))
    } else if (match[6] !== undefined) {
      const text = stripTags(match[6])
      if (text) children.push(paragraphNode([textNode(text)]))
    }
  }

  if (!found) {
    const text = stripTags(cleaned)
    if (text) children.push(paragraphNode([textNode(text)]))
  }

  return rootNode(children)
}

// ── Seed ────────────────────────────────────────────────────────────

async function main() {
  const payload = await getPayload({ config })

  const categories = loadJSON('payload-categories.json') ?? []
  const pages = loadJSON('payload-pages.json') ?? []
  const products = loadJSON('payload-products.json') ?? []

  // 1. Categories
  console.log(`\n=== Categories (${categories.length}) ===`)
  const categoryIdByHandle = new Map<string, number | string>()
  let catCreated = 0
  let catSkipped = 0
  for (const c of categories) {
    try {
      const doc = await payload.create({
        collection: 'categories',
        data: {
          title: c.title,
          slug: c.slug,
          description: c.description || '',
          seoTitle: c.seoTitle || '',
          seoDescription: c.seoDescription || '',
          shopifyOriginalUrl: c.shopifyOriginalUrl || '',
        },
      })
      categoryIdByHandle.set(c.slug, doc.id)
      catCreated++
    } catch (err) {
      catSkipped++
      console.warn(`  skip category "${c.slug}": ${(err as Error).message}`)
    }
  }
  console.log(`  created ${catCreated}, skipped ${catSkipped}`)

  // 2. Pages
  console.log(`\n=== Pages (${pages.length}) ===`)
  let pageCreated = 0
  let pageSkipped = 0
  for (const p of pages) {
    try {
      await payload.create({
        collection: 'pages',
        data: {
          title: p.title,
          slug: p.slug,
          content: htmlToLexical(p.content),
          seoTitle: p.seoTitle || '',
          seoDescription: p.seoDescription || '',
          shopifyOriginalUrl: p.shopifyOriginalUrl || '',
        },
      })
      pageCreated++
    } catch (err) {
      pageSkipped++
      console.warn(`  skip page "${p.slug}": ${(err as Error).message}`)
    }
  }
  console.log(`  created ${pageCreated}, skipped ${pageSkipped}`)

  // 3. Products
  const limit = process.env.SEED_LIMIT ? parseInt(process.env.SEED_LIMIT, 10) : products.length
  const productsToSeed = products.slice(0, limit)
  console.log(`\n=== Products (${productsToSeed.length} of ${products.length}) ===`)
  let prodCreated = 0
  let prodSkipped = 0
  for (let i = 0; i < productsToSeed.length; i++) {
    const p = productsToSeed[i]
    const categoryHandle = (p.categoryHandles || [])[0]
    const categoryId = categoryHandle ? categoryIdByHandle.get(categoryHandle) : undefined

    try {
      await payload.create({
        collection: 'products',
        data: {
          title: p.title,
          slug: p.slug,
          sku: p.sku || '',
          price: p.price ?? undefined,
          salePrice: p.salePrice ?? undefined,
          showPrice: p.showPrice ?? true,
          description: htmlToLexical(p.description),
          category: categoryId,
          seoTitle: p.seoTitle || '',
          seoDescription: p.seoDescription || '',
          shopifyOriginalUrl: p.shopifyOriginalUrl || p.shopifyUrl || '',
        },
      })
      prodCreated++
    } catch (err) {
      prodSkipped++
      console.warn(`  skip product "${p.slug}": ${(err as Error).message}`)
    }

    if ((i + 1) % 250 === 0 || i === productsToSeed.length - 1) {
      console.log(`  progress: ${i + 1}/${productsToSeed.length} (created ${prodCreated}, skipped ${prodSkipped})`)
    }
  }
  console.log(`  created ${prodCreated}, skipped ${prodSkipped}`)

  console.log('\n✅ Seed complete')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
