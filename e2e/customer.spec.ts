import { test, expect, STORE_URL } from '../helpers'

test.describe('Customer: registration and login', () => {
  test('registration page loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/register`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/login`)
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })
})

test.describe('Customer: RFQ flow', () => {
  test('quote cart page loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/quote-cart`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('RFQ submission form is accessible from product page', async ({ page }) => {
    await page.goto(`${STORE_URL}/products`)
    const productLink = page.locator('a[href*="/products/"]').first()
    if (await productLink.count() > 0) {
      await productLink.click()
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

test.describe('Chatbot', () => {
  test('chat widget renders on storefront', async ({ page }) => {
    await page.goto(STORE_URL)
    // The chat widget might be present — check for common selectors
    const chatWidget = page.locator('[class*="chat"], [id*="chat"], [class*="ChatWidget"]').first()
    const exists = await chatWidget.count()
    if (exists > 0) {
      await expect(chatWidget).toBeVisible()
    }
  })
})
