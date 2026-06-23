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

    const { rows } = await query(
      `SELECT q.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'title', qi.title, 'quantity', qi.quantity,
            'unitPrice', qi.unit_price, 'totalPrice', qi.total_price
          )) FROM quotations_items qi WHERE qi.quotation_id = q.id),
          '[]'
        ) as items
       FROM quotations q WHERE q.id = $1`,
      [id]
    )

    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const q = rows[0]
    const pdfBuffer = generateQuotationPDF({
      id: q.id,
      title: q.title,
      customerName: q.customer_name,
      customerEmail: q.customer_email,
      status: q.status,
      items: q.items || [],
      subtotal: Number(q.subtotal || 0),
      tax: Number(q.tax || 0),
      total: Number(q.total || 0),
      notes: q.notes,
      bankDetails: q.bank_details || {},
      terms: q.terms,
      warranty: q.warranty,
      validUntil: q.valid_until,
      createdAt: q.created_at,
    })

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quotation-${id}-${q.customer_name || 'homeu'}.pdf"`,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
