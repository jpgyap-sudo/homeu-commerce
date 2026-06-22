import { query } from '@/lib/db'
import { getTemplateSections } from '@/lib/theme'
import { HomeSections } from '@/components/home/HomeSections'

export const dynamic = 'force-dynamic'

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; preview?: string }>
}) {
  const sp = await searchParams
  const categorySlug = sp.category || ''

  let activeCategory = null
  if (categorySlug) {
    const res = await query(
      `SELECT title, slug, image_url as "imageUrl", description FROM categories WHERE slug = $1 LIMIT 1`,
      [categorySlug]
    )
    activeCategory = res.rows[0] || null
  }

  const sections = await getTemplateSections('collection')

  return (
    <HomeSections
      sections={sections}
      preview={sp.preview !== undefined}
      context={{
        category: activeCategory || { title: 'Our Products', slug: '' },
      }}
    />
  )
}
