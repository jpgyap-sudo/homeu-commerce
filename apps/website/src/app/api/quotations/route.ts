import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
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
      `SELECT * FROM quotations ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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

    const countResult = await query('SELECT COUNT(*) FROM quotations')
    const nextNum = parseInt(countResult.rows[0].count) + 1
    const year = new Date().getFullYear()
    const quotationNumber = body.quotationNumber || `Q-${year}-${String(nextNum).padStart(4, '0')}`

    const result = await query(
      `INSERT INTO quotations (quotation_number, customer_name, email, phone, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [
        quotationNumber,
        body.customerName || '',
        body.email || '',
        body.phone || '',
        body.status || 'draft',
        body.notes || '',
      ]
    )

    return NextResponse.json({ success: true, quotation: snakeToCamel(result.rows[0]) }, { status: 201 })
  } catch (error: any) {
    console.error('Quotations POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quotation' },
      { status: 500 }
    )
  }
}
