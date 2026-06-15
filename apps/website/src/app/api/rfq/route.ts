import { NextRequest, NextResponse } from 'next/server'
import { default as DaVinciOSConfig } from '@DaVinciOS-config'
import nodemailer from 'nodemailer'
import { generatePricingSuggestions } from '@/utils/ollama-utils'
import { getDaVinciOSClient } from '@/lib/daVinciOS'

type RFQItemInput = {
  product?: string
  productTitleSnapshot?: string
  title?: string
  skuSnapshot?: string
  sku?: string
  unitPriceSnapshot?: number
  price?: number
  quantity?: number
}

function normalizeQuantity(quantity: unknown) {
  const numeric = Number(quantity)
  if (!Number.isFinite(numeric)) return 1
  return Math.max(1, Math.min(999, Math.floor(numeric)))
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return []

  return items
    .map((item: RFQItemInput) => {
      const title = item.productTitleSnapshot || item.title || ''
      const price = Number(item.unitPriceSnapshot ?? item.price ?? 0)

      return {
        product: item.product || undefined,
        productTitleSnapshot: String(title).trim(),
        skuSnapshot: item.skuSnapshot || item.sku || undefined,
        unitPriceSnapshot: Number.isFinite(price) ? Math.max(0, price) : 0,
        quantity: normalizeQuantity(item.quantity),
      }
    })
    .filter((item) => item.productTitleSnapshot)
}

function canSendEmail() {
  return Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM)
}

export async function POST(request: NextRequest) {
  try {
    const daVinciOS = await getDaVinciOSClient(DaVinciOSConfig)
    const body = await request.json()
    const items = normalizeItems(body.items)

    // Validate required fields
    if (!body.customerName || !body.phone || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, phone, or items' },
        { status: 400 }
      )
    }

    // Calculate estimated total
    const estimatedTotal = items.reduce((sum: number, item) => {
      const price = item.unitPriceSnapshot || 0
      const qty = item.quantity || 1
      return sum + price * qty
    }, 0)

    // Create RFQ request in DaVinciOS
    const rfq = await daVinciOS.create({
      collection: 'rfq-requests',
      data: {
        customer: body.customer || undefined,
        customerName: String(body.customerName).trim(),
        email: body.email ? String(body.email).trim() : undefined,
        phone: String(body.phone).trim(),
        deliveryLocation: body.deliveryLocation ? String(body.deliveryLocation).trim() : undefined,
        projectType: body.projectType || 'home',
        notes: body.notes ? String(body.notes).trim() : undefined,
        items,
        estimatedTotal,
        status: 'new',
      },
    })

    // Generate AI pricing suggestions
    let pricingSuggestions = ''
    try {
      pricingSuggestions = await generatePricingSuggestions(items)
    } catch (suggestionError) {
      console.warn('RFQ pricing suggestions skipped:', suggestionError)
    }

    // Send email notification
    if (canSendEmail() && body.email) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })

      const mailOptions = {
        from: `"HomeU RFQ Bot" <${process.env.EMAIL_FROM}>`,
        to: String(body.email).trim(),
        bcc: process.env.EMAIL_TO || undefined,
        subject: 'Your HomeU RFQ request was received',
        html: `
          <h2>Thank you for your RFQ request.</h2>
          <p>We've received your request for:</p>
          <ul>
            ${items.map((item) => `<li>${item.productTitleSnapshot} (x${item.quantity})</li>`).join('')}
          </ul>
          <p><strong>Estimated subtotal:</strong> ₱${estimatedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          ${pricingSuggestions ? `<p>${pricingSuggestions}</p>` : ''}
          <p>Our team will review availability, delivery, and final pricing before sending a formal quotation.</p>
        `,
      }

      await transporter.sendMail(mailOptions)
    }

    return NextResponse.json({ success: true, rfqId: rfq.id })
  } catch (error: any) {
    console.error('RFQ submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit RFQ' },
      { status: 500 }
    )
  }
}
