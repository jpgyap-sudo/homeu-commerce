/**
 * Bot Prompts and Messages
 *
 * All system instructions, greeting templates, reply templates, and UI copy
 * for the HomeU Concierge chatbot. Single source of truth for bot messaging.
 */

// ── System Prompt ─────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are HomeU Concierge, the website assistant for HomeU.PH — a furniture and lighting showroom in the Philippines.

The website is NOT an online shop. Product prices are shown for reference only. Do not accept orders or payments. Your goal is to help visitors find suitable products, add items to an RFQ cart, request quotations, book showroom visits, and connect with sales representatives.

Always be warm, professional, concise, and sales-supportive.

You can help with:
- furniture and lighting recommendations
- product matching from uploaded images
- RFQ cart building
- quantity and project questions
- showroom appointment requests
- Viber handoff to sales

Never say: buy now, checkout, place order, pay now, final price guaranteed, stock guaranteed.

Always remind when needed: "Prices are for reference only. Final quotation depends on quantity, availability, finish, delivery location, and project requirements."

Rules:
1. If the visitor hasn't provided their name/email/mobile, ask for those before helping further.
2. If they ask about pricing, explain reference pricing and offer to create an RFQ.
3. If they upload furniture photo, offer to find similar products.
4. If they have 2+ items in RFQ cart, offer Viber handoff.
5. If unsure, offer to connect with human sales team.
6. Never make up product URLs — only reference real catalog products.`

// ── Greeting Messages ─────────────────────────────────────────

export const GREETING_HOMEPAGE = `Hi! Looking for furniture or lighting? You can send a photo, describe what you need, or add items to your RFQ cart. Would you like help finding a product or booking a showroom visit?`

export const GREETING_PRODUCT_PAGE = `Interested in this item? I can help check similar options, add it to your RFQ cart, or arrange a showroom appointment.`

export const GREETING_RFQ_PAGE = `I see you're building an RFQ. Can I help you find matching items, suggest alternatives, or answer questions about your selections?`

export const GREETING_RETURNING = `Welcome back! Would you like to continue where you left off, or start something new?`

// ── Lead Gate Message ─────────────────────────────────────────

export const LEAD_GATE_MESSAGE = `Hi! I can help you find furniture or lighting, recommend similar products from a photo, prepare an RFQ, or book a showroom visit.

Before we continue, please enter your name, email, and mobile number so our team can reply properly.`

// ── Reply Templates ───────────────────────────────────────────

export function imageUploadReply(description: string): string {
  return `Thanks for sharing that image. I can see ${description}

I'll look for similar products in our catalog. Please note that prices are for reference only — final quotation depends on quantity, availability, finish, and delivery location.`
}

export interface ProductRecommendation {
  title: string
  url: string
  reason: string
  matchType: string
  referencePrice?: number
}

export function productRecommendationReply(products: ProductRecommendation[]): string {
  if (products.length === 0) {
    return `I couldn't find exact matches in our current catalog. Would you like to try describing what you need, or I can connect you with our sales team who may be able to source similar items.`
  }

  const lines = products.map((p, i) =>
    `${i + 1}. **${p.title}** — [View product](${p.url})\n   ${p.reason}${p.referencePrice ? ` — ₱${p.referencePrice.toLocaleString('en-PH')}` : ''}`
  )

  return `I found a few options that might work for you:\n\n${lines.join('\n\n')}\n\nWould you like to add any of these to your RFQ cart?`
}

export const RFQ_QUANTITY_QUESTION = `How many pieces do you need, and where is the delivery location?`

export function viberHandoffMessage(viberNumber: string, viberName: string): string {
  return `For faster quotation or showroom appointment, you may contact our sales representative on Viber: **${viberName}** — ${viberNumber}

Would you also like me to send your RFQ details to our sales team so they can prepare a quotation?`
}

export const APPOINTMENT_MESSAGE = `Would you like to book a showroom visit? Please choose your preferred date, time, number of visitors, and the product categories you want to see.`

export function fallbackMessage(viberNumber: string): string {
  return `I may need help from our sales team to answer that accurately. I can forward your inquiry now, or you may contact our sales representative on Viber: ${viberNumber}`
}

export const PRICE_DISCLAIMER = `Prices are for reference only. Final quotation depends on quantity, availability, finish, delivery location, and project requirements.`

export const RFQ_CONFIRMATION = `Thank you. Your RFQ has been sent to our sales team. We will review the items and contact you with quotation details.`

export const APPOINTMENT_CONFIRMATION = `Thank you. Your showroom visit request has been sent. Our team will confirm your schedule.`

// ── Quick Action Buttons ──────────────────────────────────────

export interface QuickAction {
  id: string
  label: string
  icon: string
  action: string // command for the bot state machine
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'find-similar', label: 'Find Similar Product', icon: '🔍', action: 'PRODUCT_SEARCH' },
  { id: 'upload-photo', label: 'Send Product Photo', icon: '📷', action: 'IMAGE_UPLOAD' },
  { id: 'request-rfq', label: 'Request Quotation', icon: '📋', action: 'RFQ_REQUEST' },
  { id: 'book-showroom', label: 'Book Showroom Visit', icon: '📅', action: 'APPOINTMENT' },
  { id: 'viber-sales', label: 'Contact Sales on Viber', icon: '💬', action: 'VIBER_HANDOFF' },
]

// ── Lead Form Fields ──────────────────────────────────────────

export interface LeadFormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
}

export const LEAD_FORM_FIELDS: LeadFormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Maria Santos' },
  { name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'maria@example.com' },
  { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, placeholder: '0917 123 4567' },
  {
    name: 'buyerType', label: 'I am a...', type: 'select', required: false,
    options: [
      { label: 'Homeowner', value: 'homeowner' },
      { label: 'Architect / Designer', value: 'architect' },
      { label: 'Contractor', value: 'contractor' },
      { label: 'Hotel / Restaurant', value: 'hotel' },
      { label: 'Retail Buyer', value: 'retail' },
    ],
  },
  { name: 'companyName', label: 'Company (optional)', type: 'text', required: false, placeholder: 'Studio ABC' },
]

export const CONSENT_TEXT = `I agree to be contacted about my inquiry. HomeU will use this information only to respond to your quotation request or appointment booking.`

// ── Error Messages ────────────────────────────────────────────

export const ERROR_GENERIC = `Something went wrong. Please try again or contact our sales team directly.`
export const ERROR_AI_TIMEOUT = `I'm having trouble processing your request. Let me connect you with our sales team.`
export const ERROR_VALIDATION = `Please check your information and try again.`
