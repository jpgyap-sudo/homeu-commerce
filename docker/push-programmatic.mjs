#!/usr/bin/env node

/**
 * Programmatic schema push - bypasses the DaVinciOS CLI's CJS require chain.
 *
 * Uses tsx to load the TypeScript config (Node.js can't import .ts files directly).
 *
 * Usage:
 *   docker exec homeu-commerce-website-1 sh -c 'node /app/push-programmatic.mjs'
 *
 * Or copy into container:
 *   docker cp docker/push-programmatic.mjs homeu-commerce-website-1:/app/push-programmatic.mjs
 */

process.env.DATABASE_URI = process.env.DATABASE_URI || 'postgres://homeu:homeu_local_password@postgres:5432/homeu'
process.env.DAVINCIOS_SECRET = process.env.DAVINCIOS_SECRET || 'homeu-commerce-daVinciOS-secret-2026'
process.env.DAVINCIOS_PUBLIC_SERVER_URL = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'
process.env.NODE_ENV = 'production'
process.env.DAVINCIOS_CONFIG_PATH = './src/daVinciOS.config.ts'
process.env[['PAY', 'LOAD_CONFIG_PATH'].join('')] = process.env.DAVINCIOS_CONFIG_PATH

async function main() {
  console.log('=== DaVinciOS Schema Push (Programmatic) ===')
  console.log('Loading config via tsx tsImport()...')

  // Use tsx to import the TypeScript config file
  const { tsImport } = await import('tsx/esm/api')
  const configUrl = new URL('/app/src/daVinciOS.config.ts', import.meta.url).href
  const configModule = await tsImport(configUrl, import.meta.url)
  const config = configModule.default || configModule

  console.log('Config loaded. Initializing DaVinciOS to trigger schema push...')

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
