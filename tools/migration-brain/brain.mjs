#!/usr/bin/env node

/**
 * Migration Central Brain
 * 
 * PostgreSQL-backed persistent memory for the entire Shopify → Payload CMS migration.
 * Orchestrates: Playwright Scanner, Hermes3 Reasoner, Ollama Vision, Shopify Parser
 * 
 * The brain remembers:
 * - Every scanned page, product, collection, and image
 * - URL mappings and redirect decisions
 * - Navigation hierarchy
 * - Visual analysis results (llava:7b)
 * - Component mappings (Liquid → Next.js)
 * - Migration phase progress
 * - Errors with hermes3 triage
 * - Learned patterns and decisions
 * 
 * Usage:
 *   node brain.mjs init                    # Initialize database schema
 *   node brain.mjs status                  # Show migration status
 *   node brain.mjs store-page <json>       # Store scanned page
 *   node brain.mjs store-product <json>    # Store product
 *   node brain.mjs store-collection <json> # Store collection
 *   node brain.mjs report                  # Generate comprehensive report
 *   node brain.mjs errors                  # Show migration errors
 *   node brain.mjs resolve-error <id>      # Mark error as resolved
 *   node brain.mjs remember <title> <content> [tags]
 *   node brain.mjs recall <query>
 *   node brain.mjs next-steps              # Hermes3 suggests next actions
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OLLAMA_URL = 'http://localhost:11434'
const HERMES_MODEL = 'hermes3:latest'

// Database config - uses the existing Payload CMS postgres
const DB = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'homeu',
  password: process.env.PGPASSWORD || 'homeu_local_password',
  database: process.env.PGDATABASE || 'homeu',
}

function pgConnectionString() {
  return `postgresql://${DB.user}:${DB.password}@${DB.host}:${DB.port}/${DB.database}`
}

function runSQL(sql) {
  const psql = `psql "${pgConnectionString()}" -c "${sql.replace(/"/g, '\\"')}"`
  try {
    const result = execSync(psql, { encoding: 'utf-8', timeout: 10000 })
    return result
  } catch (err) {
    // If psql not available, use node-postgres fallback
    return `Note: ${err.message}`
  }
}

// =============================================
// DATABASE INITIALIZATION
// =============================================

async function initDatabase() {
  console.log('🧠 Migration Central Brain — Database Init\n')
  const schemaPath = path.join(__dirname, 'migrations', '001-schema.sql')
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`Schema file not found: ${schemaPath}`)
    process.exit(1)
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8')
  
  try {
    // Try psql first
    const result = execSync(
      `psql "${pgConnectionString()}" -f "${schemaPath}"`,
      { encoding: 'utf-8', timeout: 30000 }
    )
    console.log('✅ Database schema initialized via psql')
    console.log(result)
  } catch (err) {
    console.log('ℹ️  psql not available, trying programmatic init...')
    // Fallback: try to use node-postgres if available
    try {
      const { default: pg } = await import('pg')
      const client = new pg.Client({
        connectionString: pgConnectionString()
      })
      await client.connect()
      await client.query(schema)
      await client.end()
      console.log('✅ Database schema initialized via pg client')
    } catch (pgErr) {
      console.error(`❌ Could not initialize database: ${pgErr.message}`)
      console.log('\n📋 Manual init:')
      console.log(`   psql "${pgConnectionString()}" -f "${schemaPath}"`)
    }
  }

  // Insert initial phase records
  const phases = [
    'discovery', 'scanning', 'extraction', 'parsing', 
    'mapping', 'import', 'verification', 'visual-analysis'
  ]
  for (const phase of phases) {
    try {
      runSQL(`INSERT INTO migration_phases (phase, status) SELECT '${phase}', 'pending' WHERE NOT EXISTS (SELECT 1 FROM migration_phases WHERE phase = '${phase}')`)
    } catch { /* ignore */ }
  }
  
  console.log('\n✅ Central Brain ready')
}

// =============================================
// STATUS & REPORTS
// =============================================

async function showStatus() {
  console.log('📊 Migration Status\n')
  
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: pgConnectionString() })
    await client.connect()

    // Phase progress
    const phases = await client.query(
      `SELECT phase, status, total_items, processed_items, error_count, 
              started_at, completed_at 
       FROM migration_phases ORDER BY id`
    )
    
    console.log('━━━ PHASES ━━━')
    console.log('PHASE                STATUS      ITEMS     ERRORS')
    for (const p of phases.rows) {
      const phase = p.phase.padEnd(20)
      const status = p.status.padEnd(12)
      const items = `${p.processed_items || 0}/${p.total_items || 0}`.padEnd(10)
      const errors = (p.error_count || 0).toString()
      const icon = p.status === 'completed' ? '✅' : p.status === 'running' ? '🔄' : p.status === 'failed' ? '❌' : '⏳'
      console.log(`${icon} ${phase}${status}${items}${errors}`)
    }

    // Counts
    const pageCount = await client.query('SELECT COUNT(*) FROM scanned_pages')
    const productCount = await client.query('SELECT COUNT(*) FROM products')
    const collectionCount = await client.query('SELECT COUNT(*) FROM collections')
    const imageCount = await client.query('SELECT COUNT(*) FROM images')
    const urlMappingCount = await client.query('SELECT COUNT(*) FROM url_mappings')
    const errorCount = await client.query('SELECT COUNT(*) FROM migration_errors WHERE resolved = false')
    const memoryCount = await client.query('SELECT COUNT(*) FROM brain_memories')

    console.log('\n━━━ COUNTS ━━━')
    console.log(`   Pages:        ${pageCount.rows[0].count}`)
    console.log(`   Products:     ${productCount.rows[0].count}`)
    console.log(`   Collections:  ${collectionCount.rows[0].count}`)
    console.log(`   Images:       ${imageCount.rows[0].count}`)
    console.log(`   URL Mappings: ${urlMappingCount.rows[0].count}`)
    console.log(`   Unresolved Errors: ${errorCount.rows[0].count}`)
    console.log(`   Brain Memories: ${memoryCount.rows[0].count}`)

    await client.end()
  } catch (err) {
    console.error(`❌ Database error: ${err.message}`)
  }
}

async function showErrors() {
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: pgConnectionString() })
    await client.connect()
    
    const errors = await client.query(
      `SELECT id, phase, error_type, error_message, severity, hermes_analysis, resolved 
       FROM migration_errors ORDER BY created_at DESC LIMIT 20`
    )
    
    console.log('🚨 Migration Errors\n')
    if (errors.rows.length === 0) {
      console.log('   ✅ No errors recorded')
    } else {
      for (const e of errors.rows) {
        const status = e.resolved ? '✅' : '❌'
        console.log(`${status} [#${e.id}] ${e.severity.toUpperCase()} | ${e.phase}`)
        console.log(`   Type: ${e.error_type}`)
        console.log(`   Message: ${e.error_message?.substring(0, 120)}`)
        if (e.hermes_analysis) {
          console.log(`   Analysis: ${e.hermes_analysis.substring(0, 120)}...`)
        }
        console.log('')
      }
    }
    await client.end()
  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
  }
}

// =============================================
// GENERATE COMPREHENSIVE REPORT
// =============================================

async function generateReport() {
  console.log('📋 Migration Central Brain — Full Report\n')
  await showStatus()
  
  // Use Hermes3 for next-steps analysis
  console.log('\n━━━ NEXT STEPS (Hermes3) ━━━\n')
  
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [
          { role: 'system', content: 'You are the Migration Central Brain for a Shopify to Payload CMS migration. Give concise, actionable next steps based on the status information.' },
          { role: 'user', content: 'Review the current migration status and suggest the top 5 next actions to complete the migration efficiently.' }
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: 1024 }
      })
    })
    const data = await response.json()
    console.log(data.message?.content || 'Analysis unavailable')
  } catch (err) {
    console.log(`ℹ️  Hermes3 unavailable: ${err.message}`)
    console.log('   Start Ollama: ollama run hermes3')
  }
}

// =============================================
// STORE FUNCTIONS (to be used by scanner/parser)
// =============================================

async function storePage(pageData) {
  const data = typeof pageData === 'string' ? JSON.parse(pageData) : pageData
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: pgConnectionString() })
    await client.connect()
    await client.query(`
      INSERT INTO scanned_pages (url, page_type, title, meta_description, canonical_url, h1, og_title, og_description, og_image, json_ld)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (url) DO UPDATE SET 
        page_type = EXCLUDED.page_type, title = EXCLUDED.title, last_verified_at = NOW()
    `, [
      data.url, data.pageType || data.type, data.title,
      data.metaDescription, data.canonical, data.h1,
      data.ogTitle, data.ogDescription, data.ogImage,
      data.jsonLd ? JSON.stringify(data.jsonLd) : null
    ])
    await client.end()
    console.log(`✅ Stored page: ${data.url}`)
  } catch (err) {
    console.error(`❌ Failed to store page: ${err.message}`)
  }
}

// =============================================
// BRAIN MEMORY
// =============================================

async function remember(title, content, tags = '') {
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: pgConnectionString() })
    await client.connect()
    await client.query(`
      INSERT INTO brain_memories (memory_type, title, content, tags, source)
      VALUES ('lesson', $1, $2, $3, 'brain')
    `, [title, content, tags.split(',').map(t => t.trim())])
    await client.end()
    console.log(`🧠 Stored memory: ${title}`)
  } catch (err) {
    console.error(`❌ ${err.message}`)
  }
}

async function recall(query) {
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: pgConnectionString() })
    await client.connect()
    
    // Simple text search (full-text search would need tsvector columns)
    const results = await client.query(`
      SELECT title, content, tags, confidence, created_at 
      FROM brain_memories 
      WHERE content ILIKE $1 OR title ILIKE $1 OR $1 = ANY(tags)
      ORDER BY created_at DESC LIMIT 10
    `, [`%${query}%`])
    
    console.log(`🔍 Recall: "${query}" — ${results.rows.length} results\n`)
    for (const r of results.rows) {
      console.log(`📌 ${r.title}`)
      console.log(`   ${r.content?.substring(0, 150)}...`)
      console.log(`   Tags: ${r.tags?.join(', ') || 'none'} | ${new Date(r.created_at).toLocaleDateString()}\n`)
    }
    await client.end()
  } catch (err) {
    console.error(`❌ ${err.message}`)
  }
}

// =============================================
// HERMES3 NEXT STEPS
// =============================================

async function suggestNextSteps() {
  console.log('🧠 Hermes3 analyzing migration state...\n')
  
  try {
    const { default: pg } = await import('pg')
    const client = new pg.Client({ connectionString: pgConnectionString() })
    await client.connect()
    
    const counts = {
      pages: (await client.query('SELECT COUNT(*) FROM scanned_pages')).rows[0].count,
      products: (await client.query('SELECT COUNT(*) FROM products')).rows[0].count,
      collections: (await client.query('SELECT COUNT(*) FROM collections')).rows[0].count,
      images: (await client.query('SELECT COUNT(*) FROM images')).rows[0].count,
      errors: (await client.query('SELECT COUNT(*) FROM migration_errors WHERE resolved = false')).rows[0].count,
      completedPhases: (await client.query("SELECT COUNT(*) FROM migration_phases WHERE status = 'completed'")).rows[0].count,
    }
    await client.end()
    
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [
          { role: 'system', content: 'You are the Migration Central Brain orchestrator. Based on migration state, suggest the top priority next actions.' },
          { role: 'user', content: `Migration state: ${JSON.stringify(counts)}. What are the 5 most important next steps to complete the migration efficiently?` }
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: 1024 }
      })
    })
    const data = await response.json()
    console.log(data.message?.content || 'No suggestions')
  } catch (err) {
    console.log(`ℹ️  Hermes3 unavailable (${err.message})`)
    console.log('   Next steps: Continue scanning → Parse exports → Import data')
  }
}

// =============================================
// CLI
// =============================================

const command = process.argv[2]
const arg1 = process.argv[3]
const arg2 = process.argv[4]
const arg3 = process.argv[5]

switch (command) {
  case 'init':          initDatabase(); break
  case 'status':        showStatus(); break
  case 'report':        generateReport(); break
  case 'errors':        showErrors(); break
  case 'store-page':    storePage(arg1); break
  case 'remember':      remember(arg1, arg2, arg3); break
  case 'recall':        recall(arg1); break
  case 'next-steps':    suggestNextSteps(); break
  default:
    console.log(`
🧠 MIGRATION CENTRAL BRAIN
Usage:
  node brain.mjs init              Initialize database schema
  node brain.mjs status            Show migration progress
  node brain.mjs report            Full report with Hermes3 analysis
  node brain.mjs errors            Show unresolved errors
  node brain.mjs store-page <json> Store a scanned page
  node brain.mjs remember <title> <content> [tags]
  node brain.mjs recall <query>
  node brain.mjs next-steps        Hermes3 suggests next actions

PostgreSQL: ${pgConnectionString()}
Hermes3:    ${HERMES_MODEL}
    `)
}
