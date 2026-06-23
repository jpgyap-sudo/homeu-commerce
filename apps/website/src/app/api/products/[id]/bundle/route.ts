/**
 * GET /api/products/[id]/bundle — "Buy these products together" offer
 *
 * Returns the active bundle configured for this product (if any): the
 * bundled partner product, its variants (for the storefront variant
 * picker), the configured quantity/discount, and pre-computed pricing so
 * the storefront widget doesn't need to re-derive the math.
 *
 * Public — no auth required (storefront read), mirrors /api/products/[id].
 */
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const productRes = await query(
      `SELECT id, title, slug, price, sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = products.id ORDER BY pi.sort_order ASC LIMIT 1) AS image_url
       FROM products WHERE slug = $1 OR id::text = $1 LIMIT 1`,
      [id]
    )
    if (productRes.rowCount === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const mainProduct = productRes.rows[0]

    // The shopper's currently-selected variant of the MAIN product (e.g. a
    // 10-seater table). Bundles can be tiered per variant — a 6-seater table
    // might pair with 6 chairs while a 10-seater pairs with 10 — mirroring
    // the original Bundler app. Prefer an exact trigger_variant_id match,
    // then fall back to the catch-all row (trigger_variant_id IS NULL).
    const url = new URL(request.url)
    const variantIdParam = url.searchParams.get('variantId')
    const selectedVariantId = variantIdParam ? parseInt(variantIdParam, 10) : null

    const bundleRes = await query(
      `SELECT b.*,
              p.title AS bundled_title, p.slug AS bundled_slug,
              p.price AS bundled_price, p.sale_price AS bundled_sale_price,
              (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS bundled_image_url
       FROM product_bundles b
       JOIN products p ON p.id = b.bundled_product_id
       WHERE b.product_id = $1 AND b.active = true
         AND (b.trigger_variant_id IS NULL OR b.trigger_variant_id = $2)
       ORDER BY (b.trigger_variant_id IS NOT NULL AND b.trigger_variant_id = $2) DESC, b.sort_order ASC
       LIMIT 1`,
      [mainProduct.id, selectedVariantId]
    )

    if (bundleRes.rowCount === 0) {
      return NextResponse.json({ bundle: null })
    }
    const b = bundleRes.rows[0]

    const variantsRes = await query(
      `SELECT id, title, sku, price, sale_price, inventory_quantity, is_default
       FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC`,
      [b.bundled_product_id]
    )
    const bundledVariants = variantsRes.rows.map((v: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: parseFloat(v.price),
      salePrice: v.sale_price ? parseFloat(v.sale_price) : null,
      inventoryQuantity: v.inventory_quantity,
      isDefault: v.is_default,
    }))

    const defaultVariant = bundledVariants.find((v: any) => v.id === b.bundled_variant_id)
      || bundledVariants.find((v: any) => v.isDefault)
      || bundledVariants[0]
      || null

    const mainPrice = parseFloat(mainProduct.sale_price || mainProduct.price || 0)
    const bundledUnitPrice = defaultVariant
      ? (defaultVariant.salePrice || defaultVariant.price)
      : parseFloat(b.bundled_sale_price || b.bundled_price || 0)
    const bundledQuantity = b.bundled_quantity
    const discountType: 'percent' | 'fixed' = b.discount_type
    const discountValue = parseFloat(b.discount_value)

    function applyDiscount(amount: number): number {
      if (discountType === 'fixed') return Math.max(0, amount - discountValue)
      return Math.max(0, amount * (1 - discountValue / 100))
    }

    const mainLineSubtotal = mainPrice
    const bundledLineSubtotal = bundledUnitPrice * bundledQuantity
    const subtotal = mainLineSubtotal + bundledLineSubtotal

    const mainLineDiscounted = discountType === 'percent' ? applyDiscount(mainLineSubtotal) : mainLineSubtotal
    const bundledLineDiscounted = discountType === 'percent' ? applyDiscount(bundledLineSubtotal) : bundledLineSubtotal
    const discountedTotal = discountType === 'percent'
      ? mainLineDiscounted + bundledLineDiscounted
      : applyDiscount(subtotal)

    return NextResponse.json({
      bundle: {
        id: b.id,
        discountType,
        discountValue,
        mainProduct: {
          id: mainProduct.id,
          title: mainProduct.title,
          slug: mainProduct.slug,
          imageUrl: mainProduct.image_url,
          price: mainLineSubtotal,
          discountedPrice: mainLineDiscounted,
        },
        bundledProduct: {
          id: b.bundled_product_id,
          title: b.bundled_title,
          slug: b.bundled_slug,
          imageUrl: b.bundled_image_url,
          quantity: bundledQuantity,
          unitPrice: bundledUnitPrice,
          price: bundledLineSubtotal,
          discountedPrice: bundledLineDiscounted,
          variants: bundledVariants,
          selectedVariantId: defaultVariant?.id ?? null,
        },
        subtotal,
        discountedTotal,
      },
    })
  } catch (err) {
    console.error('[api/products/:id/bundle] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch bundle' }, { status: 500 })
  }
}
