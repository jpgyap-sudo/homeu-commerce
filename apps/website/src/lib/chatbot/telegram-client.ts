/**
 * Telegram Notification Client
 *
 * Sends structured alerts to a sales group chat via the Telegram Bot API.
 * Used for: new leads, RFQ submissions, appointment requests, escalations, hot leads.
 *
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN=123456:ABC
 *   TELEGRAM_GROUP_CHAT_ID=-100123456789
 *   ADMIN_BASE_URL=https://admin.homeu.ph
 */

const TELEGRAM_API = 'https://api.telegram.org/bot'

export interface TelegramAlert {
  eventType: 'NEW_LEAD' | 'RFQ_SUBMITTED' | 'APPOINTMENT_REQUESTED' | 'ESCALATION' | 'HOT_LEAD' | 'NEW_DESIGNER_APPLICATION'
  leadId?: string
  conversationId?: string
  leadName: string
  mobile?: string
  email?: string
  buyerType?: string
  projectLocation?: string
  score?: number
  scoreLabel?: string
  summary?: string
  company?: string
  details?: string
  rfqItems?: number
  rFQTotal?: string
  appointmentDate?: string
  urgency?: string
  imageUrl?: string
  adminUrl?: string
}

// ── Send Telegram Alert ───────────────────────────────────────

export async function sendTelegramAlert(alert: TelegramAlert): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // loadNamespace already resolves DB value > env var > default
  const { loadNamespace } = await import('@/lib/app-config')
  const messaging = await loadNamespace<{ telegramBotToken: string; telegramChatId: string }>('messaging')
  const botToken = messaging.telegramBotToken
  const chatId = messaging.telegramChatId

  if (!botToken || !chatId) {
    console.warn('[chatbot] Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_CHAT_ID.')
    return { success: false, error: 'Telegram not configured' }
  }

  const adminUrl = process.env.ADMIN_BASE_URL || 'http://localhost:3000'
  const message = formatAlertMessage(alert, adminUrl)

  try {
    const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: parseInt(chatId, 10),
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    })

    const data = await res.json()

    if (data.ok) {
      return { success: true, messageId: String(data.result?.message_id) }
    } else {
      return { success: false, error: data.description || 'Unknown Telegram error' }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error'
    console.error('[chatbot] Telegram send failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

// ── Format Alert Message ──────────────────────────────────────

function formatAlertMessage(alert: TelegramAlert, adminUrl: string): string {
  const lines: string[] = []

  // Header
  const icons: Record<string, string> = {
    NEW_LEAD: '🆕',
    RFQ_SUBMITTED: '📋',
    APPOINTMENT_REQUESTED: '📅',
    ESCALATION: '🔴',
    HOT_LEAD: '🔥',
    NEW_DESIGNER_APPLICATION: '🎨',
  }
  const icon = icons[alert.eventType] || '📌'
  const titles: Record<string, string> = {
    NEW_LEAD: 'New Lead Captured',
    RFQ_SUBMITTED: 'RFQ Submitted',
    APPOINTMENT_REQUESTED: 'Showroom Appointment Requested',
    ESCALATION: 'Conversation Escalated to Human',
    HOT_LEAD: '🔥 Hot Lead Alert',
    NEW_DESIGNER_APPLICATION: 'New Designer Club Application',
  }
  lines.push(`${icon} <b>${titles[alert.eventType] || 'Alert'}</b>`)
  lines.push('')

  // Lead info
  lines.push(`<b>Name:</b> ${escapeHtml(alert.leadName)}`)
  if (alert.mobile) lines.push(`<b>Mobile:</b> ${escapeHtml(alert.mobile)}`)
  if (alert.email) lines.push(`<b>Email:</b> ${escapeHtml(alert.email)}`)
  if (alert.buyerType) lines.push(`<b>Type:</b> ${escapeHtml(alert.buyerType)}`)
  if (alert.company) lines.push(`<b>Company:</b> ${escapeHtml(alert.company)}`)
  if (alert.scoreLabel) lines.push(`<b>Score:</b> ${alert.score} (${escapeHtml(alert.scoreLabel)})`)
  if (alert.projectLocation) lines.push(`<b>Location:</b> ${escapeHtml(alert.projectLocation)}`)

  if (alert.summary || alert.details) {
    lines.push('')
    lines.push(`<b>Summary:</b> ${escapeHtml(alert.summary || alert.details || '')}`)
  }

  if (alert.rfqItems !== undefined) lines.push(`<b>RFQ Items:</b> ${alert.rfqItems}`)
  if (alert.rFQTotal) lines.push(`<b>Estimated Total:</b> ₱${alert.rFQTotal}`)
  if (alert.appointmentDate) lines.push(`<b>Appointment:</b> ${escapeHtml(alert.appointmentDate)}`)
  if (alert.urgency) lines.push(`<b>Urgency:</b> ${escapeHtml(alert.urgency)}`)

  // Admin link
  if (alert.leadId) {
    const link = alert.adminUrl || `${adminUrl}/admin/collections/leads/${alert.leadId}`
    lines.push('')
    lines.push(`<a href="${link}">🔗 View in Admin</a>`)
  }

  return lines.join('\n')
}

// ── Helper ────────────────────────────────────────────────────

function escapeHtml(text: string | undefined): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
