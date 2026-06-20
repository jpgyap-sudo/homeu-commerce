import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { generatePricingSuggestions } from '@/utils/ollama-utils'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

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
      // Fetch items
      const items = await query(
        `SELECT * FROM rfq_request_items WHERE rfq_request_id = $1 ORDER BY id`,
        [parseInt(id)]
      )
      return NextResponse.json({ ...r.rows[0], items: items.rows })
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW()) RETURNING *`,
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
    if (items && Array.isArray(items)) {
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

    // Email notification
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@homeu.ph',
        to: process.env.NOTIFICATION_EMAIL || 'admin@homeu.ph',
        subject: `New RFQ Request from ${customerName || email}`,
        text: `New RFQ Request\n\nCustomer: ${customerName || 'N/A'}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nMessage: ${message || 'N/A'}\n\nItems: ${items ? JSON.stringify(items) : 'None'}`,
      })
    } catch {
      // Email is optional
    }

    return NextResponse.json({
      success: true,
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
