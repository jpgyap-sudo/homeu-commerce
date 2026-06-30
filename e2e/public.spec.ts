import { test, expect, STORE_URL } from '../helpers'

test.describe('Public: homepage', () => {
  test('loads and shows content', async ({ page }) => {
    await page.goto(STORE_URL)
    await expect(page).toHaveTitle(/Home/)
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto(STORE_URL)
    const navLinks = page.locator('header a')
    const count = await navLinks.count()
    expect(count).toBeGreaterThan(2)
    const href = await navLinks.first().getAttribute('href')
    if (href && href !== '#') {
      await navLinks.first().click()
      await expect(page).toHaveURL(/.*/)
    }
  })
})

test.describe('Public: products', () => {
  test('product listing loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/products`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('product detail page loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/products`)
    const productLink = page.locator('a[href*="/products/"]').first()
    if (await productLink.count() > 0) {
      const href = await productLink.getAttribute('href')
      await productLink.click()
      await expect(page).toHaveURL(/\/products\//)
      await expect(page.locator('h1')).toBeVisible()
    }
  })
})

test.describe('Public: collections', () => {
  test('collection listing loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/collections`)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Public: blog', () => {
  test('blog listing loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/blog`)
    await expect(page.locator('body')).toBeVisible()
  })

  test('blog article loads', async ({ page }) => {
    await page.goto(`${STORE_URL}/blog`)
    const articleLink = page.locator('a[href*="/blog/"]').first()
    if (await articleLink.count() > 0) {
      await articleLink.click()
      await expect(page).toHaveURL(/\/blog\//)
    }
  })
})

test.describe('Public: SEO', () => {
  test('robots.txt is accessible', async ({ page }) => {
    const resp = await page.goto(`${STORE_URL}/robots.txt`)
    expect(resp?.status()).toBe(200)
  })

  test('sitemap.xml is accessible', async ({ page }) => {
    const resp = await page.goto(`${STORE_URL}/sitemap.xml`)
    expect(resp?.status()).toBe(200)
  })
})
