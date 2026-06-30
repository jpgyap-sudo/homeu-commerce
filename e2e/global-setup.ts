import { FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('E2E global setup: ready')
}

export default globalSetup
