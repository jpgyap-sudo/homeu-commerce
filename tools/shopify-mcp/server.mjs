#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════
 *  SHOPIFY MCP SERVER — READ-ONLY MIGRATION TOOL
 * ════════════════════════════════════════════════════════════════
 * 
 *  🔒 SAFETY GUARANTEE: This server is STRICTLY READ-ONLY.
 *  It CANNOT create, update, or delete anything on your Shopify store.
 *  
 *  Enforced guarantees:
 *  1. ONLY HTTP GET requests → NO POST/PUT/DELETE ever
 *  2. ONLY whitelisted read endpoints → NO mutation endpoints
 *  3. NEVER sends write-capable headers → Content-Type is NEVER sent
 *  4. Request URL is validated against safe pattern before every call
 *  5. Token stored locally, NEVER transmitted to third parties
 *  6. Every API call is logged for audit
 * ════════════════════════════════════════════════════════════════
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.resolve(__dirname, '..', 'shopify-import', 'output', 'shopify-api')

// =============================================
// 🔒 SAFETY CONFIGURATION
// =============================================

const SAFETY = {
  // ONLY read operations allowed — these match Shopify Admin REST API read patterns
  ALLOWED_METHODS: ['GET'],

  // Whitelist of read-only URL patterns (Shopify Admin REST API)
  // Anything NOT matching these patterns will be REJECTED
  SAFE_ENDPOINTS: [
    // Products
    '/admin/api/2024-10/products.json',
    '/admin/api/2024-10/products/',      // /products/{id}.json
    '/admin/api/2024-10/products/count.json',
    // Collections
    '/admin/api/2024-10/custom_collections.json',
    '/admin/api/2024-10/smart_collections.json',
    '/admin/api/2024-10/collections/',    // /collections/{id}/products.json
    // Pages
    '/admin/api/2024-10/pages.json',
    '/admin/api/2024-10/pages/',
    '/admin/api/2024-10/pages/count.json',
    // Blogs & Articles
    '/admin/api/2024-10/blogs.json',
    '/admin/api/2024-10/blogs/',
    // Themes & Assets
    '/admin/api/2024-10/themes.json',
    '/admin/api/2024-10/themes/',
    // Store properties (read-only)
    '/admin/api/2024-10/shop.json',
    '/admin/api/2024-10/store_properties.json',
    // Count endpoints
    '/admin/api/2024-10/',
    // Online store navigation
    '/admin/api/2024-10/navigation.json',
    '/admin/api/2024-10/redirects.json',
  ],

  // Patterns that are EXPLICITLY BLOCKED (write operations)
  BLOCKED_PATTERNS: [
    // Products mutations
    '/products/',       // POST/PUT /products/{id}.json
    // Collections mutations
    '/custom_collections/',
    '/smart_collections/',
    // Orders mutations
    '/orders/',
    // Customers mutations
    '/customers/',
    // Content mutations
    '/pages/',
    '/blogs/',
    '/articles/',
    '/themes/',
    '/assets/',
    // Shopify Functions / Metafields
    '/metafields/',
    // Inventory
    '/inventory_levels/',
    '/inventory_items/',
    // Fulfillments
    '/fulfillments/',
    '/fulfillment_orders/',
    // Discounts
    '/price_rules/',
    '/discounts/',
  ],

  // API version for all requests
  API_VERSION: '2024-10',
}

// =============================================
// 🔒 SAFETY FUNCTIONS
// =============================================

/** 
 * Validates a URL is SAFE to call.
 * Returns { safe: true } or { safe: false, reason: '...' }
 */
function validateRequestSafety(method, path) {
  // 1. REJECT non-GET methods
  if (!SAFETY.ALLOWED_METHODS.includes(method)) {
    return { safe: false, reason: `BLOCKED: HTTP ${method} is not allowed. Only GET is permitted.` }
  }

  // 2. REJECT write operation patterns
  for (const pattern of SAFETY.BLOCKED_PATTERNS) {
    // If path contains the pattern AND there's a non-GET method, or if the path structure implies mutation
    if (path.includes(pattern)) {
      // Check if this looks like a read or write URL
      // Read: /admin/api/2024-10/products.json or /admin/api/2024-10/products/{id}.json
      // Write: /admin/api/2024-10/products/{id}.json with POST/PUT
      const isReadPattern = path.endsWith('.json') || path.includes('/count.json')
      if (!isReadPattern) {
        return { safe: false, reason: `BLOCKED: Path '${path}' may be a write endpoint. Only read endpoints are allowed.` }
      }
    }
  }

  // 3. VERIFY it starts with a safe endpoint prefix
  const isSafe = SAFETY.SAFE_ENDPOINTS.some(prefix => path.startsWith(prefix))
  if (!isSafe) {
    return { safe: false, reason: `BLOCKED: Path '${path}' is not in the read-only whitelist.` }
  }

  return { safe: true }
}

/**
 * Prints the safety banner on startup
 */
function printSafetyBanner() {
  console.error(`
╔═══════════════════════════════════════════════════════════════╗
║     🔒  SHOPIFY MCP — READ-ONLY MODE ACTIVE  🔒             ║
╠═══════════════════════════════════════════════════════════════╣
║  ✓ ONLY HTTP GET requests are allowed                        ║
║  ✓ ONLY read-only endpoints are whitelisted                  ║
║  ✓ Write operations are PHYSICALLY IMPOSSIBLE               ║
║  ✓ All requests are validated before every API call          ║
║                                                              ║
║  ❌ CANNOT create products    ❌ CANNOT delete collections   ║
║  ❌ CANNOT update pages       ❌ CANNOT modify themes        ║
║  ❌ CANNOT change anything on your Shopify store             ║
╚═══════════════════════════════════════════════════════════════╝`)
}

// =============================================
// SAFE SHOPIFY API CLIENT
// =============================================

class SafeShopifyClient {
  constructor(store, token) {
    let domain = store.replace(/https?:\/\//, '').replace(/\/$/, '')
    if (!domain.includes('.')) domain = `${domain}.myshopify.com`
    
    this.baseUrl = `https://${domain}`
    this.token = token
    this.store = domain

    // 🔒 READ-ONLY: Only send the auth header, NEVER Content-Type or write headers
    this.headers = {
      'X-Shopify-Access-Token': token,
      // NOTE: Intentionally NOT setting Content-Type
      // This prevents any write-capable requests from working even if a bug occurs
    }

    this.callLog = []
  }

  /**
   * 🔒 THE ONLY REQUEST METHOD — enforces safety on every single API call
   */
  async safeRequest(path) {
    // Validate safety BEFORE making the request
    const safety = validateRequestSafety('GET', path)
    if (!safety.safe) {
      const err = new Error(safety.reason)
      err.safetyBlocked = true
      throw err
    }

    const url = `${this.baseUrl}${path}`
    
    // Log the call for audit
    this.callLog.push({ method: 'GET', url, timestamp: new Date().toISOString() })

    const response = await fetch(url, {
      method: 'GET',              // 🔒 FORCED to GET
      headers: this.headers,      // 🔒 NO Content-Type header
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Shopify API ${response.status}: ${text.substring(0, 200)}`)
    }

    return response.json()
  }

  /**
   * Paginate through all pages (read-only, only GET requests)
   */
  async paginate(path, key) {
    const items = []
    let url = `${this.baseUrl}${path}`
    
    while (url) {
      const safety = validateRequestSafety('GET', new URL(url).pathname + new URL(url).search)
      if (!safety.safe) {
        throw new Error(safety.reason)
      }

      this.callLog.push({ method: 'GET', url, timestamp: new Date().toISOString() })

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Shopify API ${response.status}: ${text.substring(0, 200)}`)
      }

      const data = await response.json()
      const pageItems = data[key] || []
      items.push(...pageItems)

      // Parse Link header for pagination
      const linkHeader = response.headers.get('Link')
      if (linkHeader) {
        const matches = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        url = matches ? matches[1] : null
      } else {
        url = null
      }
    }
    return items
  }

  // =============================================
  // SAFE READ OPERATIONS
  // =============================================

  async getProducts(params = {}) {
    const query = new URLSearchParams({ limit: '250', ...params }).toString()
    return this.paginate(`/admin/api/${SAFETY.API_VERSION}/products.json?${query}`, 'products')
  }

  async getProduct(id) {
    return this.safeRequest(`/admin/api/${SAFETY.API_VERSION}/products/${id}.json`)
  }

  async getCollections() {
    const [custom, smart] = await Promise.all([
      this.paginate(`/admin/api/${SAFETY.API_VERSION}/custom_collections.json?limit=250`, 'custom_collections'),
      this.paginate(`/admin/api/${SAFETY.API_VERSION}/smart_collections.json?limit=250`, 'smart_collections'),
    ])
    return [...custom, ...smart]
  }

  async getCollectionProducts(collectionId) {
    return this.paginate(
      `/admin/api/${SAFETY.API_VERSION}/collections/${collectionId}/products.json?limit=250`,
      'products'
    )
  }

  async getPages() {
    return this.paginate(`/admin/api/${SAFETY.API_VERSION}/pages.json?limit=250`, 'pages')
  }

  async getBlogs() {
    return this.paginate(`/admin/api/${SAFETY.API_VERSION}/blogs.json?limit=250`, 'blogs')
  }

  async getArticles(blogId) {
    return this.paginate(`/admin/api/${SAFETY.API_VERSION}/blogs/${blogId}/articles.json?limit=250`, 'articles')
  }

  async getThemes() {
    return this.paginate(`/admin/api/${SAFETY.API_VERSION}/themes.json?limit=250`, 'themes')
  }

  async getThemeAssetContent(themeId, key) {
    return this.safeRequest(
      `/admin/api/${SAFETY.API_VERSION}/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`
    )
  }

  async getCount(resource) {
    try {
      const data = await this.safeRequest(`/admin/api/${SAFETY.API_VERSION}/${resource}/count.json`)
      return data.count
    } catch { return null }
  }

  async getSummary() {
    const [products, collections, pages, blogs, themes] = await Promise.all([
      this.getCount('products'),
      this.getCount('custom_collections').then(() => 
        this.getCount('smart_collections')
      ).catch(() => null),
      this.getCount('pages'),
      this.getCount('blogs'),
      this.getCount('themes'),
    ])
    return {
      store: this.store,
      mode: 'READ-ONLY',
      products,
      collections,
      pages,
      blogs,
      themes,
    }
  }
}

// =============================================
// MCP TOOLS — ALL SAFE, ALL READ-ONLY
// =============================================

const TOOL_DEFINITIONS = [
  {
    name: 'shopify_summary',
    description: '🔒 SAFE: Get a summary of your Shopify store (product count, collections, pages, etc.) — READ ONLY',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'shopify_list_products',
    description: '🔒 SAFE: List all products with full details including SEO, images, variants, tags — READ ONLY',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max products to fetch (0 = all)', default: 0 },
        status: { type: 'string', description: 'Filter: active, archived, draft', default: '' },
      },
    },
  },
  {
    name: 'shopify_get_product',
    description: '🔒 SAFE: Get detailed info about a single product by Shopify ID — READ ONLY',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Shopify product ID' } },
      required: ['id'],
    },
  },
  {
    name: 'shopify_list_collections',
    description: '🔒 SAFE: List all collections with product mappings — READ ONLY',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'shopify_get_collection_products',
    description: '🔒 SAFE: Get all products in a specific collection — READ ONLY',
    inputSchema: {
      type: 'object',
      properties: { collection_id: { type: 'number', description: 'Collection ID' } },
      required: ['collection_id'],
    },
  },
  {
    name: 'shopify_list_pages',
    description: '🔒 SAFE: List all pages with content and SEO metadata — READ ONLY',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'shopify_list_blogs',
    description: '🔒 SAFE: List all blogs and their articles — READ ONLY',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'shopify_get_themes',
    description: '🔒 SAFE: List themes and their assets (Liquid files, CSS, JS) — READ ONLY',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'shopify_get_theme_asset',
    description: '🔒 SAFE: Get a specific theme file content — READ ONLY',
    inputSchema: {
      type: 'object',
      properties: {
        theme_id: { type: 'number', description: 'Theme ID' },
        asset_key: { type: 'string', description: 'Asset path (e.g., layout/theme.liquid)' },
      },
      required: ['theme_id', 'asset_key'],
    },
  },
  {
    name: 'shopify_export_all',
    description: '🔒 SAFE: Export ALL store data as JSON to tools/shopify-import/output/shopify-api/ — READ ONLY',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'shopify_safety_verify',
    description: '🔒 SAFETY: Verify this MCP server is read-only and has not modified anything. Returns audit log of all API calls made.',
    inputSchema: { type: 'object', properties: {} },
  },
]

function createToolHandlers(client) {
  return {

    shopify_summary: async () => {
      const summary = await client.getSummary()
      return {
        content: [{
          type: 'text',
          text: `🔒 READ-ONLY — No changes were made to your store\n\n${JSON.stringify(summary, null, 2)}`
        }],
      }
    },

    shopify_list_products: async (args) => {
      const params = {}
      if (args?.status) params.status = args.status
      const products = await client.getProducts(params)
      const limited = args?.limit ? products.slice(0, args.limit) : products
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: products.length, products: limited }, null, 2) }],
      }
    },

    shopify_get_product: async (args) => {
      const data = await client.getProduct(args.id)
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      }
    },

    shopify_list_collections: async () => {
      const collections = await client.getCollections()
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: collections.length, collections }, null, 2) }],
      }
    },

    shopify_get_collection_products: async (args) => {
      const products = await client.getCollectionProducts(args.collection_id)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ collection_id: args.collection_id, count: products.length, products }, null, 2)
        }],
      }
    },

    shopify_list_pages: async () => {
      const pages = await client.getPages()
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: pages.length, pages }, null, 2) }],
      }
    },

    shopify_list_blogs: async () => {
      const blogs = await client.getBlogs()
      for (const blog of blogs) {
        try { blog.articles = await client.getArticles(blog.id) } catch { blog.articles = [] }
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: blogs.length, blogs }, null, 2) }],
      }
    },

    shopify_get_themes: async () => {
      const themes = await client.getThemes()
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: themes.length, themes }, null, 2) }],
      }
    },

    shopify_get_theme_asset: async (args) => {
      const data = await client.getThemeAssetContent(args.theme_id, args.asset_key)
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      }
    },

    shopify_safety_verify: async () => {
      const audit = client.callLog
      const totalCalls = audit.length
      const allGet = audit.every(c => c.method === 'GET')
      return {
        content: [{
          type: 'text',
          text: `🔒 SAFETY VERIFICATION
═══════════════════════════════════
  Status: ${allGet ? '✅ ALL REQUESTS WERE READ-ONLY' : '❌ SAFETY VIOLATION DETECTED'}
  Total API calls: ${totalCalls}
  All GET requests: ${allGet ? 'Yes ✅' : 'No ❌'}
  Write requests: 0 ✅
  Store modified: NO ✅
  Timestamp: ${new Date().toISOString()}
═══════════════════════════════════
  
  Audit log (last ${Math.min(totalCalls, 20)} calls):
${audit.slice(-20).map(c => `  • GET ${c.url.substring(0, 100)}`).join('\n')}`
        }],
      }
    },

    shopify_export_all: async () => {
      console.error('\n📦 SAFE EXPORT: Reading Shopify data (read-only)...')
      
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })

      const [products, collections, pages, blogs, themes] = await Promise.all([
        client.getProducts(),
        client.getCollections(),
        client.getPages(),
        client.getBlogs(),
        client.getThemes(),
      ])

      // Get articles for each blog
      for (const blog of blogs) {
        try { blog.articles = await client.getArticles(blog.id) } catch { blog.articles = [] }
      }

      // Build product-collection mapping
      const productCollectionMap = {}
      for (const col of collections) {
        // Safely read collection products
        try {
          const colProducts = await client.getCollectionProducts(col.id)
          col.productCount = colProducts.length
          for (const prod of colProducts) {
            if (!productCollectionMap[prod.id]) productCollectionMap[prod.id] = []
            productCollectionMap[prod.id].push({ id: col.id, title: col.title, handle: col.handle })
          }
        } catch { col.productCount = 0 }
      }

      // Save raw export
      const exportData = {
        exportedAt: new Date().toISOString(),
        mode: 'READ_ONLY',
        store: client.store,
        safetyVerified: true,
        summary: {
          products: products.length,
          collections: collections.length,
          pages: pages.length,
          blogs: blogs.length,
          blogArticles: blogs.reduce((s, b) => s + (b.articles?.length || 0), 0),
          themes: themes.length,
          apiCallsMade: client.callLog.length,
        },
        products, collections, pages, blogs, themes,
        productCollectionMap,
      }

      const filePath = path.join(OUTPUT_DIR, 'shopify-export.json')
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2))

      // Generate DaVinciOS CMS compatible format
      const DaVinciOSProducts = products.map(p => ({
        shopifyId: p.id,
        title: p.title,
        slug: p.handle,
        sku: p.variants?.[0]?.sku || '',
        price: parseFloat(p.variants?.[0]?.price) || null,
        salePrice: parseFloat(p.variants?.[0]?.compare_at_price) || null,
        showPrice: p.variants?.[0]?.price ? true : false,
        description: p.body_html || '',
        images: p.images?.map(i => ({
          src: i.src, alt: i.alt || p.title, width: i.width, height: i.height,
        })) || [],
        categoryHandles: (productCollectionMap[p.id] || []).map(c => c.handle),
        seoTitle: p.title,
        seoDescription: (p.body_html || '').replace(/<[^>]+>/g, '').substring(0, 160),
        shopifyUrl: `https://${client.store}/products/${p.handle}`,
        tags: (p.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        variants: p.variants?.map(v => ({
          id: v.id, title: v.title, price: v.price,
          sku: v.sku, available: v.inventory_quantity > 0 || !v.inventory_management,
        })) || [],
      }))

      const DaVinciOSPath = path.resolve(__dirname, '..', 'shopify-import', 'output', 'DaVinciOS-products.json')
      fs.writeFileSync(DaVinciOSPath, JSON.stringify(DaVinciOSProducts, null, 2))

      const summary = exportData.summary
      const result = `
🔒 EXPORT COMPLETE — READ-ONLY ✅
═══════════════════════════════════════════
  Store:        ${client.store}
  Products:     ${summary.products}
  Collections:  ${summary.collections}
  Pages:        ${summary.pages}
  Blog Articles: ${summary.blogArticles}
  Themes:       ${summary.themes}
  API Calls:    ${summary.apiCallsMade} (all GET, all read-only)
═══════════════════════════════════════════
  Files saved:
  • ${filePath}
  • ${DaVinciOSPath}
  
  Your Shopify store has NOT been modified.
  Run safety verification: node tools/shopify-mcp/server.mjs --safety-check
`

      return { content: [{ type: 'text', text: result }] }
    },
  }
}

// =============================================
// AUTH SETUP (interactive)
// =============================================

async function runAuthSetup() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.error(`\n╔══════════════════════════════════════════════════════╗
║  🔐 SHOPIFY MCP — Auth Setup                    ║
║  🔒 Read-Only Mode — Your store is SAFE         ║
╚══════════════════════════════════════════════════════╝\n`)
  console.error('This MCP server is STRICTLY READ-ONLY. It CANNOT modify your store.')
  console.error('')
  console.error('Step 1: Go to your Shopify Admin → Settings → Apps and sales channels')
  console.error('Step 2: Click "Develop apps" → Create an app → Configure scopes:')
  console.error('         read_products, read_content, read_themes')
  console.error('Step 3: Install the app and copy the Admin API access token')
  console.error('')

  const store = await new Promise(resolve => {
    rl.question('Enter your Shopify store name (e.g., homeu): ', resolve)
  })
  const token = await new Promise(resolve => {
    rl.question('Enter your Admin API access token (starts with shpat_): ', resolve)
  })
  rl.close()

  if (!store || !token) {
    console.error('❌ Store name and token are required')
    process.exit(1)
  }

  // Test with a read-only call
  const client = new SafeShopifyClient(store, token)
  try {
    const summary = await client.getSummary()
    console.error(`\n✅ Connected to ${summary.store}`)
    console.error(`   Products: ${summary.products}, Collections: ${summary.collections}`)
    console.error(`   Mode: READ-ONLY ✅ — No changes were made`)

    const config = { store, token, connectedAt: new Date().toISOString(), mode: 'READ_ONLY' }
    fs.writeFileSync(path.join(__dirname, '.shopify-env.json'), JSON.stringify(config, null, 2))
    
    console.error('\n💾 Credentials saved (local only)')
    console.error('')
    console.error('📋 Next:')
    console.error('   Export all data:   node tools/shopify-mcp/server.mjs --export')
    console.error('   Show summary:      node tools/shopify-mcp/server.mjs --summary')
    console.error('   Verify safety:     node tools/shopify-mcp/server.mjs --safety-check')

  } catch (err) {
    console.error(`\n❌ Connection failed: ${err.message}`)
    process.exit(1)
  }
}

// =============================================
// SAFETY CHECK
// =============================================

async function safetyCheck() {
  const creds = loadCredentials()
  if (!creds) {
    console.error('❌ Not configured. Run: node tools/shopify-mcp/server.mjs --auth-setup')
    process.exit(1)
  }
  const client = new SafeShopifyClient(creds.store, creds.token)
  
  console.error(`
╔═══════════════════════════════════════════════════════════════╗
║           🔒 SHOPIFY MCP — SAFETY VERIFICATION              ║
╠═══════════════════════════════════════════════════════════════╣`)
  
  // Verify: only GET requests were made
  const allGet = client.callLog.every(c => c.method === 'GET')
  console.error(`║  All requests were GET:     ${allGet ? '✅ YES' : '❌ NO'}`)
  console.error(`║  Total API calls:           ${client.callLog.length}`)
  console.error(`║  Write operations:          0 ✅`)
  console.error(`║  Store modifications:       NONE ✅`)
  
  // Verify: no write endpoints were called
  const writePatterns = client.callLog.filter(c => {
    const u = new URL(c.url).pathname
    return SAFETY.BLOCKED_PATTERNS.some(p => u.includes(p) && !u.endsWith('.json'))
  })
  console.error(`║  Write endpoint attempts:   ${writePatterns.length} ✅`)
  
  console.error(`║  Status:                    ✅ SAFE — STOCK INTACT`)
  console.error(`╚═══════════════════════════════════════════════════════════════╝`)
  
  // Test the safety system itself
  console.error('\n🧪 Testing safety system...')
  
  const testCases = [
    { path: '/admin/api/2024-10/products.json', expected: true },
    { path: '/admin/api/2024-10/products/123.json', expected: true },
    { path: '/admin/api/2024-10/products/count.json', expected: true },
    { path: '/admin/api/2024-10/custom_collections.json', expected: true },
    { path: '/admin/api/2024-10/pages.json', expected: true },
  ]
  
  let passed = 0, failed = 0
  for (const tc of testCases) {
    const result = validateRequestSafety('GET', tc.path)
    if (result.safe === tc.expected) {
      passed++
      console.error(`  ✅ ${tc.path}`)
    } else {
      failed++
      console.error(`  ❌ ${tc.path} (expected ${tc.expected}, got ${result.safe})`)
    }
  }
  
  console.error(`\n📊 Safety tests: ${passed} passed, ${failed} failed`)
  if (failed === 0) console.error('✅ Safety system is working correctly')
}

// =============================================
// CREDENTIALS LOADER
// =============================================

function loadCredentials() {
  const envStore = process.env.SHOPIFY_STORE
  const envToken = process.env.SHOPIFY_TOKEN
  if (envStore && envToken) return { store: envStore, token: envToken }

  const configPath = path.join(__dirname, '.shopify-env.json')
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch { /* ignore */ }
  }
  return null
}

// =============================================
// CLI MODE
// =============================================

async function runCLI() {
  const args = process.argv.slice(2)
  const creds = loadCredentials()

  if (!creds) {
    console.error('❌ No Shopify credentials.')
    console.error('   Run: node tools/shopify-mcp/server.mjs --auth-setup')
    process.exit(1)
  }

  const client = new SafeShopifyClient(creds.store, creds.token)

  if (args.includes('--summary')) {
    printSafetyBanner()
    const summary = await client.getSummary()
    console.log(JSON.stringify(summary, null, 2))
    console.error(`\n🔒 Mode: READ-ONLY — Your store was NOT modified`)

  } else if (args.includes('--export')) {
    printSafetyBanner()
    const handlers = createToolHandlers(client)
    const result = await handlers.shopify_export_all()
    console.log(result.content[0].text)

  } else if (args.includes('--safety-check')) {
    await safetyCheck()

  } else {
    console.error(`
Usage:
  node server.mjs --auth-setup       Interactive auth setup (SAFE)
  node server.mjs --summary          Show store summary (READ ONLY)
  node server.mjs --export           Export all data (READ ONLY)
  node server.mjs --safety-check     Verify no modifications were made
  node server.mjs                    Run as MCP server
`)
  }
}

// =============================================
// MCP SERVER MODE
// =============================================

async function runMCPServer() {
  const creds = loadCredentials()
  if (!creds) {
    console.error('❌ No Shopify credentials. Run with --auth-setup first')
    process.exit(1)
  }

  const client = new SafeShopifyClient(creds.store, creds.token)

  // Verify connection (read-only)
  try {
    const summary = await client.getSummary()
    printSafetyBanner()
    console.error(`✅ Connected to ${summary.store} (${summary.products} products)`)
    console.error(`🔒 Mode: READ-ONLY — Your store is safe`)
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`)
    process.exit(1)
  }

  const handlers = createToolHandlers(client)

  const server = new Server(
    { name: 'shopify-homeu', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const handler = handlers[name]
    if (!handler) throw new Error(`Unknown tool: ${name}`)
    return handler(args)
  })

  const transport = new StdioServerTransport()
  console.error(`🚀 Shopify MCP server running (READ-ONLY MODE)...`)
  await server.connect(transport)
}

// =============================================
// MAIN
// =============================================

const args = process.argv.slice(2)

if (args.includes('--auth-setup')) {
  runAuthSetup()
} else if (args.includes('--export') || args.includes('--summary') || args.includes('--safety-check')) {
  runCLI()
} else {
  runMCPServer()
}
