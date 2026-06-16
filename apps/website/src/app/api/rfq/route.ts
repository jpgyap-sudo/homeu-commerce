import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { generatePricingSuggestions } from '@/utils/ollama-utils'
import { query } from '@/lib/db'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, email, phone, address, message, items, productId, quantity } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      )
    }

    // Look up or create customer
    let customerId: number | null = null
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

    // Create RFQ request
    const rfqResult = await query(
      `INSERT INTO rfq_requests (customer_id, customer_name, email, phone, address, message, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW()) RETURNING *`,
      [customerId, customerName || '', email, phone || '', address || '', message || '']
    )
    const rfq = rfqResult.rows[0]

    // Add items if provided
    if (items && Array.isArray(items)) {
      for (const item of items as RFQItemInput[]) {
        await query(
          `INSERT INTO rfq_request_items (rfq_request_id, product, title, sku, unit_price, quantity, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [rfq.id, item.product || null, item.title || null, item.sku || null, item.unitPriceSnapshot || item.price || 0, item.quantity || 1]
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
