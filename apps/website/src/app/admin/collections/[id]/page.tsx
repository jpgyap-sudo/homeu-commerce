import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { query } from '@/lib/db'
import CollectionEditor, { type CollectionData } from '../CollectionEditor'

export const metadata = { title: 'Edit collection — DaVinciOS' }

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const { id } = await params

  const cRes = await query(`SELECT * FROM categories WHERE id = $1`, [id])
  if (cRes.rows.length === 0) notFound()
  const c = cRes.rows[0]

  const pRes = await query(
    `SELECT p.id, p.title, p.slug, p.price, p.sale_price, cp.source,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url
     FROM collection_products cp
     JOIN products p ON p.id = cp.product_id
     WHERE cp.collection_id = $1
     ORDER BY cp.position ASC
     LIMIT 500`,
    [id]
  )

  const initial: CollectionData = {
    id: c.id,
    title: c.title || '',
    slug: c.slug || '',
    description: c.description || '',
    imageUrl: c.image_url || '',
    bannerImageUrl: c.banner_image_url || '',
    bannerFocalX: c.banner_focal_x ?? 50,
    bannerFocalY: c.banner_focal_y ?? 50,
    bannerImageScale: c.banner_image_scale ?? 100,
    type: c.collection_type === 'smart' ? 'smart' : 'manual',
    rules: Array.isArray(c.rules) ? c.rules : [],
    rulesMatch: c.rules_match === 'any' ? 'any' : 'all',
    published: c.published !== false,
    featured: !!c.featured,
    position: c.position || 0,
    productSort: c.product_sort || 'manual',
    seoTitle: c.seo_title || '',
    seoDescription: c.seo_description || '',
    products: pRes.rows.map((p: any) => ({
      id: p.id, title: p.title, slug: p.slug,
      price: p.price, salePrice: p.sale_price,
      imageUrl: p.image_url || null, source: p.source,
    })),
  }

  return <CollectionEditor initial={initial} />
}
