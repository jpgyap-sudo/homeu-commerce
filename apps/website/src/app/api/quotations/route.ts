import { NextRequest, NextResponse } from 'next/server'
import type { Where } from 'DaVinciOS'
import { default as DaVinciOSConfig } from '@DaVinciOS-config'
import { getDaVinciOSClient } from '@/lib/daVinciOS'

/**
 * GET /api/quotations?limit=10&page=1&status=draft&search=...
 * Fetch quotations with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const daVinciOS = await getDaVinciOSClient(DaVinciOSConfig)
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const rfqId = searchParams.get('rfq')
    const customerId = searchParams.get('customer')

    // Build where clause
    const where: Where = {}

    if (status) {
      where.status = { equals: status }
    }

    if (rfqId) {
      where.rfq = { equals: rfqId }
    }

    if (customerId) {
      where.customer = { equals: customerId }
    }

    if (search) {
      where.or = [
        { quotationNumber: { contains: search } },
        { customerName: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const result = await daVinciOS.find({
      collection: 'quotations',
      limit,
      page,
      where,
      sort: '-createdAt',
      depth: 2,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Quotations GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/quotations
 * Create a new quotation. Optionally auto-generate quotation number.
 */
export async function POST(request: NextRequest) {
  try {
    const daVinciOS = await getDaVinciOSClient(DaVinciOSConfig)
    const body = await request.json()

    // Auto-generate quotation number if not provided
    if (!body.quotationNumber) {
      const countResult = await daVinciOS.find({
        collection: 'quotations',
        limit: 1,
        sort: '-createdAt',
        pagination: false,
      })
      const nextNum = (countResult.totalDocs || 0) + 1
      const year = new Date().getFullYear()
      body.quotationNumber = `Q-${year}-${String(nextNum).padStart(4, '0')}`
    }

    // Validate required fields
    if (!body.customerName || !body.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName and phone are required' },
        { status: 400 }
      )
    }

    const quotation = await daVinciOS.create({
      collection: 'quotations',
      data: body,
    })

    return NextResponse.json({ success: true, quotation }, { status: 201 })
  } catch (error: any) {
    console.error('Quotations POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quotation' },
      { status: 500 }
    )
  }
}
