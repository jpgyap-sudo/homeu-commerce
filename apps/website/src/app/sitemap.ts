import { MetadataRoute } from 'next'
import { query } from '@/lib/db'

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeu.ph'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/products`, lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/blog`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/search`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const [products, categories, articles, pages] = await Promise.all([
    query('SELECT slug, updated_at FROM products', []).catch(() => ({ rows: [] })),
    query('SELECT slug FROM categories', []).catch(() => ({ rows: [] })),
    query(`SELECT a.handle, a.updated_at, b.handle as blog_handle
           FROM articles a JOIN blogs b ON b.id = a.blog_id`, []).catch(() => ({ rows: [] })),
    query(`SELECT slug, updated_at FROM pages WHERE status = 'published'`, []).catch(() => ({ rows: [] })),
  ])

  const productRoutes: MetadataRoute.Sitemap = products.rows.map((p: any) => ({
    url: `${BASE}/products/${p.slug}`,
    lastModified: p.updated_at || now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = categories.rows.map((c: any) => ({
    url: `${BASE}/products?category=${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const articleRoutes: MetadataRoute.Sitemap = articles.rows.map((a: any) => ({
    url: `${BASE}/blog/${a.blog_handle}/${a.handle}`,
    lastModified: a.updated_at || now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const pageRoutes: MetadataRoute.Sitemap = pages.rows.map((p: any) => ({
    url: `${BASE}/pages/${p.slug}`,
    lastModified: p.updated_at || now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...articleRoutes, ...pageRoutes]
}
