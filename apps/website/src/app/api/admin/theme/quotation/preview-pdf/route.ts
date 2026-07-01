import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateQuotationPDF } from '@/lib/generate-quotation-pdf'
import { SAMPLE_QUOTATION } from '@/lib/quotation-pdf-sample'

/** Renders the real PDF (not a mock) from theme settings posted by the
 *  Quotation Theme Builder, using a fixture quotation. Settings are not
 *  saved here — this is preview-only. */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const theme = await request.json()
    const pdfBuffer = await generateQuotationPDF(SAMPLE_QUOTATION, theme)
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="quotation-preview.pdf"',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
