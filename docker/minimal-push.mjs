#!/usr/bin/env node

/**
 * Minimal schema push — builds config in pure JS to avoid the tsx + top-level await issue.
 *
 * Usage (after copying to container):
 *   docker exec homeu-commerce-website-1 sh -c 'node /app/minimal-push.mjs'
 */

process.env.DATABASE_URI = process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@postgres:5432/homeu'
process.env.DAVINCIOS_SECRET = process.env.DAVINCIOS_SECRET || 'homeu-commerce-daVinciOS-secret-2026'
process.env.DAVINCIOS_PUBLIC_SERVER_URL = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'
process.env.NODE_ENV = 'production'

async function main() {
  console.log('=== DaVinciOS Schema Push (Minimal) ===')

  // Load DaVinciOS core and DB adapter
  const { buildConfig } = await import('/app/node_modules/DaVinciOS/dist/index.js')
  const { postgresAdapter } = await import('/app/node_modules/@DaVinciOScms/db-postgres/dist/index.js')

  // Load collection modules using tsx to handle .ts extension
  const { tsImport } = await import('tsx/esm/api')
  const baseUrl = new URL('/app/src/', import.meta.url).href

  const Products = (await tsImport(baseUrl + 'collections/Products.ts', import.meta.url)).Products
  const Categories = (await tsImport(baseUrl + 'collections/Categories.ts', import.meta.url)).Categories
  const Customers = (await tsImport(baseUrl + 'collections/Customers.ts', import.meta.url)).Customers
  const RFQRequests = (await tsImport(baseUrl + 'collections/RFQRequests.ts', import.meta.url)).RFQRequests
  const Media = (await tsImport(baseUrl + 'collections/Media.ts', import.meta.url)).Media
  const Pages = (await tsImport(baseUrl + 'collections/Pages.ts', import.meta.url)).Pages
  const Redirects = (await tsImport(baseUrl + 'collections/Redirects.ts', import.meta.url)).Redirects
  const Quotations = (await tsImport(baseUrl + 'collections/Quotations.ts', import.meta.url)).Quotations
  const SEOHealth = (await tsImport(baseUrl + 'globals/SEOHealth.ts', import.meta.url)).SEOHealth

  const serverURL = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const secret = process.env.DAVINCIOS_SECRET || ''

  // Build config — use a simple editor function instead of lexicalEditor()
  // to avoid the top-level await in @DaVinciOScms/richtext-lexical
  const config = buildConfig({
    admin: {
      meta: {
        title: 'HomeU Admin',
        titleSuffix: ' - HomeU Admin',
        description: 'HomeU catalog management.',
        applicationName: 'HomeU Admin',
      },
    },
    // Use the default editor (slate) instead of lexical to avoid TLA
    editor: undefined,
    collections: [Products, Categories, Customers, RFQRequests, Media, Pages, Redirects, Quotations],
    globals: [SEOHealth],
    secret,
    cors: [serverURL, 'https://store.homeu.ph', 'https://admin.homeu.ph'],
    csrf: [serverURL, 'https://store.homeu.ph', 'https://admin.homeu.ph'],
    cookiePrefix: 'homeu',
    db: postgresAdapter({
      pool: {
        connectionString: process.env.DATABASE_URI || '',
        max: 10,
        idleTimeoutMillis: 30000,
      },
    }),
  })

  console.log('Config built. Initializing DaVinciOS to trigger schema push...')

  const { getDaVinciOS } = await import('/app/node_modules/DaVinciOS/dist/index.js')

  await getDaVinciOS({
    config,
  })

  console.log('DaVinciOS initialized successfully!')
  console.log('Schema should now be pushed/migrated.')

  await new Promise((resolve) => setTimeout(resolve, 2000))
  process.exit(0)
}

main().catch((err) => {
  console.error('Schema push failed:', err)
  process.exit(1)
})
