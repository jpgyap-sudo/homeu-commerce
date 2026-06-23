import { query } from '@/lib/db'
import { getTemplateSections } from '@/lib/theme'
import { HomeSections } from '@/components/home/HomeSections'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams

  const result = await query(
    `SELECT p.*,
            (SELECT row_to_json(c.*) FROM categories c WHERE c.id = p.category_id) as category,
            (SELECT json_agg(row_to_json(pi.*) ORDER BY pi.sort_order)
             FROM product_images pi WHERE pi.product_id = p.id) as images,
            (SELECT json_agg(row_to_json(pv.*) ORDER BY pv.sort_order)
             FROM product_variants pv WHERE pv.product_id = p.id) as variants
     FROM products p
     WHERE p.slug = $1 AND p.status = 'active'
     LIMIT 1`,
    [slug]
  )

  if (result.rows.length === 0) {
    notFound()
  }

  const p = result.rows[0]
  const images = p.images || []
  const variants = (p.variants || []).map((v: any) => ({
    id: v.id,
    title: v.title,
    sku: v.sku,
    price: parseFloat(v.price),
    salePrice: v.sale_price ? parseFloat(v.sale_price) : null,
    inventoryQuantity: v.inventory_quantity,
    isDefault: v.is_default,
  }))

  const product = {
    id: p.id,
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    price: p.sale_price || p.price,
    originalPrice: p.price,
    salePrice: p.sale_price,
    showPrice: p.show_price,
    priceNote: p.price_note,
    description: p.description,
    dimensions: p.dimensions,
    materials: p.materials,
    category: p.category,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    images,
    imageUrl: images[0]?.url || null,
    tags: p.tags || [],
    variants,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }

  const sections = await getTemplateSections('product')

  return (
    <HomeSections
      sections={sections}
      preview={sp.preview !== undefined}
      context={{ product }}
    />
  )
}
