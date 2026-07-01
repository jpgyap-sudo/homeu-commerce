import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateQuotationPDF } from '@/lib/generate-quotation-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const { rows } = await query(
      `SELECT q.*,
        COALESCE(
          NULLIF(q.items, '[]'::jsonb),
          (SELECT jsonb_agg(jsonb_build_object(
            'productId', qi.product_id,
            'description', qi.title,
            'quantity', qi.quantity,
            'unitCost', qi.unit_price,
            'discountedCost', qi.unit_price,
            'total', qi.total_price
          )) FROM quotations_items qi WHERE qi.quotation_id = q.id),
          '[]'::jsonb
        ) as pdf_items
       FROM quotations q WHERE q.id = $1`,
      [id]
    )

    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const q = rows[0]

    const themeRes = await query(`SELECT value FROM site_settings WHERE key = $1`, ['theme_quotation'])
    const baseTheme = themeRes.rows[0]?.value || null
    const overrides = q.theme_overrides || null
    const theme = baseTheme || overrides ? { ...(baseTheme || {}), ...(overrides || {}) } : null

    // Process items and fetch image base64 data URIs asynchronously
    const processedItems = []
    for (const item of (q.pdf_items || [])) {
      let imageUrl = item.imageUrl || item.image_url || ''
      const productId = item.productId || item.product_id || item.product

      if (!imageUrl && productId) {
        try {
          const imgRes = await query(
            `SELECT m.url 
             FROM products_rels r 
             JOIN media m ON m.id = r.media_id 
             WHERE r.parent_id = $1 AND r.path = 'images' 
             ORDER BY r.order ASC LIMIT 1`,
            [productId]
          )
          if (imgRes.rows.length > 0) {
            imageUrl = imgRes.rows[0].url
          }
        } catch (e) {
          console.error('Error fetching product image for PDF:', e)
        }
      }

      let base64Image = null
      if (imageUrl) {
        let fullUrl = imageUrl
        if (imageUrl.startsWith('/')) {
          const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || 'https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com'
          fullUrl = `${cdnBase.replace(/\/$/, '')}${imageUrl}`
        }
        try {
          const fetchRes = await fetch(fullUrl)
          if (fetchRes.ok) {
            const buf = Buffer.from(await fetchRes.arrayBuffer())
            const mime = fetchRes.headers.get('content-type') || 'image/jpeg'
            base64Image = `data:${mime};base64,${buf.toString('base64')}`
          }
        } catch (e) {
          console.error(`Error downloading image for PDF (${fullUrl}):`, e)
        }
      }

      processedItems.push({
        ...item,
        imageUrl: base64Image || imageUrl || ''
      })
    }

    const pdfBuffer = await generateQuotationPDF({
      id: q.id,
      quotationNumber: q.quotation_number,
      title: q.title,
      customerName: q.customer_name,
      customerEmail: q.customer_email || q.email,
      email: q.email || q.customer_email,
      phone: q.phone,
      deliveryLocation: q.delivery_location,
      projectType: q.project_type,
      status: q.status,
      items: processedItems,
      subtotal: Number(q.subtotal || 0),
      shippingCost: Number(q.shipping_cost || 0),
      total: Number(q.total || 0),
      grandTotal: Number(q.grand_total || q.total || 0),
      notes: q.notes,
      termsDeliveryLeadtime: q.terms_delivery_leadtime,
      termsPaymentTerms: q.terms_payment_terms,
      termsWarranty: q.terms_warranty,
      termsBankDetails: q.terms_bank_details,
      termsCancellationPolicy: q.terms_cancellation_policy,
      termsReturnPolicy: q.terms_return_policy,
      termsRejectionOfItems: q.terms_rejection_of_items,
      termsRefundPolicy: q.terms_refund_policy,
      validUntil: q.valid_until,
      createdAt: q.created_at,
    }, theme)
    const filenameName = String(q.customer_name || 'homeu').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '')
    const disposition = searchParams.get('preview') === '1' ? 'inline' : 'attachment'

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="quotation-${q.quotation_number || id}-${filenameName || 'homeu'}.pdf"`,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
