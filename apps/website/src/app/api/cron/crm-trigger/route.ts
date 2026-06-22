import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createMailTransporter, loadSmtpConfig } from '@/lib/smtp-config'
import crypto from 'crypto'

// Secure key to prevent unauthorized cron executions
const CRON_SECRET = process.env.CRON_SECRET || 'homeu-crm-secret-token-123xyz'

function fmtMoney(n: number): string {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '')

    // For ease of development/testing, bypass validation if CRON_SECRET is not configured or in development mode
    const isDev = process.env.NODE_ENV !== 'production'
    if (!isDev && token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const smtpConfig = await loadSmtpConfig()
    const transporter = await createMailTransporter()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.homeatelier.ph'

    let abandonedSent = 0
    let expiringSent = 0

    // ── 1. SWEEP FOR ABANDONED CARTS ──────────────────────────────
    const abandonedCarts = await query(
      `SELECT c.id AS cart_id, c.lead_id, l.email, l.name, c.estimated_total
       FROM chatbot.rfq_carts c
       JOIN chatbot.leads l ON l.id = c.lead_id
       WHERE c.status = 'draft'
         AND c.created_at < NOW() - INTERVAL '2 hours'
         AND c.created_at > NOW() - INTERVAL '24 hours'
         AND l.email IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM crm_logs cl 
           WHERE cl.cart_id = c.id AND cl.action_sent = 'cart_abandoned_email'
         )
       LIMIT 10`
    )

    for (const cart of abandonedCarts.rows) {
      try {
        const itemsRes = await query(
          `SELECT product_title, quantity, reference_price FROM chatbot.rfq_items WHERE rfq_cart_id = $1`,
          [cart.cart_id]
        )

        if (itemsRes.rows.length === 0) continue

        const customerName = cart.name || 'Valued Customer'
        const recoveryUrl = `${siteUrl}/quote-cart?leadId=${cart.lead_id}&ref=crm_abandoned`

        const itemsHtml = itemsRes.rows.map(item => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #222;">${item.product_title}</td>
            <td style="padding: 12px 0; text-align: center; color: #666;">${item.quantity}</td>
            <td style="padding: 12px 0; text-align: right; color: #222;">${item.reference_price ? fmtMoney(Number(item.reference_price) * item.quantity) : 'MTO Spec'}</td>
          </tr>
        `).join('')

        await transporter.sendMail({
          from: smtpConfig.from,
          to: cart.email,
          subject: '🛋️ Complete Your Quote Request — Home Atelier',
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; border: 1px solid #e5ebe6; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #1a6d3e; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Home Atelier</h2>
              <p style="color: #667168; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hi ${customerName},</p>
              <p style="color: #2b362d; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">We noticed you left some beautiful pieces in your quotation cart. Would you like us to prepare a formal design quote and check stock availability for you?</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 14px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e5ebe6; text-align: left; color: #667168;">
                    <th style="padding-bottom: 8px; font-weight: 600;">Item</th>
                    <th style="padding-bottom: 8px; text-align: center; font-weight: 600;">Qty</th>
                    <th style="padding-bottom: 8px; text-align: right; font-weight: 600;">Est. Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${recoveryUrl}" style="display: inline-block; background-color: #1a6d3e; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(26, 109, 62, 0.15);">Resume Your Quote Request</a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5ebe6; margin: 24px 0;" />
              <p style="font-size: 12px; color: #9aa69c; text-align: center; line-height: 1.5; margin: 0;">
                If you have custom requirements or questions, simply reply directly to this email. Our sales designers are happy to assist.
              </p>
            </div>
          `,
        })

        // Log crm entry to prevent duplicate emails
        await query(
          `INSERT INTO crm_logs (cart_id, action_sent) VALUES ($1, 'cart_abandoned_email')`,
          [cart.cart_id]
        )
        abandonedSent++
      } catch (err: any) {
        console.error(`[crm-cron] Failed to process abandoned cart ${cart.cart_id}:`, err.message)
      }
    }

    // ── 2. SWEEP FOR EXPIRING QUOTES ──────────────────────────────
    const expiringQuotes = await query(
      `SELECT q.id AS quote_id, q.customer_name, q.customer_email, q.valid_until, q.total, q.quotation_number, q.created_at
       FROM quotations q
       WHERE q.status = 'sent'
         AND q.valid_until > NOW()
         AND q.valid_until < NOW() + INTERVAL '48 hours'
         AND q.customer_email IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM crm_logs cl 
           WHERE cl.quotation_id = q.id AND cl.action_sent = 'quote_expiring_email'
         )
       LIMIT 10`
     )

    for (const quote of expiringQuotes.rows) {
      try {
        const customerName = quote.customer_name || 'Valued Customer'
        const secret = process.env.JWT_SECRET || 'fallback'
        const token = crypto
          .createHmac('sha256', secret)
          .update(`${quote.quote_id}-${quote.created_at}`)
          .digest('hex')
          .slice(0, 16)
        const reviewUrl = `${siteUrl}/quotation/${quote.quote_id}?token=${token}`
        const expiryDateStr = new Date(quote.valid_until).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        await transporter.sendMail({
          from: smtpConfig.from,
          to: quote.customer_email,
          subject: `⏰ Quotation #${quote.quotation_number || quote.quote_id} is Expiring Soon`,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 32px; border: 1px solid #fee2e2; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #c00; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Quotation Expiring</h2>
              <p style="color: #667168; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hi ${customerName},</p>
              <p style="color: #2b362d; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                This is a quick reminder that your quotation <strong>#${quote.quotation_number || quote.quote_id}</strong> valued at <strong>${fmtMoney(quote.total)}</strong> is expiring on <strong>${expiryDateStr}</strong>.
              </p>
              <p style="color: #2b362d; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
                To lock in current prices and production lead times, please review the quotation online, click accept, and transfer your deposit via bank transfer.
              </p>

              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${reviewUrl}" style="display: inline-block; background-color: #1a6d3e; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(26, 109, 62, 0.15);">Review & Approve Quotation</a>
              </div>

              <hr style="border: none; border-top: 1px solid #e5ebe6; margin: 24px 0;" />
              <p style="font-size: 12px; color: #9aa69c; text-align: center; line-height: 1.5; margin: 0;">
                If you need to make changes or request a revision, simply click the review link and select "Request Revision".
              </p>
            </div>
          `,
        })

        // Log crm entry
        await query(
          `INSERT INTO crm_logs (quotation_id, action_sent) VALUES ($1, 'quote_expiring_email')`,
          [quote.quote_id]
        )
        expiringSent++
      } catch (err: any) {
        console.error(`[crm-cron] Failed to process expiring quote ${quote.quote_id}:`, err.message)
      }
    }

    return NextResponse.json({
      success: true,
      processed: {
        abandonedCartsSent: abandonedSent,
        expiringQuotesSent: expiringSent,
      },
    })
  } catch (err: any) {
    console.error('[api/cron/crm-trigger] Error:', err)
    return NextResponse.json({ error: 'Failed to process CRM sweep' }, { status: 500 })
  }
}
