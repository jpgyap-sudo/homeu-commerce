/**
 * import-blogs.mjs — Import Shopify blog articles → DaVinciOS
 *
 * Creates `blogs` and `articles` tables if they don't exist, then imports
 * all 29 articles from the 3 HomeU blogs fetched via Shopify GraphQL.
 *
 * Run: node tools/shopify-import/import-blogs.mjs [--dry-run]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')

// ─── Load env ────────────────────────────────────────────────────────────────
function loadEnv() {
  for (const file of ['../../apps/website/.env', '../../.env'].map(f => path.join(__dirname, f))) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}
loadEnv()

// ─── Blog data (from Shopify GraphQL cache) ───────────────────────────────────
const CACHE_FILE = 'C:/Users/user/.claude/projects/C--Users-user--homeu-commerce/29eb4d28-1a40-4375-81c2-95f82843b453/tool-results/mcp-b6eb1217-9a12-4cec-b576-420545f73ab9-graphql_query-1781673210098.txt'

// ─── DB ───────────────────────────────────────────────────────────────────────
const DB_URI = process.env.DATABASE_URI
if (!DB_URI) throw new Error('DATABASE_URI not set. Load apps/website/.env first.')

const client = new pg.Client({ connectionString: DB_URI })

async function run() {
  await client.connect()
  console.log('Connected to DB:', DB_URI.replace(/:([^:@]+)@/, ':***@'))

  // ── Create tables ──────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id          SERIAL PRIMARY KEY,
        shopify_id  TEXT UNIQUE,
        title       TEXT NOT NULL,
        handle      TEXT NOT NULL UNIQUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id           SERIAL PRIMARY KEY,
        shopify_id   TEXT UNIQUE,
        blog_id      INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        blog_handle  TEXT NOT NULL,
        title        TEXT NOT NULL,
        handle       TEXT NOT NULL,
        body         TEXT,
        author_name  TEXT,
        published_at TIMESTAMPTZ,
        image_url    TEXT,
        image_alt    TEXT,
        tags         JSONB DEFAULT '[]',
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(blog_id, handle)
      )
    `)
    console.log('Tables ready.')
  }

  // ── Load data ──────────────────────────────────────────────────────────────
  if (!fs.existsSync(CACHE_FILE)) {
    throw new Error(`Cache file not found: ${CACHE_FILE}`)
  }
  const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  const blogs = raw.data.blogs.nodes

  let totalBlogs = 0, totalArticles = 0

  for (const blog of blogs) {
    console.log(`\nBlog: ${blog.handle} — "${blog.title}" (${blog.articles.nodes.length} articles)`)

    let blogId
    if (!DRY_RUN) {
      const res = await client.query(`
        INSERT INTO blogs (shopify_id, title, handle)
        VALUES ($1, $2, $3)
        ON CONFLICT (shopify_id) DO UPDATE SET title = EXCLUDED.title, handle = EXCLUDED.handle
        RETURNING id
      `, [blog.id, blog.title, blog.handle])
      blogId = res.rows[0].id
      totalBlogs++
    }

    for (const article of blog.articles.nodes) {
      const publishedAt = article.publishedAt ? new Date(article.publishedAt) : null
      console.log(`  [${DRY_RUN ? 'DRY' : 'INSERT'}] ${article.handle} | ${article.publishedAt?.slice(0,10) ?? 'undated'} | ${article.title.slice(0,60)}`)

      if (!DRY_RUN) {
        await client.query(`
          INSERT INTO articles
            (shopify_id, blog_id, blog_handle, title, handle, body, author_name, published_at, image_url, image_alt, tags)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (shopify_id) DO UPDATE SET
            title        = EXCLUDED.title,
            handle       = EXCLUDED.handle,
            body         = EXCLUDED.body,
            author_name  = EXCLUDED.author_name,
            published_at = EXCLUDED.published_at,
            image_url    = EXCLUDED.image_url,
            image_alt    = EXCLUDED.image_alt,
            tags         = EXCLUDED.tags,
            updated_at   = NOW()
        `, [
          article.id,
          blogId,
          blog.handle,
          article.title,
          article.handle,
          article.body || null,
          article.author?.name || null,
          publishedAt,
          article.image?.url || null,
          article.image?.altText || null,
          JSON.stringify(article.tags || []),
        ])
        totalArticles++
      }
    }
  }

  console.log(`\n✓ Done. Imported ${totalBlogs} blogs, ${totalArticles} articles.`)
  await client.end()
}

run().catch(err => {
  console.error('Error:', err.message)
  client.end().catch(() => {})
  process.exit(1)
})
