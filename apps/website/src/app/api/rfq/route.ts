import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { default as payloadConfig } from '@payload-config'
import nodemailer from 'nodemailer'
import { generatePricingSuggestions } from '@/utils/ollama-utils'

// Configure email transport (update with your email provider credentials)
const transporter = nodemailer.createTransport({
  host: 'smtp.your-email-provider.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: payloadConfig })
    const body = await request.json()

    // Validate required fields
    if (!body.customerName || !body.phone || !body.items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, phone, or items' },
        { status: 400 }
      )
    }

    // Calculate estimated total
    const estimatedTotal = body.items.reduce((sum: number, item: any) => {
      const price = item.unitPriceSnapshot || 0
      const qty = item.quantity || 1
      return sum + price * qty
    }, 0)

    // Create RFQ request in Payload
    const rfq = await payload.create({
      collection: 'rfq-requests',
      data: {
        ...body,
        estimatedTotal,
        status: 'new',
      },
    })

    // Generate AI pricing suggestions
    const pricingSuggestions = await generatePricingSuggestions(body.items)

    // Send email notification
    const mailOptions = {
      from: `"HomeU RFQ Bot" <${process.env.EMAIL_FROM}>`,
      to: body.email,
      subject: 'Your RFQ Request Received',
      html: `
        <h2>Thank you for your RFQ request!</h2>
        <p>We've received your request for:</p>
        <ul>
          ${body.items.map((item: any) => `<li>${item.title} (x${item.quantity})</li>`).join('')}
        </ul>
        <p><strong>Estimated Total:</strong> $${estimatedTotal.toFixed(2)}</p>
        <p>${pricingSuggestions}</p>
        <p>Our team will contact you within 24 hours.</p>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, rfqId: rfq.id })
  } catch (error: any) {
    console.error('RFQ submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit RFQ' },
      { status: 500 }
    )
  }
}