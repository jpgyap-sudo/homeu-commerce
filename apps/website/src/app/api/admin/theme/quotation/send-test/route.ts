import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateQuotationPDF } from '@/lib/generate-quotation-pdf'
import { SAMPLE_QUOTATION } from '@/lib/quotation-pdf-sample'
import { createMailTransporter, loadSmtpConfig } from '@/lib/smtp-config'

/** Emails a test quotation PDF (fixture data, unsaved theme settings) to
 *  the logged-in admin, so staff can sanity-check a template edit without
 *  saving it or opening a real customer quotation. */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.email) {
    return NextResponse.json({ error: 'No email on your admin account to send the test to' }, { status: 400 })
  }

  try {
    const theme = await request.json()

    const smtp = await loadSmtpConfig()
    if (!smtp.host || !smtp.user || !smtp.pass) {
      return NextResponse.json(
        { error: 'SMTP is not configured. Set it in DaVinciOS email settings first.' },
        { status: 503 }
      )
    }

    const pdfBuffer = await generateQuotationPDF(SAMPLE_QUOTATION, theme)
    const transporter = await createMailTransporter()
    await transporter.sendMail({
      from: smtp.from || smtp.user,
      to: session.email,
      subject: 'Test quotation — Quotation Theme Builder',
      text: 'Attached is a test quotation PDF generated from your current (unsaved) theme settings.',
      attachments: [
        { filename: 'quotation-preview.pdf', content: Buffer.from(pdfBuffer), contentType: 'application/pdf' },
      ],
    })

    return NextResponse.json({ success: true, sentTo: session.email })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
