import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const cameled: any = {}
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    cameled[camelKey] = snakeToCamel(obj[key])
    if (key === 'pending_revision' || key === 'revision_request') {
      cameled[key] = obj[key]
    }
  }
  return cameled
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const rfqId = searchParams.get('rfq')
    const customerId = searchParams.get('customer')

    const conditions: string[] = []
    const params: any[] = []

    if (status) {
      conditions.push(`status = $${params.length + 1}`)
      params.push(status)
    }
    if (rfqId) {
      conditions.push(`rfq_id = $${params.length + 1}`)
      params.push(rfqId)
    }
    if (customerId) {
      conditions.push(`customer_id = $${params.length + 1}`)
      params.push(customerId)
    }
    if (search) {
      conditions.push(`(quotation_number ILIKE $${params.length + 1} OR customer_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`)
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    const offset = (page - 1) * limit

    const countResult = await query(`SELECT COUNT(*) FROM quotations ${where}`, params)
    const totalDocs = parseInt(countResult.rows[0].count)

    const dataResult = await query(
      `SELECT *, TO_CHAR(valid_until, 'YYYY-MM-DD') as valid_until FROM quotations ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      docs: dataResult.rows.map(snakeToCamel),
      totalDocs,
      limit,
      page,
      totalPages: Math.ceil(totalDocs / limit),
    })
  } catch (error: any) {
    console.error('Quotations GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()

    if (!body.customerName || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName and phone are required' },
        { status: 400 }
      )
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: items must be a non-empty array' },
        { status: 400 }
      )
    }

    const maxResult = await query('SELECT COALESCE(MAX(id), 0) as max_id FROM quotations')
    const nextNum = parseInt(maxResult.rows[0].max_id) + 1
    const year = new Date().getFullYear()
    const quotationNumber = body.quotationNumber || `Q-${year}-${String(nextNum).padStart(4, '0')}`

    const result = await query(
      `INSERT INTO quotations (
        quotation_number, customer_name, customer_email, email, phone, status, notes,
        delivery_location, project_type, customer_id, rfq_id, items,
        subtotal, shipping_cost, total, grand_total, valid_until,
        terms_delivery_leadtime, terms_payment_terms, terms_warranty, terms_bank_details,
        terms_cancellation_policy, terms_return_policy, terms_rejection_of_items, terms_refund_policy,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW()
      ) RETURNING *`,
      [
        quotationNumber,
        body.customerName || '',
        body.email || '',
        body.email || '',
        body.phone || '',
        body.status || 'draft',
        body.notes || '',
        body.deliveryLocation || null,
        body.projectType || 'home',
        body.customer ? Number(body.customer) : null,
        body.rfq ? Number(body.rfq) : null,
        JSON.stringify(body.items || []),
        Number(body.subtotal) || 0,
        Number(body.shippingCost) || 0,
        Number(body.grandTotal) || 0,
        Number(body.grandTotal) || 0,
        body.validUntil || null,
        body.deliveryLeadtime || null,
        body.paymentTerms || null,
        body.warranty || null,
        body.bankDetails || null,
        body.cancellationPolicy || null,
        body.returnPolicy || null,
        body.rejectionOfItems || null,
        body.refundPolicy || null,
      ]
    )

    const quotationId = result.rows[0].id

    // Insert items into quotations_items table
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        await query(
          `INSERT INTO quotations_items (quotation_id, product_id, title, quantity, unit_price, total_price, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            quotationId,
            item.productId ? Number(item.productId) : null,
            item.productTitle || item.description || '',
            Number(item.quantity) || 1,
            Number(item.unitCost) || 0,
            Number(item.total) || 0,
            item.notes || null
          ]
        )
      }
    }

    return NextResponse.json({ success: true, quotation: snakeToCamel(result.rows[0]) }, { status: 201 })
  } catch (error: any) {
    console.error('Quotations POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quotation' },
      { status: 500 }
    )
  }
}
