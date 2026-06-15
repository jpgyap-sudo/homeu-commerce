import { NextRequest, NextResponse } from 'next/server'
import { default as DaVinciOSConfig } from '@DaVinciOS-config'
import { getDaVinciOSClient } from '@/lib/daVinciOS'

/**
 * GET /api/quotations/[id]
 * Fetch a single quotation by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const daVinciOS = await getDaVinciOSClient(DaVinciOSConfig)

    const quotation = await daVinciOS.findByID({
      collection: 'quotations',
      id,
      depth: 2,
    })

    if (!quotation) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(quotation)
  } catch (error: any) {
    console.error('Quotation GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/quotations/[id]
 * Update a quotation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const daVinciOS = await getDaVinciOSClient(DaVinciOSConfig)
    const body = await request.json()

    const quotation = await daVinciOS.update({
      collection: 'quotations',
      id,
      data: body,
    })

    return NextResponse.json({ success: true, quotation })
  } catch (error: any) {
    console.error('Quotation PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update quotation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/quotations/[id]
 * Delete a quotation.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const daVinciOS = await getDaVinciOSClient(DaVinciOSConfig)

    await daVinciOS.delete({
      collection: 'quotations',
      id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Quotation DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete quotation' },
      { status: 500 }
    )
  }
}
