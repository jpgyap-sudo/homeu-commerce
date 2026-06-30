import { test as base, Page } from '@playwright/test'

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3000'
const STORE_URL = process.env.STORE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@homeatelier.ph'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'admin'

export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ browser }, use) => {
    const page = await browser.newPage({ baseURL: ADMIN_URL })
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'
export { ADMIN_URL, STORE_URL }
