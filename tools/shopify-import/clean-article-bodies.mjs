/**
 * Clean imported article bodies:
 *   1. Remove a leading duplicate-title block — ONLY if its text content
 *      exactly equals the article title (normalized). Safe; never touches a
 *      block that isn't a verbatim title repeat.
 *   2. Strip junk rich-editor class attributes (Twitter/X: css-… / r-…),
 *      which are inert but bloat the HTML.
 *
 * Read-only DB by default. Writes only with --execute, and always emits
 * output/article-body-clean.sql so the same change can be applied to the VPS.
 *
 *   node clean-article-bodies.mjs            # dry run, show counts
 *   node clean-article-bodies.mjs --execute  # apply to local + write SQL
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from '../../node_modules/pg/lib/index.js'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  for (const file of [
    path.join(__dirname, '..', '..', 'apps', 'website', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ]) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}

const norm = (html) =>
  html.replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ').trim().toLowerCase()

// Return [outerHtml, rest] for the first top-level element, or null.
function firstTopElement(html) {
  const m = html.match(/^\s*<([a-zA-Z0-9]+)(?:\s[^>]*)?>/)
  if (!m) return null
  const tag = m[1].toLowerCase()
  const startTagEnd = html.indexOf('>', html.indexOf('<')) + 1
  // Walk tokens counting same-tag nesting.
  const re = new RegExp(`<(/?)${tag}(?:\\s[^>]*)?>`, 'gi')
  re.lastIndex = html.indexOf('<')
  let depth = 0, mm
  while ((mm = re.exec(html))) {
    depth += mm[1] ? -1 : 1
    if (depth === 0) {
      const end = re.lastIndex
      return [html.slice(0, end), html.slice(end)]
    }
  }
  return null
}

// Strip class attributes whose value contains rich-editor junk (css-… / r-…).
function stripJunkClasses(html) {
  let count = 0
  const out = html.replace(/\sclass="([^"]*)"/gi, (full, val) => {
    if (/\b(?:css-[0-9a-z]+|r-[0-9a-z]+)\b/i.test(val)) { count++; return '' }
    return full
  })
  return [out, count]
}

function cleanBody(body, title) {
  let removedTitle = false
  let [html, classCount] = stripJunkClasses(body)

  const titleNorm = norm(title)
  // Try up to 2 leading elements (sometimes a wrapper then the title)
  for (let i = 0; i < 2; i++) {
    const first = firstTopElement(html.replace(/^\s+/, ''))
    if (!first) break
    const [outer, rest] = first
    const inner = norm(outer)
    if (inner === titleNorm && titleNorm.length > 0) {
      html = rest.replace(/^\s+/, '')
      removedTitle = true
      break
    }
    break // only inspect the very first element
  }
  return { html, removedTitle, classCount, changed: removedTitle || classCount > 0 }
}

async function main() {
  loadEnv()
  const execute = process.argv.includes('--execute')
  const pool = new Pool({ connectionString: process.env.DATABASE_URI || process.env.DATABASE_URL })

  const res = await pool.query(`SELECT id, title, body FROM articles WHERE body IS NOT NULL ORDER BY id`)
  let changed = 0, titlesRemoved = 0, classRows = 0
  const TAG = '$HOMEU_BODY_9c2$'
  const sql = ['-- Article body cleanup (generated from local DB)', 'SET client_min_messages TO WARNING;', 'BEGIN;']

  for (const r of res.rows) {
    const { html, removedTitle, classCount, changed: didChange } = cleanBody(r.body, r.title)
    if (!didChange) continue
    changed++
    if (removedTitle) titlesRemoved++
    if (classCount > 0) classRows++
    if (execute) {
      await pool.query(`UPDATE articles SET body = $1, updated_at = NOW() WHERE id = $2`, [html, r.id])
      sql.push(`UPDATE articles SET body = ${TAG}${html}${TAG} WHERE id = ${r.id};`)
    }
  }
  await pool.end()

  console.log(`${execute ? 'Cleaned' : '[dry run] would clean'}:`)
  console.log(`  articles changed:        ${changed} / ${res.rows.length}`)
  console.log(`  leading duplicate title: ${titlesRemoved} removed`)
  console.log(`  junk-class rows:         ${classRows}`)

  if (execute) {
    sql.push('COMMIT;')
    const out = path.join(__dirname, 'output', 'article-body-clean.sql')
    fs.writeFileSync(out, sql.join('\n'), 'utf8')
    console.log(`  VPS sync SQL:            ${out}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
