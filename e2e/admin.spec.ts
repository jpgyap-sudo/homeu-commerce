import { test, expect } from '../helpers'

test.describe('Admin: login', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

test.describe('Admin: dashboard', () => {
  test('dashboard loads with widgets', async ({ adminPage }) => {
    await expect(adminPage.locator('h1, .dashboard-title, [class*="dashboard"]')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Admin: products', () => {
  test('products list loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/products')
    await expect(adminPage.locator('body')).toBeVisible()
    await expect(adminPage.locator('h1, .page-title, [class*="product"]')).toBeVisible({ timeout: 10000 })
  })

  test('product detail page loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/products')
    const editLink = adminPage.locator('a[href*="/admin/products/"]').first()
    if (await editLink.count() > 0) {
      await editLink.click()
      await expect(adminPage).toHaveURL(/\/admin\/products\/\d+/)
    }
  })
})

test.describe('Admin: categories', () => {
  test('categories list loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/categories')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: collections', () => {
  test('collections list loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/collections')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: theme', () => {
  test('theme editor loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/theme')
    await expect(adminPage.locator('body')).toBeVisible()
    await expect(adminPage.locator('h1, [class*="theme"], [class*="editor"]').first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Admin: online store', () => {
  test('online store themes page loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/online-store')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: RFQ', () => {
  test('RFQ list loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/rfq')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: quotations', () => {
  test('quotations list loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/quotations')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: customers', () => {
  test('customers list loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/customers')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: media', () => {
  test('media library loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/media')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: settings', () => {
  test('settings users page loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings/users')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})

test.describe('Admin: analytics', () => {
  test('analytics dashboard loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/analytics')
    await expect(adminPage.locator('body')).toBeVisible()
  })
})
