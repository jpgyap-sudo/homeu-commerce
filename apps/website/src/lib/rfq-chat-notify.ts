/**
 * rfq-chat-notify.ts
 * ===================
 * Handles sending email notifications to customers when admin clicks
 * the "Notify Customer" button in the RFQ chat admin panel.
 *
 * SMTP config is loaded from DaVinciOS_kv (DB key-value store),
 * falling back to environment variables.
 */

import { createMailTransporter, loadSmtpConfig } from '@/lib/smtp-config'
import { query } from '@/lib/db'

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://homeu.ph'

/**
 * Get a nodemailer transporter — loads SMTP config from DB first.
 */
async function getTransporter() {
  return createMailTransporter()
}

/**
 * Send a notification email to a customer about their RFQ update.
 * The email contains ONLY a direct deep link to the customer's RFQ account.
 *
 * @param to - Customer email address
 * @param customerName - Customer's name for personalization
 * @param rfqId - RFQ request ID for the deep link
 * @returns Object with success status and messageId if sent
 */
export async function sendRfqNotificationEmail(
  to: string,
  customerName: string,
  rfqId: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const rfqDisplayId = `RFQ #${String(rfqId).slice(-6).toUpperCase()}`
    const deepLink = `${APP_URL}/customer/rfq/${rfqId}`
    const subject = `Update on your ${rfqDisplayId} — Home Atelier`

    const transporter = await getTransporter()
    const smtpConfig = await loadSmtpConfig()

    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 22px; color: #222; margin: 0;">Home Atelier</h1>
            <p style="color: #666; font-size: 13px; margin: 4px 0 0;">56 Valencia QC · Manila</p>
          </div>

          <p style="font-size: 15px; color: #333; line-height: 1.5;">Hi ${customerName},</p>

          <p style="font-size: 15px; color: #333; line-height: 1.5;">
            You have an update on your quotation request. View it in your RFQ account to see the latest messages and details.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${deepLink}"
               style="display: inline-block; padding: 14px 36px; background: #222; color: #fff;
                      text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
              💬 View in My RFQ Account
            </a>
          </div>

          <p style="font-size: 13px; color: #999; text-align: center;">
            <a href="${deepLink}" style="color: #999;">${deepLink}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="font-size: 12px; color: #999; text-align: center;">
            You received this because a Home Atelier team member sent you an update.
            <br/>
            <a href="${APP_URL}/customer/dashboard" style="color: #999;">Home Atelier</a> · sales@homeu.ph
          </p>
        </div>
      `,
    })

    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    console.error('[rfq-chat-notify] Failed to send email:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Fetch RFQ info by ID for use in sending notification.
 */
export async function getRfqForNotification(rfqId: number): Promise<{
  customerName: string
  email: string
} | null> {
  const result = await query(
    'SELECT customer_name, email FROM rfq_requests WHERE id = $1 LIMIT 1',
    [rfqId]
  )
  if (result.rows.length === 0) return null
  return {
    customerName: result.rows[0].customer_name || 'Valued Customer',
    email: result.rows[0].email || '',
  }
}
