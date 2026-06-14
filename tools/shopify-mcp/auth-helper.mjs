#!/usr/bin/env node

/**
 * Shopify Auth Helper — Client Credentials Grant Flow
 * 
 * This script exchanges your Dev Dashboard app credentials for an access token.
 * You'll need to provide your store name and app credentials.
 * 
 * Usage: node tools/shopify-mcp/auth-helper.mjs
 */

import { URLSearchParams } from 'node:url'
import readline from 'readline'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🔐 Shopify MCP — Auth Helper (Client Credentials)         ║
║  🔒 Read-Only Mode — Your store is SAFE                    ║
╚═══════════════════════════════════════════════════════════════╝
`)

  // Get credentials from user
  const clientId = await question('Enter your Client ID (from Dev Dashboard): ')
  const clientSecret = await question('Enter your Client Secret: ')
  const shop = await question('Enter your store name (e.g., homeu): ')

  if (!clientId || !clientSecret || !shop) {
    console.error('❌ All fields are required')
    rl.close()
    process.exit(1)
  }

  // Normalize shop name
  const normalizedShop = shop.includes('.myshopify.com') ? shop.replace('.myshopify.com', '') : shop
  const shopUrl = `${normalizedShop}.myshopify.com`

  console.log(`\n🔄 Requesting access token for ${shopUrl}...`)

  try {
    // Request token using client credentials grant
    const response = await fetch(
      `https://${shopUrl}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token request failed: ${response.status} - ${errorText}`)
    }

    const { access_token, expires_in, scope } = await response.json()
    
    console.log(`
✅ Token received!
   Scope: ${scope}
   Expires in: ${expires_in} seconds (24 hours)
`)

    // Save credentials
    const config = {
      store: normalizedShop,
      token: access_token,
      scope: scope,
      connectedAt: new Date().toISOString(),
      mode: 'READ_ONLY'
    }

    const configPath = path.join(__dirname, '.shopify-env.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log(`💾 Credentials saved to .shopify-env.json`)
    console.log(`
📋 Next steps:
   1. Export all data:  node tools/shopify-mcp/server.mjs --export
   2. Show summary:     node tools/shopify-mcp/server.mjs --summary
   3. Verify safety:    node tools/shopify-mcp/server.mjs --safety-check
`)

  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
    if (err.message.includes('shop_not_permitted')) {
      console.error(`
💡 Troubleshooting:
   - Make sure your app and store are in the same Shopify organization
   - Verify the store appears under "Dev stores" in Dev Dashboard
   - Check that SHOPIFY_SHOP matches your store's subdomain exactly
`)
    }
  } finally {
    rl.close()
  }
}

main()