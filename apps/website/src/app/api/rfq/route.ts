import { NextRequest, NextResponse } from 'next/server'
import { generatePricingSuggestions } from '@/utils/ollama-utils'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { extractDimensionsFromDescription, extractMaterialsFromDescription } from '@/lib/format-utils'

type RFQItemInput = {
  product?: string
  productTitleSnapshot?: string
  title?: string
  skuSnapshot?: string
  sku?: string
  unitPriceSnapshot?: number
  price?: number
  quantity?: number
  notes?: string
}

/**
 * GET /api/rfq — list RFQ requests (admin only)
 * Query params: ?limit=50&offset=0&status=new&search=...
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const id = searchParams.get('id')

    // Single RFQ detail
    if (id) {
      const r = await query(
        `SELECT r.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
         FROM rfq_requests r
         LEFT JOIN customers c ON r.customer_id = c.id
         WHERE r.id = $1`,
        [parseInt(id)]
      )
      if (r.rows.length === 0) {
        return NextResponse.json({ error: 'RFQ not found' }, { status: 404 })
      }
      // Fetch items with product metadata and images
      const itemsResult = await query(
        `SELECT ri.*,
                p.materials AS product_materials,
                p.dimensions AS product_dimensions,
                p.description AS product_description,
                (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image_url
         FROM rfq_request_items ri
         LEFT JOIN products p ON ri.product_id = p.id
         WHERE ri.rfq_request_id = $1
         ORDER BY ri.id`,
        [parseInt(id)]
      )

      const items = itemsResult.rows.map(item => {
        let materials = item.product_materials
        let dimensions = item.product_dimensions
        if (!materials || !materials.trim()) {
          materials = extractMaterialsFromDescription(item.product_description)
        }
        if (!dimensions || !dimensions.trim()) {
          dimensions = extractDimensionsFromDescription(item.product_description)
        }
        return {
          ...item,
          product_materials: materials,
          product_dimensions: dimensions
        }
      })

      return NextResponse.json({ ...r.rows[0], items })
    }

    // List query
    const conditions: string[] = []
    const values: any[] = []
    let idx = 0

    if (status) {
      idx++
      conditions.push(`r.status = $${idx}`)
      values.push(status)
    }
    if (search) {
      idx++
      conditions.push(
        `(LOWER(COALESCE(r.customer_name,'')) LIKE LOWER($${idx}) OR LOWER(COALESCE(r.email,'')) LIKE LOWER($${idx}))`
      )
      values.push(`%${search}%`)
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRes = await query(
      `SELECT COUNT(*) as total FROM rfq_requests r ${whereSQL}`,
      values
    )
    const total = parseInt(countRes.rows[0]?.total || '0')

    idx++
    const rows = await query(
      `SELECT r.*, r.customer_name, r.email, r.phone
       FROM rfq_requests r
       ${whereSQL}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    )

    return NextResponse.json({
      rfqs: rows.rows,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('RFQ GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customer, customerName, email, phone, deliveryLocation, projectType, notes, address, message, items } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    // Determine customer ID from body.customer or look up / create by email
    let customerId: number | null = null

    // If customer is provided as an object with id, extract it
    if (customer && typeof customer === 'object' && customer.id) {
      customerId = parseInt(customer.id) || null
    } else if (customer && typeof customer === 'string') {
      customerId = parseInt(customer) || null
    }

    // If no customerId yet, look up or create by email
    if (!customerId) {
      const existing = await query('SELECT id FROM customers WHERE email = $1 LIMIT 1', [email.toLowerCase()])
      if (existing.rows.length > 0) {
        customerId = existing.rows[0].id
      } else if (customerName) {
        const newCustomer = await query(
          'INSERT INTO customers (email, name, phone, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
          [email.toLowerCase(), customerName, phone || '']
        )
        customerId = newCustomer.rows[0].id
      }
    }

    // Create RFQ request with ALL fields
    const rfqResult = await query(
      `INSERT INTO rfq_requests (customer_id, customer_name, email, phone, delivery_location, project_type, notes, address, message, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', NOW(), NOW()) RETURNING *`,
      [
        customerId,
        customerName || '',
        email,
        phone || '',
        deliveryLocation || '',
        projectType || '',
        notes || '',
        address || '',
        message || '',
      ]
    )
    const rfq = rfqResult.rows[0]

    // Add items if provided — use snapshot fields
    // Auto-create rfq_request_items table if it doesn't exist (safety for
    // deployments where migrations haven't been applied)
    if (items && Array.isArray(items) && items.length > 0) {
      try {
        await query(`SELECT 1 FROM rfq_request_items LIMIT 0`, [])
      } catch {
        await query(
          `CREATE TABLE IF NOT EXISTS rfq_request_items (
            id SERIAL PRIMARY KEY,
            rfq_request_id INTEGER NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
            product_title_snapshot TEXT DEFAULT '',
            sku_snapshot TEXT DEFAULT '',
            unit_price_snapshot NUMERIC DEFAULT 0,
            quantity NUMERIC DEFAULT 1 NOT NULL,
            notes TEXT DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`, []
        )
      }
      for (const item of items as RFQItemInput[]) {
        const productTitleSnapshot = item.productTitleSnapshot || item.title || ''
        const skuSnapshot = item.skuSnapshot || item.sku || ''
        const unitPriceSnapshot = item.unitPriceSnapshot || item.price || 0
        const itemNotes = item.notes || ''
        await query(
          `INSERT INTO rfq_request_items (rfq_request_id, product_id, product_title_snapshot, sku_snapshot, unit_price_snapshot, quantity, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [rfq.id, item.product || null, productTitleSnapshot, skuSnapshot, unitPriceSnapshot, item.quantity || 1, itemNotes]
        )
      }
    }

    // Generate AI pricing suggestions
    let aiSuggestions: string = ''
    try {
      aiSuggestions = await generatePricingSuggestions(message || '')
    } catch {
      // AI suggestions are optional
    }

    // Admin notification email — uses the admin's DB-configured SMTP settings
    // (Settings -> Email), not raw env vars, which are unset in production.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeu.ph'
    try {
      const { createMailTransporter, loadSmtpConfig } = await import('@/lib/smtp-config')
      const smtp = await loadSmtpConfig()
      const transporter = await createMailTransporter()
      await transporter.sendMail({
        from: smtp.from || 'noreply@homeu.ph',
        to: smtp.salesEmail || smtp.from || 'admin@homeu.ph',
        subject: `New RFQ Request from ${customerName || email}`,
        text: `New RFQ Request\n\nCustomer: ${customerName || 'N/A'}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nMessage: ${message || 'N/A'}\n\nItems: ${items ? JSON.stringify(items) : 'None'}\n\nView: ${process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'}/admin/rfq/${rfq.id}`,
      })
    } catch (err: any) {
      console.error('[rfq] admin notification email failed:', err.message)
    }

    // Customer confirmation email — previously the customer got nothing in
    // their inbox at all, no proof their RFQ was received and no way back
    // to track it short of staying logged in and finding it in their
    // dashboard. This is the receipt.
    if (email) {
      try {
        const { createMailTransporter, loadSmtpConfig } = await import('@/lib/smtp-config')
        const smtp = await loadSmtpConfig()
        const transporter = await createMailTransporter()
        const trackingLink = `${siteUrl}/customer/rfq/${rfq.id}`
        const itemLines = (items || [])
          .map((i: RFQItemInput) => `  • ${i.productTitleSnapshot || i.title || 'Item'} × ${i.quantity || 1}`)
          .join('\n')
        await transporter.sendMail({
          from: smtp.from || 'noreply@homeu.ph',
          to: email,
          subject: `We received your quotation request — RFQ #${String(rfq.id).padStart(6, '0')}`,
          text: `Hi ${customerName || 'there'},\n\nThanks for your request for quotation! Our team will review it and get back to you shortly.\n\nReference: RFQ #${String(rfq.id).padStart(6, '0')}\n${itemLines ? `\nItems:\n${itemLines}\n` : ''}\nTrack your request anytime: ${trackingLink}\n\n— Home Atelier Team`,
        })
      } catch (err: any) {
        console.error('[rfq] customer confirmation email failed:', err.message)
      }
    }

    // Telegram alert — same channel used elsewhere (leads, appointments)
    try {
      const { sendTelegramAlert } = await import('@/lib/chatbot/telegram-client')
      await sendTelegramAlert({
        eventType: 'RFQ_SUBMITTED',
        leadName: customerName || email,
        mobile: phone || undefined,
        email,
        summary: message || `${items?.length || 0} item(s) requested`,
        adminUrl: `${process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'}/admin/rfq/${rfq.id}`,
      })
    } catch { /* best-effort */ }

    // Auto-subscribe to newsletter
    try {
      if (email) {
        await query(
          `INSERT INTO newsletter_subscribers (email, source)
           VALUES ($1, 'rfq') ON CONFLICT (email) DO NOTHING`,
          [email.toLowerCase().trim()]
        )
      }
    } catch { /* best-effort */ }

    return NextResponse.json({
      success: true,
      rfqId: rfq.id,
      rfq,
      aiSuggestions,
    }, { status: 201 })
  } catch (error: any) {
    console.error('RFQ POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit RFQ request' },
      { status: 500 }
    )
  }
}
