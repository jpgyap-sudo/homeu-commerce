#!/usr/bin/env node

/**
 * Shopify Export All — convenience wrapper
 * 
 * Exports ALL store data via the MCP server and saves to:
 *   tools/shopify-import/output/shopify-api/
 * 
 * Usage: node export-all.mjs
 */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('📦 Shopify — Export All Data\n')

// Check for credentials
const credsPath = path.join(__dirname, '.shopify-env.json')
if (!fs.existsSync(credsPath)) {
  console.error('❌ No credentials found. Run: node server.mjs --auth-setup')
  process.exit(1)
}

// Run the MCP server in export mode
try {
  execSync(`node "${path.join(__dirname, 'server.mjs')}" --export`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env },
  })
} catch (err) {
  console.error('Export failed:', err.message)
  process.exit(1)
}
