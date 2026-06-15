#!/usr/bin/env node

/**
 * Direct schema push - builds config in pure JS to avoid TS loading issues.
 * 
 * Usage:
 *   docker exec homeu-commerce-website-1 sh -c 'node /app/push-direct.mjs'
 */

process.env.DATABASE_URI = process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@postgres:5432/homeu'
process.env.DAVINCIOS_SECRET = process.env.DAVINCIOS_SECRET || 'homeu-commerce-daVinciOS-secret-2026'
process.env.DAVINCIOS_PUBLIC_SERVER_URL = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'
process.env.NODE_ENV = 'production'
process.env.DAVINCIOS_CONFIG_PATH = './src/daVinciOS.config.ts'

async function main() {
  console.log('=== DaVinciOS Schema Push (Direct) ===')
  console.log('Loading DaVinciOS modules...')

  const { buildConfig } = await import('/app/node_modules/@davincios/cms/dist/index.js')
  const { postgresAdapter } = await import('/app/node_modules/@davincios/db-postgres/dist/index.js')
  const { lexicalEditor } = await import('/app/node_modules/@davincios/richtext-lexical/dist/index.js')
  
  console.log('Loading collection modules...')
  
  const { Products } = await import('/app/src/collections/Products.ts')
  const { Categories } = await import('/app/src/collections/Categories.ts')
  const { Customers } = await import('/app/src/collections/Customers.ts')
  const { RFQRequests } = await import('/app/src/collections/RFQRequests.ts')
  const { Media } = await import('/app/src/collections/Media.ts')
  const { Pages } = await import('/app/src/collections/Pages.ts')
  const { Redirects } = await import('/app/src/collections/Redirects.ts')
  const { Quotations } = await import('/app/src/collections/Quotations.ts')
  const { SEOHealth } = await import('/app/src/globals/SEOHealth.ts')

  const serverURL = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const secret = process.env.DAVINCIOS_SECRET || ''

  const config = buildConfig({
    admin: {
      meta: {
        title: 'HomeU Admin',
        titleSuffix: ' - HomeU Admin',
        description: 'HomeU catalog, customer, RFQ, media, page, and redirect operations.',
        applicationName: 'HomeU Admin',
      },
    },
    editor: lexicalEditor(),
    collections: [Products, Categories, Customers, RFQRequests, Media, Pages, Redirects, Quotations],
    globals: [SEOHealth],
    secret,
    cors: [
      serverURL,
      'https://store.homeu.ph',
      'https://admin.homeu.ph',
    ],
    csrf: [
      serverURL,
      'https://store.homeu.ph',
      'https://admin.homeu.ph',
    ],
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

  const { getDaVinciOS } = await import('/app/node_modules/@davincios/cms/dist/index.js')

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
